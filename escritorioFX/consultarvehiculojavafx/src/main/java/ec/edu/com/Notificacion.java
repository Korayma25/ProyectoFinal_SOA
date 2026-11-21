package ec.edu.com;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/** Aviso de venta que devuelve GET /api/notificaciones del servicio de notificaciones. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record Notificacion(
        String eventoId,
        String tipo,
        Long ventaId,
        Long vehiculoId,
        String fechaHoraEvento,
        String recibidoEn,
        String mensaje) {
}
