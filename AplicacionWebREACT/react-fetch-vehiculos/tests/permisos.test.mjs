import test from 'node:test';
import assert from 'node:assert/strict';
import { funcionesDelRol, permisosDelRol } from '../src/utils/permisos.js';

test('CONSULTA solo ve el catálogo', () => {
  assert.deepEqual(permisosDelRol('CONSULTA'), { catalogo: true, indicadores: false, ventas: false });
  assert.deepEqual(funcionesDelRol('CONSULTA'), ['Consultar vehículos disponibles']);
});

test('OPERADOR y ADMIN ven catálogo, indicadores y ventas', () => {
  for (const rol of ['OPERADOR', 'admin']) {
    assert.deepEqual(permisosDelRol(rol), { catalogo: true, indicadores: true, ventas: true });
    assert.equal(funcionesDelRol(rol).length, 3);
  }
});

test('rol desconocido o vacío recibe solo lectura de catálogo', () => {
  for (const rol of ['', undefined, 'INVITADO']) assert.equal(permisosDelRol(rol).ventas, false);
});
