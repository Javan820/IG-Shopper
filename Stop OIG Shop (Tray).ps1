Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$notifyIcon = New-Object System.Windows.Forms.NotifyIcon
$notifyIcon.Icon = [System.Drawing.SystemIcons]::Application
$notifyIcon.Text = "OIG Shop — Dev Server Running"
$notifyIcon.Visible = $true

function Stop-OIGServer {
    try {
        $conn = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
        if ($conn) {
            Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
        }
    } catch {}
    $notifyIcon.Visible = $false
    [System.Windows.Forms.Application]::Exit()
}

$menu = New-Object System.Windows.Forms.ContextMenuStrip
$stopItem = New-Object System.Windows.Forms.ToolStripMenuItem
$stopItem.Text = "Stop OIG Shop Server"
$stopItem.add_Click({ Stop-OIGServer })
[void]$menu.Items.Add($stopItem)

$notifyIcon.ContextMenuStrip = $menu
$notifyIcon.add_DoubleClick({ Stop-OIGServer })

$notifyIcon.ShowBalloonTip(4000, "OIG Shop Running", "Right-click or double-click this icon to stop the server.", [System.Windows.Forms.ToolTipIcon]::Info)

[System.Windows.Forms.Application]::Run()
