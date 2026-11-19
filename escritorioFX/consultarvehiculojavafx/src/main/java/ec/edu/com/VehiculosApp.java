package ec.edu.com;

import com.fasterxml.jackson.core.JsonProcessingException;
import javafx.application.Application;
import javafx.application.Platform;
import javafx.beans.property.ReadOnlyIntegerWrapper;
import javafx.beans.property.ReadOnlyObjectWrapper;
import javafx.beans.property.ReadOnlyStringWrapper;
import javafx.collections.FXCollections;
import javafx.geometry.Insets;
import javafx.scene.Scene;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.control.PasswordField;
import javafx.scene.control.TableColumn;
import javafx.scene.control.TableView;
import javafx.scene.layout.HBox;
import javafx.scene.layout.Priority;
import javafx.scene.layout.VBox;
import javafx.stage.Stage;

import java.net.ConnectException;
import java.net.http.HttpTimeoutException;
import java.util.List;
import java.util.concurrent.CompletionException;

public final class VehiculosApp extends Application {

    private static final String ESTILO_NEUTRO = "-fx-text-fill: #1f5f3a;";
    private static final String ESTILO_ERROR =
            "-fx-text-fill: #b42318; -fx-font-weight: bold;";

    private final VehiculosApiClient api = new VehiculosApiClient();

    private final PasswordField txtToken = new PasswordField();
    private final Button btnConsultar = new Button("Consultar");
    private final Button btnLimpiar = new Button("Limpiar datos");
    private final Label lblEstado =
            new Label("Ingrese un JWT para realizar la consulta.");
    private final Label lblTotal = new Label("Total de vehículos: 0");
    private final TableView<Vehiculo> tabla = new TableView<>();

    @Override
    public void start(Stage ventana) {
        Label titulo = new Label("Vehículos registrados");
        titulo.setStyle("-fx-font-size: 20px; -fx-font-weight: bold;");

        txtToken.setPromptText("Pegue aquí el token JWT");
        txtToken.setMaxWidth(Double.MAX_VALUE);

        btnConsultar.setDefaultButton(true);
        btnConsultar.setOnAction(evento -> consultar());
        btnLimpiar.setOnAction(evento -> limpiarDatos());

        configurarTabla();
        lblEstado.setStyle(ESTILO_NEUTRO);

        VBox.setVgrow(tabla, Priority.ALWAYS);

        HBox acciones = new HBox(10, btnConsultar, btnLimpiar, lblTotal);

        VBox contenido = new VBox(
                12,
                titulo,
                new Label("Token JWT:"),
                txtToken,
                acciones,
                lblEstado,
                tabla
        );

        contenido.setPadding(new Insets(22));
        contenido.setStyle("-fx-background-color: white;");

        ventana.setScene(new Scene(contenido, 1024, 650));
        ventana.setTitle("Consulta de vehículos");
        ventana.show();
    }

    private void configurarTabla() {
        tabla.getColumns().setAll(
                columnaEntero("ID", Vehiculo::idVehiculo),
                columnaTexto("Marca", Vehiculo::marca),
                columnaTexto("Modelo", Vehiculo::modelo),
                columnaTexto("Placa", Vehiculo::placa),
                columnaTexto("Chasis", Vehiculo::chasis),
                columnaEntero("Año", Vehiculo::anio),
                columnaTexto("Color", Vehiculo::color),
                columnaObjeto("Precio", Vehiculo::precio),
                columnaTexto("Estado", Vehiculo::estado)
        );
        

        tabla.setPlaceholder(new Label("No hay vehículos para mostrar."));
        tabla.setColumnResizePolicy(
                TableView.CONSTRAINED_RESIZE_POLICY_FLEX_NEXT_COLUMN
        );
    }

    private TableColumn<Vehiculo, String> columnaTexto(
            String titulo,
            java.util.function.Function<Vehiculo, String> valor
    ) {
        TableColumn<Vehiculo, String> columna = new TableColumn<>(titulo);

        columna.setCellValueFactory(
                celda -> new ReadOnlyStringWrapper(
                        valor.apply(celda.getValue())
                )
        );

        return columna;
    }

    private TableColumn<Vehiculo, Number> columnaEntero(
            String titulo,
            java.util.function.ToIntFunction<Vehiculo> valor
    ) {
        TableColumn<Vehiculo, Number> columna = new TableColumn<>(titulo);

        columna.setCellValueFactory(
                celda -> new ReadOnlyIntegerWrapper(
                        valor.applyAsInt(celda.getValue())
                )
        );

        return columna;
    }

