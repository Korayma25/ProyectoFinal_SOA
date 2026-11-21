package ec.edu.uta.notificaciones.model;

import java.time.Instant;

/** Aviso de venta registrado por el servicio de notificaciones. */
public record Aviso(String eventoId, String tipo, Long ventaId, Long vehiculoId,
                    String fechaHoraEvento, Instant recibidoEn, String mensaje) {
}
