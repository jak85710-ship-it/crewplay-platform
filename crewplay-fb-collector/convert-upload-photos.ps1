# Download / convert images to JPG, upload to GCS, update sheet photo column
param(
    [switch]$DryRun,
    [switch]$Upload,
    [switch]$UpdateSheet,
    [switch]$OnlyEmpty,
    [int]$Limit = 0,
    [int]$FromRow = 0,
    [int]$ToRow = 0,
    [switch]$ForceMissingLocal
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.UTF8Encoding]::UTF8
Add-Type -AssemblyName System.Drawing

$Root = $PSScriptRoot
$ConfigPath = Join-Path $Root 'config.json'
$PhotoConfigPath = Join-Path $Root 'storage/photo-config.json'
$InboxDir = Join-Path $Root 'storage/photos-inbox'
$JpgDir = Join-Path $Root 'storage/photos-jpg'
$ReportPath = Join-Path $Root 'photo-upload-report.json'

$Bucket = 'crewplay-arena-storage'
$GcsPrefix = 'photo'
$BaseUrl = 'https://storage.googleapis.com/crewplay-arena-storage'
$DefaultPhoto = $BaseUrl + '/photo/a1.jpg'
$MaxDim = 1280
$JpegQuality = 85

if (Test-Path $PhotoConfigPath) {
    $pc = Get-Content $PhotoConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($pc.baseUrl) { $BaseUrl = [string]$pc.baseUrl.TrimEnd('/') }
    if ($pc.bucket) { $Bucket = [string]$pc.bucket }
    if ($pc.defaultPhoto) { $DefaultPhoto = [string]$pc.defaultPhoto }
}

function Read-Config {
    if (-not (Test-Path $ConfigPath)) { throw 'config.json not found.' }
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

function Test-ValidGcsJpg([string]$photo) {
    if ([string]::IsNullOrWhiteSpace($photo)) { return $false }
    if ($photo -notmatch '^https?://') { return $false }
    if ($photo -notmatch 'crewplay-arena-storage/photo/.+\.jpg($|\?)') { return $false }
    if ($photo -match '/a1\.jpg($|\?)') { return $false }
    return $true
}

function Get-GcsFileName([int]$row) {
    return ('r' + $row + '.jpg')
}

function Get-GcsUrl([int]$row) {
    return $BaseUrl + '/' + $GcsPrefix + '/' + (Get-GcsFileName $row)
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
    if (-not $codec) { throw 'JPEG encoder not found.' }
    $ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
        [System.Drawing.Imaging.Encoder]::Quality, [long]$quality)
    $bitmap.Save($path, $codec, $ep)
    $ep.Dispose()
}

function Resize-Bitmap($src, [int]$maxDim) {
    $w = $src.Width
    $h = $src.Height
    if ($w -le $maxDim -and $h -le $maxDim) {
        return $src
    }
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
    $src = $null
    $work = $null
    try {
        $src = New-Object System.Drawing.Bitmap($sourcePath)
        $work = Resize-Bitmap $src $MaxDim
        $dir = Split-Path $destPath -Parent
        if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
        Save-BitmapAsJpeg $work $destPath $JpegQuality
    } finally {
        if ($work -and $work -ne $src) { $work.Dispose() }
        if ($src) { $src.Dispose() }
    }
}

function Test-DownloadablePhotoUrl([string]$url) {
    if ([string]::IsNullOrWhiteSpace($url)) { return $false }
    if ($url -match 'static\.|rsrc\.php') { return $false }
    if ($url -match '\.webp' -and $url -notmatch 'scontent.*/v/') { return $false }
    return $true
}

function Test-ImageFile([string]$path) {
    if (-not (Test-Path $path)) { return $false }
    if ((Get-Item $path).Length -lt 200) { return $false }
    try {
        $b = New-Object System.Drawing.Bitmap($path)
        $b.Dispose()
        return $true
    } catch {
        return $false
    }
}

