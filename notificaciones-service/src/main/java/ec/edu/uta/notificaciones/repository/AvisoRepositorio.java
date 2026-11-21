package ec.edu.uta.notificaciones.repository;

import ec.edu.uta.notificaciones.model.Aviso;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Repository;

/** Historial de avisos. La clave es el eventoId, por lo que un evento repetido no se duplica. */
@Repository
public class AvisoRepositorio {

    private final ConcurrentHashMap<String, Aviso> avisos = new ConcurrentHashMap<>();

    /** @return true si se registró; false si el eventoId ya existía (duplicado). */
    public boolean registrar(Aviso aviso) {
        return avisos.putIfAbsent(aviso.eventoId(), aviso) == null;
    }

    /** Historial, del más reciente al más antiguo. */
    public List<Aviso> historial() {
        List<Aviso> lista = new ArrayList<>(avisos.values());
        lista.sort(Comparator.comparing(Aviso::recibidoEn).reversed());
        return lista;
    }
}
