$ErrorActionPreference = "Stop"

$stopped = $false

while ($true) {
    $listeners = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue
    if (-not $listeners) {
        break
    }

    $listeners | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object {
        Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
        $stopped = $true
    }

    Start-Sleep -Milliseconds 500
}

if ($stopped) {
    Write-Host "Server stopped."
    exit 0
}

Write-Host "Server is not running."
