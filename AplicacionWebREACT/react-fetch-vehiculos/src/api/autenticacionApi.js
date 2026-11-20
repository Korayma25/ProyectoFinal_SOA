/**
 * Autenticación del cliente web.
 *
 * Responsabilidad: enviar POST /oauth/token con usuario y contraseña e interpretar la respuesta.
 * El navegador NO conoce el cliente OAuth: el proxy de Vite (vite.config.js) lo agrega desde el
 * servidor. El JWT que devuelve esta función lo guarda la aplicación solo en memoria.
 */

// Identificador de aplicación del login. No es un secreto.
const IDAPLI = '92';

/** Error con el código HTTP (o null si no hubo respuesta) para mostrarlo en pantalla. */
export class ErrorAcceso extends Error {
  constructor(mensaje, status = null) {
    super(mensaje);
    this.name = 'ErrorAcceso';
    this.status = status;
  }
}

const MENSAJES = {
  400: 'HTTP 400: solicitud de acceso incorrecta.',
  401: 'HTTP 401: usuario o contraseña incorrectos.',
  403: 'HTTP 403: el usuario no tiene permiso para acceder.',
  404: 'HTTP 404: no existe la ruta de autenticación.',
  500: 'HTTP 500: error en el servicio de autenticación o falta configurar el cliente OAuth.',
  502: 'HTTP 502: el servidor intermedio no pudo contactar a NGINX.',
  503: 'HTTP 503: el servicio de autenticación no está disponible.',
  504: 'HTTP 504: el servicio de autenticación no respondió a tiempo.',
};

/** POST /oauth/token. Devuelve { token, expiraEn (segundos o null), codigoHttp }. */
export async function iniciarSesion(usuario, clave, ejecutarFetch = fetch) {
  const cuerpo = new URLSearchParams({
    grant_type: 'password',
    username: usuario,
    password: clave,
    idapli: IDAPLI,
  });

  let respuesta;
  try {
    respuesta = await ejecutarFetch('/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: cuerpo,
      cache: 'no-store',
    });
  } catch {
    throw new ErrorAcceso('No se pudo conectar. Verifique el servidor y la red.');
  }

  if (!respuesta.ok) {
    throw new ErrorAcceso(
      MENSAJES[respuesta.status] ?? `La API devolvió HTTP ${respuesta.status}.`,
      respuesta.status,
    );
  }

  let datos;
  try {
    datos = await respuesta.json();
  } catch {
    throw new ErrorAcceso('La respuesta de autenticación no pudo interpretarse.', respuesta.status);
  }

  const token = datos?.access_token ?? datos?.accessToken;
  if (!token) {
    throw new ErrorAcceso('La respuesta de autenticación no incluye un JWT.', respuesta.status);
  }
  return { token, expiraEn: Number(datos.expires_in) || null, codigoHttp: respuesta.status };
}

/**
 * Lee el claim "rol" del JWT solo para mostrarlo en pantalla. No valida la firma:
 * la autorización real la aplica el backend con HTTP 401 o 403.
 */
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
