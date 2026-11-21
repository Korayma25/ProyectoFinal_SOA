# venta-vehiculos-api_security — API de vehículos (Java Spring Boot)

API REST de vehículos con autenticación **OAuth/JWT**. Se ejecuta en dos instancias idénticas (A y B) detrás de NGINX.

## Funciones
- `POST /oauth/token` — login (`grant_type=password`): cliente OAuth por Basic + usuario y contraseña. Devuelve `access_token`, `refresh_token` y `expires_in` (1800 s).
- `GET /api/vehiculos` (filtros marca y estado), `GET /api/vehiculos/{id}`, `POST`, `PUT`, `PATCH` y `DELETE` según rol.
- `GET /api/identidad` — usuario y roles del JWT.
- Reservas de vehículo (`/api/reservas`), de uso interno de FastAPI con la credencial `SERVICIO_VENTAS`.
- `GET /actuator/health` — salud para NGINX y el monitor.

Roles: `CONSULTA` (solo lectura), `OPERADOR` y `ADMIN` (escritura; `DELETE` solo ADMIN).

## Requisitos
JDK 17+, Maven 3.9, MySQL/MariaDB con la base `vehiculos` (tablas `vehiculos`, `usuarios_api`, `reservas`).

## Configuración
`src/main/resources/application.properties` (o `secrets.local.properties` / variables de entorno). Sin valores en este README:

| Propiedad | Uso |
|---|---|
| `spring.datasource.*` | Conexión a MySQL (`DB_USER`, `DB_PASSWORD`) |
| `app.security.jwt-secret` | Clave de firma del JWT; debe ser igual a `JWT_SECRET` de FastAPI |
| `app.security.client-id` / `client-secret` | Cliente OAuth (igual en PWA, React y Windows Forms) |
| `app.security.ventas-key` | Clave de integración con FastAPI (`VENTAS_SERVICE_KEY`) |
| `servicios.notificaciones.key` | Clave del servicio de notificaciones |

## Ejecutar
```powershell
mvn spring-boot:run                                  # instancia A, puerto 8086
$env:SERVER_PORT='8087'; mvn spring-boot:run         # instancia B (iniciarla cuando A ya esté lista)
```
Comprobar: `http://127.0.0.1:8086/actuator/health` → `{"status":"UP"}`.

## Notas
- Ambas instancias comparten la misma clave y base de datos, por lo que un JWT es válido en las dos.
- No arrancar A y B a la vez desde el mismo proyecto (Maven falla al compilar simultáneamente).
