# Read photo column status for a row range (no secrets printed)
param([int]$FromRow = 97, [int]$ToRow = 278)

$ErrorActionPreference = 'Stop'
$Root = $PSScriptRoot
$config = Get-Content (Join-Path $Root 'config.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$body = 'client_id=' + [uri]::EscapeDataString([string]$config.client_id) +
        '&client_secret=' + [uri]::EscapeDataString([string]$config.client_secret) +
        '&refresh_token=' + [uri]::EscapeDataString([string]$config.refresh_token) +
        '&grant_type=refresh_token'
$token = (Invoke-RestMethod -Uri 'https://oauth2.googleapis.com/token' -Method Post `
    -ContentType 'application/x-www-form-urlencoded' -Body $body).access_token
$sheetName = if ($config.sheet_name) { [string]$config.sheet_name } else { '工作表1' }
$name = $sheetName
if ($sheetName -match "[\s'!]") { $name = "'" + ($sheetName -replace "'", "''") + "'" }
$range = [uri]::EscapeDataString($name + ('!A' + $FromRow + ':G' + $ToRow))
$url = 'https://sheets.googleapis.com/v4/spreadsheets/' + $config.sheet_id + '/values/' + $range
$data = Invoke-RestMethod -Uri $url -Headers @{ Authorization = 'Bearer ' + $token }
$jpgDir = Join-Path $Root 'storage/photos-jpg'

for ($i = 0; $i -lt $data.values.Count; $i++) {
    $row = @($data.values[$i])
    while ($row.Count -lt 7) { $row += '' }
    $sheetRow = $FromRow + $i
    $photo = [string]$row[3]
    $assign = [string]$row[4]
    $local = Test-Path (Join-Path $jpgDir ('r' + $sheetRow + '.jpg'))
    $kind = 'other'
    if ($photo -match '/a1\.jpg') { $kind = 'a1' }
    elseif ($photo -match 'crewplay-arena-storage/photo/r(\d+)\.jpg') { $kind = 'gcs_r' + $Matches[1] }
    elseif ($photo -match 'scontent|fbcdn') { $kind = 'fb_cdn' }
    elseif ($photo -match 'facebook\.com') { $kind = 'fb_page' }
    elseif ([string]::IsNullOrWhiteSpace($photo)) { $kind = 'empty' }
    if (-not $local -or $kind -eq 'a1' -or $kind -eq 'empty' -or ($kind -match '^gcs_r' -and $kind -ne ('gcs_r' + $sheetRow))) {
        Write-Output ($sheetRow.ToString() + '|' + $kind + '|local=' + $local + '|' + $photo.Substring(0, [Math]::Min(80, $photo.Length)))
    }
}
