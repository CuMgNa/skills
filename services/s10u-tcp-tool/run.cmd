@echo off
setlocal
set "ROOT=%~dp0"
if not exist "%ROOT%.venv\Scripts\python.exe" (
  echo Missing local Python environment. Run scripts\setup.ps1 first.
  pause
  exit /b 1
)
if not exist "%ROOT%frontend\dist\index.html" (
  echo Frontend is not built. Run scripts\setup.ps1 first.
  pause
  exit /b 1
)
set PYTHONUTF8=1
echo Open http://127.0.0.1:8765 in a browser.
echo Closing the browser does not disconnect TCP. Export logs before stopping.
"%ROOT%.venv\Scripts\python.exe" -m s10u_tool --host 127.0.0.1 --port 8765
if errorlevel 1 pause
