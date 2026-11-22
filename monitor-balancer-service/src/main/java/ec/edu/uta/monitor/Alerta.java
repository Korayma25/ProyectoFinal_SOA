package ec.edu.uta.monitor;

import java.time.Instant;

public record Alerta(Instant fecha, String componente, String tipo, String mensaje) {
}
