# ConsultaJWT_SOA — Cliente Windows Forms de administración

Aplicación C# (Windows Forms, .NET) de administración. **No registra ventas.**

## Funciones
- Inicio de sesión (`FormLogin`) con usuario y contraseña; el JWT queda dentro de `ClienteApi`.
- Crear vehículos (API Java) y compradores (FastAPI), y listar vehículos, compradores y ventas.
- Pestañas según rol (CONSULTA no ve la creación). Muestra códigos HTTP y errores 401, 403, 404, 422, de conexión y de tiempo agotado.
- La comunicación HTTP está separada del formulario (`ClienteApi.cs`); todo pasa por NGINX (`http://127.0.0.1:8090`).

## Requisitos
Visual Studio con .NET (`net10.0-windows`) y los servicios en ejecución.

## Configuración
`ConsultaJWT_SOA/secrets.local.json` (Git lo ignora), con `clientId`, `clientSecret` e `idapli`. Debe coincidir con el cliente OAuth de la API Java. Se copia junto al ejecutable al compilar.

## Ejecutar
Abrir `ConsultaJWT_SOA.slnx` en Visual Studio y pulsar F5, o `dotnet run --project ConsultaJWT_SOA`.

## Archivos principales
`Program.cs`, `FormLogin.cs`, `FormAdministracion.cs`, `ClienteApi.cs`, `ModelosAdmin.cs`, `ConfigLocal.cs`.

## Nota
El código de administración (formularios y cliente HTTP) está en la rama `feature/VisualComunity`.
