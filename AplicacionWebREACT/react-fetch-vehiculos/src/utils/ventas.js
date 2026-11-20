/** Reglas de presentación de las ventas (funciones puras, probadas de forma automática). */

export const POR_PAGINA = 10;

// Estados que acepta GET /api/ventas?estado=
export const ESTADOS_VENTA = ['COMPLETADA', 'PENDIENTE', 'EN_REVISION', 'FALLIDA'];

const dinero = new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' });

/** Importe tal como llega de la API (texto o número); '—' si no existe (venta fallida). */
export function formatearImporte(valor, moneda = 'USD') {
  if (valor === null || valor === undefined || valor === '') return '—';
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return String(valor);
  return moneda && moneda !== 'USD' ? `${numero.toFixed(2)} ${moneda}` : dinero.format(numero);
}

/** Fecha UTC ISO-8601 → fecha y hora local; '—' si es nula o inválida (p. ej. 0000-00-00). */
export function formatearFecha(iso) {
  if (!iso) return '—';
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime())
    ? '—'
    : fecha.toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' });
}

/** Datos de paginación para mostrar «11–20 de 35» y habilitar Anterior/Siguiente. */
export function paginacion({ total, offset, items }) {
  const desde = total === 0 ? 0 : offset + 1;
  const hasta = offset + items;
  return {
    desde,
    hasta,
    hayAnterior: offset > 0,
    haySiguiente: hasta < total,
  };
}
