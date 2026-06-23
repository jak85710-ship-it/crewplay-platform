$ErrorActionPreference = 'Stop'
$config = Get-Content (Join-Path $PSScriptRoot 'config.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$tokenBody = @{
    client_id     = $config.client_id
    client_secret = $config.client_secret
    refresh_token = $config.refresh_token
    grant_type    = 'refresh_token'
}
$tokenResp = Invoke-RestMethod -Uri 'https://oauth2.googleapis.com/token' -Method POST -Body $tokenBody
$headers = @{ Authorization = "Bearer $($tokenResp.access_token)" }
$range = [uri]::EscapeDataString("'$($config.sheet_name)'!A:G")
$url = "https://sheets.googleapis.com/v4/spreadsheets/$($config.sheet_id)/values/$range"
$data = Invoke-RestMethod -Uri $url -Headers $headers

$stats = @{
    total       = $data.values.Count - 1
    withPhoto   = 0
    withFee     = 0
    withLinDa   = 0
    uniqueArena = @{}
    photoIn1_80 = 0
    photoIn81up = 0
    stdIntro1_80 = 0
    stdIntro81up = 0
}
for ($i = 1; $i -lt $data.values.Count; $i++) {
    $row = $data.values[$i]
    $photo = if ($row.Count -gt 3) { $row[3] } else { '' }
    $intro = if ($row.Count -gt 2) { $row[2] } else { '' }
    $arena = if ($row.Count -gt 1) { $row[1] } else { '' }
    $hasPhoto = -not [string]::IsNullOrWhiteSpace($photo)
    if ($hasPhoto) { $stats.withPhoto++ }
    if ($i -le 80) { if ($hasPhoto) { $stats.photoIn1_80++ } } else { if ($hasPhoto) { $stats.photoIn81up++ } }
    if ($intro -match '\u8CBB\u7528\uFF1A') { $stats.withFee++ }
    if ($intro -match '\u81E8\u6253\u8CBB\uFF1A') { $stats.withLinDa++ }
    $std = ($intro -match '\u6642\u9593\uFF1A') -and ($intro -match '\u5730\u9EDE\uFF1A') -and (($intro -match '\u8CBB\u7528\uFF1A') -or ($intro -match '\u81E8\u6253\u8CBB\uFF1A'))
    if ($std) {
        if ($i -le 80) { $stats.stdIntro1_80++ } else { $stats.stdIntro81up++ }
    }
    if ($arena) { $stats.uniqueArena[$arena] = $true }
}

$sample = @()
foreach ($n in 79, 80, 81, 82, 105) {
    $idx = $n - 1
    if ($idx -ge $data.values.Count) { continue }
    $row = $data.values[$idx]
    $sample += [PSCustomObject]@{
        row      = $n
        sport    = if ($row.Count -gt 0) { $row[0] } else { '' }
        arena    = if ($row.Count -gt 1) { $row[1] } else { '' }
        intro    = if ($row.Count -gt 2) { $row[2] } else { '' }
        photo    = if ($row.Count -gt 3) { $row[3] } else { '' }
        assign   = if ($row.Count -gt 4) { $row[4] } else { '' }
        region   = if ($row.Count -gt 5) { $row[5] } else { '' }
        location = if ($row.Count -gt 6) { $row[6] } else { '' }
    }
}

$result = [PSCustomObject]@{
    stats  = [PSCustomObject]@{
        totalRows    = $stats.total
        withPhoto    = $stats.withPhoto
        withoutPhoto = $stats.total - $stats.withPhoto
        hasFee       = $stats.withFee
        hasLinDaFei  = $stats.withLinDa
        uniqueArena  = $stats.uniqueArena.Count
        photoRows1_80 = $stats.photoIn1_80
        photoRows81up = $stats.photoIn81up
        stdIntro1_80  = $stats.stdIntro1_80
        stdIntro81up  = $stats.stdIntro81up
    }
    sample = $sample
}
$outPath = Join-Path $PSScriptRoot 'diag-rows.json'
$result | ConvertTo-Json -Depth 6 | Set-Content $outPath -Encoding UTF8
Write-Host "Wrote $outPath"
