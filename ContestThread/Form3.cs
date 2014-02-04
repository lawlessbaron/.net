// Type: ContestThread.Form3
// Assembly: ContestThread, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null
// MVID: 070C1006-D1E9-45BF-87DB-DDCEC0C82A43
// Assembly location: C:\Users\Baron\AppData\Local\Apps\2.0\YN2BW7H6.CA8\HH1B452R.AZQ\cont..tion_0eb10ad23c693329_0001.0000_1574a1e9c67cead3\ContestThread.exe

using System;
using System.ComponentModel;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Windows.Forms;

namespace ContestThread
{
  public class Form3 : Form
  {
    private IContainer components = (IContainer) null;
    private Label label1;
    private Label label2;
    private Label label3;
    private TextBox textBox1;
    private Label label4;
    private TextBox textBox2;
    private Label label5;
    private Label label6;
    private TextBox textBox3;
    private Label label7;
    private TextBox textBox4;
    private Label label8;
    private TextBox textBox5;
    private Button button1;
    private Button button3;
    private LinkLabel linkLabel1;

    public Form3()
    {
      this.InitializeComponent();
      this.linkLabel1.Links.Add(new LinkLabel.Link()
      {
        LinkData = (object) "http://www.se7ensins.com/forums/threads/guidelines-releasing-your-application-11-26-2013.844627/"
      });
    }

    private void button1_Click(object sender, EventArgs e)
    {
      SaveFileDialog saveFileDialog = new SaveFileDialog();
      if (saveFileDialog.ShowDialog() != DialogResult.OK)
        return;
      using (Stream stream = (Stream) File.Open(saveFileDialog.FileName, FileMode.CreateNew))
      {
        using (StreamWriter streamWriter = new StreamWriter(stream))
        {
          streamWriter.Write("[b]Title/Brief Description:[/b]");
          streamWriter.Write(this.textBox1.Text);
          streamWriter.Write(Environment.NewLine);
          streamWriter.Write("[b]Images:[/b]");
          streamWriter.Write(this.textBox2.Text);
          streamWriter.Write(Environment.NewLine);
          streamWriter.Write("[b]Detailed Description:[/b]");
          streamWriter.Write(this.textBox3.Text);
          streamWriter.Write(Environment.NewLine);
          streamWriter.Write("[b]Download:[/b]");
          streamWriter.Write(this.textBox4.Text);
          streamWriter.Write(Environment.NewLine);
          streamWriter.Write("[b]Virus Scans:[/b]");
          streamWriter.Write(Environment.NewLine);
          streamWriter.Write(this.textBox5.Text);
        }
      }
    }

    private void button3_Click(object sender, EventArgs e)
    {
      ((Control) new Form4()).Show();
    }

    private void linkLabel1_LinkClicked(object sender, LinkLabelLinkClickedEventArgs e)
    {
      Process.Start(e.Link.LinkData as string);
    }

    protected override void Dispose(bool disposing)
    {
      if (disposing && this.components != null)
        this.components.Dispose();
      base.Dispose(disposing);
    }

