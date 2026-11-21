package ec.edu.com;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Properties;

/**
 * Configuración del cliente de notificaciones. Nada sensible va en el código fuente:
 * - URL base: variable NOTIFICACIONES_URL (por defecto NGINX, http://127.0.0.1:8090).
 * - Clave del servicio: variable NOTIFICACIONES_KEY o la propiedad notificaciones.key del archivo
 *   secrets.local.properties (junto a donde se ejecuta la aplicación; excluido de Git).
 */
public final class ConfigNotificaciones {

    public static final String URL_POR_DEFECTO = "http://127.0.0.1:8090";
    public static final String ARCHIVO_LOCAL = "secrets.local.properties";

    private ConfigNotificaciones() {
    }

    public static String urlBase() {
        String url = System.getenv("NOTIFICACIONES_URL");
        return url == null || url.isBlank() ? URL_POR_DEFECTO : url.trim().replaceAll("/+$", "");
    }

    /** @return la clave configurada o cadena vacía si falta. */
    public static String clave() {
        String entorno = System.getenv("NOTIFICACIONES_KEY");
        if (entorno != null && !entorno.isBlank()) {
            return entorno.trim();
        }
        return claveDeArchivo(Path.of(ARCHIVO_LOCAL));
    }

    static String claveDeArchivo(Path archivo) {
        if (!Files.isRegularFile(archivo)) {
            return "";
        }
        try (InputStream in = Files.newInputStream(archivo)) {
            Properties propiedades = new Properties();
            propiedades.load(in);
            return propiedades.getProperty("notificaciones.key", "").trim();
        } catch (IOException e) {
            return "";
        }
    }
}
