package ec.edu.com;

import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.HashSet;
import java.util.Set;
import javafx.animation.KeyFrame;
import javafx.animation.Timeline;
import javafx.application.Platform;
import javafx.beans.property.ReadOnlyObjectWrapper;
import javafx.beans.property.ReadOnlyStringWrapper;
import javafx.collections.FXCollections;
import javafx.geometry.Insets;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.control.TableColumn;
import javafx.scene.control.TableView;
import javafx.scene.layout.HBox;
import javafx.scene.layout.Priority;
import javafx.scene.layout.VBox;
import javafx.util.Duration;

/**
 * Pestaña «Notificaciones»: muestra los avisos de venta con sondeo automático cada 4 segundos
 * y un estado de conexión que diferencia «sin notificaciones» de «servicio con fallo».
 */
public final class PanelNotificaciones extends VBox {

    private static final int SEGUNDOS_SONDEO = 4;
    private static final String VERDE = "-fx-text-fill: #1f5f3a; -fx-font-weight: bold;";
    private static final String ROJO = "-fx-text-fill: #b42318; -fx-font-weight: bold;";
    private static final String AZUL = "-fx-text-fill: #1d4ed8; -fx-font-weight: bold;";
    private static final DateTimeFormatter HORA = DateTimeFormatter.ofPattern("HH:mm:ss");

    private final NotificacionesApiClient api;
    private final Label lblConexion = new Label("Conectando...");
    private final Label lblDetalle = new Label();
    private final Label lblTotal = new Label("Total de notificaciones: 0");
    private final Label lblUltima = new Label("Última actualización: —");
    private final TableView<Notificacion> tabla = new TableView<>();
    private final Timeline sondeo;
    private final Set<String> conocidas = new HashSet<>();
    private boolean primeraCarga = true;
    private boolean consultando = false;

    public PanelNotificaciones(NotificacionesApiClient api) {
        super(12);
        this.api = api;
        setPadding(new Insets(22));
        setStyle("-fx-background-color: white;");

        Label titulo = new Label("Notificaciones de venta");
        titulo.setStyle("-fx-font-size: 20px; -fx-font-weight: bold;");
        Button btnActualizar = new Button("Actualizar ahora");
        btnActualizar.setOnAction(e -> consultar());
        HBox estado = new HBox(14, new Label("Estado:"), lblConexion, btnActualizar, lblTotal, lblUltima);
        estado.setAlignment(javafx.geometry.Pos.CENTER_LEFT);

        configurarTabla();
        VBox.setVgrow(tabla, Priority.ALWAYS);
        getChildren().addAll(titulo, estado, lblDetalle, tabla);

        sondeo = new Timeline(new KeyFrame(Duration.seconds(SEGUNDOS_SONDEO), e -> consultar()));
        sondeo.setCycleCount(Timeline.INDEFINITE);
    }

    /** Inicia la consulta inmediata y el sondeo automático. */
    public void iniciar() {
        consultar();
        sondeo.play();
    }

    public void detener() {
        sondeo.stop();
    }

    private void configurarTabla() {
        tabla.getColumns().add(columna("Recibido", n -> formatearHora(n.recibidoEn()), 110));
        tabla.getColumns().add(columna("Venta", n -> String.valueOf(n.ventaId()), 80));
        tabla.getColumns().add(columna("Vehículo", n -> String.valueOf(n.vehiculoId()), 90));
        tabla.getColumns().add(columna("Tipo", Notificacion::tipo, 150));
        tabla.getColumns().add(columna("Mensaje", Notificacion::mensaje, 330));
        tabla.getColumns().add(columna("Evento", n -> n.eventoId() == null ? "" : n.eventoId(), 260));
        tabla.setColumnResizePolicy(TableView.CONSTRAINED_RESIZE_POLICY_FLEX_LAST_COLUMN);
        tabla.setPlaceholder(new Label("Todavía no hay notificaciones de venta."));
    }

    private TableColumn<Notificacion, String> columna(String titulo,
            java.util.function.Function<Notificacion, String> valor, double ancho) {
        TableColumn<Notificacion, String> c = new TableColumn<>(titulo);
        c.setCellValueFactory(celda -> new ReadOnlyStringWrapper(valor.apply(celda.getValue())));
        c.setPrefWidth(ancho);
        return c;
    }

    static String formatearHora(String iso) {
        try {
            return LocalTime.ofInstant(Instant.parse(iso), ZoneId.systemDefault()).format(HORA);
        } catch (RuntimeException e) {
            return iso == null ? "—" : iso;
        }
    }

    private void consultar() {
        if (consultando) {
            return; // evita solapar consultas si el servicio responde lento
        }
        consultando = true;
        api.consultar().thenAccept(r -> Platform.runLater(() -> {
            try {
                mostrar(r);
            } finally {
                consultando = false;
            }
        }));
    }

    private void mostrar(NotificacionesApiClient.Resultado r) {
        lblUltima.setText("Última actualización: " + LocalTime.now().format(HORA));
        if (!r.ok()) {
            // Fallo del servicio: se conserva la lista anterior y se informa el problema, sin confundirlo con «vacío».
            lblConexion.setStyle(ROJO);
            lblConexion.setText(switch (r.tipo()) {
                case SIN_CLAVE -> "Sin configurar";
                case NO_AUTORIZADO -> "Clave rechazada";
                case SIN_CONEXION -> "Sin conexión";
                default -> "Servicio con fallo";
            });
            lblDetalle.setStyle(ROJO);
            lblDetalle.setText(r.detalle());
            return;
        }
        lblConexion.setStyle(VERDE);
        lblConexion.setText("Conectado");
        var avisos = r.avisos();
        long nuevas = avisos.stream().filter(a -> a.eventoId() != null && !conocidas.contains(a.eventoId())).count();
        avisos.forEach(a -> conocidas.add(a.eventoId()));
        tabla.setItems(FXCollections.observableArrayList(avisos));
        lblTotal.setText("Total de notificaciones: " + avisos.size());
        if (avisos.isEmpty()) {
            lblDetalle.setStyle(VERDE);
            lblDetalle.setText("Servicio disponible: todavía no hay notificaciones de venta.");
        } else if (nuevas > 0 && !primeraCarga) {
            lblDetalle.setStyle(AZUL);
            lblDetalle.setText("Nueva notificación recibida (" + nuevas + ").");
        } else {
            lblDetalle.setStyle(VERDE);
            lblDetalle.setText("Notificaciones al día.");
        }
        primeraCarga = false;
    }
}
