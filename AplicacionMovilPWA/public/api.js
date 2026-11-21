/**
 * Cliente HTTP de la PWA. No conoce la interfaz ni accede a MySQL.
 * Todas las rutas son relativas: server.mjs las reenvía a NGINX (8090).
 * El JWT lo recibe cada función como argumento; este módulo nunca lo almacena.
 */
export function normalizarToken(entrada = '') {
  // Se aceptan tanto JWT sin prefijo como textos que empiezan con Bearer.
  return String(entrada).trim().replace(/^Bearer\s+/i, '').trim();
}

const MENSAJES = {
  400: 'HTTP 400: solicitud incorrecta.',
  401: 'HTTP 401: JWT ausente, inválido o vencido.',
  403: 'HTTP 403: el usuario no tiene permiso para esta operación.',
  404: 'HTTP 404: recurso no encontrado.',
  409: 'HTTP 409: conflicto con el estado actual del recurso.',
  422: 'HTTP 422: datos inválidos.',
  502: 'HTTP 502: no se pudo establecer conexión con el servicio.',
  503: 'HTTP 503: el servicio no está disponible.',
  504: 'HTTP 504: el servicio no respondió a tiempo.',
};

/** Error HTTP con código, detalle del servicio y bandera de resultado incierto. */
export class ErrorApi extends Error {
  constructor(mensaje, { codigoHttp = null, detalle = null, incierto = false } = {}) {
    super(mensaje);
    this.name = 'ErrorApi';
    this.codigoHttp = codigoHttp;
    this.detalle = detalle;
    // incierto: no se sabe si el servidor llegó a procesar la operación.
    this.incierto = incierto;
  }
}

async function leerJson(respuesta) {
  try { return await respuesta.json(); } catch { return null; }
}

async function pedir(ruta, opciones, ejecutarFetch) {
  let respuesta;
  try {
    respuesta = await ejecutarFetch(ruta, { ...opciones, cache: 'no-store' });
  } catch {
    throw new ErrorApi('No se pudo conectar con el servicio. Compruebe la red y los servicios.', { incierto: true });
  }
  return respuesta;
}

async function errorDeRespuesta(respuesta) {
  const cuerpo = await leerJson(respuesta);
  const detalle = cuerpo?.detail || cuerpo?.mensaje || cuerpo?.error || null;
  const codigo = cuerpo?.codigo ? ` [${cuerpo.codigo}]` : '';
  const base = MENSAJES[respuesta.status] || `HTTP ${respuesta.status}: operación no completada.`;
  return new ErrorApi(detalle ? `${base}${codigo} ${detalle}` : base, {
    codigoHttp: respuesta.status,
    detalle: cuerpo,
    incierto: respuesta.status >= 500,
  });
}

function cabecerasAutorizadas(entradaToken, extra = {}) {
  const encabezados = new Headers({ Accept: 'application/json', ...extra });
  const jwt = normalizarToken(entradaToken);
  // Si no hay JWT, el backend es quien determina si responde HTTP 401.
  if (jwt) encabezados.set('Authorization', `Bearer ${jwt}`);
  return encabezados;
}

/** POST /oauth/token (vía servidor de la PWA). Devuelve el JWT emitido para esa cuenta. */
export async function iniciarSesion(usuario, clave, ejecutarFetch = fetch) {
  const respuesta = await pedir('/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ usuario, clave }),
  }, ejecutarFetch);
  if (!respuesta.ok) {
    if (respuesta.status === 401) throw new ErrorApi('HTTP 401: usuario o contraseña incorrectos.', { codigoHttp: 401 });
    throw await errorDeRespuesta(respuesta);
  }
  const datos = await leerJson(respuesta);
  const token = datos?.access_token || datos?.accessToken;
  if (!token) throw new ErrorApi('La respuesta de autenticación no incluye un JWT.', { codigoHttp: respuesta.status });
  return { codigoHttp: respuesta.status, token, expiraEn: Number(datos.expires_in) || null };
}

async function listar(ruta, entradaToken, ejecutarFetch, nombre) {
  const respuesta = await pedir(ruta, { method: 'GET', headers: cabecerasAutorizadas(entradaToken) }, ejecutarFetch);
  if (!respuesta.ok) {
    const error = await errorDeRespuesta(respuesta);
    if (respuesta.status === 404) error.message = `HTTP 404: no se encontró ${ruta}.`;
    throw error;
  }
  const datos = await leerJson(respuesta);
  if (!Array.isArray(datos)) {
    throw new ErrorApi(nombre === 'vehículos'
      ? 'La API debe devolver un arreglo JSON de vehículos.'
      : `La API debe devolver un arreglo JSON de ${nombre}.`, { codigoHttp: respuesta.status });
  }
  return { codigoHttp: respuesta.status, datos };
}

