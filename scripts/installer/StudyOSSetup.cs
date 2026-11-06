using System;
using System.IO;
using System.Diagnostics;
using System.Windows.Forms;
using System.Drawing;

namespace StudyOS
{
    public class SetupForm : Form
    {
        private ProgressBar progressBar;
        private Label statusLabel;
        private Timer installTimer;
        private int progressStep = 0;

        public SetupForm()
        {
            this.Text = "StudyOS Desktop Setup";
            this.Size = new Size(520, 260);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.BackColor = Color.FromArgb(17, 24, 39); // Slate-900
            this.ForeColor = Color.White;

            Label titleLabel = new Label();
            titleLabel.Text = "StudyOS Desktop Setup (v1.0.18)";
            titleLabel.Font = new Font("Segoe UI", 15, FontStyle.Bold);
            titleLabel.ForeColor = Color.FromArgb(249, 115, 22); // Orange primary
            titleLabel.Location = new Point(25, 22);
            titleLabel.AutoSize = true;
            this.Controls.Add(titleLabel);

            Label descLabel = new Label();
            descLabel.Text = "Installing StudyOS dedicated workspace on your Windows machine...";
            descLabel.Font = new Font("Segoe UI", 9.5f);
            descLabel.ForeColor = Color.FromArgb(209, 213, 219);
            descLabel.Location = new Point(27, 60);
            descLabel.AutoSize = true;
            this.Controls.Add(descLabel);

            statusLabel = new Label();
            statusLabel.Text = "Initializing installer components...";
            statusLabel.Font = new Font("Segoe UI", 9);
            statusLabel.ForeColor = Color.FromArgb(156, 163, 175);
            statusLabel.Location = new Point(27, 98);
            statusLabel.Size = new Size(450, 20);
            this.Controls.Add(statusLabel);

            progressBar = new ProgressBar();
            progressBar.Location = new Point(27, 122);
            progressBar.Size = new Size(450, 22);
            progressBar.Style = ProgressBarStyle.Continuous;
            this.Controls.Add(progressBar);

            installTimer = new Timer();
            installTimer.Interval = 80;
            installTimer.Tick += InstallTimer_Tick;
            installTimer.Start();
        }

        private void InstallTimer_Tick(object sender, EventArgs e)
        {
            progressStep += 10;
            if (progressStep <= 100)
            {
                progressBar.Value = progressStep;
                if (progressStep == 20) statusLabel.Text = "Creating StudyOS application directory in LocalAppData...";
                if (progressStep == 50) statusLabel.Text = "Creating Desktop and Start Menu app shortcuts...";
                if (progressStep == 80) statusLabel.Text = "Configuring distraction-free desktop launcher...";
            }
            else
            {
                installTimer.Stop();
                PerformInstall();
                statusLabel.Text = "Installation complete! Launching StudyOS Desktop...";
                Timer exitTimer = new Timer();
                exitTimer.Interval = 1000;
                exitTimer.Tick += (s, args) =>
                {
                    exitTimer.Stop();
                    LaunchStudyOS();
                    Application.Exit();
                };
                exitTimer.Start();
            }
        }

        private void PerformInstall()
        {
            try
            {
                string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                string installDir = Path.Combine(localAppData, "StudyOS");
                if (!Directory.Exists(installDir))
                {
                    Directory.CreateDirectory(installDir);
                }

                string launcherVbs = Path.Combine(installDir, "LaunchStudyOS.vbs");
                string vbsCode = "Set WshShell = CreateObject(\"WScript.Shell\")\r\nWshShell.Run \"msedge.exe --app=https://studyos-web-8ruc.onrender.com/app --window-size=1280,800\", 1, False\r\n";
                File.WriteAllText(launcherVbs, vbsCode);

                string desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                string startMenuPath = Environment.GetFolderPath(Environment.SpecialFolder.StartMenu);
                string programsPath = Path.Combine(startMenuPath, "Programs");

                CreateShortcut(Path.Combine(desktopPath, "StudyOS.lnk"), launcherVbs, "StudyOS - Your Academic OS");
                if (Directory.Exists(programsPath))
                {
                    CreateShortcut(Path.Combine(programsPath, "StudyOS.lnk"), launcherVbs, "StudyOS - Your Academic OS");
                }
            }
            catch { }
        }

        private void CreateShortcut(string shortcutPath, string targetPath, string description)
        {
            try
            {
                Type shellType = Type.GetTypeFromProgID("WScript.Shell");
                dynamic shell = Activator.CreateInstance(shellType);
                dynamic shortcut = shell.CreateShortcut(shortcutPath);
                shortcut.TargetPath = targetPath;
                shortcut.WorkingDirectory = Path.GetDirectoryName(targetPath);
                shortcut.Description = description;
                shortcut.Save();
            }
            catch { }
        }

        private void LaunchStudyOS()
        {
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = "msedge.exe";
                psi.Arguments = "--app=\"https://studyos-web-8ruc.onrender.com/app\" --window-size=1280,800";
                psi.UseShellExecute = true;
                Process.Start(psi);
            }
            catch
            {
                Process.Start(new ProcessStartInfo("https://studyos-web-8ruc.onrender.com/app") { UseShellExecute = true });
            }
        }

        [STAThread]
        public static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new SetupForm());
        }
    }
}