    private TableColumn<Vehiculo, Object> columnaObjeto(
            String titulo,
            java.util.function.Function<Vehiculo, Object> valor
    ) {
        TableColumn<Vehiculo, Object> columna = new TableColumn<>(titulo);

        columna.setCellValueFactory(
                celda -> new ReadOnlyObjectWrapper<>(
                        valor.apply(celda.getValue())
                )
        );

        return columna;
    }

    private void consultar() {
        String token = normalizarToken(txtToken.getText());

        if (token.isEmpty()) {
            mostrarError("Debe ingresar un token JWT.");
            return;
        }

        txtToken.setText(token);
        btnConsultar.setDisable(true);

        lblEstado.setStyle(ESTILO_NEUTRO);
        lblEstado.setText("Consultando vehículos...");

        try {
            api.consultarVehiculos(token).whenComplete((resultado, error) ->
                    Platform.runLater(() -> {
                        try {
                            if (error != null) {
                                manejarError(error);
                            } else {
                                manejarRespuesta(resultado);
                            }
                        } finally {
                            btnConsultar.setDisable(false);
                        }
                    })
            );
        } catch (RuntimeException ex) {
            try {
                manejarError(ex);
            } finally {
                btnConsultar.setDisable(false);
            }
        }
    }

    /** Limpia el token y los resultados sin consultar al servidor. */
    private void limpiarDatos() {
        txtToken.clear();
        tabla.getItems().clear();
        lblTotal.setText("Total de vehículos: 0");
        lblEstado.setStyle(ESTILO_NEUTRO);
        lblEstado.setText("Datos limpiados.");
    }

    private String normalizarToken(String texto) {
        String token = texto == null ? "" : texto.trim();

        return token.regionMatches(
                true,
                0,
                "Bearer ",
                0,
                "Bearer ".length()
        )
                ? token.substring("Bearer ".length()).trim()
                : token;
    }

    private void manejarRespuesta(
            VehiculosApiClient.ResultadoConsulta resultado
    ) {
        switch (resultado.codigoHttp()) {
            case 200 -> cargarVehiculos(resultado.vehiculos());

            case 401 ->
                    mostrarErrorLimpiando("JWT inválido o vencido.");

            case 403 ->
                    mostrarErrorLimpiando(
                            "No tiene permisos para consultar vehículos."
                    );

            default ->
                    mostrarErrorLimpiando(
                            "La consulta falló. Código HTTP: "
                                    + resultado.codigoHttp()
                    );
        }
    }

    private void cargarVehiculos(List<Vehiculo> vehiculos) {
        tabla.setItems(FXCollections.observableArrayList(vehiculos));

        lblTotal.setText("Total de vehículos: " + vehiculos.size());
        lblEstado.setStyle(ESTILO_NEUTRO);

        if (vehiculos.isEmpty()) {
            lblEstado.setText("No hay vehículos registrados.");
        } else {
            lblEstado.setText("Consulta realizada correctamente.");
        }
    }

    private void manejarError(Throwable error) {
        Throwable causa = desenvolver(error);

        if (causa instanceof HttpTimeoutException) {
            mostrarErrorLimpiando(
                    "Tiempo de espera agotado: la API superó los 15 segundos."
            );

        } else if (causa instanceof ConnectException) {
            mostrarErrorLimpiando(
                    "No se pudo establecer la conexión con el servidor."
            );

        } else if (causa instanceof JsonProcessingException) {
            mostrarErrorLimpiando(
                    "La respuesta del servidor tiene un formato JSON inválido."
            );

        } else {
            mostrarErrorLimpiando(
                    "Error de red al consultar el servidor: "
                            + causa.getMessage()
            );
        }
    }

    private Throwable desenvolver(Throwable error) {
        Throwable actual = error;

        while (
                (actual instanceof CompletionException
                        || actual instanceof java.util.concurrent.ExecutionException)
                        && actual.getCause() != null
        ) {
            actual = actual.getCause();
        }

        return actual;
    }

    private void mostrarError(String mensaje) {
        lblEstado.setStyle(ESTILO_ERROR);
        lblEstado.setText(mensaje);
    }

    private void mostrarErrorLimpiando(String mensaje) {
        tabla.getItems().clear();
        lblTotal.setText("Total de vehículos: 0");
        mostrarError(mensaje);
    }
}
