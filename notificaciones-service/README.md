# notificaciones-service — Servicio de notificaciones (Java Spring Boot)

Consume los eventos de venta de **RabbitMQ**, los guarda en MySQL y expone el historial para JavaFX.

## Funciones
- **Consumidor:** `EventoVentaListener` lee la cola durable `notificaciones.ventas` con confirmación manual (`ack` solo tras guardar). Un evento inválido se rechaza sin reencolar; si MySQL falla, el mensaje vuelve a la cola.
- **Sin duplicados:** el aviso se guarda con `evento_id` único (`INSERT IGNORE`).
- `GET /api/notificaciones` — historial, del más reciente al más antiguo.
- `POST /api/notificaciones` — registro directo (ruta original del taller).
- Todas las rutas exigen la cabecera `X-Notification-Key`.

## Requisitos
JDK 17+, Maven 3.9, RabbitMQ (5672) y MySQL (tabla `notificaciones` en la base `vehiculos`).

## Base de datos
Tabla `notificaciones` (`db/schema.sql`): `evento_id` único, `tipo`, `venta_id`, `vehiculo_id`, `fecha_hora_evento`, `recibido_en`, `mensaje`. El servicio también la crea al iniciar si falta.

## Configuración
`application.properties` (clave `app.notificacion-key`, igual a la de Java y FastAPI), `rabbitmq.properties` y `database.properties` (sobrescribibles con `RABBITMQ_*` y `DB_*`).

## Ejecutar
```powershell
mvn spring-boot:run        # puerto 8088
mvn test                   # 5 pruebas del consumidor
```

## Notas
- Si MySQL o RabbitMQ no están activos al iniciar, el servicio arranca igual y se reconecta.
- Por NGINX la ruta es `http://127.0.0.1:8090/api/notificaciones`.
