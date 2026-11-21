# ventas-api-py-1 — API de compradores y ventas (Python FastAPI)

Servicio de **compradores y ventas** con validación local del JWT, idempotencia y publicación de eventos en RabbitMQ.

## Endpoints
| Método y ruta | Rol |
|---|---|
| `POST /api/compradores`, `GET /api/compradores` | OPERADOR, ADMIN |
| `GET/PUT /api/compradores/{id}` | Propietario o ADMIN |
| `POST /api/ventas` (cabecera `Idempotency-Key`) | OPERADOR, ADMIN |
| `GET /api/ventas`, `/api/ventas/{id}`, `/api/ventas/resumen`, `/api/ventas/{id}/comprobante` | Autenticado (ADMIN ve todo; los demás, lo propio) |
| `GET /health` | Público |

- **JWT:** `app/security.py` valida firma (HS256/384/512), expiración, tipo `access` y rol (401/403).
- **Idempotencia:** misma clave y cuerpo → no duplica (200); misma clave con otro cuerpo → 409.
- **Eventos:** `app/clients/publicador_eventos.py` publica `VENTA_COMPLETADA` en la cola durable `notificaciones.ventas` solo para ventas COMPLETADAS. Si RabbitMQ no confirma, la notificación queda `PENDIENTE` y el worker la reintenta.
- Para reservar y confirmar vehículos llama a la API Java con la credencial de integración.

## Requisitos
Python 3.11+, MySQL (base `vehiculos`), API Java en ejecución y RabbitMQ.

## Configuración (`.env`, plantilla `.env.example`)
`DB_*`, `JAVA_URL`, `NOTIFICACIONES_URL`, `JWT_SECRET` (igual a la clave de Java), `VENTAS_SERVICE_KEY`, `NOTIFICACIONES_KEY`, `RABBITMQ_HOST/PORT/USER/PASSWORD/COLA_VENTAS`. El `.env` no se sube a Git.

## Ejecutar
```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt -r requirements-dev.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8000
.\.venv\Scripts\python.exe -m app.worker          # opcional: reintenta notificaciones PENDIENTES (--once para una pasada)
```

## Pruebas
```powershell
.\.venv\Scripts\python.exe -m pytest -q
```
Cubren validación del JWT, alcance de listados, publicador y reglas de notificación.