function Download-ImageFile([string]$url, [string]$destPath) {
    $headers = @{
        'User-Agent' = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        'Referer'    = 'https://www.facebook.com/'
    }
    $dir = Split-Path $destPath -Parent
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    Invoke-WebRequest -Uri $url -Headers $headers -OutFile $destPath -UseBasicParsing -TimeoutSec 60
    if (-not (Test-ImageFile $destPath)) {
        Remove-Item $destPath -Force -ErrorAction SilentlyContinue
        throw 'Downloaded file is not a valid image (FB URL may have expired). Save image manually to photos-inbox.'
    }
}

function Invoke-GsutilUpload([string]$localPath, [string]$gcsObject) {
    $gsutil = Get-Command gsutil -ErrorAction SilentlyContinue
    if (-not $gsutil) { throw 'gsutil not found. Install Google Cloud SDK or upload manually.' }
    $uri = 'gs://' + $Bucket + '/' + $gcsObject
    & gsutil -h 'Content-Type:image/jpeg' cp $localPath $uri
    if ($LASTEXITCODE -ne 0) { throw ('gsutil cp failed: ' + $uri) }
    & gsutil acl ch -u AllUsers:R $uri
    if ($LASTEXITCODE -ne 0) { throw ('gsutil acl failed: ' + $uri) }
}

if (-not $UpdateSheet -and -not $DryRun -and -not $Upload) {
    $UpdateSheet = $true
}

New-Item -ItemType Directory -Path $InboxDir -Force | Out-Null
New-Item -ItemType Directory -Path $JpgDir -Force | Out-Null

$config = Read-Config
$token = Get-AccessToken $config
$sheetName = if ($config.sheet_name) { [string]$config.sheet_name } else { '工作表1' }
$range = [uri]::EscapeDataString((Format-SheetRange $sheetName 'A2:G'))
$url = 'https://sheets.googleapis.com/v4/spreadsheets/' + $config.sheet_id + '/values/' + $range
$data = Invoke-RestMethod -Uri $url -Headers @{ Authorization = 'Bearer ' + $token } -Method Get

$jobs = New-Object System.Collections.Generic.List[object]
$skipped = 0

for ($i = 0; $i -lt $data.values.Count; $i++) {
    $row = @($data.values[$i])
    $sheetRow = $i + 2
    if ($FromRow -gt 0 -and $sheetRow -lt $FromRow) { continue }
    if ($ToRow -gt 0 -and $sheetRow -gt $ToRow) { continue }
    while ($row.Count -lt 7) { $row += '' }
    $arena = [string]$row[1]
    $photo = [string]$row[3]
    if ([string]::IsNullOrWhiteSpace($arena)) { continue }

    if (Test-ValidGcsJpg $photo) {
        $localJpg = Join-Path $JpgDir (Get-GcsFileName $sheetRow)
        if (-not $ForceMissingLocal -or (Test-Path $localJpg)) {
            $skipped++
            continue
        }
    }

    $inbox = Find-InboxSource $sheetRow
    $sourceUrl = $null
    $sourceKind = $null

    if ($inbox) {
        $sourceKind = 'inbox'
    } elseif (-not [string]::IsNullOrWhiteSpace($photo) -and $photo -match '^https?://') {
        if ($OnlyEmpty) { continue }
        if (-not (Test-DownloadablePhotoUrl $photo)) { continue }
        $sourceUrl = $photo
        $sourceKind = 'url'
    } elseif ($OnlyEmpty) {
        continue
    } else {
        continue
    }

    $jobs.Add([PSCustomObject]@{
        row        = $sheetRow
        arena      = $arena
        sourceKind = $sourceKind
        sourcePath = $inbox
        sourceUrl  = $sourceUrl
        destJpg    = Join-Path $JpgDir (Get-GcsFileName $sheetRow)
        gcsUrl     = Get-GcsUrl $sheetRow
    })
}

if ($Limit -gt 0 -and $jobs.Count -gt $Limit) {
    $jobs = $jobs[0..($Limit - 1)]
}

