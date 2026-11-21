package ec.edu.uta.notificaciones.config;

import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.PropertySource;

/** Configuración de RabbitMQ: la cola de ventas es durable, igual que la declara el publicador. */
@Configuration
@PropertySource("classpath:rabbitmq.properties")
public class RabbitConfig {

    @Bean
    public Queue colaVentas(@Value("${app.rabbit.cola-ventas}") String nombre) {
        return QueueBuilder.durable(nombre).build();
    }
}
