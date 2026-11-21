package ec.edu.com;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.CompletableFuture;

/**
 * Cliente HTTP de GET /api/notificaciones. JavaFX NO accede a RabbitMQ ni a MySQL: solo consulta este
 * endpoint del servicio de notificaciones (por NGINX). Nunca lanza excepciones: siempre devuelve un
 * {@link Resultado} que distingue una lista vacía de un fallo del servicio.
 */
public final class NotificacionesApiClient {

    /** Qué ocurrió en la consulta; la interfaz lo traduce al estado de conexión. */
    public enum Tipo { OK, SIN_CLAVE, NO_AUTORIZADO, ERROR_SERVICIO, SIN_CONEXION, FORMATO_INVALIDO }

    public record Resultado(Tipo tipo, int codigoHttp, List<Notificacion> avisos, String detalle) {
        public boolean ok() {
            return tipo == Tipo.OK;
        }
    }

    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();
    private final ObjectMapper mapper = new ObjectMapper();
    private final String urlBase;
    private final String clave;

    public NotificacionesApiClient(String urlBase, String clave) {
        this.urlBase = urlBase;
        this.clave = clave == null ? "" : clave;
    }

    public CompletableFuture<Resultado> consultar() {
        if (clave.isBlank()) {
            return CompletableFuture.completedFuture(new Resultado(Tipo.SIN_CLAVE, 0, List.of(),
                    "Falta la clave del servicio de notificaciones (NOTIFICACIONES_KEY o secrets.local.properties)."));
        }
        HttpRequest solicitud;
        try {
            solicitud = HttpRequest.newBuilder(URI.create(urlBase + "/api/notificaciones"))
                    .timeout(Duration.ofSeconds(5))
                    .header("Accept", "application/json")
                    .header("X-Notification-Key", clave)
                    .GET().build();
        } catch (IllegalArgumentException e) {
            return CompletableFuture.completedFuture(new Resultado(Tipo.SIN_CONEXION, 0, List.of(),
                    "La URL del servicio no es válida: " + urlBase));
        }
        return http.sendAsync(solicitud, HttpResponse.BodyHandlers.ofString())
                .thenApply(this::interpretar)
                .exceptionally(error -> new Resultado(Tipo.SIN_CONEXION, 0, List.of(),
                        "No se pudo conectar con el servicio de notificaciones."));
    }

    private Resultado interpretar(HttpResponse<String> respuesta) {
        int codigo = respuesta.statusCode();
        if (codigo == 401 || codigo == 403) {
            return new Resultado(Tipo.NO_AUTORIZADO, codigo, List.of(), "El servicio rechazó la clave (HTTP " + codigo + ").");
        }
        if (codigo != 200) {
            return new Resultado(Tipo.ERROR_SERVICIO, codigo, List.of(), "El servicio respondió HTTP " + codigo + ".");
        }
        try {
            List<Notificacion> avisos = mapper.readValue(respuesta.body(), new TypeReference<List<Notificacion>>() { });
            return new Resultado(Tipo.OK, codigo, avisos, "");
        } catch (JsonProcessingException e) {
            return new Resultado(Tipo.FORMATO_INVALIDO, codigo, List.of(), "La respuesta no es una lista JSON de notificaciones.");
        }
    }
}
