param(
  [ValidateSet("email-qr", "checkin-qr", "deploy-only")]
  [string]$Mode = "email-qr",
  [string]$Message = "",
  [string]$GitName = "CrewPlay Bot",
  [string]$GitEmail = "crewplay-bot@local"
)

$ErrorActionPreference = "Stop"

function Run-Git {
  param([string[]]$Args)
  & git @Args
  if ($LASTEXITCODE -ne 0) {
    throw "git command failed: git $($Args -join ' ')"
  }
}

function Get-FilesForMode {
  param([string]$SelectedMode)
  switch ($SelectedMode) {
    "email-qr" {
      return @(
        "crewplay-platform/src/lib/email.ts"
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
    default {
      return @()
    }
  }
}

function Get-DefaultMessage {
  param([string]$SelectedMode)
  switch ($SelectedMode) {
    "email-qr" { return "feat(email): include host check-in QR in notification mail" }
    "checkin-qr" { return "feat(checkin): switch to host QR guest self-checkin" }
    "deploy-only" { return "chore: trigger deploy" }
    default { return "chore: update" }
  }
}

try {
  $repoRoot = (& git rev-parse --show-toplevel).Trim()
  if (-not $repoRoot) {
    throw "Not inside a git repository."
  }
  Set-Location $repoRoot

  $finalMessage = if ([string]::IsNullOrWhiteSpace($Message)) { Get-DefaultMessage -SelectedMode $Mode } else { $Message.Trim() }
  $files = Get-FilesForMode -SelectedMode $Mode

  Write-Host "Mode: $Mode"
  Write-Host "Repo: $repoRoot"
  Write-Host "Message: $finalMessage"

  if ($Mode -ne "deploy-only") {
    foreach ($file in $files) {
      Run-Git @("add", "--", $file)
    }
    $staged = (& git diff --cached --name-only).Trim()
    if (-not $staged) {
      throw "No staged files. Save your edits first, then run again."
    }
    Write-Host "Staged files:"
    (& git diff --cached --name-only)
    Run-Git @("-c", "user.name=$GitName", "-c", "user.email=$GitEmail", "commit", "-m", $finalMessage)
  } else {
    Run-Git @("-c", "user.name=$GitName", "-c", "user.email=$GitEmail", "commit", "--allow-empty", "-m", $finalMessage)
  }

  Run-Git @("push")
  Write-Host "Push completed."
} catch {
  Write-Error $_
  exit 1
}
