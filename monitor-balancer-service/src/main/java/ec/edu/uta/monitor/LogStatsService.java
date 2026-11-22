package ec.edu.uta.monitor;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Calcula estadísticas de reparto a partir del access.log de NGINX.
 * Cuando una petición se reintenta, el log trae varias direcciones; se cuenta la última,
 * que es la instancia que realmente respondió.
 */
@Service
public class LogStatsService {

    private static final Pattern LINEA = Pattern.compile(
            "\"(\\w+) (\\S+)[^\"]*\" status=(\\d+) backend=(.*?) rt=([\\d.]+)");

    private final Path log;
    private final int maxLineas;

    public LogStatsService(@Value("${monitor.access-log}") String log,
                           @Value("${monitor.max-lineas-log}") int maxLineas) {
        this.log = Path.of(log);
        this.maxLineas = maxLineas;
    }

    public Map<String, Object> calcular() {
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("archivo", log.toString());
        if (!Files.isReadable(log)) {
            r.put("disponible", false);
            r.put("mensaje", "No se puede leer el access.log de NGINX");
            return r;
        }
        Deque<String> ultimas = new ArrayDeque<>();
        try (Stream<String> s = Files.lines(log, StandardCharsets.ISO_8859_1)) {
            s.forEach(l -> {
                ultimas.addLast(l);
                if (ultimas.size() > maxLineas) ultimas.removeFirst();
            });
        } catch (IOException e) {
            r.put("disponible", false);
            r.put("mensaje", "Error leyendo el log: " + e.getMessage());
            return r;
        }
        Map<String, Integer> porBackend = new LinkedHashMap<>();
        Map<String, Integer> porStatus = new LinkedHashMap<>();
        int total = 0;
        int reintentos = 0;
        double sumaRt = 0;
        for (String l : ultimas) {
            Matcher m = LINEA.matcher(l);
            if (!m.find() || !m.group(2).startsWith("/api/vehiculos")) continue;
            String[] backs = m.group(4).trim().split("\\s*,\\s*");
            String ultimo = backs[backs.length - 1];
            if (ultimo.isEmpty() || ultimo.equals("-")) ultimo = "sin-backend";
            if (backs.length > 1) reintentos++;
            porBackend.merge(ultimo, 1, Integer::sum);
            porStatus.merge(m.group(3), 1, Integer::sum);
            sumaRt += Double.parseDouble(m.group(5));
            total++;
        }
        Map<String, String> porcentaje = new LinkedHashMap<>();
        for (Map.Entry<String, Integer> e : porBackend.entrySet()) {
            porcentaje.put(e.getKey(), String.format(Locale.ROOT, "%.1f%%", 100.0 * e.getValue() / total));
        }
        r.put("disponible", true);
        r.put("ruta", "/api/vehiculos");
        r.put("lineasAnalizadas", ultimas.size());
        r.put("totalPeticiones", total);
        r.put("porBackend", porBackend);
        r.put("porcentajePorBackend", porcentaje);
        r.put("porStatus", porStatus);
        r.put("reintentosEntreInstancias", reintentos);
        r.put("tiempoMedioMs", total == 0 ? 0 : Math.round(1000 * sumaRt / total));
        return r;
    }
}
