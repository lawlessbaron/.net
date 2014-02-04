// Type: ContestThread.Form2
// Assembly: ContestThread, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null
// MVID: 070C1006-D1E9-45BF-87DB-DDCEC0C82A43
// Assembly location: C:\Users\Baron\AppData\Local\Apps\2.0\YN2BW7H6.CA8\HH1B452R.AZQ\cont..tion_0eb10ad23c693329_0001.0000_1574a1e9c67cead3\ContestThread.exe

using System.ComponentModel;
using System.Drawing;
using System.Windows.Forms;

namespace ContestThread
{
  public class Form2 : Form
  {
    private IContainer components = (IContainer) null;
    private Label label1;
    private RichTextBox richTextBox1;

    public Form2()
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
      this.richTextBox1 = new RichTextBox();
      this.SuspendLayout();
      this.label1.AutoSize = true;
      this.label1.BorderStyle = BorderStyle.Fixed3D;
      this.label1.Font = new Font("Microsoft Sans Serif", 36f, FontStyle.Bold, GraphicsUnit.Point, (byte) 0);
      this.label1.Location = new Point(42, 9);
      this.label1.Name = "label1";
      this.label1.Size = new Size(344, 57);
      this.label1.TabIndex = 0;
      this.label1.Text = "HOW TO USE";
      this.richTextBox1.Location = new Point(12, 69);
      this.richTextBox1.Name = "richTextBox1";
      this.richTextBox1.ReadOnly = true;
      this.richTextBox1.Size = new Size(419, 275);
      this.richTextBox1.TabIndex = 1;
      this.richTextBox1.Text = "To use this program just type out as usual upon doing so when you save please choose your file type for example when typing the name of the file for Example Baron.txt and it will save as a txt file ";
      this.AutoScaleDimensions = new SizeF(6f, 13f);
      this.ClientSize = new Size(443, 356);
      this.Controls.Add((Control) this.richTextBox1);
      this.Controls.Add((Control) this.label1);
      this.Name = "Form2";
      this.Text = "How to use";
      this.ResumeLayout(false);
      this.PerformLayout();
    }
  }
}
