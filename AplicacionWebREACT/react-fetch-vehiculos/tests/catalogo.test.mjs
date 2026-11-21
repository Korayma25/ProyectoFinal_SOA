import test from 'node:test';
import assert from 'node:assert/strict';
import { esDisponible, filtrarPorMarca, idDe, marcasDe, soloDisponibles } from '../src/utils/catalogo.js';

const lista = [
  { idVehiculo: 1, marca: 'Toyota', modelo: 'Corolla', estado: 'DISPONIBLE' },
  { idVehiculo: 2, marca: 'Toyota', modelo: 'Hilux', estado: 'VENDIDO' },
  { idVehiculo: 3, marca: 'Hyundai', modelo: 'Tucson', estado: 'disponible' },
  { idVehiculo: 4, marca: 'Ford', modelo: 'Mustang', estado: 'RESERVADO' },
  { idVehiculo: 5, marca: 'Chevrolet', modelo: 'Spark' },
];

test('catálogo para vender: solo vehículos DISPONIBLES (sin vendidos ni otros estados)', () => {
  const disponibles = soloDisponibles(lista);
  assert.deepEqual(disponibles.map(idDe), [1, 3]);
  assert.ok(disponibles.every(esDisponible));
});

test('el estado se compara sin distinguir mayúsculas ni espacios', () => {
  assert.equal(esDisponible({ estado: ' Disponible ' }), true);
  assert.equal(esDisponible({ estado: 'VENDIDO' }), false);
  assert.equal(esDisponible({}), false);
  assert.equal(esDisponible(null), false);
});

test('filtro por marca: coincide parcialmente, sin mayúsculas ni tildes', () => {
  const disponibles = soloDisponibles(lista);
  assert.deepEqual(filtrarPorMarca(disponibles, 'toy').map(idDe), [1]);
  assert.deepEqual(filtrarPorMarca(disponibles, '  HYUN ').map(idDe), [3]);
  assert.deepEqual(filtrarPorMarca([{ idVehiculo: 9, marca: 'Citroën' }], 'citroen').map(idDe), [9]);
});

test('filtro por marca: texto vacío no filtra y sin coincidencias devuelve lista vacía', () => {
  const disponibles = soloDisponibles(lista);
  assert.equal(filtrarPorMarca(disponibles, '').length, 2);
  assert.equal(filtrarPorMarca(disponibles, '   ').length, 2);
  assert.deepEqual(filtrarPorMarca(disponibles, 'Mazda'), []);
});

test('el filtro no incluye vendidos aunque la marca coincida', () => {
  // Hay un Toyota VENDIDO (id 2) que no debe aparecer en el catálogo de venta.
  const resultado = filtrarPorMarca(soloDisponibles(lista), 'Toyota');
  assert.deepEqual(resultado.map(idDe), [1]);
});

test('marcas sugeridas: únicas, ordenadas y solo de los disponibles', () => {
  assert.deepEqual(marcasDe(soloDisponibles(lista)), ['Hyundai', 'Toyota']);
});

test('idDe acepta idVehiculo o id', () => {
  assert.equal(idDe({ idVehiculo: 7 }), 7);
  assert.equal(idDe({ id: 8 }), 8);
  assert.equal(idDe(undefined), null);
});
