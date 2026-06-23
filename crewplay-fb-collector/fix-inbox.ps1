# Fix inbox JSON rows for LINE-ready upload
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.UTF8Encoding]::UTF8

$Root = $PSScriptRoot
$Inbox = Join-Path $Root 'inbox'
$DefaultPhoto = 'https://storage.googleapis.com/crewplay-arena-storage/photo/a1.jpg'

function Clean-Text([string]$t) {
    if (-not $t) { return '' }
    return ($t -replace '\s+', ' ').Trim()
}

function Clean-Venue([string]$v) {
    $v = Clean-Text $v
    $v = $v -replace '^球館[：:]\s*', ''
    $v = $v -replace '^地點[：:]\s*', ''
    $v = $v -replace '^[】\]\[【✧場地˳༚　\s]+', ''
    $v = $v -replace '^[：:]+', ''
    $v = $v -replace '^\|地址\|', ''
    return Clean-Text $v
}

function Is-BadTeam([string]$team) {
    if (-not $team) { return $true }
    $t = Clean-Text $team
    if ($t.Length -lt 2) { return $true }
    if ($t -match '^(週[一二三四五六日天]|禮拜[一二三四五六日天]|星期[一二三四五六日天]|日期|自備零錢|報名請私訊|報名繳費|人\(採用|新力|持續練習不斷精進\]\(https|（初中)') { return $true }
    if ($t -match '徵固定和?$|徵$|固定和$') { return $false }
    if ($t -eq '羽球隊') { return $true }
    if ($t -match 'https' -or $t -match '\]\(http') { return $true }
    if ($t.Length -gt 28) { return $true }
    return $false
}

function Extract-TeamFromRaw([string]$raw) {
    if (-not $raw) { return '' }
    $lines = $raw -split "`n"
    foreach ($ln in $lines[0..([Math]::Min(8, $lines.Count - 1))]) {
        $ln = Clean-Text $ln
        if (-not $ln -or $ln.Length -lt 3) { continue }
        if ($ln -match '^【([^】]{2,20})】') { return Clean-Text $matches[1] }
        if ($ln -match '^[［\[]([^］\]]{2,20})[］\]]') { return Clean-Text $matches[1] }
        if ($ln -match '^(.{2,18}(?:羽球團|排球團|匹克球團|球團|聯隊|戰隊|隊))') {
            $c = Clean-Text $matches[1]
            if (-not (Is-BadTeam $c)) { return $c }
        }
        if ($ln -match '^(隼勝|賀逗陣|南Fang|羽宙|GOGO21|就將|柏林|格洛斯特|南Fang|來帕|羽蔣有約|※透中午羽你同樂※|山山羽球|Violin|羽Vi同樂|快樂球隊|週二光榮)') {
            return Clean-Text ($ln -replace '※+', '').Trim()
        }
    }
    return ''
}

function Extract-VenueFromRaw([string]$raw, [string]$current) {
    $patterns = @(
        '超速羽球館(?:大社館)?',
        '東尼羽球[-－]?鳳山館',
        '東尼羽球館',
        '東尼美術館羽球館',
        '高雄東尼羽球美術館店',
        '東尼鳳山\s*羽球館',
        '力羽美羽球館',
        '鳳西羽球館',
        'More羽球館',
        'more複合式羽球館',
        'MORE羽球館',
        '嘉世羽球館',
        '奧本羽球館',
        '奧本羽球場',
        '神力羽球館',
        '戰將羽球館',
        '楠梓戰將羽球館',
        '松上羽球館',
        '高雄市松上羽球館',
        '邁特羽球館',
        '康橋羽球館',
        '加賀羽球館',
        '藏龍羽球楠橋館',
        '新力羽球(?:仁武館|館)?',
        '羽冠羽球館',
        '羽利羽球館',
        '德蔻換鞋羽球館',
        '優勢冷氣羽球館|冷氣羽球館',
        '左營Wumo羽球館',
        '苓雅運動中心',
        '中正技擊館',
        '鹽埕運動中心',
        '翔豐羽球工坊',
        '凱富羽球館',
        '南區羽球[^\\n]{0,12}館',
        'S\s*[Kk]lub',
        '光榮國小'
    )
    $blob = $raw + ' ' + $current
    if ($blob -match '本球館可穿線|星光團') { return '力羽美羽球館' }
    if ($blob -match '靠近籃球場|S\s*[Kk]lub') { return 'S Klub 羽球館' }
    foreach ($p in $patterns) {
        if ($blob -match $p) {
            $v = $matches[0]
            $v = $v -replace '冷氣羽球館', '優勢冷氣羽球館'
            $v = $v -replace '大社館', '超速羽球館大社館'
            if ($v -match '靠近籃球場|S\s*[Kk]lub') { return 'S Klub 羽球館' }
            if ($v -match '本球館可穿線|星光團') { return '力羽美羽球館' }
            if ($v -match '報名繳費') { return '翔豐羽球工坊' }
            return Clean-Venue $v
        }
    }
    return Clean-Venue $current
}

