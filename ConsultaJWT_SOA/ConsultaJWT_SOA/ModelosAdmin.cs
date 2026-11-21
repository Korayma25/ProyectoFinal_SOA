using System.Text.Json.Serialization;

namespace ConsultaJWT_SOA;

// Resultado de una llamada HTTP: siempre trae el código y un mensaje listo para mostrar.
public sealed class ResultadoApi<T>
{
    // Código HTTP recibido; 0 cuando no hubo respuesta (red caída o tiempo agotado).
    public int CodigoHttp { get; init; }
    public bool Exito { get; init; }
    public string Mensaje { get; init; } = "";
    public T? Datos { get; init; }
}

// Cuerpo de POST /api/vehiculos (API Java). El estado lo decide el servidor.
public sealed class NuevoVehiculo
{
    [JsonPropertyName("marca")] public string Marca { get; set; } = "";
    [JsonPropertyName("modelo")] public string Modelo { get; set; } = "";
    [JsonPropertyName("placa")] public string Placa { get; set; } = "";
    [JsonPropertyName("chasis")] public string Chasis { get; set; } = "";
    [JsonPropertyName("anio")] public int Anio { get; set; }
    [JsonPropertyName("color")] public string? Color { get; set; }
    [JsonPropertyName("precio")] public decimal Precio { get; set; }
}

// Cuerpo de POST /api/compradores (FastAPI).
public sealed class NuevoComprador
{
    [JsonPropertyName("documento")] public string Documento { get; set; } = "";
    [JsonPropertyName("nombre")] public string Nombre { get; set; } = "";
    [JsonPropertyName("correo")] public string Correo { get; set; } = "";
}

// Comprador devuelto por FastAPI.
public sealed class Comprador
{
    [JsonPropertyName("id")] public int Id { get; set; }
    [JsonPropertyName("documento")] public string Documento { get; set; } = "";
    [JsonPropertyName("nombre")] public string Nombre { get; set; } = "";
    [JsonPropertyName("correo")] public string Correo { get; set; } = "";
}

// Venta devuelta por FastAPI (solo lectura en esta aplicación).
public sealed class Venta
{
    [JsonPropertyName("id")] public int Id { get; set; }
    [JsonPropertyName("vehiculoId")] public int VehiculoId { get; set; }
    [JsonPropertyName("compradorId")] public int CompradorId { get; set; }
    [JsonPropertyName("precioAcordado")] public string? PrecioAcordado { get; set; }
    [JsonPropertyName("moneda")] public string? Moneda { get; set; }
    [JsonPropertyName("estado")] public string Estado { get; set; } = "";
    [JsonPropertyName("notificacion")] public string? Notificacion { get; set; }
    [JsonPropertyName("fechaUTC")] public string? FechaUtc { get; set; }
}

// Página de GET /api/ventas.
public sealed class PaginaVentas
{
    [JsonPropertyName("items")] public List<Venta> Items { get; set; } = new();
    [JsonPropertyName("total")] public int Total { get; set; }
    [JsonPropertyName("limit")] public int Limit { get; set; }
    [JsonPropertyName("offset")] public int Offset { get; set; }
}

/// <summary>Respuesta de GET /api/identidad.</summary>
public sealed class IdentidadUsuario
{
    public string Usuario { get; set; } = "";
    public List<string> Roles { get; set; } = new();
}