    private void InitializeComponent()
    {
            this.label1 = new System.Windows.Forms.Label();
            this.label2 = new System.Windows.Forms.Label();
            this.label3 = new System.Windows.Forms.Label();
            this.textBox1 = new System.Windows.Forms.TextBox();
            this.label4 = new System.Windows.Forms.Label();
            this.textBox2 = new System.Windows.Forms.TextBox();
            this.label5 = new System.Windows.Forms.Label();
            this.label6 = new System.Windows.Forms.Label();
            this.textBox3 = new System.Windows.Forms.TextBox();
            this.label7 = new System.Windows.Forms.Label();
            this.textBox4 = new System.Windows.Forms.TextBox();
            this.label8 = new System.Windows.Forms.Label();
            this.textBox5 = new System.Windows.Forms.TextBox();
            this.button1 = new System.Windows.Forms.Button();
            this.button3 = new System.Windows.Forms.Button();
            this.linkLabel1 = new System.Windows.Forms.LinkLabel();
            this.SuspendLayout();
            // 
            // label1
            // 
            this.label1.AutoSize = true;
            this.label1.Location = new System.Drawing.Point(13, 13);
            this.label1.Name = "label1";
            this.label1.Size = new System.Drawing.Size(80, 13);
            this.label1.TabIndex = 0;
            this.label1.Text = "Required Fields";
            // 
            // label2
            // 
            this.label2.AutoSize = true;
            this.label2.ForeColor = System.Drawing.Color.Red;
            this.label2.Location = new System.Drawing.Point(89, 13);
            this.label2.Name = "label2";
            this.label2.Size = new System.Drawing.Size(11, 13);
            this.label2.TabIndex = 1;
            this.label2.Text = "*";
            // 
            // label3
            // 
            this.label3.AutoSize = true;
            this.label3.Location = new System.Drawing.Point(16, 33);
            this.label3.Name = "label3";
            this.label3.Size = new System.Drawing.Size(112, 13);
            this.label3.TabIndex = 2;
            this.label3.Text = "Title/Brief Description:";
            // 
            // textBox1
            // 
            this.textBox1.Location = new System.Drawing.Point(135, 33);
            this.textBox1.Multiline = true;
            this.textBox1.Name = "textBox1";
            this.textBox1.Size = new System.Drawing.Size(231, 110);
            this.textBox1.TabIndex = 3;
            // 
            // label4
            // 
            this.label4.AutoSize = true;
            this.label4.Location = new System.Drawing.Point(16, 178);
            this.label4.Name = "label4";
            this.label4.Size = new System.Drawing.Size(44, 13);
            this.label4.TabIndex = 4;
            this.label4.Text = "Images:";
            // 
            // textBox2
            // 
            this.textBox2.Location = new System.Drawing.Point(135, 178);
            this.textBox2.Multiline = true;
            this.textBox2.Name = "textBox2";
            this.textBox2.Size = new System.Drawing.Size(231, 110);
            this.textBox2.TabIndex = 5;
            this.textBox2.Text = "[img] [/img] [img] [/img]";
            // 
            // label5
            // 
            this.label5.AutoSize = true;
            this.label5.Location = new System.Drawing.Point(132, 162);
            this.label5.Name = "label5";
            this.label5.Size = new System.Drawing.Size(244, 13);
            this.label5.TabIndex = 6;
            this.label5.Text = "Copy and paste the img bbCodes if you need more";
            // 
            // label6
            // 
            this.label6.AutoSize = true;
            this.label6.Location = new System.Drawing.Point(372, 32);
            this.label6.Name = "label6";
            this.label6.Size = new System.Drawing.Size(105, 13);
            this.label6.TabIndex = 7;
            this.label6.Text = "Detailed Description:";
            // 
            // textBox3
            // 
            this.textBox3.Location = new System.Drawing.Point(491, 32);
            this.textBox3.Multiline = true;
            this.textBox3.Name = "textBox3";
            this.textBox3.Size = new System.Drawing.Size(231, 110);
            this.textBox3.TabIndex = 8;
            // 
            // label7
            // 
            this.label7.AutoSize = true;
            this.label7.Location = new System.Drawing.Point(372, 164);
            this.label7.Name = "label7";
            this.label7.Size = new System.Drawing.Size(58, 13);
            this.label7.TabIndex = 9;
            this.label7.Text = "Download:";
            // 
            // textBox4
            // 
            this.textBox4.Location = new System.Drawing.Point(491, 164);
            this.textBox4.Name = "textBox4";
            this.textBox4.Size = new System.Drawing.Size(231, 20);
            this.textBox4.TabIndex = 10;
            // 
            // label8
            // 
            this.label8.AutoSize = true;
            this.label8.Location = new System.Drawing.Point(372, 221);
            this.label8.Name = "label8";
            this.label8.Size = new System.Drawing.Size(61, 13);
            this.label8.TabIndex = 11;
            this.label8.Text = "Virus Scan:";
            // 
            // textBox5
            // 
            this.textBox5.Location = new System.Drawing.Point(491, 221);
            this.textBox5.Multiline = true;
            this.textBox5.Name = "textBox5";
            this.textBox5.Size = new System.Drawing.Size(231, 69);
            this.textBox5.TabIndex = 12;
            this.textBox5.Text = "Virus Scan 1:\r\nVirus Scan 2:";
            // 
            // button1
            // 
            this.button1.Location = new System.Drawing.Point(16, 312);
            this.button1.Name = "button1";
            this.button1.Size = new System.Drawing.Size(75, 23);
            this.button1.TabIndex = 13;
            this.button1.Text = "Save File";
            this.button1.UseVisualStyleBackColor = true;
            this.button1.Click += new System.EventHandler(this.button1_Click);
            // 
            // button3
            // 
            this.button3.Location = new System.Drawing.Point(243, 312);
            this.button3.Name = "button3";
            this.button3.Size = new System.Drawing.Size(103, 23);
            this.button3.TabIndex = 15;
            this.button3.Text = "Virus scan sites";
            this.button3.UseVisualStyleBackColor = true;
            this.button3.Click += new System.EventHandler(this.button3_Click);
            // 
            // linkLabel1
            // 
            this.linkLabel1.AutoSize = true;
            this.linkLabel1.Location = new System.Drawing.Point(97, 317);
            this.linkLabel1.Name = "linkLabel1";
            this.linkLabel1.Size = new System.Drawing.Size(140, 13);
            this.linkLabel1.TabIndex = 16;
            this.linkLabel1.TabStop = true;
            this.linkLabel1.Text = "Program Release Guidelines";
            this.linkLabel1.LinkClicked += new System.Windows.Forms.LinkLabelLinkClickedEventHandler(this.linkLabel1_LinkClicked);
            // 
            // Form3
            // 
            this.ClientSize = new System.Drawing.Size(728, 338);
            this.Controls.Add(this.linkLabel1);
            this.Controls.Add(this.button3);
            this.Controls.Add(this.button1);
            this.Controls.Add(this.textBox5);
            this.Controls.Add(this.label8);
            this.Controls.Add(this.textBox4);
            this.Controls.Add(this.label7);
            this.Controls.Add(this.textBox3);
            this.Controls.Add(this.label6);
            this.Controls.Add(this.label5);
            this.Controls.Add(this.textBox2);
            this.Controls.Add(this.label4);
            this.Controls.Add(this.textBox1);
            this.Controls.Add(this.label3);
            this.Controls.Add(this.label2);
            this.Controls.Add(this.label1);
            this.Name = "Form3";
            this.Text = "Program Releases";
            this.ResumeLayout(false);
            this.PerformLayout();

    }
  }
}
