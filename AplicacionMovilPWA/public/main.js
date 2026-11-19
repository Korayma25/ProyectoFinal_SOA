import {
  iniciarSesion, listarVehiculos, listarCompradores, registrarVenta, consultarVenta,
  nuevaClaveIdempotencia, rolDeJwt, funcionesDelRol,
} from './api.js';

// ---- Referencias a la interfaz ----
const $ = (selector) => document.querySelector(selector);
const panelLogin = $('#panel-login');
const zonaVenta = $('#zona-venta');
const formLogin = $('#form-login');
const campoUsuario = $('#usuario');
const campoClave = $('#clave');
const botonClave = $('#alternarClave');
const botonEntrar = $('#entrar');
const mensajeLogin = $('#mensaje-login');
const botonSalir = $('#salir');
const contenedor = $('#vehiculos');
const contador = $('#contador');
const selectComprador = $('#comprador');
const seleccion = $('#seleccion');
const formVenta = $('#form-venta');
const botonVender = $('#vender');
const mensajeVenta = $('#mensaje-venta');
const resultado = $('#resultado');
const formConsulta = $('#form-consulta');
const campoVentaId = $('#venta-id');
const mensajeConsulta = $('#mensaje-consulta');
const conexion = $('#conexion');
const contenedorVendidos = $('#vehiculos-vendidos');
const contadorVendidos = $('#contador-vendidos');
const panelVenta = $('#panel-venta');
const panelConsulta = $('#panel-consulta');
const etiquetaRol = $('#rol-sesion');
const textoFunciones = $('#funciones-rol');

// Funciones habilitadas según el rol de la sesión (solo presentación; el backend es quien autoriza).
let permisos = funcionesDelRol('').permisos;
let rolActual = '';

function aplicarRol(jwt) {
  rolActual = rolDeJwt(jwt);
  const { permisos: p, etiquetas } = funcionesDelRol(rolActual);
  permisos = p;
  panelVenta.hidden = !p.has('registrarVenta');
  panelConsulta.hidden = !p.has('consultarVenta');
  etiquetaRol.textContent = `Rol: ${rolActual || 'DESCONOCIDO'}`;
  etiquetaRol.hidden = false;
  textoFunciones.textContent = `Funciones habilitadas: ${etiquetas.join(' · ')}.`;
  textoFunciones.hidden = false;
}

const moneda = new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' });

// ---- Estado de la sesión: el JWT vive solo en memoria ----
let token = '';
let temporizadorSesion = null;
let vehiculoElegido = null;            // vehículo seleccionado para la venta
let claveVenta = null;                 // { firma, clave }: se reutiliza solo ante un resultado incierto
let ultimaVentaId = null;

function mostrar(elemento, texto, tipo = 'neutro') {
  elemento.textContent = texto;
  elemento.className = `mensaje ${tipo}`;
}

function crear(etiqueta, clase, contenido) {
  const elemento = document.createElement(etiqueta);
  if (clase) elemento.className = clase;
  // textContent impide interpretar HTML que pudiera venir de la API.
  if (contenido !== undefined) elemento.textContent = String(contenido);
  return elemento;
}

const texto = (v) => (v === null || v === undefined || v === '' ? '—' : String(v));

function precio(valor) {
  if (valor === null || valor === undefined || valor === '') return '—';
  const numero = Number(valor);
  return Number.isFinite(numero) ? moneda.format(numero) : texto(valor);
}

// ---- Sesión ----
function abrirSesion(jwt, expiraEn) {
  token = jwt;
  aplicarRol(jwt);
  panelLogin.hidden = true;
  zonaVenta.hidden = false;
  clearTimeout(temporizadorSesion);
  if (expiraEn) temporizadorSesion = setTimeout(() => cerrarSesion('La sesión venció. Inicie sesión de nuevo.'), expiraEn * 1000);
}

