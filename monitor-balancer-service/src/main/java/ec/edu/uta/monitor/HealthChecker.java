package ec.edu.uta.monitor;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentLinkedDeque;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Consulta periódicamente NGINX y cada instancia, y genera alertas en los cambios de estado. */
@Component
public class HealthChecker {

    private static final int MAX_ALERTAS = 200;

    private final HttpClient http;
    private final Duration timeout;
    private final Map<String, String> destinos = new LinkedHashMap<>();
    private final Map<String, EstadoComponente> estados = new LinkedHashMap<>();
    private final ConcurrentLinkedDeque<Alerta> alertas = new ConcurrentLinkedDeque<>();

    public HealthChecker(@Value("${monitor.nginx-url}") String nginx,
                         @Value("${monitor.instancia-a}") String a,
                         @Value("${monitor.instancia-b}") String b,
                         @Value("${monitor.timeout-ms}") long timeoutMs) {
        this.timeout = Duration.ofMillis(timeoutMs);
        this.http = HttpClient.newBuilder().connectTimeout(timeout).build();
        destinos.put("nginx", nginx);
        destinos.put("instancia-a", a);
        destinos.put("instancia-b", b);
    }

    @Scheduled(fixedDelayString = "${monitor.intervalo-ms}")
    public void revisar() {
        destinos.forEach(this::revisarUno);
    }

    private synchronized void revisarUno(String nombre, String url) {
        long t0 = System.nanoTime();
        Integer status = null;
        boolean arriba = false;
        try {
            HttpResponse<String> r = http.send(
                    HttpRequest.newBuilder(URI.create(url)).timeout(timeout).GET().build(),
                    HttpResponse.BodyHandlers.ofString());
            status = r.statusCode();
            arriba = status == 200;
        } catch (Exception e) {
            if (e instanceof InterruptedException) Thread.currentThread().interrupt();
        }
        long ms = (System.nanoTime() - t0) / 1_000_000;
        String nuevo = arriba ? "UP" : "DOWN";
        Instant ahora = Instant.now();
        EstadoComponente previo = estados.get(nombre);
        Instant cambio = ahora;
        int fallos = arriba ? 0 : (previo == null ? 1 : previo.fallosConsecutivos() + 1);
        if (previo != null) {
            cambio = previo.ultimoCambio();
            if (!previo.estado().equals(nuevo)) {
                cambio = ahora;
                registrar(nombre, arriba ? "RECUPERACION" : "CAIDA",
                        arriba ? nombre + " volvió a responder (HTTP " + status + ")"
                               : nombre + " dejó de responder" + (status != null ? " (HTTP " + status + ")" : ""));
            }
        } else if (!arriba) {
            registrar(nombre, "CAIDA", nombre + " no responde al iniciar el monitor");
        }
        estados.put(nombre, new EstadoComponente(nombre, url, nuevo, status, ms, fallos, ahora, cambio));
    }

    private void registrar(String componente, String tipo, String mensaje) {
        alertas.addFirst(new Alerta(Instant.now(), componente, tipo, mensaje));
        while (alertas.size() > MAX_ALERTAS) alertas.pollLast();
    }

    public synchronized List<EstadoComponente> estados() {
        return new ArrayList<>(estados.values());
    }

    public List<Alerta> alertas() {
        return new ArrayList<>(alertas);
    }
}
