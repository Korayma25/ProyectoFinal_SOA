using System.Text.Json;

namespace ConsultaJWT_SOA;

/// <summary>
/// Cliente OAuth de esta aplicación, leído de secrets.local.json (ignorado por Git por el patrón "secrets.*").
/// Se busca junto al ejecutable, que es donde el proyecto lo copia al compilar.
/// </summary>
public sealed class ConfigLocal
{
    public string ClientId { get; set; } = "";
    public string ClientSecret { get; set; } = "";
    public string IdApli { get; set; } = "92";

    public static ConfigLocal? Cargar()
    {
        var ruta = Path.Combine(AppContext.BaseDirectory, "secrets.local.json");
        if (!File.Exists(ruta)) return null;
        try
        {
            var c = JsonSerializer.Deserialize<ConfigLocal>(File.ReadAllText(ruta),
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            return c is null || string.IsNullOrWhiteSpace(c.ClientId) || string.IsNullOrWhiteSpace(c.ClientSecret) ? null : c;
        }
        catch (JsonException) { return null; }
    }
}
