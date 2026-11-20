namespace ConsultaJWT_SOA;

/// <summary>
/// Pantalla inicial: solo pide usuario y contraseña. El JWT se obtiene con POST /oauth/token
/// y queda dentro de <see cref="Api"/>; el usuario nunca lo ve ni lo escribe.
/// </summary>
public sealed class FormLogin : Form
{
    private readonly TextBox _txtUsuario = new() { Dock = DockStyle.Fill };
    private readonly TextBox _txtClave = new() { Dock = DockStyle.Fill, UseSystemPasswordChar = true };
    private readonly Button _btnEntrar = new() { Text = "Iniciar sesión", AutoSize = true, Anchor = AnchorStyles.Right };
    private readonly Label _lblEstado = new() { Dock = DockStyle.Fill, AutoSize = true, MaximumSize = new Size(340, 0), ForeColor = Color.FromArgb(50, 64, 76) };

    /// <summary>Cliente ya autenticado (válido solo si el resultado del diálogo es OK).</summary>
    public ClienteApi Api { get; } = new();
    public string Usuario { get; private set; } = "";

    public FormLogin()
    {
        Text = "Iniciar sesión";
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false;
        MinimizeBox = false;
        StartPosition = FormStartPosition.CenterScreen;
        ClientSize = new Size(380, 230);
        AcceptButton = _btnEntrar;

        var titulo = new Label
        {
            Text = "Administración de vehículos", Dock = DockStyle.Top, Height = 44,
            Font = new Font(Font.FontFamily, 13, FontStyle.Bold), TextAlign = ContentAlignment.MiddleCenter
        };

        var tabla = new TableLayoutPanel { Dock = DockStyle.Fill, ColumnCount = 2, RowCount = 4, Padding = new Padding(16, 8, 16, 8) };
        tabla.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));
        tabla.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        for (int i = 0; i < 4; i++) tabla.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        tabla.Controls.Add(Etiqueta("Usuario:"), 0, 0);
        tabla.Controls.Add(_txtUsuario, 1, 0);
        tabla.Controls.Add(Etiqueta("Contraseña:"), 0, 1);
        tabla.Controls.Add(_txtClave, 1, 1);
        tabla.Controls.Add(_btnEntrar, 1, 2);
        tabla.Controls.Add(_lblEstado, 0, 3);
        tabla.SetColumnSpan(_lblEstado, 2);

        Controls.Add(tabla);
        Controls.Add(titulo);

        _lblEstado.Text = "Ingrese sus credenciales.";
        _btnEntrar.Click += async (_, _) => await Entrar();
    }

    private static Label Etiqueta(string texto) =>
        new() { Text = texto, AutoSize = true, Anchor = AnchorStyles.Left, Margin = new Padding(3, 7, 8, 0) };

    private async Task Entrar()
    {
        var usuario = _txtUsuario.Text.Trim();
        if (usuario.Length == 0 || _txtClave.Text.Length == 0)
        {
            Mostrar("Usuario y contraseña son obligatorios.", true);
            return;
        }

        _btnEntrar.Enabled = false;
        UseWaitCursor = true;
        Mostrar("Autenticando…");
        try
        {
            var r = await Api.IniciarSesionAsync(usuario, _txtClave.Text);
            if (r.Exito) r = await Api.CargarRolesAsync();   // el rol define qué se muestra
            if (r.Exito)
            {
                _txtClave.Clear();      // la contraseña no se conserva
                Usuario = usuario;
                DialogResult = DialogResult.OK;
            }
            else
            {
                _txtClave.Clear();
                _txtClave.Focus();
                Mostrar(r.Mensaje, true);
            }
        }
        finally
        {
            UseWaitCursor = false;
            _btnEntrar.Enabled = true;
        }
    }

    private void Mostrar(string mensaje, bool error = false)
    {
        _lblEstado.ForeColor = error ? Color.Firebrick : Color.FromArgb(50, 64, 76);
        _lblEstado.Text = mensaje;
    }
}
