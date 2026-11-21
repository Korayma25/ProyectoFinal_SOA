package ec.edu.uta.notificaciones.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/** Evento publicado por FastAPI cuando una venta queda COMPLETADA. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record EventoVenta(String eventoId, String tipo, Long ventaId, Long vehiculoId, String fechaHora) {

    public boolean esValido() {
        return eventoId != null && !eventoId.isBlank()
                && "VENTA_COMPLETADA".equals(tipo)
                && ventaId != null && ventaId > 0
                && vehiculoId != null && vehiculoId > 0;
    }
}