function cerrarSesion(aviso = 'Sesión cerrada.') {
  token = '';
  clearTimeout(temporizadorSesion);
  vehiculoElegido = null;
  claveVenta = null;
  ultimaVentaId = null;
  campoClave.value = '';
  campoClave.type = 'password';
  zonaVenta.hidden = true;
  panelLogin.hidden = false;
  contenedor.replaceChildren();
  contenedorVendidos.replaceChildren();
  etiquetaRol.hidden = true;
  textoFunciones.hidden = true;
  selectComprador.replaceChildren();
  resultado.hidden = true;
  mostrar(mensajeVenta, 'Aún no se ha registrado ninguna venta.');
  mostrar(mensajeLogin, aviso, 'neutro');
}

// Un 401 en cualquier operación devuelve al inicio de sesión.
function manejarError(error, elemento) {
  if (error.codigoHttp === 401) { cerrarSesion(error.message); return; }
  mostrar(elemento, error.message, 'error');
}

// ---- Catálogo ----
function pintarVehiculos(todos) {
  // El catálogo solo muestra los disponibles; los vendidos van en el apartado 05.
  const vehiculos = todos.filter((v) => String(v.estado).toUpperCase() === 'DISPONIBLE');
  contenedor.replaceChildren();
  contador.textContent = `${vehiculos.length} vehículo${vehiculos.length === 1 ? '' : 's'}`;
  if (vehiculos.length === 0) {
    contenedor.append(crear('p', 'vacio', 'No hay vehículos disponibles.'));
    return;
  }
  for (const v of vehiculos) {
    const id = v.idVehiculo ?? v.id;
    const estado = texto(v.estado);
    const disponible = estado.toUpperCase() === 'DISPONIBLE';
    const tarjeta = crear('article', `vehiculo${vehiculoElegido === id ? ' elegido' : ''}`);

    const cabecera = crear('div', 'vehiculo-cabecera');
    const titulo = crear('div');
    titulo.append(crear('h3', 'vehiculo-titulo', `${texto(v.marca)} ${texto(v.modelo)}`), crear('span', 'vehiculo-id', `ID: ${texto(id)}`));
    const claseEstado = disponible ? 'disponible' : estado.toUpperCase() === 'VENDIDO' ? 'vendido' : '';
    cabecera.append(titulo, crear('span', `estado ${claseEstado}`, estado));

    const grilla = crear('div', 'datos');
    for (const [etiqueta, valor, extra] of [
      ['Placa', texto(v.placa)], ['Año', texto(v.anio)], ['Color', texto(v.color)], ['Precio', precio(v.precio), 'dato-precio'],
    ]) {
      const grupo = crear('div', extra || '');
      grupo.append(crear('span', 'dato-etiqueta', etiqueta), crear('span', 'dato-valor', valor));
      grilla.append(grupo);
    }
    tarjeta.append(cabecera, grilla);

    if (disponible && permisos.has('registrarVenta')) {
      const boton = crear('button', 'boton-secundario seleccionar', vehiculoElegido === id ? 'Seleccionado' : 'Seleccionar para venta');
      boton.type = 'button';
      boton.addEventListener('click', () => elegirVehiculo(v));
      tarjeta.append(boton);
    }
    contenedor.append(tarjeta);
  }
}

let vehiculosCargados = [];

// ---- Vehículos vendidos (apartado 05): subconjunto del catálogo con estado VENDIDO ----
function pintarVendidos(vehiculos) {
  const vendidos = vehiculos.filter((v) => String(v.estado).toUpperCase() === 'VENDIDO');
  contenedorVendidos.replaceChildren();
  contadorVendidos.textContent = `${vendidos.length} vehículo${vendidos.length === 1 ? '' : 's'}`;
  if (vendidos.length === 0) {
    contenedorVendidos.append(crear('p', 'vacio', 'Aún no hay vehículos vendidos.'));
    return;
  }
  for (const v of vendidos) {
    const id = v.idVehiculo ?? v.id;
    const tarjeta = crear('article', 'vehiculo');
    const cabecera = crear('div', 'vehiculo-cabecera');
    const titulo = crear('div');
    titulo.append(crear('h3', 'vehiculo-titulo', `${texto(v.marca)} ${texto(v.modelo)}`), crear('span', 'vehiculo-id', `ID: ${texto(id)}`));
    cabecera.append(titulo, crear('span', 'estado vendido', 'VENDIDO'));
    const grilla = crear('div', 'datos');
    for (const [etiqueta, valor, extra] of [
      ['Placa', texto(v.placa)], ['Año', texto(v.anio)], ['Color', texto(v.color)], ['Precio', precio(v.precio), 'dato-precio'],
    ]) {
      const grupo = crear('div', extra || '');
      grupo.append(crear('span', 'dato-etiqueta', etiqueta), crear('span', 'dato-valor', valor));
      grilla.append(grupo);
    }
    tarjeta.append(cabecera, grilla);
    contenedorVendidos.append(tarjeta);
  }
}

