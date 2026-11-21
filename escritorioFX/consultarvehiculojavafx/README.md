# consultarvehiculojavafx — Cliente JavaFX

Aplicación de escritorio con dos pestañas.

## Funciones
- **Vehículos:** consulta `GET /api/vehiculos` con un JWT pegado por el usuario y muestra la tabla.
- **Notificaciones (Actividad 9):** consulta `GET /api/notificaciones` por NGINX cada 4 segundos y muestra los avisos de venta. El estado de conexión distingue «Conectado» sin avisos de «Sin conexión», «Clave rechazada», «Servicio con fallo» o «Sin configurar». No accede a RabbitMQ ni a MySQL.

## Requisitos
JDK 17+ (JavaFX 21 se descarga con Maven) y los servicios en ejecución.

## Configuración
La clave del servicio de notificaciones (`app.notificacion-key`) se lee de la variable `NOTIFICACIONES_KEY` o de `secrets.local.properties` (propiedad `notificaciones.key`, junto a donde se ejecuta; Git lo ignora). Opcional: `NOTIFICACIONES_URL` (por defecto `http://127.0.0.1:8090`).

## Ejecutar
```powershell
$env:NOTIFICACIONES_KEY = "<clave>"
mvn clean javafx:run
mvn test           # 8 pruebas del cliente de notificaciones
```

## Estructura
`VehiculosApp` (ventana), `VehiculosApiClient`, `PanelNotificaciones`, `NotificacionesApiClient`, `ConfigNotificaciones`.
