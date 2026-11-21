# react-fetch-vehiculos — Cliente web React + Vite

Cliente web de **consulta** (no registra ventas). Basado en el proyecto del taller de Javier Vargas y ampliado.

## Funciones
- Login con usuario y contraseña; JWT solo en memoria.
- Catálogo de vehículos **disponibles** (los vendidos no se muestran), filtro por marca y detalle completo.
- Indicadores (`GET /api/ventas/resumen`), lista de ventas paginada con filtro por estado y seguimiento por venta.
- Paneles según rol: CONSULTA solo el catálogo; OPERADOR y ADMIN también indicadores y ventas.
- Estados de carga, listado vacío, errores HTTP y de conectividad (con «Reintentar»).

## Requisitos
Node.js 20+ y los servicios en ejecución (NGINX 8090, API Java, FastAPI).

## Configuración
Copiar `.env.example` como `.env` (no se sube a Git): `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`, `API_BASE_URL` (por defecto `http://127.0.0.1:8090`). Esas variables solo las lee el servidor de Vite; no llegan al navegador.

## Proxy de Vite (`vite.config.js`)
- Todo sale hacia NGINX. `/oauth/token` agrega el cliente OAuth en el servidor.
- `/api` solo permite `GET`: cualquier otro método responde 405.

## Ejecutar
```powershell
npm ci
npm run dev        # http://localhost:5173
npm test           # 30 pruebas
npm run build
npm run lint
```

## Estructura
`src/api` (clientes HTTP), `src/utils` (reglas de catálogo, ventas y permisos), `src/componentes/Ventas.jsx`, `tests/`.
