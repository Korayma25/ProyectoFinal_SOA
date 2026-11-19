import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { crearServidor } from '../server.mjs';

// Pruebas de integración locales: backend simulado y servidor de la PWA en puertos aleatorios.
async function conServidores(opciones, manejador, prueba) {
  const backend = createServer(manejador);
  backend.listen(0, '127.0.0.1'); await once(backend, 'listening');
  const frontend = crearServidor({ apiBase: `http://127.0.0.1:${backend.address().port}`, ...opciones });
  frontend.listen(0, '127.0.0.1'); await once(frontend, 'listening');
  try {
    await prueba(`http://127.0.0.1:${frontend.address().port}`);
  } finally {
    await new Promise((r) => frontend.close(r));
    await new Promise((r) => backend.close(r));
  }
}

const leer = async (req) => { const t = []; for await (const c of req) t.push(c); return Buffer.concat(t).toString(); };

test('proxy reenvía Bearer y respuesta HTTP del backend', async () => {
  let jwt = '';
  await conServidores({}, (req, res) => {
    jwt = req.headers.authorization;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end('[]');
  }, async (base) => {
    const respuesta = await fetch(`${base}/api/vehiculos`, { headers: { Authorization: 'Bearer prueba.jwt' } });
    assert.equal(respuesta.status, 200);
    assert.equal(jwt, 'Bearer prueba.jwt');
    assert.equal(respuesta.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await respuesta.json(), []);
  });
});

test('login: el servidor agrega el cliente OAuth y el navegador solo envía usuario y clave', async () => {
  let visto;
  await conServidores({ clienteId: 'cli', clienteSecreto: 'sec', idApli: '92' }, async (req, res) => {
    visto = { ruta: req.url, auth: req.headers.authorization, tipo: req.headers['content-type'], cuerpo: await leer(req) };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end('{"access_token":"jwt.de.prueba","expires_in":1800}');
  }, async (base) => {
    const r = await fetch(`${base}/oauth/token`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario: 'ana', clave: 'x y' }),
    });
    assert.equal(r.status, 200);
    assert.equal(visto.ruta, '/oauth/token');
    assert.equal(visto.auth, 'Basic ' + Buffer.from('cli:sec').toString('base64'));
    assert.match(visto.tipo, /x-www-form-urlencoded/);
    const p = new URLSearchParams(visto.cuerpo);
    assert.equal(p.get('grant_type'), 'password');
    assert.equal(p.get('username'), 'ana');
    assert.equal(p.get('password'), 'x y');
    assert.equal(p.get('idapli'), '92');
  });
});

test('login sin cliente OAuth configurado responde 500 sin llamar al backend', async () => {
  let llamado = false;
  await conServidores({ clienteId: '', clienteSecreto: '' }, (_req, res) => { llamado = true; res.end(); }, async (base) => {
    const r = await fetch(`${base}/oauth/token`, { method: 'POST', body: '{"usuario":"a","clave":"b"}' });
    assert.equal(r.status, 500);
    assert.equal(llamado, false);
  });
});

test('POST /api/ventas reenvía cuerpo, Idempotency-Key, Authorization y Location', async () => {
  let visto;
  await conServidores({}, async (req, res) => {
    visto = { clave: req.headers['idempotency-key'], auth: req.headers.authorization, cuerpo: await leer(req) };
    res.writeHead(201, { 'Content-Type': 'application/json', Location: '/api/ventas/7' });
    res.end('{"id":7,"estado":"COMPLETADA"}');
  }, async (base) => {
    const r = await fetch(`${base}/api/ventas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer j', 'Idempotency-Key': 'pwa-12345678' },
      body: JSON.stringify({ vehiculoId: 3, compradorId: 1 }),
    });
    assert.equal(r.status, 201);
    assert.equal(r.headers.get('location'), '/api/ventas/7');
    assert.equal(visto.clave, 'pwa-12345678');
    assert.equal(visto.auth, 'Bearer j');
    assert.deepEqual(JSON.parse(visto.cuerpo), { vehiculoId: 3, compradorId: 1 });
  });
});

test('solo se exponen las rutas necesarias; el resto responde 404', async () => {
  await conServidores({}, (_req, res) => { res.end('{}'); }, async (base) => {
    for (const [metodo, ruta] of [
      ['GET', '/api/ventas'], ['DELETE', '/api/ventas/1'], ['PUT', '/api/compradores/1'],
      ['POST', '/api/compradores'], ['GET', '/api/identidad'], ['GET', '/oauth/token'],
    ]) {
      const r = await fetch(`${base}${ruta}`, { method: metodo });
      assert.equal(r.status, 404, `${metodo} ${ruta}`);
    }
  });
});

test('GET /api/ventas/{id} y /api/compradores están permitidos', async () => {
  await conServidores({}, (req, res) => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ruta: req.url })); }, async (base) => {
    assert.equal((await (await fetch(`${base}/api/ventas/16`)).json()).ruta, '/api/ventas/16');
    assert.equal((await fetch(`${base}/api/compradores`)).status, 200);
  });
});

test('backend caído responde 502', async () => {
  const frontend = crearServidor({ apiBase: 'http://127.0.0.1:9' });
  frontend.listen(0, '127.0.0.1'); await once(frontend, 'listening');
  try {
    const r = await fetch(`http://127.0.0.1:${frontend.address().port}/api/vehiculos`);
    assert.equal(r.status, 502);
  } finally {
    await new Promise((res) => frontend.close(res));
  }
});
