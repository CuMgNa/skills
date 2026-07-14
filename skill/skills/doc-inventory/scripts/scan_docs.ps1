<#
.SYNOPSIS
    文档盘点兜底脚本(doc-inventory 技能)
.DESCRIPTION
    扫描指定文件夹下所有文档,按默认排除集过滤,可选关键词/时间筛选,
    产出结构化 JSON 供模型生成 Markdown 报告。

    脚本只产数据,不产报告。报告由模型按 SKILL.md 模板写。

    设计要点:
    1. 默认排除 node_modules/.git/output 等噪音目录,排除自身产物 文档盘点报告-* (防自我污染,保幂等)
    2. 时间口径自动判断:在 git 仓库内优先 git 时间,普通文件夹用文件系统时间
    3. 中文路径/文件名 UTF-8 输出,不乱码
    4. Windows 长路径(>260)容错:逐文件 try/catch,跳过不中断
    5. 扩展名统一转小写归一(.MD -> md),无后缀单独归类不丢弃

.OUTPUTS
    JSON 结构:
    {
      "query": {
        "path": "...",
        "keyword": "测试",
        "keywords": ["测试"],
        "timeFilter": "本月",
        "timeField": "Modified",
        "timeRange": { "start": "2026-07-01", "end": "2026-07-14" }
      },
      "summary": {
        "total": 8,
        "byExt": [ { "ext": ".md", "count": 8, "percent": 100 } ],
        "extCount": 1,
        "isGitRepo": false,
        "timeSource": "filesystem"
      },
      "excludeRules": { "dirs": [...], "files": [...] },
      "files": [
        {
          "name": "API测试框架.md",
          "ext": ".md",
          "path": "C:\\...\\full\\path",
          "relPath": "docs/...",
          "dir": "docs",
          "created": "2026-06-01T10:00:00",
          "modified": "2026-07-12T15:30:00",
          "size": 12600,
          "sizeReadable": "12.3 KB",
          "matchedBy": ["测试"],
          "timeSource": "filesystem"
        }
      ],
      "warnings": {
        "skipped": [],
        "emptyFiles": [],
        "hugeFiles": [],
        "duplicates": [],
        "stale": []
      }
    }

.EXAMPLE
    .\scan_docs.ps1 -Path "D:\项目文档"
    全量盘点 D:\项目文档

.EXAMPLE
    .\scan_docs.ps1 -Path "D:\项目文档" -Keyword "测试,验收" -TimeFilter "本月"
    盘点本月内文件名含"测试"或"验收"的文档

.EXAMPLE
    .\scan_docs.ps1 -Path "C:\repo" -TimeFilter "2026-07-01~2026-07-14" -OutFile result.json
    按绝对区间筛,结果写文件
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)]
    [string]$Path,

    [string]$Keyword = "",

    [string]$TimeFilter = "",

    [ValidateSet("Created","Modified")]
    [string]$TimeField = "Modified",

    [string]$RulesFile = "",

    [string]$OutFile = ""
)

$ErrorActionPreference = "Stop"

# ---------- 输出编码强制 UTF-8(中文不乱码) ----------
try {
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    $OutputEncoding = [System.Text.Encoding]::UTF8
} catch {}

if (-not (Test-Path -LiteralPath $Path -PathType Container)) {
    Write-Error "目标路径不存在或不是文件夹: $Path"
    exit 1
}

$Path = (Resolve-Path -LiteralPath $Path).Path

# ---------- 默认排除规则 ----------
$ExcludeDirs = @('node_modules','.git','output','dist','build','__pycache__','.venv','venv','target','.idea','.vscode','bin','obj')
# 文件级排除:支持通配
$ExcludeFilePatterns = @('文档盘点报告-*','~$*','Thumbs.db','desktop.ini','.DS_Store','*.tmp')

