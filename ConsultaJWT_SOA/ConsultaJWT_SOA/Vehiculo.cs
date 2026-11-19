using System.Text.Json.Serialization;

// DTO: representa cada vehículo recibido en el arreglo JSON.
public sealed class Vehiculo
{
    // Identificador numérico del vehículo en la API.
    [JsonPropertyName("idVehiculo")]
    public int IdVehiculo { get; set; }
    // Marca del vehículo registrada en el servidor.
    [JsonPropertyName("marca")]
    public string Marca { get; set; } = "";
    // Modelo comercial del vehículo.
    [JsonPropertyName("modelo")]
    public string Modelo { get; set; } = "";
    // Placa asignada al vehículo.
    [JsonPropertyName("placa")]
    public string Placa { get; set; } = "";
    // Número de identificación del chasis.
    [JsonPropertyName("chasis")]
    public string Chasis { get; set; } = "";
    // Año del modelo en la base de datos.
    [JsonPropertyName("anio")]
    public int Anio { get; set; }
    // Color registrado para el vehículo.
    [JsonPropertyName("color")]
    public string Color { get; set; } = "";
    // Decimal conserva la precisión del precio monetario.
    [JsonPropertyName("precio")]
    public decimal Precio { get; set; }
    // Estado actual: por ejemplo, DISPONIBLE o VENDIDO.
    [JsonPropertyName("estado")]
    public string Estado { get; set; } = "";
}
