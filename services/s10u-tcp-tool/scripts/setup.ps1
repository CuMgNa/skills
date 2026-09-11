param([switch]$SkipFrontend)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$python = Join-Path $root '.venv\Scripts\python.exe'

function Assert-NativeSuccess([string]$Step) {
    if ($LASTEXITCODE -ne 0) { throw "$Step failed (exit $LASTEXITCODE)." }
}

if (-not (Test-Path -LiteralPath $python)) {
    & py -3.12 -m venv (Join-Path $root '.venv')
    Assert-NativeSuccess 'Create local Python environment'
}
& $python -m pip install -c (Join-Path $root 'requirements.lock') -e "${root}[dev]"
Assert-NativeSuccess 'Install backend dependencies'

if (-not $SkipFrontend) {
    $frontend = Join-Path $root 'frontend'
    if (Test-Path -LiteralPath (Join-Path $frontend 'package-lock.json')) {
        & npm.cmd --prefix $frontend ci
    } else {
        & npm.cmd --prefix $frontend install
    }
    Assert-NativeSuccess 'Install frontend dependencies'
    & npm.cmd --prefix $frontend run build
    Assert-NativeSuccess 'Build frontend'
}
Write-Host 'Setup complete. Run scripts\run.ps1 or run.cmd.'
