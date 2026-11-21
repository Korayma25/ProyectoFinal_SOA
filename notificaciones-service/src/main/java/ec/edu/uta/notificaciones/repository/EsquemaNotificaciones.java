package ec.edu.uta.notificaciones.repository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Al iniciar, crea la tabla notificaciones (en la base vehiculos) si falta; ver también db/schema.sql.
 * Si MySQL no está disponible, el servicio sigue arrancando y solo registra una advertencia.
 */
@Component
public class EsquemaNotificaciones {

    private static final Logger log = LoggerFactory.getLogger(EsquemaNotificaciones.class);

    private final JdbcTemplate jdbc;

    public EsquemaNotificaciones(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void crearTablaSiFalta() {
        try {
            jdbc.execute("CREATE TABLE IF NOT EXISTS notificaciones ("
                    + "id BIGINT NOT NULL AUTO_INCREMENT, evento_id VARCHAR(64) NOT NULL, "
                    + "tipo VARCHAR(40) NOT NULL, venta_id BIGINT NOT NULL, vehiculo_id BIGINT NOT NULL, "
                    + "fecha_hora_evento VARCHAR(40) NULL, recibido_en DATETIME(6) NOT NULL, "
                    + "mensaje VARCHAR(255) NOT NULL, PRIMARY KEY (id), "
                    + "UNIQUE KEY uq_notificaciones_evento (evento_id), KEY ix_notificaciones_recibido (recibido_en)"
                    + ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            log.info("Tabla notificaciones verificada");
        } catch (RuntimeException e) {
            log.warn("No se pudo verificar la tabla notificaciones (¿está MySQL activo?): {}",
                    e.getMessage());
        }
    }
}
