// Type: ContestThread.Form4
// Assembly: ContestThread, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null
// MVID: 070C1006-D1E9-45BF-87DB-DDCEC0C82A43
// Assembly location: C:\Users\Baron\AppData\Local\Apps\2.0\YN2BW7H6.CA8\HH1B452R.AZQ\cont..tion_0eb10ad23c693329_0001.0000_1574a1e9c67cead3\ContestThread.exe

using System.ComponentModel;
using System.Drawing;
using System.Windows.Forms;

namespace ContestThread
{
  public class Form4 : Form
  {
    private IContainer components = (IContainer) null;
    private Label label1;
    private TextBox textBox1;

    public Form4()
    {
      this.InitializeComponent();
    }

    protected override void Dispose(bool disposing)
    {
      if (disposing && this.components != null)
        this.components.Dispose();
      base.Dispose(disposing);
    }

    private void InitializeComponent()
    {
      this.label1 = new Label();
      this.textBox1 = new TextBox();
      this.SuspendLayout();
      this.label1.AutoSize = true;
      this.label1.BorderStyle = BorderStyle.Fixed3D;
      this.label1.Font = new Font("Microsoft Sans Serif", 36f, FontStyle.Regular, GraphicsUnit.Point, (byte) 0);
      this.label1.Location = new Point(7, 9);
      this.label1.Name = "label1";
      this.label1.Size = new Size(377, 57);
      this.label1.TabIndex = 0;
      this.label1.Text = "Virus Scan Sites";
      this.textBox1.Location = new Point(9, 80);
      this.textBox1.Multiline = true;
      this.textBox1.Name = "textBox1";
      this.textBox1.ReadOnly = true;
      this.textBox1.Size = new Size(372, 228);
      this.textBox1.TabIndex = 1;
      this.textBox1.Text = "https://www.metascan-online.com/en\r\nhttps://www.virustotal.com/\r\nhttp://www.virscan.org/\r\nhttp://www.fortiguard.com/antivirus/virus_scanner.html";
      this.AutoScaleDimensions = new SizeF(6f, 13f);
      this.ClientSize = new Size(391, 320);
      this.Controls.Add((Control) this.textBox1);
      this.Controls.Add((Control) this.label1);
      this.Name = "Form4";
      this.Text = "Virus Scan Sites";
      this.ResumeLayout(false);
      this.PerformLayout();
    }
  }
}
