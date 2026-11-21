package ec.edu.uta.notificaciones;

import ec.edu.uta.notificaciones.model.Aviso;
import ec.edu.uta.notificaciones.repository.AvisoRepositorio;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

/** Repositorio en memoria solo para las pruebas unitarias del listener. */
class AvisoRepositorioMemoria implements AvisoRepositorio {

    private final ConcurrentHashMap<String, Aviso> avisos = new ConcurrentHashMap<>();

    @Override
    public boolean registrar(Aviso aviso) {
        return avisos.putIfAbsent(aviso.eventoId(), aviso) == null;
    }

    @Override
    public List<Aviso> historial() {
        List<Aviso> lista = new ArrayList<>(avisos.values());
        lista.sort(Comparator.comparing(Aviso::recibidoEn).reversed());
        return lista;
    }
}
