/**
 * Paneles que muestra la interfaz según el rol del JWT. Es solo presentación:
 * la autorización real la sigue aplicando el backend (HTTP 403).
 *  - CONSULTA: catálogo de vehículos (ventas e indicadores responden 403).
 *  - OPERADOR y ADMIN: además indicadores y consulta de ventas.
 * Un rol desconocido recibe solo el catálogo.
 */
const PERMISOS = {
  CONSULTA: { catalogo: true, indicadores: false, ventas: false },
  OPERADOR: { catalogo: true, indicadores: true, ventas: true },
  ADMIN: { catalogo: true, indicadores: true, ventas: true },
};

export function permisosDelRol(rol) {
  return PERMISOS[String(rol ?? '').toUpperCase()] ?? PERMISOS.CONSULTA;
}

export function funcionesDelRol(rol) {
  const p = permisosDelRol(rol);
  return [
    'Consultar vehículos disponibles',
    ...(p.indicadores ? ['Ver indicadores de ventas'] : []),
    ...(p.ventas ? ['Consultar ventas'] : []),
  ];
}
