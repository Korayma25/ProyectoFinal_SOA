package ec.edu.uta.notificaciones.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.PropertySource;

/** Carga la configuración de la base de datos de notificaciones (database.properties). */
@Configuration
@PropertySource("classpath:database.properties")
public class BaseDatosConfig {
}
