import test from 'node:test';
import assert from 'node:assert/strict';
import {
  listarVehiculos, normalizarToken, iniciarSesion, registrarVenta, consultarVenta,
  nuevaClaveIdempotencia,
} from '../public/api.js';

const respuestaJson = (estado, cuerpo, cabeceras = {}) => new Response(JSON.stringify(cuerpo), {
  status: estado, headers: { 'Content-Type': 'application/json', ...cabeceras },
});

test('login obtiene el JWT de la respuesta de /oauth/token', async () => {
  let ruta; let cuerpo;
  const r = await iniciarSesion('ana', 'clave', async (u, o) => { ruta = u; cuerpo = JSON.parse(o.body); return respuestaJson(200, { access_token: 'a.b.c', expires_in: 1800 }); });
  assert.equal(ruta, '/oauth/token');
  assert.deepEqual(cuerpo, { usuario: 'ana', clave: 'clave' });
  assert.equal(r.token, 'a.b.c');
  assert.equal(r.expiraEn, 1800);
});

test('login con credenciales incorrectas informa HTTP 401', async () => {
  await assert.rejects(iniciarSesion('a', 'b', async () => respuestaJson(401, { mensaje: 'x' })),
    (e) => e.codigoHttp === 401 && /incorrectos/.test(e.message));
});

test('registrarVenta envía solo ids, Bearer e Idempotency-Key (sin precio ni estado)', async () => {
  let o; let ruta;
  const r = await registrarVenta('jwt', 3, 1, 'pwa-clave-1234', async (u, op) => { ruta = u; o = op; return respuestaJson(201, { id: 9, estado: 'COMPLETADA' }, { Location: '/api/ventas/9' }); });
  assert.equal(ruta, '/api/ventas');
  assert.equal(o.method, 'POST');
  assert.equal(o.headers.get('Authorization'), 'Bearer jwt');
  assert.equal(o.headers.get('Idempotency-Key'), 'pwa-clave-1234');
  assert.deepEqual(JSON.parse(o.body), { vehiculoId: 3, compradorId: 1 });
  assert.equal(r.codigoHttp, 201);
  assert.equal(r.ubicacion, '/api/ventas/9');
});

test('registrarVenta acepta 200 (reintento) y 202 (pendiente)', async () => {
  for (const estado of [200, 202]) {
    const r = await registrarVenta('j', 1, 1, 'pwa-clave-1234', async () => respuestaJson(estado, { id: 1, estado: 'X' }));
    assert.equal(r.codigoHttp, estado);
  }
});

test('registrarVenta: 409 es definitivo, 503 y fallo de red son inciertos', async () => {
  await assert.rejects(registrarVenta('j', 1, 1, 'pwa-clave-1234', async () => respuestaJson(409, { codigo: 'CLAVE_REUTILIZADA', detail: 'misma clave' })),
    (e) => e.codigoHttp === 409 && e.incierto === false && /CLAVE_REUTILIZADA/.test(e.message));
  await assert.rejects(registrarVenta('j', 1, 1, 'pwa-clave-1234', async () => respuestaJson(503, {})),
    (e) => e.codigoHttp === 503 && e.incierto === true);
  await assert.rejects(registrarVenta('j', 1, 1, 'pwa-clave-1234', async () => { throw new Error('red'); }),
    (e) => e.incierto === true && /conectar/.test(e.message));
});

test('consultarVenta valida el id y consulta GET /api/ventas/{id}', async () => {
  await assert.rejects(consultarVenta('j', 'abc'), /identificador/);
  let ruta;
  const r = await consultarVenta('j', '16', async (u) => { ruta = u; return respuestaJson(200, { id: 16, estado: 'COMPLETADA' }); });
  assert.equal(ruta, '/api/ventas/16');
  assert.equal(r.venta.estado, 'COMPLETADA');
});

test('la clave de idempotencia cumple el patrón del contrato', () => {
  const clave = nuevaClaveIdempotencia(() => '123e4567-e89b-12d3-a456-426614174000');
  assert.match(clave, /^[A-Za-z0-9_-]{8,100}$/);
});

// Los datos de estas pruebas son simulados y no sustituyen a la API real.
test('normaliza un token pegado con prefijo Bearer', () => {
  assert.equal(normalizarToken('  bearer abc.def.ghi  '), 'abc.def.ghi');
});

test('GET transmite Authorization y recibe una lista JSON', async () => {
  let solicitud;
  const simularFetch = async (ruta, opciones) => {
    solicitud = { ruta, opciones };
    return new Response(JSON.stringify([{ idVehiculo: 1, marca: 'Ejemplo' }]), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  };
  const resultado = await listarVehiculos('mi.token', simularFetch);
  assert.equal(solicitud.ruta, '/api/vehiculos');
  assert.equal(solicitud.opciones.headers.get('Authorization'), 'Bearer mi.token');
  assert.equal(solicitud.opciones.cache, 'no-store');
  assert.equal(resultado.vehiculos.length, 1);
});

test('sin token no agrega Authorization (el backend decide 401)', async () => {
  const simularFetch = async (_ruta, opciones) => {
    assert.equal(opciones.headers.has('Authorization'), false);
    return new Response('[]', { status: 200 });
  };
  await listarVehiculos('', simularFetch);
});

test('identifica HTTP 401 sin mostrar una lista inventada', async () => {
  await assert.rejects(
    listarVehiculos('vencido', async () => new Response('No autorizado', { status: 401 })),
    (error) => error.codigoHttp === 401 && /401/.test(error.message),
  );
});

test('rechaza un objeto en lugar del arreglo JSON contratado', async () => {
  await assert.rejects(
    listarVehiculos('jwt', async () => new Response('{"data":[]}', { status: 200 })),
    /arreglo JSON/,
  );
});

test('informa error de conectividad', async () => {
  await assert.rejects(
    listarVehiculos('jwt', async () => { throw new Error('sin red'); }),
    /conectar/,
  );
});
