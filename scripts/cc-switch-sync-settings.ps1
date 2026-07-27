# Sync CC Switch current provider -> Claude settings.json (both paths)
# Usage: after switching in CC Switch GUI, run:
#   powershell -ExecutionPolicy Bypass -File .\scripts\cc-switch-sync-settings.ps1
$ErrorActionPreference = 'Stop'
python "$PSScriptRoot\cc-switch-sync-settings.py"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host ""
Write-Host "Next: close Claude Code, open a NEW PowerShell, run claude, then /status" -ForegroundColor Cyan
