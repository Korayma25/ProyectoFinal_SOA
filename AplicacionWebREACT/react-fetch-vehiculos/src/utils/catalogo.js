/**
 * Reglas del catálogo de vehículos del cliente web. Son funciones puras (sin React ni HTTP)
 * para poder probarlas de forma automática.
 */

/** Identificador del vehículo: la API Java lo entrega como idVehiculo. */
export const idDe = (vehiculo) => vehiculo?.idVehiculo ?? vehiculo?.id ?? null;

/** Un vehículo está disponible para la venta solo si su estado es DISPONIBLE. */
export const esDisponible = (vehiculo) =>
  String(vehiculo?.estado ?? '').trim().toUpperCase() === 'DISPONIBLE';

/** El catálogo para vender no incluye los vehículos vendidos (ni otro estado distinto de DISPONIBLE). */
export const soloDisponibles = (vehiculos) => vehiculos.filter(esDisponible);

// Compara sin distinguir mayúsculas ni tildes ni espacios sobrantes.
const normalizar = (texto) =>
  String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();

/** Filtra por marca: coincide si la marca contiene el texto escrito. Texto vacío = sin filtro. */
export function filtrarPorMarca(vehiculos, texto) {
  const buscado = normalizar(texto);
  if (!buscado) return vehiculos;
  return vehiculos.filter((v) => normalizar(v.marca).includes(buscado));
}

/** Marcas distintas (ordenadas) para sugerir en el campo de filtro. */
export function marcasDe(vehiculos) {
  const marcas = vehiculos.map((v) => String(v.marca ?? '').trim()).filter(Boolean);
  return [...new Set(marcas)].sort((a, b) => a.localeCompare(b, 'es'));
}
