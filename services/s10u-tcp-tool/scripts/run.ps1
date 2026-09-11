param(
    [ValidateRange(1024, 65535)][int]$Port = 8765,
    [string]$DataDir = ''
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$python = Join-Path $root '.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $python)) { throw 'Run scripts\setup.ps1 first; no local Python environment exists.' }
if (-not (Test-Path -LiteralPath (Join-Path $root 'frontend\dist\index.html'))) { throw 'Frontend is not built. Run scripts\setup.ps1 or npm --prefix frontend run build.' }
if ($DataDir) { $env:S10U_TOOL_DATA_DIR = $DataDir }
$env:PYTHONUTF8 = '1'
Write-Host "Open http://127.0.0.1:$Port in a browser. Ctrl+C stops the service."
Write-Host 'Closing the browser does not disconnect TCP. Logs are session-only: export before exit.'
& $python -m s10u_tool --host 127.0.0.1 --port $Port
exit $LASTEXITCODE
