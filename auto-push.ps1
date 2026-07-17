param(
  [ValidateSet("all", "email-qr", "checkin-qr", "deploy-only", "line-uid-mvp")]
  [string]$Mode = "all",
  [string]$Message = "",
  [string]$GitName = "CrewPlay Bot",
  [string]$GitEmail = "crewplay-bot@local",
  [string]$NetlifyBuildHookUrl = "",
  [switch]$SkipDeployHook,
  [switch]$FailOnDeployHookError,
  [switch]$RequireDeployHook,
  [switch]$SkipPush,
  [switch]$DryRun,
  [int]$PushRetry = 2
)

$ErrorActionPreference = "Stop"
# In PowerShell 7, native stderr can be promoted to terminating errors.
# We disable that so git warnings (e.g. LF/CRLF) do not abort the script.
$PSNativeCommandUseErrorActionPreference = $false

function Invoke-GitProcess {
  param([string[]]$CommandArgs)

  function Convert-ToArgString {
    param([string[]]$ArgsList)
    $escaped = foreach ($item in $ArgsList) {
      if ($null -eq $item) { '""'; continue }
      if ($item -match '[\s"]') {
        '"' + ($item -replace '"', '\"') + '"'
      } else {
        $item
      }
    }
    return ($escaped -join " ")
  }

  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = "git"
  $psi.UseShellExecute = $false
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.CreateNoWindow = $true

  $argListProp = $psi.PSObject.Properties["ArgumentList"]
  if ($null -ne $argListProp -and $null -ne $psi.ArgumentList) {
    foreach ($arg in $CommandArgs) {
      [void]$psi.ArgumentList.Add($arg)
    }
  } else {
    # Windows PowerShell / older .NET fallback
    $psi.Arguments = Convert-ToArgString -ArgsList $CommandArgs
  }

  $proc = New-Object System.Diagnostics.Process
  $proc.StartInfo = $psi
  [void]$proc.Start()
  $stdoutRaw = $proc.StandardOutput.ReadToEnd()
  $stderrRaw = $proc.StandardError.ReadToEnd()
  $proc.WaitForExit()
  $stdout = if ([string]::IsNullOrEmpty($stdoutRaw)) { @() } else { $stdoutRaw -split "`r?`n" | Where-Object { $_ -ne "" } }
  $stderr = if ([string]::IsNullOrEmpty($stderrRaw)) { @() } else { $stderrRaw -split "`r?`n" | Where-Object { $_ -ne "" } }
  return @{
    ExitCode = $proc.ExitCode
    StdOut   = $stdout
    StdErr   = $stderr
  }
}

function Run-Git {
  param(
    [string[]]$CommandArgs,
    [switch]$AllowFail
  )

  if (-not $CommandArgs -or $CommandArgs.Count -eq 0) {
    throw "Run-Git received empty command args."
  }

  if ($DryRun) {
    Write-Host ("[DRY-RUN] git " + ($CommandArgs -join " "))
    return
  }

  $cmdText = "git " + ($CommandArgs -join " ")
  Write-Host ">> $cmdText"
  $result = Invoke-GitProcess -CommandArgs $CommandArgs
  foreach ($line in $result.StdOut) { Write-Host $line }
  foreach ($line in $result.StdErr) { Write-Host $line }
  if ($result.ExitCode -ne 0 -and -not $AllowFail) {
    $details = (($result.StdErr + $result.StdOut) -join " | ")
    if ([string]::IsNullOrWhiteSpace($details)) {
      throw "git command failed (exit=$($result.ExitCode)): $cmdText"
    }
    throw "git command failed (exit=$($result.ExitCode)): $cmdText :: $details"
  }
}

function Get-GitOutput {
  param([string[]]$CommandArgs)
  if (-not $CommandArgs -or $CommandArgs.Count -eq 0) {
    throw "Get-GitOutput received empty command args."
  }
  if ($DryRun) {
    Write-Host ("[DRY-RUN] git " + ($CommandArgs -join " "))
    return "<dry-run>"
  }
  $cmdText = "git " + ($CommandArgs -join " ")
  Write-Host ">> $cmdText"
  $result = Invoke-GitProcess -CommandArgs $CommandArgs
  foreach ($line in $result.StdErr) { Write-Host $line }
  if ($result.ExitCode -ne 0) {
    foreach ($line in $result.StdOut) { Write-Host $line }
    $details = (($result.StdErr + $result.StdOut) -join " | ")
    if ([string]::IsNullOrWhiteSpace($details)) {
      throw "git command failed (exit=$($result.ExitCode)): $cmdText"
    }
    throw "git command failed (exit=$($result.ExitCode)): $cmdText :: $details"
  }
  return ($result.StdOut -join [Environment]::NewLine).Trim()
}

