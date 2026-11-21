package ec.edu.uta.notificaciones.repository;

import ec.edu.uta.notificaciones.model.Aviso;
import java.sql.Timestamp;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** Historial persistente en la tabla notificaciones de la base de datos propia del servicio. */
@Repository
public class AvisoRepositorioJdbc implements AvisoRepositorio {

    private final JdbcTemplate jdbc;

    public AvisoRepositorioJdbc(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public boolean registrar(Aviso aviso) {
        // INSERT IGNORE + UNIQUE(evento_id): un evento repetido no inserta nada (0 filas).
        int filas = jdbc.update(
                "INSERT IGNORE INTO notificaciones "
                        + "(evento_id, tipo, venta_id, vehiculo_id, fecha_hora_evento, recibido_en, mensaje) "
                        + "VALUES (?, ?, ?, ?, ?, ?, ?)",
                aviso.eventoId(), aviso.tipo(), aviso.ventaId(), aviso.vehiculoId(),
                aviso.fechaHoraEvento(), Timestamp.from(aviso.recibidoEn()), aviso.mensaje());
        return filas == 1;
    }

    @Override
    public List<Aviso> historial() {
        return jdbc.query(
                "SELECT evento_id, tipo, venta_id, vehiculo_id, fecha_hora_evento, recibido_en, mensaje "
                        + "FROM notificaciones ORDER BY recibido_en DESC, id DESC",
                (rs, fila) -> new Aviso(
                        rs.getString("evento_id"), rs.getString("tipo"),
                        rs.getLong("venta_id"), rs.getLong("vehiculo_id"),
                        rs.getString("fecha_hora_evento"),
                        rs.getTimestamp("recibido_en").toInstant(), rs.getString("mensaje")));
    }
}
