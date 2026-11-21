package ec.edu.uta.notificaciones.repository;

import ec.edu.uta.notificaciones.model.Aviso;
import java.util.List;

/** Historial de avisos. Un eventoId nunca se registra dos veces. */
public interface AvisoRepositorio {

    /** @return true si se registró; false si el eventoId ya existía (duplicado). */
    boolean registrar(Aviso aviso);

    /** Historial, del más reciente al más antiguo. */
    List<Aviso> historial();
}
