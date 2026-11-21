# AplicacionMovilPWA — PWA móvil de ventas

PWA (HTML/CSS/JavaScript, sin dependencias) para **iniciar sesión** y **registrar ventas**. Es el único cliente que vende.

## Funciones
- Login con usuario y contraseña (`POST /oauth/token`); el JWT vive solo en memoria.
- Catálogo de vehículos disponibles, lista de vendidos y compradores para la venta.
- Registro de venta (`POST /api/ventas` con `Authorization: Bearer` e `Idempotency-Key`) con resultado 201, 200 o 202.
- Consulta del estado de una venta (`GET /api/ventas/{id}`), útil ante una respuesta incierta.
- Funciones visibles según el rol (CONSULTA solo consulta). Instalable (manifiesto, íconos y service worker).

## Requisitos
Node.js 20+ y los servicios en ejecución (NGINX 8090, API Java, FastAPI).

## Configuración (`.env`, no se sube a Git)
`OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`, `OAUTH_IDAPLI` (92), `API_BASE_URL` (por defecto `http://127.0.0.1:8090`), `PORT` (5174). El navegador solo envía usuario y contraseña; `server.mjs` agrega el cliente OAuth.

## Ejecutar
```powershell
npm run dev      # http://localhost:5174
npm test         # 22 pruebas (cliente HTTP y servidor proxy)
npm run build
```

## Notas
Si cambia el cliente OAuth de Java, actualice el `.env` y reinicie la PWA. Instalable solo en `localhost` o HTTPS.
