# Export sheet diagnostics to UTF-8 JSON
$ErrorActionPreference = 'Stop'
$Root = $PSScriptRoot
$config = Get-Content (Join-Path $Root 'config.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$tokenBody = @{ client_id=$config.client_id; client_secret=$config.client_secret; refresh_token=$config.refresh_token; grant_type='refresh_token' }
$tokenResp = Invoke-RestMethod -Uri 'https://oauth2.googleapis.com/token' -Method POST -Body $tokenBody
$headers = @{ Authorization = "Bearer $($tokenResp.access_token)" }
$range = [uri]::EscapeDataString("'$($config.sheet_name)'!A:G")
$url = "https://sheets.googleapis.com/v4/spreadsheets/$($config.sheet_id)/values/$range"
$data = Invoke-RestMethod -Uri $url -Headers $headers
$rows = @()
for ($i = 1; $i -lt $data.values.Count; $i++) {
    $r = @($data.values[$i])
    while ($r.Count -lt 7) { $r += '' }
    $rows += [PSCustomObject]@{
        row = $i + 1
        sport = [string]$r[0]
        arena_name = [string]$r[1]
        photo = [string]$r[3]
        region = [string]$r[5]
        location = [string]$r[6]
        hasPhoto = -not [string]::IsNullOrWhiteSpace([string]$r[3])
        introPreview = ([string]$r[2]).Substring(0, [Math]::Min(80, ([string]$r[2]).Length))
    }
}
$out = @{
    sheetId = $config.sheet_id
    sheetName = $config.sheet_name
    totalRows = $rows.Count
    withPhoto = @($rows | Where-Object { $_.hasPhoto }).Count
    withoutPhoto = @($rows | Where-Object { -not $_.hasPhoto }).Count
    sampleSearchTargets = @($rows | Where-Object { $_.arena_name -match '鳳西|大裕|晴風|超速|大社' })
    allArenas = @($rows | ForEach-Object { $_.arena_name })
}
$path = Join-Path $Root 'sheet-diag.json'
$out | ConvertTo-Json -Depth 6 | Set-Content $path -Encoding UTF8
Write-Host $path
