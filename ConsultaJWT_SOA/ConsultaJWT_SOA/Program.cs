using System;
using System.Windows.Forms;

namespace ConsultaJWT_SOA
{
    internal static class Program
    {
        /// <summary>
        ///  The main entry point for the application.
        /// </summary>
        [STAThread]
        private static void Main()
        {
            // To customize application configuration such as set high DPI settings or default font,
            // see https://aka.ms/applicationconfiguration.
            ApplicationConfiguration.Initialize();

            // Primero el login; solo si la autenticación es correcta se abre el panel de administración.
            // "Cerrar sesión" (DialogResult.Retry) vuelve a mostrar el login.
            while (true)
            {
                using var login = new FormLogin();
                if (login.ShowDialog() != DialogResult.OK) return;

                using var panel = new FormAdministracion(login.Api, login.Usuario);
                Application.Run(panel);
                if (panel.DialogResult != DialogResult.Retry) return;
            }
        }
    }
}