$ErrorActionPreference = 'Continue'
$paths = @('/json/version', '/json', '/json/list', '/')
foreach ($p in $paths) {
  $url = 'http://127.0.0.1:9222' + $p
  try {
    $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 4
    $len = ($r.Content | Measure-Object -Character).Characters
    Write-Output ("{0} -> {1}  len={2}  head={3}" -f $p, $r.StatusCode, $len, ($r.Content.Substring(0, [Math]::Min(120, $len)) -replace '\s+', ' '))
  } catch {
    Write-Output ("{0} -> ERR {1}" -f $p, $_.Exception.Message)
  }
}