function Get-FilesForMode {
  param([string]$SelectedMode)
  switch ($SelectedMode) {
    "email-qr" {
      return @(
        "crewplay-platform/src/lib/email.ts",
        "crewplay-platform/.env.production.example"
      )
    }
    "checkin-qr" {
      return @(
        "crewplay-platform/src/lib/check-in-url.ts",
        "crewplay-platform/src/components/HostCheckInPortal.tsx",
        "crewplay-platform/src/app/api/checkin/guest/confirm/route.ts",
        "crewplay-platform/src/components/GuestSelfCheckInPanel.tsx",
        "crewplay-platform/src/app/checkin/scan/page.tsx",
        "crewplay-platform/src/components/MyBookingCard.tsx",
        "crewplay-platform/src/app/book/result/page.tsx",
        "crewplay-platform/src/components/GuestPassPanel.tsx",
        "crewplay-platform/src/lib/email.ts"
      )
    }
    "line-uid-mvp" {
      return @(
        "crewplay-platform/src/lib/line-host-candidates.ts",
        "crewplay-platform/src/app/api/line/webhook/route.ts",
        "crewplay-platform/src/app/api/admin/line-host-recipients/candidates/route.ts",
        "crewplay-platform/src/app/api/admin/line-host-recipients/assign/route.ts",
        "crewplay-platform/src/components/AdminLineHostRecipientsPanel.tsx"
      )
    }
    default {
      return @()
    }
  }
}

function Get-DefaultMessage {
  param([string]$SelectedMode)
  switch ($SelectedMode) {
    "all" { return "chore: sync all pending local changes" }
    "email-qr" { return "feat(email): include host check-in QR in notification mail" }
    "checkin-qr" { return "feat(checkin): switch to host QR guest self-checkin" }
    "line-uid-mvp" { return "feat(line): add uid candidates webhook and one-click team assignment" }
    "deploy-only" { return "chore: trigger deploy" }
    default { return "chore: update" }
  }
}

function Ensure-RepoConfig {
  # Avoid interactive gc cleanup prompts on OneDrive / Windows lock files.
  Run-Git -CommandArgs @("config", "--local", "gc.auto", "0")
  Run-Git -CommandArgs @("config", "--local", "gc.autoPackLimit", "0")
}

function Resolve-RepoRoot {
  # Use PowerShell path resolution instead of git output to avoid Unicode path mojibake.
  $current = Get-Location
  while ($null -ne $current) {
    if (Test-Path (Join-Path $current.Path ".git")) {
      return $current.Path
    }
    $current = $current.Parent
  }
  throw "Not inside a git repository (.git not found in current or parent folders)."
}

function Invoke-NetlifyBuildHook {
  param([string]$HookUrl)
  if ([string]::IsNullOrWhiteSpace($HookUrl)) {
    return
  }

  if ($DryRun) {
    Write-Host "[DRY-RUN] invoke netlify build hook"
    return
  }

  Write-Host "Triggering Netlify build hook..."
  $response = Invoke-WebRequest -Uri $HookUrl -Method POST -UseBasicParsing -TimeoutSec 30
  if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 300) {
    throw "Netlify build hook failed with HTTP $($response.StatusCode)"
  }
  Write-Host "Netlify build hook triggered."
}

function Resolve-DeployHookUrl {
  if (-not [string]::IsNullOrWhiteSpace($NetlifyBuildHookUrl)) {
    return $NetlifyBuildHookUrl.Trim()
  }
  if (-not [string]::IsNullOrWhiteSpace($env:NETLIFY_BUILD_HOOK_URL)) {
    return $env:NETLIFY_BUILD_HOOK_URL.Trim()
  }
  return ""
}

