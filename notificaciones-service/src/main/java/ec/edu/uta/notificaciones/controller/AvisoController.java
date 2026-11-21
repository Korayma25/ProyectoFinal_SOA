package ec.edu.uta.notificaciones.controller;

import ec.edu.uta.notificaciones.model.Aviso;
import ec.edu.uta.notificaciones.repository.AvisoRepositorio;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Historial de avisos de venta (GET /api/notificaciones), del más reciente al más antiguo. */
@RestController
@RequestMapping("/api/notificaciones")
public class AvisoController {

    private final AvisoRepositorio repositorio;

    public AvisoController(AvisoRepositorio repositorio) {
        this.repositorio = repositorio;
    }

    @GetMapping
    public List<Aviso> historial() {
        return repositorio.historial();
    }
}