function Extract-Address([string]$raw, [string]$loc, [string]$venue) {
    $blob = "$raw $loc $venue"
    if ($blob -match '(\d{3,5}[\u4e00-\u9fff]{2,6}[市縣][\u4e00-\u9fff\d\-－—之號巷弄路段街村里區鄉鎮市路]+)') {
        return Clean-Text $matches[1]
    }
    if ($blob -match '(高雄市[\u4e00-\u9fff\d\-－—之號巷弄路段街村里區鄉鎮]+)') {
        return Clean-Text $matches[1]
    }
    if ($blob -match '(臺南市[\u4e00-\u9fff\d\-－—之號巷弄路段街村里區鄉鎮]+)') {
        return Clean-Text $matches[1]
    }
    if ($blob -match '(新北市[\u4e00-\u9fff\d\-－—之號巷弄路段街村里區鄉鎮]+)') {
        return Clean-Text $matches[1]
    }
    $loc = Clean-Text $loc
    if ($loc -match '^\d{3}' -or ($loc -match '高雄|臺南|新北|桃園' -and $loc.Length -gt 8)) {
        return $loc -replace '^\（|\）$|^\(|\)$', ''
    }
    if ($loc -match '高雄市|臺南市|新北市' -and $loc.Length -gt 10) {
        return $loc
    }
    return ''
}

function Infer-Region([string]$loc, [string]$raw) {
    $blob = "$loc $raw"
    if ($blob -match '高雄市|高雄') { return '高雄市' }
    if ($blob -match '臺南市|台南市|臺南|台南') { return '臺南市' }
    if ($blob -match '新北市') { return '新北市' }
    if ($blob -match '桃園市') { return '桃園市' }
    if ($blob -match '臺中市|台中市') { return '臺中市' }
    return ''
}

function Parse-IntroField([string]$intro, [string]$label) {
    $esc = [regex]::Escape($label)
    if ($intro -match "${esc}[：:]\s*([^\n]+)") {
        return Clean-Text $matches[1]
    }
    return ''
}

function Normalize-Fee([string]$fee) {
    $fee = Clean-Text $fee
    $fee = $fee -replace '臨打費', ''
    $fee = $fee -replace '零打費用', ''
    $fee = $fee -replace '收費', ''
    $fee = $fee -replace '費用', ''
    $fee = $fee -replace '[：:】\[\]]+', ''
    $fee = $fee -replace '用：', ''
    if ($fee -match '(\d{2,4})') {
        $n = $matches[1]
        if ($fee -match '男.*?(\d+).*女.*?(\d+)') {
            return "男$($matches[1])/女$($matches[2])/人"
        }
        if ($fee -match '2H\s*\$?(\d+).*3H\s*\$?(\d+)') {
            return "$($matches[2])/人"
        }
        return "$n/人"
    }
    if ($fee -match '免費') { return '免費' }
    return ''
}

function Build-Introduce($venue, $time, $level, $balls, $fee) {
    $lines = @()
    if ($venue) { $lines += "地點：$venue" }
    if ($time) { $lines += "時間：$time" }
    if ($level) { $lines += "程度：$level" }
    if ($balls) { $lines += "用球：$balls" }
    if ($fee) {
        if ($fee -notmatch '/人$') { $fee = "$fee/人" }
        $lines += "費用：$fee"
    }
    return ($lines -join "`n")
}

function Build-ArenaName($venue, $team) {
    if ($team -and -not (Is-BadTeam $team)) { return Clean-Text $team }
    if ($venue) { return Clean-Venue $venue }
    return ''
}

