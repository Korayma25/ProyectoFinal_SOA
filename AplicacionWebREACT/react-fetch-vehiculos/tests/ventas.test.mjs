import test from 'node:test';
import assert from 'node:assert/strict';
import { consultarVenta, listarVentas, obtenerResumen } from '../src/api/ventasApi.js';
import { ESTADOS_VENTA, formatearFecha, formatearImporte, paginacion } from '../src/utils/ventas.js';

const respuesta = (status, cuerpo) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => {
    if (cuerpo === undefined) throw new Error('sin cuerpo');
    return cuerpo;
  },
});

test('GET /api/ventas con paginación, filtro de estado y Bearer; sin cuerpo ni método de escritura', async () => {
  let pedido;
  const pagina = { items: [{ id: 21 }], total: 11, limit: 10, offset: 0 };
  const r = await listarVentas(' jwt ', { estado: 'COMPLETADA', limit: 10, offset: 10 }, async (ruta, op) => {
    pedido = { ruta, op };
    return respuesta(200, pagina);
  });
  const url = new URL(pedido.ruta, 'http://x');
  assert.equal(url.pathname, '/api/ventas');
  assert.equal(url.searchParams.get('estado'), 'COMPLETADA');
  assert.equal(url.searchParams.get('limit'), '10');
  assert.equal(url.searchParams.get('offset'), '10');
  assert.equal(pedido.op.method, 'GET');
  assert.equal(pedido.op.body, undefined);
  assert.equal(pedido.op.headers.get('Authorization'), 'Bearer jwt');
  assert.equal(r.total, 11);
});

test('sin estado no se envía el parámetro estado', async () => {
  let ruta;
  await listarVentas('t', {}, async (r) => { ruta = r; return respuesta(200, { items: [], total: 0, limit: 10, offset: 0 }); });
  assert.equal(new URL(ruta, 'http://x').searchParams.has('estado'), false);
});

test('resumen e individual consultan GET /api/ventas/resumen y /api/ventas/{id}', async () => {
  const rutas = [];
  const f = async (ruta, op) => {
    rutas.push([ruta, op.method]);
    return respuesta(200, ruta.endsWith('resumen') ? { completadas: 4, ingresos: '126000.00', pendientes: 0, enRevision: 0, fallidas: 1 } : { id: 16 });
  };
  assert.equal((await obtenerResumen('t', f)).completadas, 4);
  assert.equal((await consultarVenta('t', 16, f)).venta.id, 16);
  assert.deepEqual(rutas, [['/api/ventas/resumen', 'GET'], ['/api/ventas/16', 'GET']]);
  await assert.rejects(() => consultarVenta('t', 'abc', f), /no válido/);
});

test('errores: 401, 403 (rol sin permiso), 422 y 500 conservan el código', async () => {
  for (const [codigo, texto] of [[401, /JWT/], [403, /permiso/], [422, /parámetros/], [500, /interno/]]) {
    await assert.rejects(() => listarVentas('t', {}, async () => respuesta(codigo, {})), (e) => e.status === codigo && texto.test(e.message));
  }
});

test('conectividad y formato inválido', async () => {
  await assert.rejects(() => listarVentas('t', {}, async () => { throw new TypeError('x'); }), (e) => e.status === undefined && /No se pudo conectar/.test(e.message));
  await assert.rejects(() => listarVentas('t', {}, async () => respuesta(200, [])), /página de ventas/);
  await assert.rejects(() => obtenerResumen('t', async () => respuesta(200, {})), /resumen/);
});

test('presentación: importes, fechas nulas e inválidas', () => {
  assert.match(formatearImporte('58500.00'), /58\.500,00/);
  assert.equal(formatearImporte(null), '—');
  assert.equal(formatearFecha(null), '—');
  assert.equal(formatearFecha('0000-00-00'), '—');
  assert.notEqual(formatearFecha('2026-11-19T23:41:01Z'), '—');
});

test('paginación y estados válidos', () => {
  assert.deepEqual(paginacion({ total: 25, offset: 10, items: 10 }), { desde: 11, hasta: 20, hayAnterior: true, haySiguiente: true });
  assert.deepEqual(paginacion({ total: 0, offset: 0, items: 0 }), { desde: 0, hasta: 0, hayAnterior: false, haySiguiente: false });
  assert.deepEqual(ESTADOS_VENTA, ['COMPLETADA', 'PENDIENTE', 'EN_REVISION', 'FALLIDA']);
});
