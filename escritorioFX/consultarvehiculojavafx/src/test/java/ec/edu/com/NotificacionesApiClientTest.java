package ec.edu.com;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.sun.net.httpserver.HttpServer;
import ec.edu.com.NotificacionesApiClient.Tipo;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class NotificacionesApiClientTest {

    private HttpServer servidor;

    @AfterEach
    void cerrar() {
        if (servidor != null) {
            servidor.stop(0);
        }
    }

    private String iniciar(int codigo, String cuerpo, AtomicReference<String> claveRecibida) throws Exception {
        servidor = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        servidor.createContext("/api/notificaciones", ex -> {
            if (claveRecibida != null) {
                claveRecibida.set(ex.getRequestHeaders().getFirst("X-Notification-Key"));
            }
            byte[] datos = cuerpo.getBytes(StandardCharsets.UTF_8);
            ex.getResponseHeaders().add("Content-Type", "application/json");
            ex.sendResponseHeaders(codigo, datos.length);
            ex.getResponseBody().write(datos);
            ex.close();
        });
        servidor.start();
        return "http://127.0.0.1:" + servidor.getAddress().getPort();
    }

    @Test
    void muestraLosAvisosYEnviaLaClaveEnLaCabecera() throws Exception {
        AtomicReference<String> clave = new AtomicReference<>();
        String json = "[{\"eventoId\":\"e-1\",\"tipo\":\"VENTA_COMPLETADA\",\"ventaId\":25,\"vehiculoId\":30,"
                + "\"fechaHoraEvento\":\"2026-11-21T01:35:35Z\",\"recibidoEn\":\"2026-11-21T01:36:00Z\","
                + "\"mensaje\":\"Venta 25 completada\",\"campoNuevo\":1}]";
        var r = new NotificacionesApiClient(iniciar(200, json, clave), "clave-de-prueba").consultar().get();
        assertEquals(Tipo.OK, r.tipo());
        assertEquals(1, r.avisos().size());
        assertEquals(25L, r.avisos().get(0).ventaId());
        assertEquals("clave-de-prueba", clave.get());
    }

    @Test
    void unaListaVaciaEsOkYNoUnFallo() throws Exception {
        var r = new NotificacionesApiClient(iniciar(200, "[]", null), "k").consultar().get();
        assertEquals(Tipo.OK, r.tipo());
        assertTrue(r.avisos().isEmpty());
    }

    @Test
    void clavesRechazadasSeDistinguenDelServicioCaido() throws Exception {
        assertEquals(Tipo.NO_AUTORIZADO, new NotificacionesApiClient(iniciar(401, "{}", null), "k").consultar().get().tipo());
        servidor.stop(0);
        assertEquals(Tipo.ERROR_SERVICIO, new NotificacionesApiClient(iniciar(500, "{}", null), "k").consultar().get().tipo());
    }

    @Test
    void unaRespuestaQueNoEsListaEsFormatoInvalido() throws Exception {
        assertEquals(Tipo.FORMATO_INVALIDO, new NotificacionesApiClient(iniciar(200, "{\"x\":1}", null), "k").consultar().get().tipo());
    }

    @Test
    void sinServidorEsSinConexion() throws Exception {
        String url = iniciar(200, "[]", null);
        servidor.stop(0);
        var r = new NotificacionesApiClient(url, "k").consultar().get();
        assertEquals(Tipo.SIN_CONEXION, r.tipo());
        assertTrue(r.avisos().isEmpty());
    }

    @Test
    void sinClaveNoSeLlamaAlServicio() throws Exception {
        assertEquals(Tipo.SIN_CLAVE, new NotificacionesApiClient("http://127.0.0.1:1", "").consultar().get().tipo());
    }

    @Test
    void laClaveSeLeeDelArchivoLocal(@TempDir Path dir) throws Exception {
        Path archivo = dir.resolve("secrets.local.properties");
        Files.writeString(archivo, "notificaciones.key=abc123\n");
        assertEquals("abc123", ConfigNotificaciones.claveDeArchivo(archivo));
        assertEquals("", ConfigNotificaciones.claveDeArchivo(dir.resolve("no-existe.properties")));
    }

    @Test
    void laHoraDelAvisoSeFormateaYUnValorInvalidoNoRompe() {
        assertTrue(PanelNotificaciones.formatearHora("2026-11-21T01:36:00Z").matches("[0-9]{2}:[0-9]{2}:[0-9]{2}"));
        assertEquals("—", PanelNotificaciones.formatearHora(null));
    }
}