function elegirVehiculo(v) {
  vehiculoElegido = v.idVehiculo ?? v.id;
  seleccion.textContent = `Vehículo seleccionado: ${texto(v.marca)} ${texto(v.modelo)} (ID ${vehiculoElegido}) · ${precio(v.precio)}`;
  pintarVehiculos(vehiculosCargados);
  actualizarBotonVenta();
}

function actualizarBotonVenta() {
  botonVender.disabled = !(vehiculoElegido && selectComprador.value);
}

async function cargarCatalogo() {
  contenedor.replaceChildren(crear('div', 'vacio', 'Cargando vehículos…'));
  try {
    const { vehiculos } = await listarVehiculos(token);
    vehiculosCargados = vehiculos;
    // Si el vehículo elegido ya no está disponible, se limpia la selección.
    const sigueDisponible = vehiculos.some((v) => (v.idVehiculo ?? v.id) === vehiculoElegido
      && String(v.estado).toUpperCase() === 'DISPONIBLE');
    if (!sigueDisponible) { vehiculoElegido = null; seleccion.textContent = 'Seleccione un vehículo disponible del catálogo.'; }
    pintarVehiculos(vehiculos);
    pintarVendidos(vehiculos);
  } catch (error) {
    contenedor.replaceChildren(crear('p', 'vacio', 'No hay datos de vehículos disponibles.'));
    contador.textContent = '0 vehículos';
    manejarError(error, mensajeVenta);
  }
  actualizarBotonVenta();
}

async function cargarCompradores() {
  try {
    const { compradores } = await listarCompradores(token);
    selectComprador.replaceChildren();
    if (compradores.length === 0) {
      selectComprador.append(new Option('No hay compradores registrados', ''));
    } else {
      selectComprador.append(new Option('Seleccione un comprador…', ''));
      for (const c of compradores) selectComprador.append(new Option(`${c.nombre} · ${c.documento}`, String(c.id)));
    }
  } catch (error) {
    selectComprador.replaceChildren(new Option('No se pudieron cargar los compradores', ''));
    manejarError(error, mensajeVenta);
  }
  actualizarBotonVenta();
}

// ---- Resultado de la venta ----
function pintarResultado(venta, codigoHttp) {
  resultado.replaceChildren();
  const filas = [
    ['HTTP', codigoHttp], ['Venta', venta.id], ['Estado', venta.estado], ['Vehículo', venta.vehiculoId],
    ['Comprador', venta.compradorId],
    ['Precio acordado', venta.precioAcordado ? `${precio(venta.precioAcordado)} ${texto(venta.moneda)}` : '—'],
    ['Notificación', texto(venta.notificacion)], ['Fecha (UTC)', texto(venta.fechaUTC)],
  ];
  for (const [etiqueta, valor] of filas) {
    const grupo = crear('div', 'resultado-fila');
    grupo.append(crear('dt', '', etiqueta), crear('dd', '', texto(valor)));
    resultado.append(grupo);
  }
  resultado.hidden = false;
}

const MENSAJE_EXITO = {
  201: 'Venta registrada correctamente.',
  200: 'La solicitud ya se había procesado: se devuelve la misma venta, sin duplicarla.',
  202: 'La venta quedó pendiente de confirmación. Consulte su estado en unos segundos.',
};

