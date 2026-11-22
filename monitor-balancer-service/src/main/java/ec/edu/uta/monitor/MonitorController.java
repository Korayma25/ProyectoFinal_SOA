package ec.edu.uta.monitor;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/monitor")
public class MonitorController {

    private final HealthChecker checker;
    private final LogStatsService stats;

    public MonitorController(HealthChecker checker, LogStatsService stats) {
        this.checker = checker;
        this.stats = stats;
    }

    /** Estado de NGINX y de cada instancia, con un resumen global. */
    @GetMapping("/estado")
    public Map<String, Object> estado() {
        List<EstadoComponente> e = checker.estados();
        long caidas = e.stream().filter(c -> c.estado().equals("DOWN")).count();
        String global = e.isEmpty() ? "SIN_DATOS" : caidas == 0 ? "OK" : caidas == e.size() ? "CAIDO" : "DEGRADADO";
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("global", global);
        r.put("fecha", Instant.now());
        r.put("componentes", e);
        return r;
    }

    /** Reparto de peticiones entre instancias según el access.log. */
    @GetMapping("/estadisticas")
    public Map<String, Object> estadisticas() {
        return stats.calcular();
    }

    /** Historial de caídas y recuperaciones (más recientes primero). */
    @GetMapping("/alertas")
    public List<Alerta> alertas() {
        return checker.alertas();
    }
}