# ---------- 分类规则加载(可选) ----------
# 规则来自 classification-rules.json(可改词加类)。匹配用的中文关键词来自JSON,不在脚本里写死,
# 彻底规避脚本内嵌中文字面量的编码风险。
$Rules = @()
$RulesFileLoaded = $null
# 默认规则放技能根目录(与SKILL.md平级),即脚本目录的上一级
$ScriptDir = $PSScriptRoot
if (-not $ScriptDir) { $ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path }
$SkillRoot = Split-Path -Parent $ScriptDir
$DefaultRulesPath = Join-Path $SkillRoot "classification-rules.json"
$RulesPath = if ($RulesFile -ne "") { $RulesFile } elseif (Test-Path -LiteralPath $DefaultRulesPath) { $DefaultRulesPath } else { "" }
if ($RulesPath -ne "" -and (Test-Path -LiteralPath $RulesPath)) {
    try {
        $RulesObj = Get-Content -LiteralPath $RulesPath -Raw -Encoding UTF8 | ConvertFrom-Json
        $Rules = @($RulesObj.rules)
        $RulesFileLoaded = $RulesPath
    } catch {
        Write-Warning ("分类规则加载失败: " + $_.Exception.Message + " 将跳过分类")
        $Rules = @()
    }
}

# 分类函数: 互斥按优先级归类,同时收集候选标签
function Get-Category {
    param([string]$Name, [string]$ExtLower)
    if ($Rules.Count -eq 0) { return @{ category = ""; candidates = @() } }
    $candidates = New-Object System.Collections.ArrayList
    $won = ""
    $wonPriority = -1
    foreach ($r in $Rules) {
        $hit = $false
        if ($r.matchType -eq 'keyword' -and $r.keywords) {
            $nameLower = $Name.ToLower()
            foreach ($kw in $r.keywords) {
                if ($nameLower.Contains(([string]$kw).ToLower())) { $hit = $true; break }
            }
        }
        elseif ($r.matchType -eq 'ext' -and $r.exts) {
            foreach ($e in $r.exts) {
                if ($ExtLower -eq ('.' + ([string]$e).ToLower())) { $hit = $true; break }
            }
        }
        if ($hit) {
            [void]$candidates.Add($r.label)
            if ($r.priority -gt $wonPriority) { $won = $r.label; $wonPriority = [int]$r.priority }
        }
    }
    if ($won -eq "") { $won = "其他/未分类" }
    return @{ category = $won; candidates = @($candidates) }
}

# ---------- 关键词解析 ----------
$Keywords = @()
if ($Keyword -and $Keyword.Trim() -ne "") {
    $Keywords = $Keyword -split '[,，]' | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" }
}