formVenta.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  if (!vehiculoElegido || !selectComprador.value) return;
  const firma = `${vehiculoElegido}:${selectComprador.value}`;
  // Se conserva la misma clave solo si el intento anterior con esta selección quedó incierto.
  if (!claveVenta || claveVenta.firma !== firma) claveVenta = { firma, clave: nuevaClaveIdempotencia() };

  botonVender.disabled = true;
  mostrar(mensajeVenta, 'Registrando venta…');
  try {
    const { codigoHttp, venta } = await registrarVenta(token, vehiculoElegido, selectComprador.value, claveVenta.clave);
    ultimaVentaId = venta.id;
    campoVentaId.value = venta.id;
    pintarResultado(venta, codigoHttp);
    const definitivo = codigoHttp !== 202;
    mostrar(mensajeVenta, `HTTP ${codigoHttp}: ${MENSAJE_EXITO[codigoHttp]}`, codigoHttp === 202 ? 'neutro' : 'exito');
    if (definitivo) { claveVenta = null; vehiculoElegido = null; seleccion.textContent = 'Seleccione un vehículo disponible del catálogo.'; }
    await cargarCatalogo();
  } catch (error) {
    resultado.hidden = true;
    if (error.incierto) {
      // No se sabe si el servidor procesó la venta: el reintento usa la misma clave y no la duplica.
      mostrar(mensajeVenta, `${error.message} El resultado es incierto: puede reintentar (se usa la misma clave de idempotencia) o consultar la venta.`, 'error');
    } else {
      claveVenta = null;
      manejarError(error, mensajeVenta);
    }
  } finally {
    actualizarBotonVenta();
  }
});

selectComprador.addEventListener('change', actualizarBotonVenta);

// ---- Consulta de estado ----
formConsulta.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  mostrar(mensajeConsulta, 'Consultando venta…');
  try {
    const { codigoHttp, venta } = await consultarVenta(token, campoVentaId.value);
    pintarResultado(venta, codigoHttp);
    mostrar(mensajeConsulta, `HTTP ${codigoHttp}: venta ${venta.id} en estado ${venta.estado}.`, 'exito');
  } catch (error) {
    manejarError(error, mensajeConsulta);
  }
});

// ---- Login ----
formLogin.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const usuario = campoUsuario.value.trim();
  if (!usuario || !campoClave.value) { mostrar(mensajeLogin, 'Usuario y contraseña son obligatorios.', 'error'); return; }
  botonEntrar.disabled = true;
  mostrar(mensajeLogin, 'Autenticando…');
  try {
    const sesion = await iniciarSesion(usuario, campoClave.value);
    campoClave.value = '';              // la contraseña no se conserva
    mostrar(mensajeLogin, `HTTP ${sesion.codigoHttp}: sesión iniciada.`, 'exito');
    abrirSesion(sesion.token, sesion.expiraEn);
    // Los compradores solo los pueden listar quienes registran ventas (CONSULTA recibiría 403).
    await Promise.all([cargarCatalogo(), permisos.has('registrarVenta') ? cargarCompradores() : null]);
  } catch (error) {
    mostrar(mensajeLogin, error.message, 'error');
  } finally {
    botonEntrar.disabled = false;
  }
});

botonClave.addEventListener('click', () => {
  const revelar = campoClave.type === 'password';
  campoClave.type = revelar ? 'text' : 'password';
  botonClave.textContent = revelar ? 'Ocultar' : 'Mostrar';
  botonClave.setAttribute('aria-pressed', String(revelar));
  botonClave.setAttribute('aria-label', revelar ? 'Ocultar contraseña' : 'Mostrar contraseña');
});

botonSalir.addEventListener('click', () => cerrarSesion('Sesión cerrada.'));

function actualizarConexion() {
  conexion.textContent = navigator.onLine ? 'Navegador conectado' : 'Sin conexión de red';
}
window.addEventListener('online', actualizarConexion);
window.addEventListener('offline', actualizarConexion);
actualizarConexion();

// El Service Worker conserva únicamente recursos visuales, nunca el JWT ni /api ni /oauth.
if ('serviceWorker' in navigator && window.isSecureContext) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // La operación REST sigue funcionando aunque no se instale el modo PWA.
    });
  });
}
