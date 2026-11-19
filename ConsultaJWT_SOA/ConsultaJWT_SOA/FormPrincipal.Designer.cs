namespace ConsultaJWT_SOA
{
    partial class FormPrincipal
    {
        /// <summary>
        /// Required designer variable.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        /// <summary>
        /// Clean up any resources being used.
        /// </summary>
        /// <param name="disposing">true if managed resources should be disposed; otherwise, false.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Windows Form Designer generated code

        /// <summary>
        /// Required method for Designer support - do not modify
        /// the contents of this method with the code editor.
        /// </summary>
        private void InitializeComponent()
        {
            lblTitulo = new Label();
            lblToken = new Label();
            txtToken = new TextBox();
            btnConsultar = new Button();
            dgvVehiculos = new DataGridView();
            lblTotal = new Label();
            lblEstado = new Label();
            ((System.ComponentModel.ISupportInitialize)dgvVehiculos).BeginInit();
            SuspendLayout();
            // 
            // lblTitulo
            // 
            lblTitulo.AutoSize = true;
            lblTitulo.Location = new Point(28, 20);
            lblTitulo.Name = "lblTitulo";
            lblTitulo.Size = new Size(149, 20);
            lblTitulo.TabIndex = 0;
            lblTitulo.Text = "Vehículos registrados";
            // 
            // lblToken
            // 
            lblToken.AutoSize = true;
            lblToken.Location = new Point(56, 83);
            lblToken.Name = "lblToken";
            lblToken.Size = new Size(43, 20);
            lblToken.TabIndex = 2;
            lblToken.Text = " JWT:";
            // 
            // txtToken
            // 
            txtToken.Location = new Point(141, 82);
            txtToken.Name = "txtToken";
            txtToken.Size = new Size(330, 27);
            txtToken.TabIndex = 3;
            // 
            // btnConsultar
            // 
            btnConsultar.Location = new Point(477, 83);
            btnConsultar.Name = "btnConsultar";
            btnConsultar.Size = new Size(94, 29);
            btnConsultar.TabIndex = 4;
            btnConsultar.Text = "Consultar";
            btnConsultar.UseVisualStyleBackColor = true;
            btnConsultar.Click += btnConsultar_Click;
            // 
            // dgvVehiculos
            // 
            dgvVehiculos.AllowUserToAddRows = false;
            dgvVehiculos.AllowUserToDeleteRows = false;
            dgvVehiculos.AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill;
            dgvVehiculos.ColumnHeadersHeightSizeMode = DataGridViewColumnHeadersHeightSizeMode.AutoSize;
            dgvVehiculos.Location = new Point(229, 193);
            dgvVehiculos.Name = "dgvVehiculos";
            dgvVehiculos.ReadOnly = true;
            dgvVehiculos.RowHeadersWidth = 51;
            dgvVehiculos.Size = new Size(521, 307);
            dgvVehiculos.TabIndex = 5;
            // 
            // lblTotal
            // 
            lblTotal.AutoSize = true;
            lblTotal.Location = new Point(448, 525);
            lblTotal.Name = "lblTotal";
            lblTotal.Size = new Size(143, 20);
            lblTotal.TabIndex = 6;
            lblTotal.Text = "Total de vehículos: 0";
            // 
            // lblEstado
            // 
            lblEstado.AutoSize = true;
            lblEstado.Location = new Point(56, 153);
            lblEstado.Name = "lblEstado";
            lblEstado.Size = new Size(150, 20);
            lblEstado.TabIndex = 7;
            lblEstado.Text = "Listo para consultar :)";
            // 
            // FormPrincipal
            // 
            AutoScaleDimensions = new SizeF(8F, 20F);
            AutoScaleMode = AutoScaleMode.Font;
            ClientSize = new Size(927, 563);
            Controls.Add(lblEstado);
            Controls.Add(lblTotal);
            Controls.Add(dgvVehiculos);
            Controls.Add(btnConsultar);
            Controls.Add(txtToken);
            Controls.Add(lblToken);
            Controls.Add(lblTitulo);
            Name = "FormPrincipal";
            Text = "Form1";
            ((System.ComponentModel.ISupportInitialize)dgvVehiculos).EndInit();
            ResumeLayout(false);
            PerformLayout();
        }

        #endregion

        private Label lblTitulo;
        private Label lblToken;
        private TextBox txtToken;
        private Button btnConsultar;
        private DataGridView dgvVehiculos;
        private Label lblTotal;
        private Label lblEstado;
    }
}