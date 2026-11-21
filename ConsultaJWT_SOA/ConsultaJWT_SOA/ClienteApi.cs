using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace ConsultaJWT_SOA;

/// <summary>
/// Cliente HTTP de la aplicación administrativa. No conoce los controles de Windows Forms:
/// recibe datos, llama a NGINX (8090) y devuelve un <see cref="ResultadoApi{T}"/>.
/// Operaciones: crear vehículo, crear comprador y listar vehículos, compradores y ventas.
/// Esta clase NO ofrece ningún método para registrar ventas.
/// </summary>
public sealed class ClienteApi
{
    // Punto único de entrada REST (NGINX).
    public const string UrlBase = "http://127.0.0.1:8090";

    private static readonly JsonSerializerOptions OpcionesJson = new() { PropertyNameCaseInsensitive = true };
    private static readonly HttpClient Http = new()
    {
        BaseAddress = new Uri(UrlBase),
        Timeout = TimeSpan.FromSeconds(15)
    };

    private string _token = "";

    /// <summary>
    /// POST /oauth/token. El usuario escribe solo usuario y contraseña; la aplicación agrega el cliente OAuth
    /// leído de secrets.local.json (excluido de Git, ver ConfigLocal), nunca del código fuente.
    /// </summary>
    public async Task<ResultadoApi<string>> IniciarSesionAsync(string usuario, string clave)
    {
        var config = ConfigLocal.Cargar();
        if (config is null)
            return Fallo<string>(0, "Falta secrets.local.json junto a la aplicación (clientId, clientSecret, idapli).");

        using var solicitud = new HttpRequestMessage(HttpMethod.Post, "oauth/token")
        {
            Content = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["grant_type"] = "password", ["username"] = usuario, ["password"] = clave, ["idapli"] = config.IdApli
            })
        };
        solicitud.Headers.Authorization = new AuthenticationHeaderValue("Basic",
            Convert.ToBase64String(Encoding.UTF8.GetBytes($"{config.ClientId}:{config.ClientSecret}")));

        return await EnviarAsync<string>(solicitud, null, async (resp, cuerpo) =>
        {
            using var doc = JsonDocument.Parse(cuerpo);
            var raiz = doc.RootElement;
            var token = raiz.TryGetProperty("access_token", out var a) ? a.GetString()
                      : raiz.TryGetProperty("accessToken", out var b) ? b.GetString() : null;
            if (string.IsNullOrEmpty(token)) return Fallo<string>((int)resp.StatusCode, "La respuesta no incluye un JWT.");
            _token = token;
            return Ok((int)resp.StatusCode, token, "Sesión iniciada.");
        });
    }

    // ---- Roles (GET /api/identidad) ----
    /// <summary>Roles del usuario autenticado, sin el prefijo "ROLE_" (CONSULTA, OPERADOR, ADMIN).</summary>
    public IReadOnlyList<string> Roles { get; private set; } = Array.Empty<string>();

    public bool EsAdmin => Roles.Contains("ADMIN");
    /// <summary>Crear vehículos y compradores y listar compradores: OPERADOR o ADMIN.</summary>
    public bool PuedeOperar => EsAdmin || Roles.Contains("OPERADOR");

    /// <summary>Consulta los roles del usuario con el JWT ya emitido y los guarda en el cliente.</summary>
    public async Task<ResultadoApi<string>> CargarRolesAsync()
    {
        var r = await Obtener<IdentidadUsuario>("api/identidad", "identidad");
        if (!r.Exito || r.Datos is null) return Fallo<string>(r.CodigoHttp, r.Mensaje);
        Roles = r.Datos.Roles
            .Select(x => x.StartsWith("ROLE_", StringComparison.OrdinalIgnoreCase) ? x[5..] : x)
            .Select(x => x.ToUpperInvariant()).ToList();
        return Ok(r.CodigoHttp, string.Join(", ", Roles), "Identidad cargada.");
    }

    // ---- API Java (vehículos) ----
    public Task<ResultadoApi<List<Vehiculo>>> ListarVehiculosAsync() =>
        Obtener<List<Vehiculo>>("api/vehiculos", "vehículos");

    public Task<ResultadoApi<Vehiculo>> CrearVehiculoAsync(NuevoVehiculo v) =>
        Crear<Vehiculo>("api/vehiculos", v, "Vehículo creado correctamente.");

    // ---- FastAPI (compradores y ventas) ----
    public Task<ResultadoApi<List<Comprador>>> ListarCompradoresAsync() =>
        Obtener<List<Comprador>>("api/compradores", "compradores");

    public Task<ResultadoApi<Comprador>> CrearCompradorAsync(NuevoComprador c) =>
        Crear<Comprador>("api/compradores", c, "Comprador creado correctamente.");

    /// <summary>Lista todas las ventas del usuario recorriendo las páginas (máximo 50 por página).</summary>
    public async Task<ResultadoApi<List<Venta>>> ListarVentasAsync()
    {
        var todas = new List<Venta>();
        int offset = 0, total;
        int codigo = 200;
        do
        {
            var pagina = await Obtener<PaginaVentas>($"api/ventas?limit=50&offset={offset}", "ventas");
            if (!pagina.Exito || pagina.Datos is null)
                return Fallo<List<Venta>>(pagina.CodigoHttp, pagina.Mensaje);
            codigo = pagina.CodigoHttp;
            todas.AddRange(pagina.Datos.Items);
            total = pagina.Datos.Total;
            if (pagina.Datos.Items.Count == 0) break;
            offset += pagina.Datos.Items.Count;
        } while (offset < total);
        return Ok(codigo, todas, $"HTTP {codigo}: {todas.Count} venta(s) cargada(s).");
    }

    // ---- Mecánica común ----
    private Task<ResultadoApi<T>> Obtener<T>(string ruta, string nombre) where T : class
    {
        var solicitud = new HttpRequestMessage(HttpMethod.Get, ruta);
        return EnviarAsync<T>(solicitud, _token, (resp, cuerpo) =>
        {
            var datos = JsonSerializer.Deserialize<T>(cuerpo, OpcionesJson);
            return Task.FromResult(datos is null
                ? Fallo<T>((int)resp.StatusCode, $"Formato JSON de {nombre} no válido.")
                : Ok((int)resp.StatusCode, datos, $"HTTP {(int)resp.StatusCode}: consulta de {nombre} realizada."));
        });
    }

    private Task<ResultadoApi<T>> Crear<T>(string ruta, object cuerpo, string exito) where T : class
    {
        var solicitud = new HttpRequestMessage(HttpMethod.Post, ruta)
        {
            Content = new StringContent(JsonSerializer.Serialize(cuerpo), Encoding.UTF8, "application/json")
        };
        return EnviarAsync<T>(solicitud, _token, (resp, texto) =>
        {
            var datos = JsonSerializer.Deserialize<T>(texto, OpcionesJson);
            return Task.FromResult(datos is null
                ? Fallo<T>((int)resp.StatusCode, "La API respondió sin los datos creados.")
                : Ok((int)resp.StatusCode, datos, $"HTTP {(int)resp.StatusCode}: {exito}"));
        });
    }

    private static async Task<ResultadoApi<T>> EnviarAsync<T>(
        HttpRequestMessage solicitud, string? token,
        Func<HttpResponseMessage, string, Task<ResultadoApi<T>>> alExito)
    {
        using (solicitud)
        {
            if (token is not null)
            {
                if (string.IsNullOrWhiteSpace(token))
                    return Fallo<T>(401, "HTTP 401: no hay sesión activa. Inicie sesión.");
                solicitud.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            }
            solicitud.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            try
            {
                using var respuesta = await Http.SendAsync(solicitud);
                var cuerpo = await respuesta.Content.ReadAsStringAsync();
                if (!respuesta.IsSuccessStatusCode)
                    return Fallo<T>((int)respuesta.StatusCode, MensajeDeError(respuesta.StatusCode, cuerpo));
                return await alExito(respuesta, cuerpo);
            }
            catch (HttpRequestException)
            {
                return Fallo<T>(0, "No se pudo conectar con NGINX (127.0.0.1:8090). Compruebe que los servicios estén activos.");
            }
            catch (TaskCanceledException)
            {
                return Fallo<T>(0, "El servicio no respondió en 15 segundos.");
            }
            catch (JsonException)
            {
                return Fallo<T>(0, "La respuesta del servicio no tiene un formato JSON válido.");
            }
        }
    }

    // Traduce el código HTTP y el detalle del servicio (Spring o FastAPI) a un texto para el usuario.
    private static string MensajeDeError(HttpStatusCode estado, string cuerpo)
    {
        var detalle = ExtraerDetalle(cuerpo);
        var codigo = (int)estado;
        var baseMsg = codigo switch
        {
            400 => "HTTP 400: solicitud incorrecta.",
            401 => "HTTP 401: JWT ausente, inválido o vencido.",
            403 => "HTTP 403: el usuario no tiene permiso para esta operación.",
            404 => "HTTP 404: recurso no encontrado.",
            409 => "HTTP 409: conflicto (dato duplicado o estado incompatible).",
            422 => "HTTP 422: datos inválidos.",
            502 or 503 => $"HTTP {codigo}: servicio no disponible.",
            504 => "HTTP 504: el servicio no respondió a tiempo.",
            _ => $"HTTP {codigo}: operación no completada."
        };
        return string.IsNullOrWhiteSpace(detalle) ? baseMsg : $"{baseMsg} {detalle}";
    }

    private static string ExtraerDetalle(string cuerpo)
    {
        try
        {
            using var doc = JsonDocument.Parse(cuerpo);
            foreach (var campo in new[] { "detail", "detalle", "mensaje", "error", "title" })
                if (doc.RootElement.TryGetProperty(campo, out var v) && v.ValueKind == JsonValueKind.String)
                    return v.GetString() ?? "";
        }
        catch (JsonException) { /* el cuerpo no era JSON: se ignora */ }
        return "";
    }

    private static ResultadoApi<T> Ok<T>(int codigo, T datos, string mensaje) =>
        new() { CodigoHttp = codigo, Exito = true, Datos = datos, Mensaje = mensaje };

    private static ResultadoApi<T> Fallo<T>(int codigo, string mensaje) =>
        new() { CodigoHttp = codigo, Exito = false, Mensaje = mensaje };
}
