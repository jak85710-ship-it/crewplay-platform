$root = $PSScriptRoot
$plants = @('alcicorne','andinum','bifurcatum','coronarium','elephantotis','ellisii','grande','hillii','holttumii','madagascariense','quadridichotomum','ridleyi','stemaria','superbum','veitchii','wallichii','wandae','willinckii')
$bases = @{ acrylic = '#B8E0F0'; wood_3d = '#C4A882'; metal_grid = '#8A9BA8' }

New-Item -ItemType Directory -Force -Path "$root\assets\plants", "$root\assets\bases", "$root\assets\ui" | Out-Null

function New-PlantSvg([string]$name) {
@'
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#7EBC8A"/><stop offset="100%" stop-color="#2E5438"/></linearGradient></defs>
  <ellipse cx="200" cy="280" rx="90" ry="60" fill="url(#g)" opacity="0.9"/>
  <path d="M200 280 C160 200 140 120 200 60 C260 120 240 200 200 280" fill="#4A7C5A"/>
  <path d="M170 200 C150 140 180 90 200 80 C220 90 250 140 230 200" fill="#3D9A60" opacity="0.8"/>
  <text x="200" y="370" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#2E5438">PLANT_LABEL</text>
</svg>
'@ -replace 'PLANT_LABEL', $name
}

foreach ($p in $plants) {
  New-PlantSvg $p | Set-Content -Path "$root\assets\plants\plant_$p.svg" -Encoding UTF8
}

foreach ($b in $bases.Keys) {
  $color = $bases[$b]
@"
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <rect x="60" y="80" width="280" height="240" rx="12" fill="$color" stroke="#1A3020" stroke-width="4"/>
  <text x="200" y="220" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#1A3020">$b</text>
</svg>
"@ | Set-Content -Path "$root\assets\bases\base_$b.svg" -Encoding UTF8
}

@"
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#1A3020"/>
  <text x="600" y="300" text-anchor="middle" font-family="serif" font-size="64" fill="#B8892A">鹿角蕨穿搭模擬器</text>
  <text x="600" y="380" text-anchor="middle" font-family="sans-serif" font-size="32" fill="#7EBC8A">Staghorn Art Studio</text>
</svg>
"@ | Set-Content -Path "$root\assets\ui\og-image.svg" -Encoding UTF8

Write-Host "Done: $((Get-ChildItem "$root\assets" -Recurse -File).Count) files"