export async function listarVehiculos(entradaToken, ejecutarFetch = fetch) {
  const { codigoHttp, datos } = await listar('/api/vehiculos', entradaToken, ejecutarFetch, 'vehículos');
  return { codigoHttp, vehiculos: datos };
}

export async function listarCompradores(entradaToken, ejecutarFetch = fetch) {
  const { codigoHttp, datos } = await listar('/api/compradores', entradaToken, ejecutarFetch, 'compradores');
  return { codigoHttp, compradores: datos };
}

/** Genera una Idempotency-Key válida para el contrato (8–100, A-Z a-z 0-9 _ -). */
export function nuevaClaveIdempotencia(generarUuid = () => globalThis.crypto.randomUUID()) {
  return `pwa-${generarUuid()}`;
}

/**
 * POST /api/ventas. El precio y el estado los decide el backend: solo se envían los identificadores.
 * 201 = venta nueva, 200 = reintento idéntico reconocido, 202 = pendiente de confirmación.
 */
export async function registrarVenta(entradaToken, vehiculoId, compradorId, claveIdempotencia, ejecutarFetch = fetch) {
  const respuesta = await pedir('/api/ventas', {
    method: 'POST',
    headers: cabecerasAutorizadas(entradaToken, {
      'Content-Type': 'application/json',
      'Idempotency-Key': claveIdempotencia,
    }),
    body: JSON.stringify({ vehiculoId: Number(vehiculoId), compradorId: Number(compradorId) }),
  }, ejecutarFetch);
  if (![200, 201, 202].includes(respuesta.status)) throw await errorDeRespuesta(respuesta);
  const venta = await leerJson(respuesta);
  if (!venta || venta.id === undefined) {
    throw new ErrorApi('La API respondió sin los datos de la venta.', { codigoHttp: respuesta.status, incierto: true });
  }
  return { codigoHttp: respuesta.status, venta, ubicacion: respuesta.headers.get('Location') };
}

/** GET /api/ventas/{id}: consulta posterior del estado, útil ante una respuesta incierta. */
export async function consultarVenta(entradaToken, id, ejecutarFetch = fetch) {
  const numero = Number(id);
  if (!Number.isInteger(numero) || numero <= 0) throw new ErrorApi('Ingrese un identificador de venta válido.');
  const respuesta = await pedir(`/api/ventas/${numero}`, {
    method: 'GET', headers: cabecerasAutorizadas(entradaToken),
  }, ejecutarFetch);
  if (!respuesta.ok) throw await errorDeRespuesta(respuesta);
  return { codigoHttp: respuesta.status, venta: await leerJson(respuesta) };
}

/**
 * Permisos de la interfaz por rol, alineados con los backends:
 *  - CONSULTA: solo lectura de vehículos (ventas y compradores responden 403).
 *  - OPERADOR y ADMIN: además registran y consultan ventas.
 * Es solo presentación: la autorización real la sigue aplicando el backend.
 */
const FUNCIONES = {
  verDisponibles: 'Ver vehículos disponibles',
  verVendidos: 'Ver vehículos vendidos',
  registrarVenta: 'Registrar venta',
  consultarVenta: 'Consultar estado de una venta',
};
const PERMISOS_ROL = {
  CONSULTA: ['verDisponibles', 'verVendidos'],
  OPERADOR: ['verDisponibles', 'verVendidos', 'registrarVenta', 'consultarVenta'],
  ADMIN: ['verDisponibles', 'verVendidos', 'registrarVenta', 'consultarVenta'],
};

/** Lee el claim "rol" del JWT (solo para la interfaz; no valida la firma). */
export function rolDeJwt(jwt = '') {
  try {
    const carga = String(jwt).split('.')[1];
    const base64 = carga.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(carga.length / 4) * 4, '=');
    const rol = JSON.parse(atob(base64)).rol;
    return typeof rol === 'string' ? rol.replace(/^ROLE_/, '').toUpperCase() : '';
  } catch {
    return '';
  }
}

/** Funciones permitidas para un rol. Un rol desconocido recibe solo lectura. */
export function funcionesDelRol(rol) {
  const claves = PERMISOS_ROL[rol] || PERMISOS_ROL.CONSULTA;
  return {
    permisos: new Set(claves),
    etiquetas: claves.map((clave) => FUNCIONES[clave]),
  };
}