function Fix-Row($row) {
    $raw = $row.archive.raw_text
    if ($raw -match '保持發言的成員') { return $null }

    $venue = Extract-VenueFromRaw $raw $row.venue
    if (-not $venue) { $venue = Extract-VenueFromRaw $raw $row.arena_name }
    if ($venue -match '^(靠近籃球場|大社館|冷氣羽球館|本球館可穿線|報名繳費|：)') {
        $venue = Extract-VenueFromRaw $raw ''
    }
    if (-not $venue -or $venue.Length -lt 3) { return $null }

    $team = $row.team_name
    if (Is-BadTeam $team) {
        $team = Extract-TeamFromRaw $raw
    }
    if (Is-BadTeam $team) { $team = '' }

    $intro = $row.introduce
    $time = Parse-IntroField $intro '時間'
    $level = Parse-IntroField $intro '程度'
    $balls = Parse-IntroField $intro '用球'
    $feeRaw = Parse-IntroField $intro '費用'
    if (-not $feeRaw) { $feeRaw = Parse-IntroField $intro '臨打費' }
    $fee = Normalize-Fee $feeRaw

    if (-not $balls -or $balls -eq '：') { $balls = '團主決定' }

    if (-not $time -and $raw -match '時間[：:]\s*([^\n]+)') { $time = Clean-Text $matches[1] }
    if (-not $level -and $raw -match '程度[：:]\s*([^\n]+)') { $level = Clean-Text $matches[1] }
    if (-not $fee -and $raw -match '費用[：:]\s*([^\n]+)') { $fee = Normalize-Fee $matches[1] }
    if (-not $fee -and $raw -match '臨打[費]?\s*(\d+)\s*元') { $fee = "$($matches[1])/人" }

    $time = $time -replace '時$', ''
    if ($time -match '徵\d|中午12-2點') {
        if ($raw -match '12-3點|12-2點') { $time = '週二 12:00-15:00' }
    }

    if (-not $level) { $level = '團主決定' }
    if (-not $fee) { return $null }

    $location = Extract-Address $raw $row.location $venue
    $region = $row.region
    if (-not $region) { $region = Infer-Region $location $raw }
    if (-not $region) { $region = Infer-Region '' $venue }

    $arena = Build-ArenaName $venue $team
    $newIntro = Build-Introduce $venue $time $level $balls $fee

    if ($newIntro -notmatch '時間：') { return $null }

    $row.venue = $venue
    $row.team_name = $team
    $row.arena_name = $arena
    $row.introduce = $newIntro
    $row.location = $location
    $row.region = $region
    if (-not $row.photo -or $row.photo -match 'fbcdn|facebook|static\.|rsrc\.php|\.webp') {
        $row.photo = $DefaultPhoto
    }
    if ($row.archive) {
        if ($team) {
            $row.archive.team_name = $team
            if ($row.archive.extra_notes -notmatch '團名：') {
                $row.archive.extra_notes = "團名：$team`n$($row.archive.extra_notes)"
            }
        }
        $row.archive.venue = $venue
        if (-not $row.archive.region -and $region) { $row.archive.region = $region }
    }
    return $row
}

$files = @(Get-ChildItem $Inbox -Filter '*.json')
if ($files.Count -eq 0) {
    Write-Host 'inbox 沒有 JSON 檔案'
    exit 1
}

$report = @()
foreach ($file in $files) {
    $json = Get-Content $file.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
    $fixed = @()
    $rejected = @()
    $i = 0
    foreach ($row in @($json.rows)) {
        $i++
        $result = Fix-Row $row
        if ($result) {
            $fixed += $result
        } else {
            $rejected += [PSCustomObject]@{
                index = $i
                arena = $row.arena_name
                reason = '場館/時間/費用無法修正或含 FB 雜訊'
            }
        }
    }
    $json.rows = $fixed
    $out = @{
        rows = $fixed
        fixedAt = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
    }
    if ($json.PSObject.Properties.Name -contains 'source') { $out.source = $json.source }
    if ($json.PSObject.Properties.Name -contains 'exportedAt') { $out.exportedAt = $json.exportedAt }
    $out | ConvertTo-Json -Depth 10 | Set-Content $file.FullName -Encoding UTF8
    Write-Host "OK $($file.Name): fixed $($fixed.Count), rejected $($rejected.Count)"
    $report += [PSCustomObject]@{
        file = $file.Name
        fixed = $fixed.Count
        rejected = $rejected.Count
        rejectedItems = $rejected
    }
}

$reportPath = Join-Path $Root 'fix-inbox-report.json'
$report | ConvertTo-Json -Depth 6 | Set-Content $reportPath -Encoding UTF8
Write-Host "Report: $reportPath"
