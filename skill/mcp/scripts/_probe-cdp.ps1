$ErrorActionPreference = 'Stop'
try {
  $r = Invoke-WebRequest -Uri 'http://127.0.0.1:9222/json/version' -UseBasicParsing -TimeoutSec 5
  Write-Output ("STATUS=" + $r.StatusCode)
  Write-Output $r.Content
} catch {
  Write-Output ("ERR=" + $_.Exception.Message)
}
