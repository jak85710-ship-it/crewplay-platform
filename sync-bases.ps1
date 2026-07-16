$ErrorActionPreference = 'Stop'
$project = $PSScriptRoot
$src = Join-Path (Join-Path $env:USERPROFILE 'OneDrive') "桌面\喚鹿工作室上板材料"
if (-not (Test-Path $src)) { throw "Source folder not found: $src" }

$dst = Join-Path $project 'assets\bases'
New-Item -ItemType Directory -Force -Path $dst | Out-Null

$files = Get-ChildItem $src -Recurse -File | Where-Object { $_.Extension -match '^\.(webp|png|jpg|jpeg)$' } | Sort-Object Name
if ($files.Count -eq 0) { throw 'No board images found' }

function Get-NameAndPrice {
  param(
    [string]$RawName,
    [int]$FallbackPrice
  )

  $m = [regex]::Match($RawName, '(?<price>\d[\d,]*)\s*$')
  if (-not $m.Success) {
    return [ordered]@{ Name = $RawName; Price = $FallbackPrice }
  }

  $name = $RawName.Substring(0, $m.Index).Trim()
  $name = [regex]::Replace($name, '[\s\-_()\[\]]+$', '')
  $name = ($name -replace '價格', '').Trim()
  $name = [regex]::Replace($name, '[:：]\s*$', '')
  if (-not $name) { $name = $RawName }

  $priceText = $m.Groups['price'].Value -replace ',', ''
  $price = $FallbackPrice
  if ([int]::TryParse($priceText, [ref]$price)) {
    return [ordered]@{ Name = $name; Price = $price }
  }
  return [ordered]@{ Name = $name; Price = $FallbackPrice }
}

$catalogPath = Join-Path $project 'catalog.json'
$catalog = Get-Content $catalogPath -Raw -Encoding UTF8 | ConvertFrom-Json
if (-not $catalog.bases) { $catalog | Add-Member -NotePropertyName bases -NotePropertyValue @() -Force }

$bases = @()
$i = 0
foreach ($f in $files) {
  $i++
  $id = ('board_' + $i.ToString('003'))
  $rawName = [System.IO.Path]::GetFileNameWithoutExtension($f.Name)
  $parsed = Get-NameAndPrice -RawName $rawName -FallbackPrice (600 + (($i - 1) * 80))
  $name = $parsed.Name
  $ext = $f.Extension.ToLower()
  $destName = ($id + $ext)
  Copy-Item $f.FullName (Join-Path $dst $destName) -Force

  $price = [int]$parsed.Price
  $emoji = if ($i % 3 -eq 1) { '🪵' } elseif ($i % 3 -eq 2) { '⬡' } else { '🧱' }
  $bases += [ordered]@{
    id=$id
    name=$name
    brand='喚鹿工作室上板材料'
    desc='上板材料'
    price=$price
    img=('assets/bases/' + $destName)
    emoji=$emoji
  }
  Write-Host ('[BaseSync] ' + $destName + ' <= ' + $f.Name)
}

$catalog.bases = $bases
$catalog.updated = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
$catalog | ConvertTo-Json -Depth 8 | Set-Content $catalogPath -Encoding UTF8

Write-Host ('Synced ' + $bases.Count + ' board materials')
