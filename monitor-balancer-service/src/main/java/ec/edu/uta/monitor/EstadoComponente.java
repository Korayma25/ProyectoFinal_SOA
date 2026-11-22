package ec.edu.uta.monitor;

import java.time.Instant;

/** Estado actual de un componente supervisado. */
public record EstadoComponente(String nombre, String url, String estado, Integer httpStatus,
                               long latenciaMs, int fallosConsecutivos, Instant ultimaRevision,
                               Instant ultimoCambio) {
}
