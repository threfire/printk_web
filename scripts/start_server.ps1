$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$appPath = Join-Path $projectRoot "app.py"
$appUrl = "http://127.0.0.1:5000"
$logDir = Join-Path $projectRoot "storage\logs"
$stdoutLog = Join-Path $logDir "server_stdout.log"
$stderrLog = Join-Path $logDir "server_stderr.log"

New-Item -ItemType Directory -Force -Path $logDir | Out-Null

function Get-AppListener {
    Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue |
        Select-Object -First 1
}

function Wait-AppReady {
    param(
        [int]$TimeoutSeconds = 30
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            $response = Invoke-WebRequest -Uri $appUrl -UseBasicParsing -TimeoutSec 2
            if ($response.StatusCode -ge 200) {
                return $true
            }
        } catch {
            Start-Sleep -Milliseconds 500
        }
    }

    return $false
}

if (-not (Test-Path $appPath)) {
    Write-Host "app.py not found."
    exit 1
}

$existing = Get-AppListener
if (-not $existing) {
    $pythonCmd = Get-Command python -ErrorAction SilentlyContinue
    if (-not $pythonCmd) {
        Write-Host "python command not found."
        exit 1
    }

    if (Test-Path $stdoutLog) {
        Remove-Item $stdoutLog -Force
    }
    if (Test-Path $stderrLog) {
        Remove-Item $stderrLog -Force
    }

    $process = Start-Process `
        -FilePath $pythonCmd.Source `
        -ArgumentList "app.py" `
        -WorkingDirectory $projectRoot `
        -WindowStyle Hidden `
        -RedirectStandardOutput $stdoutLog `
        -RedirectStandardError $stderrLog `
        -PassThru

    Start-Sleep -Seconds 1
    if ($process.HasExited) {
        Write-Host "Python process exited during startup."
        if (Test-Path $stderrLog) {
            Write-Host "--- stderr ---"
            Get-Content $stderrLog
        }
        if (Test-Path $stdoutLog) {
            Write-Host "--- stdout ---"
            Get-Content $stdoutLog
        }
        exit 1
    }
}

$ready = Wait-AppReady
if (-not $ready) {
    Write-Host "Server not ready on port 5000."
    if (Test-Path $stderrLog) {
        Write-Host "--- stderr ---"
        Get-Content $stderrLog
    }
    if (Test-Path $stdoutLog) {
        Write-Host "--- stdout ---"
        Get-Content $stdoutLog
    }
    exit 1
}

$ipv4List = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.IPAddress -notlike "127.*" -and $_.PrefixOrigin -ne "WellKnown"
} | Select-Object -ExpandProperty IPAddress

Write-Host ""
Write-Host "Server started."
Write-Host ("Local: " + $appUrl)
foreach ($ip in $ipv4List) {
    Write-Host ("LAN: http://" + $ip + ":5000")
}
Write-Host ""

Start-Process $appUrl
