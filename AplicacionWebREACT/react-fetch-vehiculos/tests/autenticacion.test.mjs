import test from 'node:test';
import assert from 'node:assert/strict';
import { iniciarSesion, rolDeJwt, ErrorAcceso } from '../src/api/autenticacionApi.js';

// Respuesta simulada de fetch: solo lo que usa el módulo.
const respuesta = (status, cuerpo) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => {
    if (cuerpo === undefined) throw new Error('sin cuerpo');
    return cuerpo;
  },
});

// JWT de ejemplo (sin firma válida) con el claim "rol".
const jwtConRol = (rol) => {
  const carga = Buffer.from(JSON.stringify({ rol })).toString('base64url');
  return `cabecera.${carga}.firma`;
};

test('login: envía usuario y contraseña como formulario a /oauth/token, sin cliente OAuth', async () => {
  let pedido;
  const ejecutarFetch = async (ruta, opciones) => {
    pedido = { ruta, opciones };
    return respuesta(200, { access_token: 'jwt-de-prueba', expires_in: 1800 });
  };
  const resultado = await iniciarSesion('maria', 'secreta', ejecutarFetch);

  assert.equal(pedido.ruta, '/oauth/token');
  assert.equal(pedido.opciones.method, 'POST');
  const cuerpo = new URLSearchParams(pedido.opciones.body.toString());
  assert.equal(cuerpo.get('grant_type'), 'password');
  assert.equal(cuerpo.get('username'), 'maria');
  assert.equal(cuerpo.get('password'), 'secreta');
  // El navegador no manda Authorization: el cliente OAuth lo agrega el servidor de Vite.
  assert.equal(pedido.opciones.headers.Authorization, undefined);
  assert.deepEqual(resultado, { token: 'jwt-de-prueba', expiraEn: 1800, codigoHttp: 200 });
});

test('login: 401 se informa como usuario o contraseña incorrectos', async () => {
  await assert.rejects(
    () => iniciarSesion('x', 'y', async () => respuesta(401, { mensaje: 'Usuario o contraseña incorrectos' })),
    (e) => e instanceof ErrorAcceso && e.status === 401 && /usuario o contraseña incorrectos/.test(e.message),
  );
});

test('login: 500 indica problema del servicio o del cliente OAuth', async () => {
  await assert.rejects(
    () => iniciarSesion('x', 'y', async () => respuesta(500, {})),
    (e) => e.status === 500 && /cliente OAuth/.test(e.message),
  );
});

test('login: fallo de red no tiene código HTTP', async () => {
  await assert.rejects(
    () => iniciarSesion('x', 'y', async () => { throw new TypeError('fetch failed'); }),
    (e) => e instanceof ErrorAcceso && e.status === null && /No se pudo conectar/.test(e.message),
  );
});

test('login: una respuesta 200 sin JWT es un error', async () => {
  await assert.rejects(
    () => iniciarSesion('x', 'y', async () => respuesta(200, { expires_in: 10 })),
    (e) => /no incluye un JWT/.test(e.message),
  );
});

test('rol: se lee del claim del JWT y se normaliza', () => {
  assert.equal(rolDeJwt(jwtConRol('ROLE_ADMIN')), 'ADMIN');
  assert.equal(rolDeJwt(jwtConRol('operador')), 'OPERADOR');
});

test('rol: un JWT mal formado no rompe la pantalla', () => {
  assert.equal(rolDeJwt('no-es-un-jwt'), '');
  assert.equal(rolDeJwt(undefined), '');
});
