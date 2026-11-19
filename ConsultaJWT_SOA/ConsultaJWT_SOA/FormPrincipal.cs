using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;

namespace ConsultaJWT_SOA;

// Ventana principal: consume la API y presenta sus resultados.
public partial class FormPrincipal : Form
{
    // Dirección base del servidor que publica /api/vehiculos.
    private const string UrlJava = "http://127.0.0.1:8086";
    // Se reutiliza un único HttpClient para todas las consultas.
    private static readonly HttpClient ClienteHttp = new()
    {
        BaseAddress = new Uri(UrlJava),
        Timeout = TimeSpan.FromSeconds(15)
    };
    public FormPrincipal()
    {
        // Inicializa controles definidos por el diseñador.
        InitializeComponent();
    }
    // Evento Click: valida JWT, envía GET y actualiza la tabla.
    private async void btnConsultar_Click(object? sender, EventArgs e)
    {
        // Recupera el contenido del campo y elimina espacios.
        string token = txtToken.Text.Trim();
        // Acepta el token solo o con el prefijo "Bearer ".
        if (token.StartsWith("Bearer ",
        StringComparison.OrdinalIgnoreCase))
        {
            token = token[7..].Trim();
        }
        // Impide la petición si no existe token.
        if (string.IsNullOrWhiteSpace(token))
        {
            MostrarEstado("Ingrese el token JWT obtenido en Postman.",
            esError: true);
            LimpiarDatos();
            txtToken.Focus();
            return;

        }
        // Evita nuevos clics mientras se espera la respuesta.
        btnConsultar.Enabled = false;
        MostrarEstado("Consultando API Java...");
        try
        {
            // Crea una solicitud GET al recurso existente.
            using var solicitud = new HttpRequestMessage(
            HttpMethod.Get, "api/vehiculos");
            // Incorpora el token a Authorization: Bearer <JWT>.
            solicitud.Headers.Authorization =
            new AuthenticationHeaderValue("Bearer", token);
            // await mantiene activa la interfaz durante la espera.
            using HttpResponseMessage respuesta =
            await ClienteHttp.SendAsync(solicitud);
            // El servidor indica que el token no es válido.
            if (respuesta.StatusCode == HttpStatusCode.Unauthorized)
            {
                LimpiarDatos();
                MostrarEstado("HTTP 401: JWT inválido o vencido.",
                esError: true);
                return;
            }
            // El token autentica, pero carece de permisos.
            if (respuesta.StatusCode == HttpStatusCode.Forbidden)
            {
                LimpiarDatos();
                MostrarEstado("HTTP 403: sin permiso de consulta.",
                esError: true);
                return;
            }
            // Interpreta los restantes errores HTTP.
            if (!respuesta.IsSuccessStatusCode)
            {
                LimpiarDatos();
                MostrarEstado(
                $"Error HTTP {(int)respuesta.StatusCode} al consultar.",
                esError: true);
                return;
            }
            // Se espera un arreglo JSON de vehículos.
            string contenidoJson =
            await respuesta.Content.ReadAsStringAsync();
            // Transforma los objetos JSON en una lista tipada.
            List<Vehiculo> lista =
            JsonSerializer.Deserialize<List<Vehiculo>>(
            contenidoJson,
            new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            }) ?? new List<Vehiculo>();
            // Se restablece el enlace antes de cargar el resultado.
            dgvVehiculos.DataSource = null;
            dgvVehiculos.DataSource = lista;
            // El contador se obtiene de los datos recibidos.
            lblTotal.Text = $"Total de vehículos: {lista.Count}";
            // Una lista vacía sigue siendo una respuesta válida.
            MostrarEstado(lista.Count == 0
            ? "HTTP 200: no hay vehículos registrados."
            : "HTTP 200: consulta realizada correctamente.");
        }
        catch (HttpRequestException)
        {
            // Fallo de red o servicio no disponible.
            LimpiarDatos();
            MostrarEstado(
            "No se pudo conectar a Spring Boot en localhost:8086.",
            esError: true);
        }
        catch (TaskCanceledException)
        {
            // La API superó el tiempo de espera de 15 segundos.
            LimpiarDatos();
            MostrarEstado("La API no respondió en 15 segundos.",
            esError: true);
        }
        catch (JsonException)
        {
            // La respuesta no cumple el formato JSON esperado.
            LimpiarDatos();
            MostrarEstado("Formato JSON de vehículos no válido.",
            esError: true);
        }
        finally
        {
            // El botón se habilita aun si ocurrió un error.
            btnConsultar.Enabled = true;
        }
    }
    // Elimina registros anteriores y reinicia el contador.
    private void LimpiarDatos()
    {
        dgvVehiculos.DataSource = null;
        lblTotal.Text = "Total de vehículos: 0";
    }
    // Actualiza el mensaje visible de estado o error.
    private void MostrarEstado(string mensaje,
    bool esError = false)
    {
        lblEstado.ForeColor = esError
        ? Color.Firebrick
        : Color.FromArgb(50, 64, 76);
        lblEstado.Text = mensaje;
    }
}


