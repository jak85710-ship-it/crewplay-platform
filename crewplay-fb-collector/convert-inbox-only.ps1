# Convert only row-named inbox files (after prepare-inbox-row-names.ps1), update sheet, no FB downloads
param(
    [switch]$Upload,
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.UTF8Encoding]::UTF8
Add-Type -AssemblyName System.Drawing

$Root = $PSScriptRoot
$ConfigPath = Join-Path $Root 'config.json'
$InboxDir = Join-Path $Root 'storage/photos-inbox'
$JpgDir = Join-Path $Root 'storage/photos-jpg'
$BaseUrl = 'https://storage.googleapis.com/crewplay-arena-storage'
$Bucket = 'crewplay-arena-storage'
$MaxDim = 1280
$JpegQuality = 85

function Read-Config {
    return Get-Content $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
}

function Get-AccessToken($config) {
    $body = 'client_id=' + [uri]::EscapeDataString([string]$config.client_id) +
            '&client_secret=' + [uri]::EscapeDataString([string]$config.client_secret) +
            '&refresh_token=' + [uri]::EscapeDataString([string]$config.refresh_token) +
            '&grant_type=refresh_token'
    $resp = Invoke-WebRequest -Uri 'https://oauth2.googleapis.com/token' -Method Post `
        -ContentType 'application/x-www-form-urlencoded' -Body $body -UseBasicParsing
    return ([string]($resp.Content | ConvertFrom-Json).access_token)
}

function Format-SheetRange($sheetTitle, $cellRange) {
    $name = $sheetTitle
    if ($sheetTitle -match "[\s'!]") { $name = "'" + ($sheetTitle -replace "'", "''") + "'" }
    if ($cellRange) { return $name + '!' + $cellRange }
    return $name
}

function Update-PhotosBatch($token, $sheetId, $sheetTitle, $updates) {
    if (-not $updates -or $updates.Count -eq 0) { return }
    $uri = 'https://sheets.googleapis.com/v4/spreadsheets/' + $sheetId + '/values:batchUpdate'
    $headers = @{ Authorization = 'Bearer ' + $token; 'Content-Type' = 'application/json; charset=utf-8' }
    $data = @()
    foreach ($u in $updates) {
        $data += @{
            range  = (Format-SheetRange $sheetTitle ('D' + $u.row))
            values = @(,@($u.photo))
        }
    }
    $payload = @{ valueInputOption = 'USER_ENTERED'; data = $data }
    $body = $payload | ConvertTo-Json -Depth 6 -Compress
    Invoke-RestMethod -Uri $uri -Headers $headers -Method Post -Body ([Text.Encoding]::UTF8.GetBytes($body)) | Out-Null
}

function Find-InboxSource([int]$row) {
    $base = Join-Path $InboxDir ([string]$row)
    foreach ($ext in @('.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp')) {
        $path = $base + $ext
        if (Test-Path $path) { return $path }
    }
    return $null
}

function Save-BitmapAsJpeg($bitmap, [string]$path, [int]$quality) {
    $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
        Where-Object { $_.MimeType -eq 'image/jpeg' } | Select-Object -First 1
    $ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
        [System.Drawing.Imaging.Encoder]::Quality, [long]$quality)
    $bitmap.Save($path, $codec, $ep)
    $ep.Dispose()
}

function Resize-Bitmap($src, [int]$maxDim) {
    $w = $src.Width; $h = $src.Height
    if ($w -le $maxDim -and $h -le $maxDim) { return $src }
    $ratio = [Math]::Min($maxDim / $w, $maxDim / $h)
    $nw = [Math]::Max(1, [int][Math]::Round($w * $ratio))
    $nh = [Math]::Max(1, [int][Math]::Round($h * $ratio))
    $out = New-Object System.Drawing.Bitmap($nw, $nh)
    $g = [System.Drawing.Graphics]::FromImage($out)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($src, 0, 0, $nw, $nh)
    $g.Dispose()
    return $out
}

function Convert-ToJpegFile([string]$sourcePath, [string]$destPath) {
    $src = $null; $work = $null
    try {
        if ($sourcePath -match '\.webp$') {
            # Use magick/ffmpeg fallback: copy via temp png if Bitmap fails
            try {
                $src = New-Object System.Drawing.Bitmap($sourcePath)
            } catch {
                throw 'WEBP needs manual re-save as JPG/PNG in inbox'
            }
        } else {
            $src = New-Object System.Drawing.Bitmap($sourcePath)
        }
        $work = Resize-Bitmap $src $MaxDim
        $dir = Split-Path $destPath -Parent
        if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
        Save-BitmapAsJpeg $work $destPath $JpegQuality
    } finally {
        if ($work -and $work -ne $src) { $work.Dispose() }
        if ($src) { $src.Dispose() }
    }
}

function Invoke-GsutilUpload([string]$localPath, [string]$gcsObject) {
    $gsutilPath = $null
    $cmd = Get-Command gsutil -ErrorAction SilentlyContinue
    if ($cmd) { $gsutilPath = $cmd.Source }
    if (-not $gsutilPath) {
        $fallback = Join-Path $env:LOCALAPPDATA 'Google\Cloud SDK\google-cloud-sdk\bin\gsutil.cmd'
        if (Test-Path $fallback) { $gsutilPath = $fallback }
    }
    if (-not $gsutilPath) { throw 'gsutil not found' }
    $uri = 'gs://' + $Bucket + '/' + $gcsObject
    & $gsutilPath -h 'Content-Type:image/jpeg' cp $localPath $uri
    if ($LASTEXITCODE -ne 0) { throw ('gsutil cp failed: ' + $uri) }
}

New-Item -ItemType Directory -Path $JpgDir -Force | Out-Null
$config = Read-Config
$token = Get-AccessToken $config
$sheetName = if ($config.sheet_name) { [string]$config.sheet_name } else { '工作表1' }

$range = [uri]::EscapeDataString((Format-SheetRange $sheetName 'A2:G'))
$url = 'https://sheets.googleapis.com/v4/spreadsheets/' + $config.sheet_id + '/values/' + $range
$data = Invoke-RestMethod -Uri $url -Headers @{ Authorization = 'Bearer ' + $token } -Method Get

$updates = New-Object System.Collections.Generic.List[object]
$convertedRows = New-Object System.Collections.Generic.List[int]
$ok = 0; $fail = 0

for ($i = 0; $i -lt $data.values.Count; $i++) {
    $sheetRow = $i + 2
    $row = @($data.values[$i])
    while ($row.Count -lt 7) { $row += '' }
    $arena = [string]$row[1]
    if ([string]::IsNullOrWhiteSpace($arena)) { continue }

    $src = Find-InboxSource $sheetRow
    if (-not $src) { continue }

    $dest = Join-Path $JpgDir ('r' + $sheetRow + '.jpg')
    $gcsUrl = $BaseUrl + '/photo/r' + $sheetRow + '.jpg'
    $line = 'Row ' + $sheetRow + ' | ' + $arena

    if ($DryRun) {
        Write-Host ('[DRY] ' + $line + ' <- ' + (Split-Path $src -Leaf))
        continue
    }

    try {
        Write-Host ('[CONVERT] ' + $line)
        Convert-ToJpegFile $src $dest
        if ($Upload) {
            Write-Host ('[UPLOAD] ' + $line)
            Invoke-GsutilUpload $dest ('photo/r' + $sheetRow + '.jpg')
        }
        $updates.Add([PSCustomObject]@{ row = $sheetRow; photo = $gcsUrl })
        $convertedRows.Add($sheetRow) | Out-Null
        $ok++
    } catch {
        Write-Host ('[FAIL] ' + $line + ' | ' + $_.Exception.Message) -ForegroundColor Red
        $fail++
    }
}

$DefaultPhoto = $BaseUrl + '/photo/a1.jpg'
$convertedSet = @{}
foreach ($r in $convertedRows) { $convertedSet[[int]$r] = $true }

for ($i = 0; $i -lt $data.values.Count; $i++) {
    $sheetRow = $i + 2
    $row = @($data.values[$i])
    while ($row.Count -lt 7) { $row += '' }
    if ([string]::IsNullOrWhiteSpace([string]$row[1])) { continue }
    if ($convertedSet.ContainsKey($sheetRow)) { continue }
    $updates.Add([PSCustomObject]@{ row = $sheetRow; photo = $DefaultPhoto })
}

if (-not $DryRun -and $updates.Count -gt 0) {
    Write-Host ''
    Write-Host ('Updating sheet photo column: ' + $updates.Count + ' rows')
    $batchSize = 40
    for ($start = 0; $start -lt $updates.Count; $start += $batchSize) {
        $end = [Math]::Min($start + $batchSize - 1, $updates.Count - 1)
        Update-PhotosBatch $token $config.sheet_id $sheetName $updates[$start..$end]
        if ($end -lt ($updates.Count - 1)) { Start-Sleep -Seconds 2 }
    }
}

Write-Host ''
Write-Host ('Done. converted=' + $ok + ' failed=' + $fail)
if (-not $DryRun) {
    $report = @{
        at            = (Get-Date).ToString('s')
        convertedRows = @($convertedRows | Sort-Object -Unique)
        uploadedRows  = if ($Upload) { @($convertedRows | Sort-Object -Unique) } else { @() }
        failed        = $fail
    }
    $report | ConvertTo-Json -Depth 4 | Set-Content (Join-Path $Root 'inbox-publish-report.json') -Encoding UTF8
}
if (-not $Upload) {
    Write-Host 'Next: re-run with -Upload or upload photos-jpg to GCS'
}