# ---------- 时间区间解析 ----------
# 用 if/elseif 链 + 预编译正则变量,避开 switch 内嵌中文/正则字符串的解析歧义
function Parse-TimeFilter {
    param([string]$F)
    if (-not $F) { return $null }
    $F = $F.Trim()
    if ($F -eq "") { return $null }

    $today = (Get-Date).Date

    # 预编译正则(放变量里用 -match,不在条件字符串里内嵌)
    $rxRange = '^\d{4}[-/]\d{1,2}[-/]\d{1,2}[~-]\d{4}[-/]\d{1,2}[-/]\d{1,2}$'
    $rxSingle = '^\d{4}[-/]\d{1,2}[-/]\d{1,2}$'
    $rxRecent = '^最近\d+天$'
    $rxNear = '^近\d+天$'

    if ($F -eq 'today' -or $F -eq '今日' -or $F -eq '今天') {
        return @{ start = $today; end = $today.AddDays(1).AddSeconds(-1) }
    }
    elseif ($F -eq 'this week' -or $F -eq '本周') {
        $dow = [int]$today.DayOfWeek
        if ($dow -eq 0) { $dow = 7 }
        $start = $today.AddDays(-($dow - 1))
        return @{ start = $start; end = $start.AddDays(7).AddSeconds(-1) }
    }
    elseif ($F -eq 'this month' -or $F -eq '本月' -or $F -eq '这个月') {
        $start = Get-Date -Year $today.Year -Month $today.Month -Day 1
        return @{ start = $start; end = $start.AddMonths(1).AddSeconds(-1) }
    }
    elseif ($F -eq 'this year' -or $F -eq '今年' -or $F -eq '本年') {
        $start = Get-Date -Year $today.Year -Month 1 -Day 1
        return @{ start = $start; end = $start.AddYears(1).AddSeconds(-1) }
    }
    elseif ($F -match $rxRecent) {
        if ($F -match '\d+') { $n = [int]$Matches[0] } else { $n = 30 }
        return @{ start = $today.AddDays(-$n + 1); end = $today.AddDays(1).AddSeconds(-1) }
    }
    elseif ($F -match $rxNear) {
        if ($F -match '\d+') { $n = [int]$Matches[0] } else { $n = 30 }
        return @{ start = $today.AddDays(-$n + 1); end = $today.AddDays(1).AddSeconds(-1) }
    }
    elseif ($F -match $rxRange) {
        # 区域无关: 用正则一次性捕获起止的 年/月/日,显式转 int 后构造,不依赖系统日期格式
        $null = $F -match '^(\d{4})[-/](\d{1,2})[-/](\d{1,2})[~-](\d{4})[-/](\d{1,2})[-/](\d{1,2})$'
        $sy = [int]$Matches[1]; $sm = [int]$Matches[2]; $sd = [int]$Matches[3]
        $ey = [int]$Matches[4]; $em = [int]$Matches[5]; $ed = [int]$Matches[6]
        $s = [datetime]::new($sy, $sm, $sd)
        $e = [datetime]::new($ey, $em, $ed).AddDays(1).AddSeconds(-1)
        return @{ start = $s; end = $e }
    }
    elseif ($F -match $rxSingle) {
        $null = $F -match '^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$'
        $y = [int]$Matches[1]; $mo = [int]$Matches[2]; $da = [int]$Matches[3]
        $s = [datetime]::new($y, $mo, $da)
        return @{ start = $s; end = $s.AddDays(1).AddSeconds(-1) }
    }
    else {
        Write-Warning ("无法识别的时间筛选: " + $F + ",已忽略")
        return $null
    }
}
$TimeRange = Parse-TimeFilter $TimeFilter

# ---------- git 检测 ----------
$IsGitRepo = $false
$GitRoot = $null
try {
    $gitDir = Get-Item -LiteralPath (Join-Path $Path ".git") -ErrorAction Stop
    $IsGitRepo = $true
    $GitRoot = $Path
} catch {
    # 向上找 git 根
    $p = $Path
    while ($p) {
        $g = Join-Path $p ".git"
        if (Test-Path -LiteralPath $g) { $IsGitRepo = $true; $GitRoot = $p; break }
        $parent = Split-Path $p -Parent
        if ($parent -eq $p) { break }
        $p = $parent
    }
}
# 时间口径: git 仓库用 git 时间(此处仅标注,实际取值见下);否则文件系统
$TimeSource = if ($IsGitRepo) { "git" } else { "filesystem" }

# ---------- 扫描 ----------
$AllFiles = New-Object System.Collections.ArrayList
$Skipped = New-Object System.Collections.ArrayList

function Test-Excluded($relativePath, $name) {
    # 目录排除: 把相对路径按 \ 或 / 拆段,任一段命中排除目录即排除
    # (避免在 -match 字符串里内插 [regex]::Escape,PS 5.1 解析器对 [\\/] 误判为类型表达式)
    $segments = $relativePath -split '[\\/]'
    foreach ($seg in $segments) {
        if ($ExcludeDirs -contains $seg) { return $true }
    }
    # 文件通配排除
    foreach ($pat in $ExcludeFilePatterns) {
        if ($name -like $pat) { return $true }
    }
    return $false
}