function Validate-DeployHookUrl {
  param([string]$HookUrl)
  if ([string]::IsNullOrWhiteSpace($HookUrl)) {
    return $false
  }
  return ($HookUrl -match "^https://api\.netlify\.com/build_hooks/[A-Za-z0-9]+$")
}

try {
  if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw "git not found in PATH. Please restart terminal or reinstall Git."
  }

  $repoRoot = Resolve-RepoRoot
  Set-Location $repoRoot
  Ensure-RepoConfig

  $finalMessage =
    if ([string]::IsNullOrWhiteSpace($Message)) {
      Get-DefaultMessage -SelectedMode $Mode
    } else {
      $Message.Trim()
    }

  $files = Get-FilesForMode -SelectedMode $Mode

  Write-Host "Mode: $Mode"
  Write-Host "Repo: $repoRoot"
  Write-Host "Message: $finalMessage"
  if ($repoRoot -like "*OneDrive*") {
    Write-Host "Hint: Repo is in OneDrive path. If push stalls, temporarily pause OneDrive sync."
  }
  $hookUrl = Resolve-DeployHookUrl
  if (-not $SkipDeployHook) {
    if ([string]::IsNullOrWhiteSpace($hookUrl)) {
      $msg = "NETLIFY_BUILD_HOOK_URL not set. Push will still work, but hook deploy trigger is skipped."
      if ($RequireDeployHook) {
        throw $msg
      }
      Write-Warning $msg
    } elseif (-not (Validate-DeployHookUrl -HookUrl $hookUrl)) {
      $msg = "NETLIFY_BUILD_HOOK_URL format looks invalid: $hookUrl"
      if ($RequireDeployHook) {
        throw $msg
      }
      Write-Warning $msg
    } else {
      Write-Host "Deploy hook precheck: OK"
    }
  }

  if ($Mode -eq "all") {
    Run-Git -CommandArgs @("add", "-A")
  } elseif ($Mode -ne "deploy-only") {
    foreach ($file in $files) {
      Run-Git -CommandArgs @("add", "--", $file)
    }
  }

  $staged = Get-GitOutput -CommandArgs @("diff", "--cached", "--name-only")

  if ($Mode -eq "deploy-only") {
    Run-Git -CommandArgs @("-c", "user.name=$GitName", "-c", "user.email=$GitEmail", "commit", "--allow-empty", "-m", $finalMessage)
  } elseif (-not $staged) {
    Write-Host "No staged files for mode '$Mode'."
    Write-Host "Nothing to commit."
    if (-not $SkipPush) {
      Write-Host "Skip push because commit did not happen."
    }
    exit 0
  } else {
    Write-Host "Staged files:"
    if ($DryRun) {
      Write-Host $staged
    } else {
      Run-Git -CommandArgs @("diff", "--cached", "--name-only")
    }
    Run-Git -CommandArgs @("-c", "user.name=$GitName", "-c", "user.email=$GitEmail", "commit", "-m", $finalMessage)
  }

  if ($SkipPush) {
    Write-Host "Commit done. Push skipped by -SkipPush."
    exit 0
  }

  $attempt = 0
  while ($true) {
    $attempt += 1
    try {
      Run-Git -CommandArgs @("-c", "gc.auto=0", "-c", "gc.autoPackLimit=0", "push")
      break
    } catch {
      if ($attempt -gt $PushRetry) {
        throw
      }
      Write-Host "Push failed, retrying ($attempt/$PushRetry)..."
      Start-Sleep -Seconds 2
    }
  }

  if (-not $DryRun) {
    $head = Get-GitOutput -CommandArgs @("rev-parse", "--short", "HEAD")
    Write-Host "Push completed. HEAD=$head"
  } else {
    Write-Host "Dry-run finished."
  }

  if (-not $SkipDeployHook) {
    if (-not [string]::IsNullOrWhiteSpace($hookUrl)) {
      try {
        Invoke-NetlifyBuildHook -HookUrl $hookUrl
      } catch {
        if ($FailOnDeployHookError) {
          throw
        }
        Write-Warning ("Deploy hook failed, but git push is already done: " + $_.Exception.Message)
        Write-Host "Tip: run with -SkipDeployHook, or fix NETLIFY_BUILD_HOOK_URL."
      }
    }
  }
} catch {
  Write-Error ("auto-push failed: " + $_.Exception.Message)
  exit 1
}
