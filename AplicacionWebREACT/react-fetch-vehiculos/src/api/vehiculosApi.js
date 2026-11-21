/**
 * Cliente HTTP de la API de vehículos.
 *
 * Responsabilidad: enviar GET, agregar JWT e interpretar HTTP/JSON.
 * No contiene código visual, consultas SQL ni reglas de negocio.
 *
 * La ruta es relativa porque el proxy de Vite (/api) conecta con NGINX (puerto 8090).
 */

// Tiempo máximo de espera de la API antes de informar un error de conectividad.
const TIEMPO_MAXIMO_MS = 15000;

const MENSAJES = {
  400: 'HTTP 400: la solicitud no es válida.',
  401: 'HTTP 401: Falta el JWT o el token ya no es válido.',
  403: 'HTTP 403: El usuario no tiene permiso para consultar.',
  404: 'HTTP 404: No existe la ruta /api/vehiculos.',
  500: 'HTTP 500: Error del servidor o de la conexión con la API Java.',
  502: 'HTTP 502: El servidor intermedio no pudo contactar a Java.',
  503: 'HTTP 503: El servicio de vehículos no está disponible.',
  504: 'HTTP 504: El servicio de vehículos no respondió a tiempo.',
};

export async function listarVehiculos(token, ejecutarFetch = fetch) {
  // Headers es el objeto estándar del navegador para cabeceras HTTP.
  const headers = new Headers({ Accept: 'application/json' });

  // Si no hay token, no se envía Authorization y el backend responde 401.
  if (String(token ?? '').trim()) {
    headers.set('Authorization', `Bearer ${String(token).trim()}`);
  }

  let respuesta;
  try {
    // fetch solicita recursos sin bloquear la interfaz de React.
    respuesta = await ejecutarFetch('/api/vehiculos', {
      method: 'GET',
      headers,
      cache: 'no-store', // Evita mostrar un catálogo almacenado en caché.
      signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS),
    });
  } catch (e) {
    // Un fallo de red o un tiempo agotado impide recibir una respuesta HTTP.
    throw new Error(
      e?.name === 'TimeoutError'
        ? `La API no respondió en ${TIEMPO_MAXIMO_MS / 1000} segundos.`
        : 'No se pudo conectar. Verifique el servidor y la red.',
    );
  }

  // fetch NO lanza una excepción automática por códigos como 401 o 403.
  // Por eso, se debe verificar manualmente respuesta.ok.
  if (!respuesta.ok) {
    const error = new Error(
      MENSAJES[respuesta.status] ?? `La API devolvió HTTP ${respuesta.status}.`,
    );
    error.status = respuesta.status; // La interfaz podrá mostrar el código.
    throw error;
  }

  // Una API puede responder 204 cuando no hay contenido.
  if (respuesta.status === 204) {
    return { vehiculos: [], codigoHttp: 204 };
  }

  let datos;
  try {
    // Convertir la respuesta JSON en un arreglo de objetos JavaScript.
    datos = await respuesta.json();
  } catch {
    throw new Error('La API respondió, pero el JSON no pudo interpretarse.');
  }

  // Contrato de esta práctica: GET /api/vehiculos devuelve una lista.
  // Si Java envía otro formato, se debe ajustar según el contrato real.
  if (!Array.isArray(datos)) {
    throw new Error('Se esperaba una lista JSON de vehículos (un arreglo).');
  }

  return { vehiculos: datos, codigoHttp: respuesta.status };
}
