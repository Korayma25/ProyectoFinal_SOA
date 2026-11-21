package ec.edu.uta.notificaciones.messaging;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rabbitmq.client.Channel;
import ec.edu.uta.notificaciones.model.Aviso;
import ec.edu.uta.notificaciones.model.EventoVenta;
import ec.edu.uta.notificaciones.repository.AvisoRepositorio;
import java.io.IOException;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

/**
 * Consumidor de la cola notificaciones.ventas.
 * - Registra un aviso por cada evento y descarta los repetidos por eventoId.
 * - Confirma (ack) solo después de registrar; un evento inválido se rechaza sin reencolar.
 */
@Component
public class EventoVentaListener {

    private static final Logger log = LoggerFactory.getLogger(EventoVentaListener.class);

    private final ObjectMapper mapper;
    private final AvisoRepositorio repositorio;

    public EventoVentaListener(ObjectMapper mapper, AvisoRepositorio repositorio) {
        this.mapper = mapper;
        this.repositorio = repositorio;
    }

    @RabbitListener(queues = "${app.rabbit.cola-ventas}")
    public void alRecibir(Message mensaje, Channel canal) throws IOException {
        long etiqueta = mensaje.getMessageProperties().getDeliveryTag();
        try {
            EventoVenta evento = mapper.readValue(mensaje.getBody(), EventoVenta.class);
            if (!evento.esValido()) {
                log.warn("Evento inválido descartado: {}", new String(mensaje.getBody()));
                canal.basicReject(etiqueta, false);
                return;
            }
            Aviso aviso = new Aviso(evento.eventoId(), evento.tipo(), evento.ventaId(), evento.vehiculoId(),
                    evento.fechaHora(), Instant.now(),
                    "Venta " + evento.ventaId() + " completada (vehículo " + evento.vehiculoId() + ")");
            if (repositorio.registrar(aviso)) {
                log.info("Evento {} recibido y registrado: venta {} vehículo {}",
                        evento.eventoId(), evento.ventaId(), evento.vehiculoId());
            } else {
                log.info("Evento {} repetido: se descarta sin duplicar el aviso", evento.eventoId());
            }
            canal.basicAck(etiqueta, false);
        } catch (IOException e) {
            log.warn("Mensaje no interpretable descartado: {}", e.getMessage());
            canal.basicReject(etiqueta, false);
        }
    }
}
