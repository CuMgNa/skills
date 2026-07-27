# Claude Code 网关一键检测（Windows）
# 用法: powershell -ExecutionPolicy Bypass -File .\scripts\claude-gateway-check.ps1

param(
    [string]$Base = "http://192.168.0.217:8317/v1",
    [string]$Model = "GLM-5.2",
    [string]$Key = ""
)

function Mask([string]$s) {
    if (-not $s -or $s.Length -le 8) { return "***" }
    return $s.Substring(0, 4) + "***" + $s.Substring($s.Length - 4)
}

Write-Host "=== CC Switch / Claude 网关检测 ===" -ForegroundColor Cyan

# 1) 从 settings.json 读取 Key（若未传参）
$configDir = [Environment]::GetEnvironmentVariable('CLAUDE_CONFIG_DIR', 'User')
if (-not $configDir) { $configDir = "$env:USERPROFILE\.claude" }
$settingsPath = Join-Path $configDir 'settings.json'
if (-not $Key -and (Test-Path $settingsPath)) {
    try {
        $sj = Get-Content $settingsPath -Raw -Encoding UTF8 | ConvertFrom-Json
        $Key = $sj.env.ANTHROPIC_AUTH_TOKEN
        if ($sj.env.ANTHROPIC_BASE_URL) { $Base = $sj.env.ANTHROPIC_BASE_URL.TrimEnd('/') }
        if ($Base -notmatch '/v1$') { $Base = $Base + '/v1' }
        if ($sj.env.ANTHROPIC_MODEL) { $Model = $sj.env.ANTHROPIC_MODEL }
    } catch {}
}

Write-Host "Base:  $Base"
Write-Host "Model: $Model"
Write-Host "Key:   $(Mask $Key)"

# 2) 解析 host/port
$uri = [Uri]($Base -replace '/v1/?$', '')
$hostName = $uri.Host
$port = if ($uri.Port -gt 0) { $uri.Port } else { 80 }
Write-Host "`n=== TCP $hostName`:$port ===" -ForegroundColor Cyan
$tcp = Test-NetConnection -ComputerName $hostName -Port $port -WarningAction SilentlyContinue
Write-Host "  TcpTestSucceeded: $($tcp.TcpTestSucceeded)"

Write-Host "`n=== CC Switch 本地路由 15721 ===" -ForegroundColor Cyan
$proxy = Test-NetConnection -ComputerName 127.0.0.1 -Port 15721 -WarningAction SilentlyContinue
Write-Host "  TcpTestSucceeded: $($proxy.TcpTestSucceeded) (需 CC Switch 开启本地路由)"

# 3) OpenAI Chat 探测
$body = (@{ model = $Model; max_tokens = 8; messages = @(@{ role = 'user'; content = 'hi' }) } | ConvertTo-Json -Compress)
$chatUrl = ($Base.TrimEnd('/')) + '/chat/completions'
Write-Host "`n=== POST $chatUrl ===" -ForegroundColor Cyan
try {
    $r = Invoke-WebRequest -Uri $chatUrl -Method POST -Headers @{
        Authorization = "Bearer $Key"
        'Content-Type' = 'application/json'
    } -Body $body -TimeoutSec 12 -UseBasicParsing
    Write-Host "  OK $($r.StatusCode)" -ForegroundColor Green
    Write-Host "  $($r.Content.Substring(0, [Math]::Min(160, $r.Content.Length)))"
} catch {
    $code = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 'N/A' }
    Write-Host "  FAIL HTTP $code" -ForegroundColor Red
    if ($code -eq 401) { Write-Host "  -> Key invalid or wrong auth; ask gateway admin" -ForegroundColor Yellow }
    if (-not $tcp.TcpTestSucceeded) { Write-Host "  -> Gateway port unreachable; check service" -ForegroundColor Yellow }
}

Write-Host "`n=== 建议 ===" -ForegroundColor Cyan
Write-Host "1. CC Switch: 设置 → 路由 → 开启本地路由 + Claude 路由"
Write-Host "2. 启用 GLM-5.2 Provider 后，新开 PowerShell → claude → /status"
Write-Host "3. 若 OpenAI 探测 401，先修 Key 再调 CC Switch"