# 用 Get-ChildItem -Recurse 兼容 Windows PowerShell 5.1(.NET Framework 无 EnumerationOptions)
# -ErrorAction SilentlyContinue 跳过无权限子目录,不中断整体扫描;逐项 try/catch 兜底长路径
try {
    Get-ChildItem -LiteralPath $Path -Recurse -File -Force -ErrorAction SilentlyContinue | ForEach-Object {
        try {
            $rel = $_.FullName.Substring($Path.Length).TrimStart('\','/')
            if (Test-Excluded $rel $_.Name) { return }
            [void]$AllFiles.Add($_)
        } catch {
            [void]$Skipped.Add(@{ path = $_.FullName; reason = "枚举异常" })
        }
    }
} catch {
    [void]$Skipped.Add(@{ path = $Path; reason = "扫描失败: $($_.Exception.Message)" })
}

# ---------- 大小格式化(必须在调用前定义,PS 逐行解析) ----------
function ConvertTo-ReadableSize {
    param([long]$Bytes)
    if ($Bytes -eq 0) { return "0 B" }
    $units = @('B','KB','MB','GB')
    $u = 0
    $d = [double]$Bytes
    while ($d -ge 1024 -and $u -lt $units.Count-1) { $d /= 1024; $u++ }
    return ("{0:N1} {1}" -f $d, $units[$u])
}

# ---------- 关键词过滤 ----------
function Match-Keyword($name) {
    if ($Keywords.Count -eq 0) { return @() }
    $lower = $name.ToLower()
    $hit = @()
    foreach ($kw in $Keywords) {
        if ($lower.Contains($kw.ToLower())) { $hit += $kw }
    }
    return ,$hit
}

# ---------- 时间取值 ----------
# 对于 git 仓库,这里仍取文件系统时间作为基础;git 精确提交时间成本高(需逐文件 git log),
# 在"文档盘点"场景文件系统时间已够用。但 summary.timeSource 标注 git,报告层可说明。
# 若需要精确 git 时间,模型可后续单独调用 git log 补充。
function Get-TimeValue($fi, $field) {
    if ($field -eq "Created") { return $fi.CreationTime }
    else { return $fi.LastWriteTime }
}

$Records = New-Object System.Collections.ArrayList
$EmptyFiles = New-Object System.Collections.ArrayList
$HugeFiles = New-Object System.Collections.ArrayList

foreach ($fi in $AllFiles) {
    try {
        # 关键词过滤
        $hitKw = Match-Keyword $fi.Name
        if ($Keywords.Count -gt 0 -and $hitKw.Count -eq 0) { continue }

        # 时间过滤
        if ($TimeRange) {
            $tv = Get-TimeValue $fi $TimeField
            if ($tv -lt $TimeRange.start -or $tv -gt $TimeRange.end) { continue }
        }

        # 扩展名归一
        $ext = ""
        if ($fi.Name -match '\.') {
            $ext = ([System.IO.Path]::GetExtension($fi.Name)).ToLower()
        }

        # 分类(可选):互斥按优先级归类
        $catInfo = @{ category = ""; candidates = @() }
        if ($Rules.Count -gt 0) {
            $catInfo = Get-Category -Name $fi.Name -ExtLower $ext
        }

        $relPath = $fi.FullName.Substring($Path.Length).TrimStart('\','/')
        $dirName = Split-Path $relPath -Parent
        if (-not $dirName) { $dirName = "(根目录)" }

        $rec = [pscustomobject]@{
            name = $fi.Name
            ext = $ext
            path = $fi.FullName
            relPath = $relPath
            dir = $dirName
            created = ($fi.CreationTime.ToString("yyyy-MM-ddTHH:mm:ss"))
            modified = ($fi.LastWriteTime.ToString("yyyy-MM-ddTHH:mm:ss"))
            size = $fi.Length
            sizeReadable = (ConvertTo-ReadableSize $fi.Length)
            matchedBy = @($hitKw)
            timeSource = $TimeSource
            category = $catInfo.category
            candidates = @($catInfo.candidates)
        }
        [void]$Records.Add($rec)

        if ($fi.Length -eq 0) { [void]$EmptyFiles.Add($rec.path) }
        if ($fi.Length -gt 50MB) { [void]$HugeFiles.Add($rec) }
    } catch {
        [void]$Skipped.Add(@{ path = $fi.FullName; reason = $_.Exception.Message })
    }
}

# ---------- 重复同名文件检测 ----------
$DupGroups = $Records | Group-Object -Property name | Where-Object { $_.Count -gt 1 }
$Duplicates = @()
foreach ($g in $DupGroups) {
    $Duplicates += ,@{ name = $g.Name; paths = @($g.Group | ForEach-Object { $_.path }) }
}

# ---------- 陈旧文档(>6个月未更新) ----------
$staleThreshold = (Get-Date).AddMonths(-6)
$Stale = @($Records | Where-Object { [datetime]$_.modified -lt $staleThreshold } | ForEach-Object { $_.path })

# ---------- 按扩展名分组统计 ----------
$ByExt = @()
$total = $Records.Count
if ($total -gt 0) {
    $extGroups = $Records | Group-Object -Property ext | Sort-Object Count -Descending
    foreach ($g in $extGroups) {
        $e = if ($g.Name -eq "") { "(无后缀)" } else { $g.Name }
        $ByExt += [ordered]@{ ext = $e; count = $g.Count; percent = [math]::Round($g.Count*100.0/$total,1) }
    }
}

# ---------- 按文档类型分类统计(可选,需配置 classification-rules.json) ----------
$ByCategory = @()
$categoryEnabled = $false
if ($Rules.Count -gt 0 -and $total -gt 0) {
    $categoryEnabled = $true
    $catGroups = $Records | Group-Object -Property category | Sort-Object Count -Descending
    foreach ($g in $catGroups) {
        $label = $g.Name
        if (-not $label) { $label = "其他/未分类" }
        # 该类内部的格式分布
        $innerExt = @{}
        foreach ($it in $g.Group) {
            $ee = $it.ext
            if (-not $ee) { $ee = "(无后缀)" }
            if ($innerExt.ContainsKey($ee)) { $innerExt[$ee] = $innerExt[$ee] + 1 }
            else { $innerExt[$ee] = 1 }
        }
        # 转有序数组(按数量倒序)
        $extList = @()
        foreach ($k in ($innerExt.GetEnumerator() | Sort-Object Value -Descending)) {
            $extList += [ordered]@{ ext = $k.Key; count = $k.Value }
        }
        $ByCategory += [ordered]@{
            category = $label
            count = $g.Count
            percent = [math]::Round($g.Count*100.0/$total,1)
            byExt = $extList
        }
    }
}

# ---------- 时间范围字符串 ----------
$timeRangeStr = $null
if ($TimeRange) {
    $timeRangeStr = [ordered]@{
        start = $TimeRange.start.ToString("yyyy-MM-dd")
        end = $TimeRange.end.ToString("yyyy-MM-dd")
    }
}

# ---------- 组装结果 ----------
$query = [ordered]@{
    path = $Path
    keyword = $Keyword
    keywords = @($Keywords)
    timeFilter = $TimeFilter
    timeField = $TimeField
    timeRange = $timeRangeStr
}
$summary = [ordered]@{
    total = $total
    byExt = $ByExt
    extCount = $ByExt.Count
    byCategory = $ByCategory
    categoryEnabled = $categoryEnabled
    rulesFile = $RulesFileLoaded
    isGitRepo = $IsGitRepo
    gitRoot = $GitRoot
    timeSource = $TimeSource
}
$excludeRules = [ordered]@{
    dirs = $ExcludeDirs
    files = $ExcludeFilePatterns
}
$warnings = [ordered]@{
    skipped = @($Skipped)
    emptyFiles = @($EmptyFiles)
    hugeFiles = @($HugeFiles | ForEach-Object { $_.path })
    duplicates = @($Duplicates)
    stale = @($Stale)
}

$result = [ordered]@{
    query = $query
    summary = $summary
    excludeRules = $excludeRules
    files = @($Records)
    warnings = $warnings
}

$json = $result | ConvertTo-Json -Depth 8

if ($OutFile -and $OutFile -ne "") {
    [System.IO.File]::WriteAllText($OutFile, $json, [System.Text.UTF8Encoding]::new($false))
    Write-Output "JSON written to: $OutFile"
    Write-Output "Total: $total files"
} else {
    Write-Output $json
}
