package ec.edu.uta.notificaciones;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rabbitmq.client.Channel;
import ec.edu.uta.notificaciones.messaging.EventoVentaListener;
import ec.edu.uta.notificaciones.repository.AvisoRepositorio;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageProperties;

class EventoVentaListenerTest {

    private static final String EVENTO = "{\"eventoId\":\"e-1\",\"tipo\":\"VENTA_COMPLETADA\","
            + "\"ventaId\":25,\"vehiculoId\":30,\"fechaHora\":\"2026-11-21T01:35:35Z\"}";

    private AvisoRepositorio repositorio;
    private EventoVentaListener listener;
    private Channel canal;

    @BeforeEach
    void preparar() {
        repositorio = new AvisoRepositorio();
        listener = new EventoVentaListener(new ObjectMapper(), repositorio);
        canal = mock(Channel.class);
    }

    private Message mensaje(String json, long etiqueta) {
        MessageProperties p = new MessageProperties();
        p.setDeliveryTag(etiqueta);
        return new Message(json.getBytes(StandardCharsets.UTF_8), p);
    }

    @Test
    void registraElAvisoYConfirma() throws Exception {
        listener.alRecibir(mensaje(EVENTO, 1), canal);
        assertEquals(1, repositorio.historial().size());
        assertEquals(25L, repositorio.historial().get(0).ventaId());
        verify(canal).basicAck(1L, false);
    }

    @Test
    void unEventoRepetidoNoDuplicaElAvisoPeroSeConfirma() throws Exception {
        listener.alRecibir(mensaje(EVENTO, 1), canal);
        listener.alRecibir(mensaje(EVENTO, 2), canal);
        assertEquals(1, repositorio.historial().size());
        verify(canal).basicAck(2L, false);
    }

    @Test
    void unEventoInvalidoSeRechazaSinReencolar() throws Exception {
        listener.alRecibir(mensaje("{\"eventoId\":\"x\",\"tipo\":\"OTRO\"}", 3), canal);
        assertEquals(0, repositorio.historial().size());
        verify(canal).basicReject(3L, false);
        verify(canal, never()).basicAck(anyLong(), anyBoolean());
    }

    @Test
    void unMensajeQueNoEsJsonSeRechazaSinReencolar() throws Exception {
        listener.alRecibir(mensaje("no-es-json", 4), canal);
        verify(canal).basicReject(4L, false);
    }
}
