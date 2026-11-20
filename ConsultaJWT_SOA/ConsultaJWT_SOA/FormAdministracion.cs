using System.Text.RegularExpressions;

namespace ConsultaJWT_SOA;

/// <summary>
/// Ventana administrativa (Actividad 5): crea vehículos y compradores y lista vehículos,
/// compradores y ventas. Toda la comunicación HTTP vive en <see cref="ClienteApi"/>.
/// Por requisito, esta ventana no ofrece ninguna opción para registrar ventas.
/// </summary>
public sealed class FormAdministracion : Form
{
    private readonly ClienteApi _api = new();

    // Acceso
    private readonly TextBox _txtToken = new() { Width = 300, UseSystemPasswordChar = true };
    private readonly TextBox _txtUsuario = new() { Width = 120 };
    private readonly TextBox _txtClave = new() { Width = 120, UseSystemPasswordChar = true };
    private readonly Button _btnEntrar = new() { Text = "Iniciar sesión", AutoSize = true };
    private readonly Button _btnUsarToken = new() { Text = "Usar token", AutoSize = true };

    // Vehículos
    private readonly TextBox _vMarca = new(), _vModelo = new(), _vPlaca = new(), _vChasis = new() { MaxLength = 17 }, _vColor = new();
    private readonly NumericUpDown _vAnio = new() { Minimum = 1950, Maximum = 2100, Value = DateTime.Now.Year };
    private readonly NumericUpDown _vPrecio = new() { Minimum = 0, Maximum = 9999999999, DecimalPlaces = 2, ThousandsSeparator = true };
    private readonly Button _btnCrearVehiculo = new() { Text = "Crear vehículo", AutoSize = true };
    private readonly Button _btnListarVehiculos = new() { Text = "Listar vehículos", AutoSize = true };
    private readonly DataGridView _gridVehiculos = NuevaGrilla();
    private readonly Label _lblTotalVehiculos = new() { AutoSize = true, Text = "Total de vehículos: 0" };

    // Compradores
    private readonly TextBox _cDocumento = new(), _cNombre = new(), _cCorreo = new();
    private readonly Button _btnCrearComprador = new() { Text = "Crear comprador", AutoSize = true };
    private readonly Button _btnListarCompradores = new() { Text = "Listar compradores", AutoSize = true };
    private readonly DataGridView _gridCompradores = NuevaGrilla();
    private readonly Label _lblTotalCompradores = new() { AutoSize = true, Text = "Total de compradores: 0" };

    // Ventas (solo lectura)
    private readonly Button _btnListarVentas = new() { Text = "Listar ventas", AutoSize = true };
    private readonly DataGridView _gridVentas = NuevaGrilla();
    private readonly Label _lblTotalVentas = new() { AutoSize = true, Text = "Total de ventas: 0" };

    private readonly Label _lblEstado = new() { Dock = DockStyle.Fill, TextAlign = ContentAlignment.MiddleLeft, Padding = new Padding(8, 0, 8, 0) };
    private readonly List<Control> _controlesOperativos = new();

    public FormAdministracion()
    {
        Text = "Administración de vehículos y compradores";
        MinimumSize = new Size(900, 640);
        Size = new Size(1000, 700);
        StartPosition = FormStartPosition.CenterScreen;

        var raiz = new TableLayoutPanel { Dock = DockStyle.Fill, ColumnCount = 1, RowCount = 3 };
        raiz.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        raiz.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
        raiz.RowStyles.Add(new RowStyle(SizeType.Absolute, 36));
        raiz.Controls.Add(ConstruirAcceso(), 0, 0);

        var pestanas = new TabControl { Dock = DockStyle.Fill };
        pestanas.TabPages.Add(ConstruirPestanaVehiculos());
        pestanas.TabPages.Add(ConstruirPestanaCompradores());
        pestanas.TabPages.Add(ConstruirPestanaVentas());
        raiz.Controls.Add(pestanas, 0, 1);
        raiz.Controls.Add(_lblEstado, 0, 2);
        Controls.Add(raiz);

        _btnEntrar.Click += async (_, _) => await IniciarSesion();
        _btnUsarToken.Click += (_, _) => UsarToken();
        _btnCrearVehiculo.Click += async (_, _) => await CrearVehiculo();
        _btnListarVehiculos.Click += async (_, _) => await ListarVehiculos();
        _btnCrearComprador.Click += async (_, _) => await CrearComprador();
        _btnListarCompradores.Click += async (_, _) => await ListarCompradores();
        _btnListarVentas.Click += async (_, _) => await ListarVentas();

        _controlesOperativos.AddRange(new Control[]
        {
            _btnEntrar, _btnUsarToken, _btnCrearVehiculo, _btnListarVehiculos,
            _btnCrearComprador, _btnListarCompradores, _btnListarVentas
        });
        Mostrar("Inicie sesión o pegue un JWT para comenzar.");
    }

