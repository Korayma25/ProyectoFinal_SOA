import { useCallback, useEffect, useState } from 'react';
import { consultarVenta, listarVentas, obtenerResumen } from '../api/ventasApi.js';
import { ESTADOS_VENTA, POR_PAGINA, formatearFecha, formatearImporte, paginacion } from '../utils/ventas.js';

/**
 * Consulta de ventas e indicadores (solo lectura).
 * No contiene ningún formulario ni botón para registrar ventas: eso solo lo hace la PWA.
 */
export default function Ventas({ token, onSesionInvalida }) {
  const [pagina, setPagina] = useState(null); // { items, total, limit, offset }
  const [estado, setEstado] = useState('');
  const [offset, setOffset] = useState(0);
  const [resumen, setResumen] = useState(null);
  const [errorResumen, setErrorResumen] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [codigoHttp, setCodigoHttp] = useState(null);
  const [seguimiento, setSeguimiento] = useState(null);
  const [errorSeguimiento, setErrorSeguimiento] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    setCodigoHttp(null);
    setSeguimiento(null);
    setErrorSeguimiento('');
    try {
      const datos = await listarVentas(token, { estado, limit: POR_PAGINA, offset });
      setPagina(datos);
      setCodigoHttp(datos.codigoHttp);
    } catch (e) {
      if (e.status === 401) return onSesionInvalida(e.message);
      setPagina(null);
      setCodigoHttp(e.status ?? null);
      setError(e.message);
    } finally {
      setCargando(false);
    }
    // Indicadores: si el rol no tiene permiso (403) solo se informa en ese bloque.
    try {
      setErrorResumen('');
      setResumen(await obtenerResumen(token));
    } catch (e) {
      if (e.status === 401) return onSesionInvalida(e.message);
      setResumen(null);
      setErrorResumen(e.message);
    }
    return undefined;
  }, [token, estado, offset, onSesionInvalida]);

  // Se consulta al abrir la sesión y cada vez que cambian el filtro de estado o la página.
  // oxlint-disable-next-line react/set-state-in-effect -- consulta inicial: sincroniza con la API externa
  useEffect(() => {
    cargar();
  }, [cargar]);

  async function verSeguimiento(id) {
    setErrorSeguimiento('');
    try {
      const { venta } = await consultarVenta(token, id);
      setSeguimiento(venta);
    } catch (e) {
      if (e.status === 401) return onSesionInvalida(e.message);
      setSeguimiento(null);
      setErrorSeguimiento(e.message);
    }
    return undefined;
  }

  const info = pagina ? paginacion({ total: pagina.total, offset: pagina.offset, items: pagina.items.length }) : null;

  return (
    <>
      <section className="panel" aria-labelledby="titulo-indicadores">
        <h2 id="titulo-indicadores">4. Indicadores de ventas</h2>
        <p className="ayuda">Datos reales de <code>GET /api/ventas/resumen</code> (FastAPI).</p>
        {resumen ? (
          <dl className="detalle">
            <div><dt>Completadas</dt><dd>{resumen.completadas}</dd></div>
            <div><dt>Ingresos</dt><dd>{formatearImporte(resumen.ingresos)}</dd></div>
            <div><dt>Pendientes</dt><dd>{resumen.pendientes}</dd></div>
            <div><dt>En revisión</dt><dd>{resumen.enRevision}</dd></div>
            <div><dt>Fallidas</dt><dd>{resumen.fallidas}</dd></div>
          </dl>
        ) : (
          <p className={errorResumen ? 'estado estado-error' : 'ayuda'}>
            {errorResumen || 'Consultando indicadores...'}
          </p>
        )}
      </section>

      <section className="panel" aria-labelledby="titulo-ventas">
        <div className="titulo-listado">
          <div>
            <h2 id="titulo-ventas">5. Ventas registradas</h2>
            <p className="ayuda">
              Consulta y seguimiento (<code>GET /api/ventas</code>). Este cliente no registra ventas.
            </p>
          </div>
          <span className="contador">
            {cargando ? 'Consultando...' : pagina ? `${pagina.total} ventas` : '—'}
          </span>
        </div>

        <div className="estado-filtro">
          <label htmlFor="filtroEstado">Estado</label>
          <select
            id="filtroEstado"
            value={estado}
            disabled={cargando}
            onChange={(e) => {
              setOffset(0);
              setEstado(e.target.value);
            }}
          >
            <option value="">Todos</option>
            {ESTADOS_VENTA.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
          <button className="secundario" type="button" disabled={cargando} onClick={cargar}>
            Actualizar
          </button>
        </div>

        <div className={error ? 'estado estado-error' : 'estado estado-ok'} role="status" aria-live="polite">
          <span>
            {error
              || (cargando ? 'Consultando ventas...' : `Consulta correcta: mostrando ${info?.desde ?? 0}–${info?.hasta ?? 0} de ${pagina?.total ?? 0}.`)}
          </span>
          {codigoHttp !== null && <strong>HTTP {codigoHttp}</strong>}
        </div>

        <div className="tabla-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Venta</th>
                <th scope="col">Vehículo</th>
                <th scope="col">Comprador</th>
                <th scope="col">Precio</th>
                <th scope="col">Estado</th>
                <th scope="col">Notificación</th>
                <th scope="col">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {(pagina?.items ?? []).map((v) => (
                <tr key={v.id} className={seguimiento?.id === v.id ? 'fila-activa' : undefined}>
                  <td>
                    <button className="enlace-id" type="button" onClick={() => verSeguimiento(v.id)}
                      aria-label={`Ver seguimiento de la venta ${v.id}`}>
                      {v.id}
                    </button>
                  </td>
                  <td>{v.vehiculoId}</td>
                  <td>{v.compradorId}</td>
                  <td>{formatearImporte(v.precioAcordado, v.moneda)}</td>
                  <td>{v.estado}</td>
                  <td>{v.notificacion}</td>
                  <td>{formatearFecha(v.fechaUTC)}</td>
                </tr>
              ))}
              {(pagina?.items ?? []).length === 0 && (
                <tr>
                  <td className="sin-datos" colSpan="7">
                    {cargando
                      ? 'Cargando ventas...'
                      : error
                        ? 'No hay datos de ventas para mostrar.'
                        : estado
                          ? `No hay ventas en estado ${estado}.`
                          : 'Aún no hay ventas registradas.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {info && pagina.total > POR_PAGINA && (
          <div className="acciones">
            <button className="secundario" type="button" disabled={cargando || !info.hayAnterior}
              onClick={() => setOffset(Math.max(0, offset - POR_PAGINA))}>
              Anterior
            </button>
            <button className="secundario" type="button" disabled={cargando || !info.haySiguiente}
              onClick={() => setOffset(offset + POR_PAGINA)}>
              Siguiente
            </button>
          </div>
        )}

        {errorSeguimiento && <p className="estado estado-error">{errorSeguimiento}</p>}
        {seguimiento && (
          <>
            <h3>Seguimiento de la venta {seguimiento.id}</h3>
            <dl className="detalle">
              <div><dt>Operación</dt><dd>{seguimiento.operacionId}</dd></div>
              <div><dt>Estado</dt><dd>{seguimiento.estado}</dd></div>
              <div><dt>Vehículo</dt><dd>{seguimiento.vehiculoId}</dd></div>
              <div><dt>Comprador</dt><dd>{seguimiento.compradorId}</dd></div>
              <div><dt>Precio acordado</dt><dd>{formatearImporte(seguimiento.precioAcordado, seguimiento.moneda)}</dd></div>
              <div><dt>Notificación</dt><dd>{seguimiento.notificacion}</dd></div>
              <div><dt>Fecha</dt><dd>{formatearFecha(seguimiento.fechaUTC)}</dd></div>
            </dl>
            <div className="acciones">
              <button className="secundario" type="button" onClick={() => setSeguimiento(null)}>
                Cerrar seguimiento
              </button>
            </div>
          </>
        )}
      </section>
    </>
  );
}
