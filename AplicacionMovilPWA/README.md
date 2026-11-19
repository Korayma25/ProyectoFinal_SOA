# AplicacionMovilPWA

PWA móvil (HTML/CSS/JavaScript, sin dependencias) para **iniciar sesión** y **registrar ventas** de vehículos. Es el único cliente del sistema con funcionalidad de venta.

## Requisitos
- Node.js 20 o superior.
- NGINX (8090), API Java de vehículos (instancias A/B) y FastAPI de ventas en ejecución.

## Configuración (variables de entorno, no se guardan en el repositorio)
| Variable | Descripción | Defecto |
|---|---|---|
| `OAUTH_CLIENT_ID` | Cliente OAuth de la API Java (obligatoria) | — |
| `OAUTH_CLIENT_SECRET` | Secreto del cliente OAuth (obligatoria) | — |
| `API_BASE_URL` | Punto de entrada REST (NGINX) | `http://127.0.0.1:8090` |
| `OAUTH_IDAPLI` | Identificador de aplicación del login | `92` |
| `PORT` | Puerto de la PWA | `5174` |

El navegador solo envía usuario y contraseña; el servidor de la PWA agrega las credenciales del cliente OAuth. El JWT se conserva solo en memoria durante la sesión.

## Ejecutar (PowerShell)
```powershell
$env:OAUTH_CLIENT_ID='<cliente>'; $env:OAUTH_CLIENT_SECRET='<secreto>'
npm run dev
```
Abrir http://localhost:5174.

## Flujo
1. Login → `POST /oauth/token` (vía NGINX).
2. Catálogo (`GET /api/vehiculos`) y compradores (`GET /api/compradores`).
3. Selección de un vehículo DISPONIBLE y un comprador → `POST /api/ventas` con `Authorization: Bearer <JWT>` e `Idempotency-Key`.
4. Resultado (201 nueva, 200 reintento, 202 pendiente) y consulta posterior `GET /api/ventas/{id}`.

Ante un resultado incierto (fallo de red, 5xx) el reintento reutiliza la misma `Idempotency-Key`, por lo que no duplica la venta.

## Pruebas y compilación
```bash
npm test        # 20 pruebas (cliente HTTP y servidor proxy)
npm run build   # publica los archivos estáticos en dist/
```
