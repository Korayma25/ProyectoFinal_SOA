/**
 * Cliente HTTP de consulta de ventas (servicio FastAPI, por NGINX).
 *
 * Solo realiza GET: este cliente NO registra ventas (eso lo hace únicamente la PWA móvil).
 * El JWT lo recibe cada función como argumento; este módulo nunca lo almacena.
 */

const TIEMPO_MAXIMO_MS = 15000;

const MENSAJES = {
  400: 'HTTP 400: la solicitud no es válida.',
  401: 'HTTP 401: Falta el JWT o el token ya no es válido.',
  403: 'HTTP 403: El usuario no tiene permiso para esta consulta.',
  404: 'HTTP 404: no se encontró la venta o la ruta.',
  422: 'HTTP 422: los parámetros de la consulta no son válidos.',
  500: 'HTTP 500: error interno del servicio de ventas.',
  502: 'HTTP 502: el servidor intermedio no pudo contactar al servicio de ventas.',
  503: 'HTTP 503: el servicio de ventas no está disponible.',
  504: 'HTTP 504: el servicio de ventas no respondió a tiempo.',
};

/** Error con el código HTTP (undefined si no hubo respuesta). */
export class ErrorVentas extends Error {
  constructor(mensaje, status) {
    super(mensaje);
    this.name = 'ErrorVentas';
    this.status = status;
  }
}

async function consultar(ruta, token, ejecutarFetch) {
  const headers = new Headers({ Accept: 'application/json' });
  if (String(token ?? '').trim()) headers.set('Authorization', `Bearer ${String(token).trim()}`);

  let respuesta;
  try {
    respuesta = await ejecutarFetch(ruta, {
      method: 'GET',
      headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS),
    });
  } catch (e) {
    throw new ErrorVentas(
      e?.name === 'TimeoutError'
        ? `El servicio de ventas no respondió en ${TIEMPO_MAXIMO_MS / 1000} segundos.`
        : 'No se pudo conectar. Verifique el servidor y la red.',
    );
  }
  if (!respuesta.ok) {
    throw new ErrorVentas(MENSAJES[respuesta.status] ?? `La API devolvió HTTP ${respuesta.status}.`, respuesta.status);
  }
  try {
    return { datos: await respuesta.json(), codigoHttp: respuesta.status };
  } catch {
    throw new ErrorVentas('La respuesta del servicio de ventas no pudo interpretarse.', respuesta.status);
  }
}

/** GET /api/ventas?estado&limit&offset → { items, total, limit, offset, codigoHttp }. */
export async function listarVentas(token, { estado = '', limit = 10, offset = 0 } = {}, ejecutarFetch = fetch) {
  const parametros = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (estado) parametros.set('estado', estado);
  const { datos, codigoHttp } = await consultar(`/api/ventas?${parametros}`, token, ejecutarFetch);
  if (!datos || !Array.isArray(datos.items) || !Number.isInteger(datos.total)) {
    throw new ErrorVentas('Se esperaba una página de ventas (items y total).', codigoHttp);
  }
  return { ...datos, codigoHttp };
}

/** GET /api/ventas/resumen → { completadas, ingresos, pendientes, enRevision, fallidas }. */
export async function obtenerResumen(token, ejecutarFetch = fetch) {
  const { datos, codigoHttp } = await consultar('/api/ventas/resumen', token, ejecutarFetch);
  if (!datos || typeof datos !== 'object' || datos.completadas === undefined) {
    throw new ErrorVentas('Se esperaba el resumen de ventas.', codigoHttp);
  }
  return { ...datos, codigoHttp };
}

/** GET /api/ventas/{id}: seguimiento de una venta. */
export async function consultarVenta(token, id, ejecutarFetch = fetch) {
  const numero = Number(id);
  if (!Number.isInteger(numero) || numero <= 0) throw new ErrorVentas('Identificador de venta no válido.');
  const { datos, codigoHttp } = await consultar(`/api/ventas/${numero}`, token, ejecutarFetch);
  if (!datos || datos.id === undefined) throw new ErrorVentas('Se esperaba una venta.', codigoHttp);
  return { venta: datos, codigoHttp };
}
