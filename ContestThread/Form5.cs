// Type: ContestThread.Form5
// Assembly: ContestThread, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null
// MVID: 070C1006-D1E9-45BF-87DB-DDCEC0C82A43
// Assembly location: C:\Users\Baron\AppData\Local\Apps\2.0\YN2BW7H6.CA8\HH1B452R.AZQ\cont..tion_0eb10ad23c693329_0001.0000_1574a1e9c67cead3\ContestThread.exe

using System;
using System.ComponentModel;
using System.Drawing;
using System.IO;
using System.Net;
using System.Windows.Forms;

namespace ContestThread
{
  public class Form5 : Form
  {
    private IContainer components = (IContainer) null;
    private Label label1;
    private BackgroundWorker backgroundWorker1;
    private RichTextBox richTextBox1;

    public Form5()
    {
      this.InitializeComponent();
    }

    private static string GetHtmlPage(string strURL)
    {
      Form5.GetHtmlPage("http://gamerzcolony.com/update/releasenotes.html");
      string str;
      using (StreamReader streamReader = new StreamReader(WebRequest.Create(strURL).GetResponse().GetResponseStream()))
      {
        str = streamReader.ReadToEnd();
        streamReader.Close();
      }
      return str;
    }

    protected override void Dispose(bool disposing)
    {
      if (disposing && this.components != null)
        this.components.Dispose();
      base.Dispose(disposing);
    }

    private void InitializeComponent()
    {
            System.ComponentModel.ComponentResourceManager resources = new System.ComponentModel.ComponentResourceManager(typeof(Form5));
            this.label1 = new System.Windows.Forms.Label();
            this.backgroundWorker1 = new System.ComponentModel.BackgroundWorker();
            this.richTextBox1 = new System.Windows.Forms.RichTextBox();
            this.SuspendLayout();
            // 
            // label1
            // 
            this.label1.AutoSize = true;
            this.label1.BorderStyle = System.Windows.Forms.BorderStyle.Fixed3D;
            this.label1.Font = new System.Drawing.Font("Microsoft Sans Serif", 24F, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, ((byte)(0)));
            this.label1.Location = new System.Drawing.Point(64, 6);
            this.label1.Name = "label1";
            this.label1.Size = new System.Drawing.Size(239, 39);
            this.label1.TabIndex = 0;
            this.label1.Text = "Release Notes";
            // 
            // richTextBox1
            // 
            this.richTextBox1.Location = new System.Drawing.Point(12, 48);
            this.richTextBox1.Name = "richTextBox1";
            this.richTextBox1.ReadOnly = true;
            this.richTextBox1.Size = new System.Drawing.Size(356, 262);
            this.richTextBox1.TabIndex = 1;
            this.richTextBox1.Text = resources.GetString("richTextBox1.Text");
            this.richTextBox1.TextChanged += new System.EventHandler(this.richTextBox1_TextChanged);
            // 
            // Form5
            // 
            this.ClientSize = new System.Drawing.Size(380, 322);
            this.Controls.Add(this.richTextBox1);
            this.Controls.Add(this.label1);
            this.Name = "Form5";
            this.Text = "Release Notes";
            this.ResumeLayout(false);
            this.PerformLayout();

    }

    private void richTextBox1_TextChanged(object sender, System.EventArgs e)
    {

    }
  }
}
