using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using System.IO;
using System.Threading;

namespace Random_Password_generator
{
    public partial class Form1 : Form
    {
        public Form1()
        {
            Font = SystemFonts.MessageBoxFont;
            InitializeComponent();

        }

        public void LoadSettings()
        {
            // TODO
        }

        Random rnd = new Random(); int[] symb = { 33, 35, 36, 37, 38, 42, 95 };
        int length = 0;


        private void Form1_Load(object sender, EventArgs e)
        {

        }

        private void label1_Click(object sender, EventArgs e)
        {

        }

        private void button1_Click(object sender, EventArgs e)
        {
            Clipboard.SetText(textBox2.Text);
        }

        private void button2_Click(object sender, EventArgs e)
        {
            StringWriter sw = new StringWriter(); length = Convert.ToInt32(textBox1.Text);

            for (; length > 0; length--)
            {
                switch (rnd.Next(1, 5))
                {
                    case 1: sw.Write((char)rnd.Next(65, 91));
                        break;
                    case 2: sw.Write((char)rnd.Next(97, 123));
                        break;
                    case 3: sw.Write((char)rnd.Next(48, 58));
                        break;
                    //case 4: sw.Write((char)symb[rnd.Next(0, 7)]);
                        //break;
                }
            }
            textBox2.Text = sw.ToString();
        }

        private void label2_Click(object sender, EventArgs e)
        {

        }

        private void toolStripMenuItem1_Click(object sender, EventArgs e)
        {

        }

        private void toolStripComboBox1_Click(object sender, EventArgs e)
        {

        }

        private void automaticUpdater1_Click(object sender, EventArgs e)
        {

        }

        private void automaticUpdater1_ClosingAborted(object sender, EventArgs e)
        {
            LoadSettings();
        }

        private void textBox1_TextChanged(object sender, EventArgs e)
        {

        }

        private void textBox2_TextChanged(object sender, EventArgs e)
        {

        }
    }
}
