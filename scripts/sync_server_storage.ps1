[CmdletBinding()]
param(
    [string]$Remote = "ubuntu@123.207.16.156",
    [string]$RemoteStorage = "~/printk/storage",
    [string]$RemoteAppDir = "~/printk",
    [string]$BackupRoot = "$env:USERPROFILE\printk-server-storage-backups",
    [int]$Port = 22,
    [string]$IdentityFile = "",
    [int]$Keep = 14,
    [int]$ServerKeep = 14,
    [string]$Branch = "master",
    [switch]$BackupsOnly,
    [switch]$RunServerUpdate,
    [switch]$InstallDailyTask,
    [string]$TaskName = "PrintkServerStorageBackup",
    [string]$TaskTime = "23:30"
)

$ErrorActionPreference = "Stop"

function Require-Command {
    param([string]$Name)

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Command not found: $Name"
    }
}

function Assert-PositiveInteger {
    param(
        [string]$Name,
        [int]$Value
    )

    if ($Value -lt 1) {
        throw "$Name must be at least 1."
    }
}

function Add-QuotedArgument {
    param(
        [System.Collections.Generic.List[string]]$Arguments,
        [string]$Name,
        [string]$Value
    )

    $escapedValue = $Value.Replace('"', '\"')
    $Arguments.Add($Name)
    $Arguments.Add("`"$escapedValue`"")
}

function Install-DailyTask {
    Require-Command "powershell.exe"

    $scriptPath = $PSCommandPath
    if (-not $scriptPath) {
        throw "Cannot resolve current script path."
    }

    $taskArguments = [System.Collections.Generic.List[string]]::new()
    $taskArguments.Add("-NoProfile")
    $taskArguments.Add("-ExecutionPolicy")
    $taskArguments.Add("Bypass")
    $taskArguments.Add("-File")
    $taskArguments.Add("`"$scriptPath`"")
    Add-QuotedArgument $taskArguments "-Remote" $Remote
    Add-QuotedArgument $taskArguments "-RemoteStorage" $RemoteStorage
    Add-QuotedArgument $taskArguments "-RemoteAppDir" $RemoteAppDir
    Add-QuotedArgument $taskArguments "-BackupRoot" $BackupRoot
    $taskArguments.Add("-Port")
    $taskArguments.Add($Port.ToString())
    if ($IdentityFile) {
        Add-QuotedArgument $taskArguments "-IdentityFile" $IdentityFile
    }
    $taskArguments.Add("-Keep")
    $taskArguments.Add($Keep.ToString())
    $taskArguments.Add("-ServerKeep")
    $taskArguments.Add($ServerKeep.ToString())
    Add-QuotedArgument $taskArguments "-Branch" $Branch
    if ($BackupsOnly) {
        $taskArguments.Add("-BackupsOnly")
    }
    if ($RunServerUpdate) {
        $taskArguments.Add("-RunServerUpdate")
    }

    $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument ($taskArguments -join " ")
    $trigger = New-ScheduledTaskTrigger -Daily -At $TaskTime
    $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew

    Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null
    Write-Host "Installed daily task: $TaskName at $TaskTime"
}

function New-ScpBaseArguments {
    $arguments = [System.Collections.Generic.List[string]]::new()
    if ($Port -ne 22) {
        $arguments.Add("-P")
        $arguments.Add($Port.ToString())
    }
    if ($IdentityFile) {
        $arguments.Add("-i")
        $arguments.Add($IdentityFile)
    }
    return $arguments
}

function New-SshBaseArguments {
    $arguments = [System.Collections.Generic.List[string]]::new()
    if ($Port -ne 22) {
        $arguments.Add("-p")
        $arguments.Add($Port.ToString())
    }
    if ($IdentityFile) {
        $arguments.Add("-i")
        $arguments.Add($IdentityFile)
    }
    return $arguments
}

function Write-RestoreInstructions {
    param(
        [string]$BackupPath,
        [string]$Scope
    )

    if ($Scope -ne "storage") {
        Write-Host ""
        Write-Host "Restore hint: this run only copied server-side backup files. Use a full storage backup for direct restore."
        return
    }

    $localBackup = $BackupPath.Replace("'", "''")
    $remote = $Remote.Replace("'", "''")
    $remoteAppDir = $RemoteAppDir.Replace("'", "''")
    $portArgsForSsh = if ($Port -ne 22) { "-p $Port " } else { "" }
    $portArgsForScp = if ($Port -ne 22) { "-P $Port " } else { "" }
    $identityArg = if ($IdentityFile) { "-i `"$IdentityFile`" " } else { "" }

    Write-Host ""
    Write-Host "Restore steps for this backup:"
    Write-Host "1. Stop containers:"
    Write-Host "   ssh $identityArg$portArgsForSsh$remote 'cd $remoteAppDir && sudo docker compose stop backend frontend nginx'"
    Write-Host "2. Keep one more server-side restore point:"
    Write-Host "   ssh $identityArg$portArgsForSsh$remote 'cd $remoteAppDir && mkdir -p storage/backups && tar -C storage --exclude=./backups -czf storage/backups/pre-restore-$(Get-Date -Format "yyyyMMdd-HHmmss").tar.gz .'"
    Write-Host "3. Upload this backup back to server storage:"
    Write-Host "   scp $identityArg$portArgsForScp-r `"$localBackup\*`" ${remote}:$remoteAppDir/storage/"
    Write-Host "4. Restart containers:"
    Write-Host "   ssh $identityArg$portArgsForSsh$remote 'cd $remoteAppDir && sudo docker compose up -d'"
}

function Invoke-StorageSync {
    Require-Command "scp.exe"
    Assert-PositiveInteger "Keep" $Keep

    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $scope = if ($BackupsOnly) { "backups" } else { "storage" }
    $remotePath = if ($BackupsOnly) { "$RemoteStorage/backups" } else { $RemoteStorage }
    $targetParent = Join-Path $BackupRoot $scope
    $targetPath = Join-Path $targetParent $timestamp

    New-Item -ItemType Directory -Force -Path $targetParent | Out-Null

    $scpArgs = New-ScpBaseArguments
    $scpArgs.Add("-r")
    $scpArgs.Add("-p")
    $scpArgs.Add("${Remote}:$remotePath")
    $scpArgs.Add($targetPath)

    Write-Host "Syncing ${Remote}:$remotePath to $targetPath"
    & scp.exe @scpArgs
    if ($LASTEXITCODE -ne 0) {
        throw "scp failed with exit code $LASTEXITCODE"
    }

    $manifest = [ordered]@{
        createdAt = (Get-Date).ToString("s")
        remote = $Remote
        remotePath = $remotePath
        localPath = $targetPath
        scope = $scope
    }
    $manifestPath = Join-Path $targetPath "backup-manifest.json"
    New-Item -ItemType Directory -Force -Path $targetPath | Out-Null
    $manifest | ConvertTo-Json | Set-Content -LiteralPath $manifestPath -Encoding UTF8

    $oldBackups = Get-ChildItem -LiteralPath $targetParent -Directory |
        Sort-Object LastWriteTime -Descending |
        Select-Object -Skip $Keep
    foreach ($oldBackup in $oldBackups) {
        Remove-Item -LiteralPath $oldBackup.FullName -Recurse -Force
    }

    Write-Host "Storage sync completed: $targetPath"
    Write-RestoreInstructions -BackupPath $targetPath -Scope $scope
    return $targetPath
}

function Invoke-ServerUpdate {
    Require-Command "ssh.exe"
    Assert-PositiveInteger "ServerKeep" $ServerKeep

    $sshArgs = New-SshBaseArguments
    $remoteCommand = "cd $RemoteAppDir && BRANCH='$Branch' KEEP_BACKUPS='$ServerKeep' bash scripts/server-update.sh"
    $sshArgs.Add($Remote)
    $sshArgs.Add($remoteCommand)

    Write-Host ""
    Write-Host "Running protected server update through scripts/server-update.sh"
    & ssh.exe @sshArgs
    if ($LASTEXITCODE -ne 0) {
        throw "ssh server update failed with exit code $LASTEXITCODE"
    }
}

if ($InstallDailyTask) {
    Assert-PositiveInteger "Keep" $Keep
    Assert-PositiveInteger "ServerKeep" $ServerKeep
    Install-DailyTask
    return
}

Invoke-StorageSync | Out-Null

if ($RunServerUpdate) {
    Invoke-ServerUpdate
}
