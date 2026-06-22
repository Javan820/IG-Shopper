param([string]$Mode = "start")

# Wait for the old server process to fully exit
Start-Sleep -Seconds 1

# Kill any node process still holding port 3000
$conn = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if ($conn) {
    Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 500
}

$dir = $PSScriptRoot
$cmd = if ($Mode -eq "dev") { "npm run dev" } else { "set NODE_OPTIONS=--max-old-space-size=1536 && npm run start" }

Start-Process -FilePath "cmd.exe" -ArgumentList "/c $cmd" -WorkingDirectory $dir -WindowStyle Minimized
