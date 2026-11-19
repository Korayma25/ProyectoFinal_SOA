/**
 * Servidor de desarrollo local sin dependencias externas.
 * Sirve la PWA y reenvía, a través de NGINX, únicamente las rutas que el cliente móvil necesita:
 *   POST /oauth/token        (login; el servidor añade las credenciales del cliente OAuth)
 *   GET  /api/vehiculos      GET /api/compradores
 *   POST /api/ventas         GET /api/ventas/{id}
 * La URL pública siempre es del mismo origen para evitar problemas CORS.
 * Los secretos del cliente OAuth se leen de variables de entorno; nunca llegan al navegador.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)));
const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.png': 'image/png',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
};

// Rutas permitidas hacia el backend (lista cerrada). Todo lo demás responde 404.
const RUTAS = [
  { metodo: 'POST', patron: /^\/oauth\/token$/, token: true },
  { metodo: 'GET', patron: /^\/api\/vehiculos$/ },
  { metodo: 'GET', patron: /^\/api\/compradores$/ },
  { metodo: 'POST', patron: /^\/api\/ventas$/, cuerpo: true },
  { metodo: 'GET', patron: /^\/api\/ventas\/\d+$/ },
];

function json(respuesta, estado, objeto) {
  respuesta.writeHead(estado, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  respuesta.end(JSON.stringify(objeto));
}

async function leerCuerpo(peticion, limite = 8192) {
  const trozos = [];
  let total = 0;
  for await (const trozo of peticion) {
    total += trozo.length;
    if (total > limite) throw new Error('Cuerpo demasiado grande');
    trozos.push(trozo);
  }
  return Buffer.concat(trozos);
}

export function crearServidor({
  directorio = resolve(ROOT, 'public'),
  // Punto único de entrada REST: NGINX.
  apiBase = process.env.API_BASE_URL || 'http://127.0.0.1:8090',
  clienteId = process.env.OAUTH_CLIENT_ID || '',
  clienteSecreto = process.env.OAUTH_CLIENT_SECRET || '',
  idApli = process.env.OAUTH_IDAPLI || '92',
} = {}) {
  const carpeta = resolve(directorio);
  const base = apiBase.replace(/\/$/, '');

  async function reenviar(peticion, respuesta, url, ruta) {
    const encabezados = { Accept: 'application/json' };
    let cuerpo;

    if (ruta.token) {
      // El navegador solo envía usuario y contraseña; el cliente OAuth lo agrega el servidor.
      if (!clienteId || !clienteSecreto) {
        return json(respuesta, 500, { error: 'Cliente OAuth no configurado en el servidor de la PWA' });
      }
      let entrada;
      try { entrada = JSON.parse((await leerCuerpo(peticion)).toString('utf8')); }
      catch { return json(respuesta, 400, { error: 'Cuerpo de login inválido' }); }
      const usuario = String(entrada?.usuario ?? '').trim();
      const clave = String(entrada?.clave ?? '');
      if (!usuario || !clave) return json(respuesta, 400, { error: 'Usuario y contraseña son obligatorios' });
      cuerpo = new URLSearchParams({ grant_type: 'password', username: usuario, password: clave, idapli: idApli }).toString();
      encabezados['Content-Type'] = 'application/x-www-form-urlencoded';
      encabezados.Authorization = 'Basic ' + Buffer.from(`${clienteId}:${clienteSecreto}`).toString('base64');
    } else {
      if (peticion.headers.authorization) encabezados.Authorization = peticion.headers.authorization;
      if (ruta.cuerpo) {
        try { cuerpo = await leerCuerpo(peticion); }
        catch { return json(respuesta, 413, { error: 'Cuerpo demasiado grande' }); }
        encabezados['Content-Type'] = peticion.headers['content-type'] || 'application/json';
        if (peticion.headers['idempotency-key']) encabezados['Idempotency-Key'] = peticion.headers['idempotency-key'];
      }
    }

    const abortador = new AbortController();
    // El registro de una venta encadena reserva, confirmación y notificación: admite más espera.
    const limiteMs = ruta.cuerpo ? 40000 : 12000;
    const temporizador = setTimeout(() => abortador.abort(), limiteMs);
    try {
      const remoto = await fetch(`${base}${url.pathname}`, {
        method: peticion.method, headers: encabezados, body: cuerpo,
        signal: abortador.signal, cache: 'no-store',
      });
      const salida = {
        'Content-Type': remoto.headers.get('content-type') || 'application/json; charset=utf-8',
        'Cache-Control': 'no-store', 'Vary': 'Authorization',
      };
      const ubicacion = remoto.headers.get('location');
      if (ubicacion) salida.Location = ubicacion;
      respuesta.writeHead(remoto.status, salida);
      respuesta.end(Buffer.from(await remoto.arrayBuffer()));
    } catch (error) {
      const tiempoAgotado = error.name === 'AbortError';
      json(respuesta, tiempoAgotado ? 504 : 502,
        { error: tiempoAgotado ? 'Tiempo de espera agotado' : 'Servicio no disponible (NGINX o backend)' });
    } finally {
      clearTimeout(temporizador);
    }
  }

  return createServer(async (peticion, respuesta) => {
    const url = new URL(peticion.url || '/', 'http://localhost');
    respuesta.setHeader('X-Content-Type-Options', 'nosniff');
    respuesta.setHeader('Referrer-Policy', 'no-referrer');
    respuesta.setHeader('Cache-Control', 'no-store');

    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/oauth/')) {
      const ruta = RUTAS.find((r) => r.metodo === peticion.method && r.patron.test(url.pathname));
      if (!ruta) return json(respuesta, 404, { error: 'Endpoint no disponible' });
      return reenviar(peticion, respuesta, url, ruta);
    }

    if (peticion.method !== 'GET' && peticion.method !== 'HEAD') {
      respuesta.writeHead(405); respuesta.end(); return;
    }

    let rutaArchivo;
    try { rutaArchivo = decodeURIComponent(url.pathname); }
    catch { respuesta.writeHead(400); respuesta.end(); return; }
    const archivo = resolve(carpeta, '.' + (rutaArchivo === '/' ? '/index.html' : rutaArchivo));
    if (!(archivo === carpeta || archivo.startsWith(carpeta + sep))) {
      respuesta.writeHead(403); respuesta.end(); return;
    }
    try {
      const detalle = await stat(archivo);
      if (!detalle.isFile()) throw new Error('Archivo no encontrado');
      respuesta.setHeader('Content-Type', TIPOS[extname(archivo)] || 'application/octet-stream');
      if (peticion.method === 'HEAD') { respuesta.writeHead(200); respuesta.end(); return; }
      respuesta.writeHead(200);
      respuesta.end(await readFile(archivo));
    } catch {
      respuesta.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      respuesta.end('Recurso no encontrado');
    }
  });
}

// Se habilita uso como módulo para pruebas, sin iniciar puerto al importarlo.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argPuerto = process.argv.find((arg) => arg.startsWith('--port='));
  const argCarpeta = process.argv.find((arg) => arg.startsWith('--dir='));
  const puerto = Number(argPuerto?.split('=')[1] || process.env.PORT || 5174);
  const host = process.env.HOST || '127.0.0.1';
  const carpeta = resolve(ROOT, argCarpeta?.split('=')[1] || 'public');
  crearServidor({ directorio: carpeta }).listen(puerto, host, () => {
    console.log(`PWA disponible: http://localhost:${puerto}`);
    console.log(`Backend (NGINX): ${process.env.API_BASE_URL || 'http://127.0.0.1:8090'}`);
    if (!process.env.OAUTH_CLIENT_ID || !process.env.OAUTH_CLIENT_SECRET) {
      console.log('AVISO: defina OAUTH_CLIENT_ID y OAUTH_CLIENT_SECRET para habilitar el login.');
    }
    console.log('Para cerrar: Ctrl + C');
  });
}
