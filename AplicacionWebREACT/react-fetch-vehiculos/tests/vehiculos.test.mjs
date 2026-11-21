import test from 'node:test';
import assert from 'node:assert/strict';
import { listarVehiculos } from '../src/api/vehiculosApi.js';

// Respuesta simulada de fetch: solo lo que usa el módulo.
const respuesta = (status, cuerpo) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => {
    if (cuerpo === undefined) throw new Error('sin cuerpo');
    return cuerpo;
  },
});

test('GET /api/vehiculos con Authorization Bearer y sin caché', async () => {
  let pedido;
  const ejecutarFetch = async (ruta, opciones) => {
    pedido = { ruta, opciones };
    return respuesta(200, [{ idVehiculo: 1 }]);
  };
  const resultado = await listarVehiculos(' jwt-de-prueba ', ejecutarFetch);

  assert.equal(pedido.ruta, '/api/vehiculos');
  assert.equal(pedido.opciones.method, 'GET');
  assert.equal(pedido.opciones.headers.get('Authorization'), 'Bearer jwt-de-prueba');
  assert.equal(pedido.opciones.cache, 'no-store');
  assert.deepEqual(resultado, { vehiculos: [{ idVehiculo: 1 }], codigoHttp: 200 });
});

test('listado vacío: HTTP 204 y lista [] se tratan como catálogo vacío', async () => {
  const sinContenido = await listarVehiculos('t', async () => respuesta(204));
  assert.deepEqual(sinContenido, { vehiculos: [], codigoHttp: 204 });
  const vacia = await listarVehiculos('t', async () => respuesta(200, []));
  assert.deepEqual(vacia, { vehiculos: [], codigoHttp: 200 });
});

test('sin token no se envía Authorization (el backend responde 401)', async () => {
  let cabeceras;
  await listarVehiculos('', async (_ruta, opciones) => {
    cabeceras = opciones.headers;
    return respuesta(200, []);
  });
  assert.equal(cabeceras.has('Authorization'), false);
});

test('errores HTTP: 401, 403, 500 y 503 conservan el código y un mensaje claro', async () => {
  for (const [codigo, texto] of [[401, /JWT/], [403, /permiso/], [500, /servidor/], [503, /no está disponible/]]) {
    await assert.rejects(
      () => listarVehiculos('t', async () => respuesta(codigo, {})),
      (e) => e.status === codigo && texto.test(e.message),
    );
  }
});

test('conectividad: fallo de red y tiempo agotado se informan sin código HTTP', async () => {
  await assert.rejects(
    () => listarVehiculos('t', async () => { throw new TypeError('fetch failed'); }),
    (e) => e.status === undefined && /No se pudo conectar/.test(e.message),
  );
  await assert.rejects(
    () => listarVehiculos('t', async () => {
      const error = new Error('tiempo');
      error.name = 'TimeoutError';
      throw error;
    }),
    (e) => e.status === undefined && /no respondió en 15 segundos/.test(e.message),
  );
});

test('formato inválido: un JSON que no es lista es un error', async () => {
  await assert.rejects(
    () => listarVehiculos('t', async () => respuesta(200, { mensaje: 'x' })),
    /lista JSON/,
  );
});
