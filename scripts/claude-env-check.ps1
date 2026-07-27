# Claude Code 环境诊断（Windows）
# 用法: powershell -ExecutionPolicy Bypass -File .\scripts\claude-env-check.ps1

Write-Host "=== User env ===" -ForegroundColor Cyan
@('CLAUDE_CONFIG_DIR','ANTHROPIC_BASE_URL','ANTHROPIC_AUTH_TOKEN','ANTHROPIC_API_KEY','ANTHROPIC_MODEL') | ForEach-Object {
  $v = [Environment]::GetEnvironmentVariable($_, 'User')
  if ($_ -match 'TOKEN|KEY' -and $v) { $v = $v.Substring(0, [Math]::Min(4, $v.Length)) + '***' }
  Write-Host "  User.$_ = $(if ($v) { $v } else { '(not set)' })"
}

Write-Host "`n=== Session env ===" -ForegroundColor Cyan
@('CLAUDE_CONFIG_DIR','ANTHROPIC_BASE_URL','ANTHROPIC_AUTH_TOKEN','ANTHROPIC_MODEL') | ForEach-Object {
  $v = (Get-Item "Env:$_" -ErrorAction SilentlyContinue).Value
  if ($_ -match 'TOKEN|KEY' -and $v) { $v = $v.Substring(0, [Math]::Min(4, $v.Length)) + '***' }
  Write-Host "  Session.$_ = $(if ($v) { $v } else { '(not set)' })"
}

$configDir = [Environment]::GetEnvironmentVariable('CLAUDE_CONFIG_DIR', 'User')
if (-not $configDir) { $configDir = "$env:USERPROFILE\.claude" }
$settings = Join-Path $configDir 'settings.json'
Write-Host "`n=== settings.json ===" -ForegroundColor Cyan
Write-Host "  Path: $settings"
Write-Host "  Exists: $(Test-Path $settings)"

Write-Host "`n=== claude binary ===" -ForegroundColor Cyan
$cmd = Get-Command claude -ErrorAction SilentlyContinue
if ($cmd) { Write-Host "  $($cmd.Source)" } else { Write-Host "  (claude not in PATH)" }