    // ---------- Construcción de la interfaz ----------
    private static DataGridView NuevaGrilla() => new()
    {
        Dock = DockStyle.Fill, ReadOnly = true, AllowUserToAddRows = false, AllowUserToDeleteRows = false,
        AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.AllCells, SelectionMode = DataGridViewSelectionMode.FullRowSelect,
        BackgroundColor = SystemColors.Window, RowHeadersVisible = false
    };

    private Control ConstruirAcceso()
    {
        var caja = new GroupBox { Text = "Acceso (JWT)", Dock = DockStyle.Top, AutoSize = true, Padding = new Padding(8) };
        var fila = new FlowLayoutPanel { Dock = DockStyle.Fill, AutoSize = true, WrapContents = true };
        fila.Controls.AddRange(new Control[]
        {
            Etiqueta("Token:"), _txtToken, _btnUsarToken,
            Etiqueta("   Usuario:"), _txtUsuario, Etiqueta("Contraseña:"), _txtClave, _btnEntrar
        });
        caja.Controls.Add(fila);
        return caja;
    }

    private static Label Etiqueta(string texto) => new() { Text = texto, AutoSize = true, Anchor = AnchorStyles.Left, Margin = new Padding(3, 7, 3, 0) };

    private static TableLayoutPanel Formulario(params (string etiqueta, Control campo)[] filas)
    {
        var t = new TableLayoutPanel { ColumnCount = 2, AutoSize = true, Dock = DockStyle.Top, Padding = new Padding(6) };
        t.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));
        t.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 260));
        foreach (var (etiqueta, campo) in filas)
        {
            t.RowStyles.Add(new RowStyle(SizeType.AutoSize));
            campo.Dock = DockStyle.Fill;
            t.Controls.Add(Etiqueta(etiqueta));
            t.Controls.Add(campo);
        }
        return t;
    }

    private TabPage ConstruirPestanaVehiculos()
    {
        var pagina = new TabPage("Vehículos");
        var formulario = Formulario(
            ("Marca:", _vMarca), ("Modelo:", _vModelo), ("Placa:", _vPlaca),
            ("Chasis (17):", _vChasis), ("Año:", _vAnio), ("Color:", _vColor), ("Precio (USD):", _vPrecio));
        var acciones = new FlowLayoutPanel { Dock = DockStyle.Top, AutoSize = true, Padding = new Padding(6) };
        acciones.Controls.AddRange(new Control[] { _btnCrearVehiculo, _btnListarVehiculos, _lblTotalVehiculos });
        _lblTotalVehiculos.Margin = new Padding(12, 7, 0, 0);
        pagina.Controls.Add(_gridVehiculos);
        pagina.Controls.Add(acciones);
        pagina.Controls.Add(formulario);
        return pagina;
    }

    private TabPage ConstruirPestanaCompradores()
    {
        var pagina = new TabPage("Compradores");
        var formulario = Formulario(("Documento:", _cDocumento), ("Nombre:", _cNombre), ("Correo:", _cCorreo));
        var acciones = new FlowLayoutPanel { Dock = DockStyle.Top, AutoSize = true, Padding = new Padding(6) };
        acciones.Controls.AddRange(new Control[] { _btnCrearComprador, _btnListarCompradores, _lblTotalCompradores });
        _lblTotalCompradores.Margin = new Padding(12, 7, 0, 0);
        pagina.Controls.Add(_gridCompradores);
        pagina.Controls.Add(acciones);
        pagina.Controls.Add(formulario);
        return pagina;
    }

    private TabPage ConstruirPestanaVentas()
    {
        var pagina = new TabPage("Ventas (consulta)");
        var acciones = new FlowLayoutPanel { Dock = DockStyle.Top, AutoSize = true, Padding = new Padding(6) };
        acciones.Controls.AddRange(new Control[] { _btnListarVentas, _lblTotalVentas });
        _lblTotalVentas.Margin = new Padding(12, 7, 0, 0);
        pagina.Controls.Add(_gridVentas);
        pagina.Controls.Add(acciones);
        return pagina;
    }

    // ---------- Estado visible ----------
    private void Mostrar(string mensaje, bool error = false)
    {
        _lblEstado.ForeColor = error ? Color.Firebrick : Color.FromArgb(50, 64, 76);
        _lblEstado.Text = mensaje;
    }

    // Ejecuta una operación mostrando "carga" y bloqueando los botones para evitar envíos dobles.
    private async Task Ejecutar(string cargando, Func<Task> operacion)
    {
        foreach (var c in _controlesOperativos) c.Enabled = false;
        UseWaitCursor = true;
        Mostrar(cargando);
        try { await operacion(); }
        finally
        {
            UseWaitCursor = false;
            foreach (var c in _controlesOperativos) c.Enabled = true;
        }
    }

    private void Resultado<T>(ResultadoApi<T> r) => Mostrar(r.Mensaje, !r.Exito);

    // ---------- Acceso ----------
    private void UsarToken()
    {
        _api.EstablecerToken(_txtToken.Text);
        if (!_api.TieneToken) { Mostrar("Pegue un JWT válido en el campo Token.", true); return; }
        Mostrar("Token cargado. Ya puede operar; el servidor validará los permisos.");
    }

    private async Task IniciarSesion()
    {
        if (string.IsNullOrWhiteSpace(_txtUsuario.Text) || string.IsNullOrEmpty(_txtClave.Text))
        { Mostrar("Usuario y contraseña son obligatorios.", true); return; }
        await Ejecutar("Autenticando…", async () =>
        {
            var r = await _api.IniciarSesionAsync(_txtUsuario.Text.Trim(), _txtClave.Text);
            if (r.Exito) { _txtToken.Text = r.Datos; _txtClave.Clear(); }
            Resultado(r);
        });
    }

    // ---------- Vehículos ----------
    private async Task CrearVehiculo()
    {
        var errores = new List<string>();
        if (string.IsNullOrWhiteSpace(_vMarca.Text)) errores.Add("marca");
        if (string.IsNullOrWhiteSpace(_vModelo.Text)) errores.Add("modelo");
        if (string.IsNullOrWhiteSpace(_vPlaca.Text)) errores.Add("placa");
        if (_vChasis.Text.Trim().Length != 17) errores.Add("chasis (exactamente 17 caracteres)");
        if (_vPrecio.Value <= 0) errores.Add("precio (mayor que cero)");
        if (errores.Count > 0) { Mostrar("Validación: revise " + string.Join(", ", errores) + ".", true); return; }

        var nuevo = new NuevoVehiculo
        {
            Marca = _vMarca.Text.Trim(), Modelo = _vModelo.Text.Trim(), Placa = _vPlaca.Text.Trim(),
            Chasis = _vChasis.Text.Trim(), Anio = (int)_vAnio.Value,
            Color = string.IsNullOrWhiteSpace(_vColor.Text) ? null : _vColor.Text.Trim(), Precio = _vPrecio.Value
        };
        await Ejecutar("Creando vehículo…", async () =>
        {
            var r = await _api.CrearVehiculoAsync(nuevo);
            if (r.Exito && r.Datos is not null)
            {
                Mostrar($"{r.Mensaje} ID asignado: {r.Datos.IdVehiculo}.");
                foreach (var c in new[] { _vMarca, _vModelo, _vPlaca, _vChasis, _vColor }) c.Clear();
                _vPrecio.Value = 0;
            }
            else Resultado(r);
        });
    }

    private async Task ListarVehiculos() => await Ejecutar("Cargando vehículos…", async () =>
    {
        var r = await _api.ListarVehiculosAsync();
        _gridVehiculos.DataSource = null;
        if (r.Exito && r.Datos is not null)
        {
            _gridVehiculos.DataSource = r.Datos;
            _lblTotalVehiculos.Text = $"Total de vehículos: {r.Datos.Count}";
        }
        else _lblTotalVehiculos.Text = "Total de vehículos: 0";
        Resultado(r);
    });

    // ---------- Compradores ----------
    private static readonly Regex PatronCorreo = new(@"^[^@\s]+@[^@\s]+\.[^@\s]+$");

    private async Task CrearComprador()
    {
        var errores = new List<string>();
        if (_cDocumento.Text.Trim().Length < 3) errores.Add("documento (mínimo 3 caracteres)");
        if (_cNombre.Text.Trim().Length < 2) errores.Add("nombre (mínimo 2 caracteres)");
        if (!PatronCorreo.IsMatch(_cCorreo.Text.Trim())) errores.Add("correo (formato nombre@dominio.ext)");
        if (errores.Count > 0) { Mostrar("Validación: revise " + string.Join(", ", errores) + ".", true); return; }

        var nuevo = new NuevoComprador { Documento = _cDocumento.Text.Trim(), Nombre = _cNombre.Text.Trim(), Correo = _cCorreo.Text.Trim() };
        await Ejecutar("Creando comprador…", async () =>
        {
            var r = await _api.CrearCompradorAsync(nuevo);
            if (r.Exito && r.Datos is not null)
            {
                Mostrar($"{r.Mensaje} ID asignado: {r.Datos.Id}.");
                _cDocumento.Clear(); _cNombre.Clear(); _cCorreo.Clear();
            }
            else Resultado(r);
        });
    }

    private async Task ListarCompradores() => await Ejecutar("Cargando compradores…", async () =>
    {
        var r = await _api.ListarCompradoresAsync();
        _gridCompradores.DataSource = null;
        if (r.Exito && r.Datos is not null)
        {
            _gridCompradores.DataSource = r.Datos;
            _lblTotalCompradores.Text = $"Total de compradores: {r.Datos.Count}";
        }
        else _lblTotalCompradores.Text = "Total de compradores: 0";
        Resultado(r);
    });

    // ---------- Ventas (solo lectura) ----------
    private async Task ListarVentas() => await Ejecutar("Cargando ventas…", async () =>
    {
        var r = await _api.ListarVentasAsync();
        _gridVentas.DataSource = null;
        if (r.Exito && r.Datos is not null)
        {
            _gridVentas.DataSource = r.Datos;
            _lblTotalVentas.Text = $"Total de ventas: {r.Datos.Count}";
        }
        else _lblTotalVentas.Text = "Total de ventas: 0";
        Resultado(r);
    });
}