Write-Host ''
Write-Host '========================================'
Write-Host '  Photo: convert to JPG + upload'
Write-Host '========================================'
Write-Host ('Skip (already GCS jpg): ' + $skipped)
Write-Host ('To process: ' + $jobs.Count)
Write-Host ('Inbox folder: ' + $InboxDir)
Write-Host ('Output JPG:   ' + $JpgDir)
Write-Host ''

if ($jobs.Count -eq 0) {
    Write-Host 'Nothing to do.'
    Write-Host 'Put images in storage/photos-inbox/ as {row}.jpg or {row}.png (row = sheet row number).'
    exit 0
}

$results = @()
$sheetUpdates = New-Object System.Collections.Generic.List[object]

foreach ($job in $jobs) {
    $line = 'Row ' + $job.row + ' | ' + $job.arena
    if ($DryRun) {
        Write-Host ('[DRY] ' + $line + ' | ' + $job.sourceKind)
        $results += [PSCustomObject]@{ row = $job.row; status = 'dry_run'; gcsUrl = $job.gcsUrl }
        continue
    }

    try {
        $tmp = Join-Path $JpgDir ('_tmp_' + $job.row)
        if ($job.sourceKind -eq 'inbox') {
            Write-Host ('[CONVERT] ' + $line + ' <- inbox')
            Convert-ToJpegFile $job.sourcePath $job.destJpg
        } else {
            Write-Host ('[DOWNLOAD] ' + $line)
            Download-ImageFile $job.sourceUrl $tmp
            Write-Host ('[CONVERT] ' + $line + ' -> JPG')
            Convert-ToJpegFile $tmp $job.destJpg
            Remove-Item $tmp -Force -ErrorAction SilentlyContinue
        }

        $uploaded = $false
        if ($Upload) {
            Write-Host ('[UPLOAD] ' + $line)
            Invoke-GsutilUpload $job.destJpg ($GcsPrefix + '/' + (Get-GcsFileName $job.row))
            $uploaded = $true
        }

        if ($UpdateSheet -and ($uploaded -or -not $Upload)) {
            if ($Upload) {
                $sheetUpdates.Add([PSCustomObject]@{ row = $job.row; photo = $job.gcsUrl })
            }
        }

        $results += [PSCustomObject]@{
            row      = $job.row
            arena    = $job.arena
            status   = if ($uploaded) { 'uploaded' } else { 'converted' }
            localJpg = $job.destJpg
            gcsUrl   = $job.gcsUrl
        }
    } catch {
        Write-Host ('[FAIL] ' + $line + ' | ' + $_.Exception.Message) -ForegroundColor Red
        $results += [PSCustomObject]@{ row = $job.row; arena = $job.arena; status = 'failed'; error = $_.Exception.Message }
    }
}

if (-not $DryRun -and $UpdateSheet -and $Upload -and $sheetUpdates.Count -gt 0) {
    Write-Host ''
    Write-Host ('Updating sheet photo column: ' + $sheetUpdates.Count + ' rows')
    $batchSize = 40
    for ($start = 0; $start -lt $sheetUpdates.Count; $start += $batchSize) {
        $end = [Math]::Min($start + $batchSize - 1, $sheetUpdates.Count - 1)
        Update-PhotosBatch $token $config.sheet_id $sheetName $sheetUpdates[$start..$end]
        if ($end -lt ($sheetUpdates.Count - 1)) { Start-Sleep -Seconds 2 }
    }
}

if (-not $DryRun -and $UpdateSheet -and -not $Upload) {
    Write-Host ''
    Write-Host 'JPG files ready. Next steps:'
    Write-Host '  1. Ask admin to upload with gsutil (see photo-upload-commands.txt)'
    Write-Host '  2. Or run again with -Upload if gsutil is installed'
    Write-Host '  3. Then run: 寫回圖片網址.bat'
}

$report = @{
    at       = (Get-Date).ToString('s')
    dryRun   = [bool]$DryRun
    upload   = [bool]$Upload
    skipped  = $skipped
    processed = $results
}
$report | ConvertTo-Json -Depth 6 | Set-Content $ReportPath -Encoding UTF8

Write-Host ''
Write-Host ('Report: ' + $ReportPath)
