-- Tabla del servicio de notificaciones (Actividad 9), dentro de la base existente «vehiculos».
-- El servicio SOLO usa esta tabla: no accede a las tablas de vehículos, compradores ni ventas.
-- Ejecutar una vez (el servicio también crea la tabla si falta).
USE vehiculos;

CREATE TABLE IF NOT EXISTS notificaciones (
  id                 BIGINT       NOT NULL AUTO_INCREMENT,
  evento_id          VARCHAR(64)  NOT NULL,           -- eventoId publicado por FastAPI
  tipo               VARCHAR(40)  NOT NULL,           -- p. ej. VENTA_COMPLETADA
  venta_id           BIGINT       NOT NULL,
  vehiculo_id        BIGINT       NOT NULL,
  fecha_hora_evento  VARCHAR(40)  NULL,               -- fecha del evento (ISO-8601 UTC)
  recibido_en        DATETIME(6)  NOT NULL,           -- cuándo lo registró este servicio (UTC)
  mensaje            VARCHAR(255) NOT NULL,
  PRIMARY KEY (id),
  -- Un mismo evento no puede registrarse dos veces, aunque RabbitMQ lo reentregue.
  UNIQUE KEY uq_notificaciones_evento (evento_id),
  KEY ix_notificaciones_recibido (recibido_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
