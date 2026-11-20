import { useEffect, useState } from 'react';
import { listarVehiculos } from './api/vehiculosApi.js';
import { iniciarSesion, rolDeJwt } from './api/autenticacionApi.js';
import './App.css';

// Ecuador usa dólares estadounidenses. No modifica el precio de la API.
const dinero = new Intl.NumberFormat('es-EC', {
  style: 'currency',
  currency: 'USD',
});

// Apoyo visual: el precio se muestra tal como llega, formateado en USD.
function mostrarPrecio(precio) {
  if (precio === null || precio === undefined || precio === '') return '—';
  const numero = Number(precio);
  return Number.isFinite(numero) ? dinero.format(numero) : String(precio);
}

export default function App() {
  // useState guarda datos de la pantalla. Cuando cambian, React la actualiza.
  // La sesión (JWT, usuario y rol) vive solo en memoria: no se usa localStorage ni cookies.
  const [sesion, setSesion] = useState(null);
  const [usuario, setUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [mostrarClave, setMostrarClave] = useState(false);
  const [accediendo, setAccediendo] = useState(false);
  const [vehiculos, setVehiculos] = useState([]);
  const [marca, setMarca] = useState('');
  const [seleccionado, setSeleccionado] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('Ingrese sus credenciales.');
  const [error, setError] = useState('');
  const [codigoHttp, setCodigoHttp] = useState(null);

  // El filtro se aplica a los vehículos ya recibidos; no consulta MySQL.
  const visibles = vehiculos.filter((v) =>
    String(v.marca ?? '').toLowerCase().includes(marca.trim().toLowerCase()),
  );

  // Cierra la sesión: borra el JWT y todos los datos mostrados.
  function cerrarSesion(aviso = 'Sesión cerrada.', conError = false) {
    setSesion(null);
    setClave('');
    setMostrarClave(false);
    setVehiculos([]);
    setSeleccionado(null);
    setMarca('');
    setCodigoHttp(null);
    setError(conError ? aviso : '');
    setMensaje(conError ? 'Inicie sesión de nuevo.' : aviso);
  }

  // Cuando el JWT vence (expires_in), la sesión se cierra automáticamente.
  useEffect(() => {
    if (!sesion?.expiraEn) return undefined;
    const temporizador = setTimeout(
      () => cerrarSesion('La sesión venció. Inicie sesión de nuevo.', true),
      sesion.expiraEn * 1000,
    );
    return () => clearTimeout(temporizador);
  }, [sesion]);

  // Evento ejecutado al enviar el formulario de acceso.
  async function acceder(evento) {
    evento.preventDefault(); // Evita que el navegador recargue la página.
    const nombre = usuario.trim();
    if (!nombre || !clave) {
      setError('Usuario y contraseña son obligatorios.');
      return;
    }
    setAccediendo(true);
    setError('');
    setCodigoHttp(null);
    setMensaje('Autenticando...');
    try {
      const acceso = await iniciarSesion(nombre, clave);
      setClave(''); // La contraseña no se conserva.
      setSesion({
        token: acceso.token,
        usuario: nombre,
        rol: rolDeJwt(acceso.token),
        expiraEn: acceso.expiraEn,
      });
      setCodigoHttp(acceso.codigoHttp);
      setMensaje('Sesión iniciada.');
      await consultarVehiculos(acceso.token);
    } catch (e) {
      setClave('');
      setCodigoHttp(e.status ?? null);
      setError(e.message);
      setMensaje('No se pudo iniciar sesión.');
    } finally {
      setAccediendo(false);
    }
  }

  // Consulta GET /api/vehiculos con el JWT de la sesión.
  async function consultarVehiculos(token) {
    setCargando(true);
    setError('');
    setMensaje('Consultando la API de vehículos...');
    setCodigoHttp(null);
    setVehiculos([]); // Evita confundir una consulta fallida con datos antiguos.
    setSeleccionado(null);

    try {
      // La conexión HTTP se realiza en otro archivo, no en la interfaz.
      const resultado = await listarVehiculos(token);
      setVehiculos(resultado.vehiculos);
      setCodigoHttp(resultado.codigoHttp);
      setMensaje(`Consulta correcta: ${resultado.vehiculos.length} vehículos.`);
    } catch (e) {
      if (e.status === 401) {
        // JWT vencido o inválido: se vuelve al login.
        cerrarSesion(e.message, true);
        return;
      }
      // Errores 403 y de red quedan visibles para el usuario.
      setCodigoHttp(e.status ?? null);
      setError(e.message);
      setMensaje('La consulta no pudo completarse.');
    } finally {
      // Se ejecuta tanto cuando fetch tiene éxito como cuando falla.
      setCargando(false);
    }
  }

  return (
    <main className="contenedor">
      <header className="cabecera">
        <div className="marca-producto">PRÁCTICA WEB · REACT + FETCH</div>
        <h1>Consulta de vehículos</h1>
        <p>Cliente web de la API REST existente en Java Spring Boot.</p>
      </header>

      <section className="panel" aria-labelledby="titulo-acceso">
        <h2 id="titulo-acceso">1. Acceso</h2>
        <p className="ayuda">
          El JWT se obtiene con su usuario y contraseña (<code>POST /oauth/token</code>) mediante el
          proxy local hacia NGINX (<code>127.0.0.1:8090</code>) y solo se conserva durante la sesión.
        </p>

        {sesion ? (
          <div className="sesion">
            <span className="etiqueta etiqueta-ok">Sesión activa</span>
            <span className="etiqueta">Usuario: {sesion.usuario}</span>
            <span className="etiqueta">Rol: {sesion.rol || 'DESCONOCIDO'}</span>
            <div className="acciones">
              <button type="button" disabled={cargando} onClick={() => consultarVehiculos(sesion.token)}>
                {cargando ? 'Consultando...' : 'Consultar vehículos'}
              </button>
              <button
                className="secundario"
                type="button"
                disabled={cargando}
                onClick={() => cerrarSesion()}
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={acceder}>
            <label htmlFor="usuario">Usuario</label>
            <input
              id="usuario"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck="false"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
            />

            <label htmlFor="clave">Contraseña</label>
            <div className="linea-token">
              <input
                id="clave"
                type={mostrarClave ? 'text' : 'password'}
                autoComplete="current-password"
                value={clave}
                onChange={(e) => setClave(e.target.value)}
              />
              <button
                className="secundario"
                type="button"
                onClick={() => setMostrarClave((actual) => !actual)}
                aria-label={mostrarClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {mostrarClave ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>

            <div className="acciones">
              <button type="submit" disabled={accediendo}>
                {accediendo ? 'Autenticando...' : 'Iniciar sesión'}
              </button>
            </div>
          </form>
        )}

        <div className={error ? 'estado estado-error' : 'estado estado-ok'} role="status" aria-live="polite">
          <span>{error || mensaje}</span>
          {codigoHttp !== null && <strong>HTTP {codigoHttp}</strong>}
        </div>
        <p className="nota">El JWT permanece en memoria: no se guarda en localStorage ni en archivos.</p>
      </section>

      {sesion && (
        <>
      <section className="panel" aria-labelledby="titulo-listado">
        <div className="titulo-listado">
          <div>
            <h2 id="titulo-listado">2. Catálogo de vehículos</h2>
            <p className="ayuda">Datos recibidos del backend; filtro ejecutado en el navegador.</p>
          </div>
          <span className="contador">{visibles.length} visibles</span>
        </div>

        <label htmlFor="filtroMarca">Filtrar por marca</label>
        <input
          id="filtroMarca"
          type="search"
          placeholder="Ejemplo: Toyota"
          value={marca}
          onChange={(e) => setMarca(e.target.value)}
          disabled={cargando}
        />

        <div className="tabla-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Marca</th>
                <th scope="col">Modelo</th>
                <th scope="col">Precio</th>
                <th scope="col">Estado</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((v, indice) => (
                <tr key={v.idVehiculo ?? v.id ?? indice}>
                  <td>
                    <button
                      className="enlace-id"
                      type="button"
                      onClick={() => setSeleccionado(v)}
                      aria-label={`Ver detalle del vehículo ${v.idVehiculo ?? v.id ?? ''}`}
                    >
                      {v.idVehiculo ?? v.id ?? '—'}
                    </button>
                  </td>
                  <td>{v.marca ?? '—'}</td>
                  <td>{v.modelo ?? '—'}</td>
                  <td>{mostrarPrecio(v.precio)}</td>
                  <td>{v.estado ?? '—'}</td>
                </tr>
              ))}
              {visibles.length === 0 && (
                <tr>
                  <td className="sin-datos" colSpan="5">
                    {cargando
                      ? 'Cargando vehículos...'
                      : vehiculos.length === 0
                        ? 'Aún no hay vehículos para mostrar. Presione Consultar vehículos.'
                        : 'No hay vehículos que coincidan con la marca.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel" aria-labelledby="titulo-detalle">
        <h2 id="titulo-detalle">3. Detalle del vehículo</h2>
        {seleccionado ? (
          <dl className="detalle">
            <div><dt>ID</dt><dd>{seleccionado.idVehiculo ?? seleccionado.id ?? '—'}</dd></div>
            <div><dt>Marca</dt><dd>{seleccionado.marca ?? '—'}</dd></div>
            <div><dt>Modelo</dt><dd>{seleccionado.modelo ?? '—'}</dd></div>
            <div><dt>Precio</dt><dd>{mostrarPrecio(seleccionado.precio)}</dd></div>
            <div><dt>Estado</dt><dd>{seleccionado.estado ?? '—'}</dd></div>
          </dl>
        ) : (
          <p className="ayuda">Después de consultar, seleccione el ID de una fila para ver sus datos.</p>
        )}
      </section>
        </>
      )}
    </main>
  );
}
