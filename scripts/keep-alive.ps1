# Keeps the dev server running at http://localhost:5173.
# Started hidden at Windows login by "Koas Foods site.vbs" in the Startup folder.
# Restarts the server whenever it stops. Log: .cache/server.log
$ErrorActionPreference = 'Continue'
$project = Split-Path -Parent $PSScriptRoot
Set-Location $project
New-Item -ItemType Directory -Force (Join-Path $project '.cache') | Out-Null
$log = Join-Path $project '.cache\server.log'

function Test-Site {
  try { Invoke-WebRequest 'http://localhost:5173/' -UseBasicParsing -TimeoutSec 3 | Out-Null; $true } catch { $false }
}

while ($true) {
  if (Test-Site) { Start-Sleep -Seconds 15; continue }   # another copy is already serving
  if (-not (Test-Path (Join-Path $project 'node_modules'))) {
    & npm.cmd install *>> $log
  }
  "[$(Get-Date -Format s)] starting dev server" | Out-File $log -Append -Encoding utf8
  & npm.cmd run dev *>> $log
  "[$(Get-Date -Format s)] server stopped (exit $LASTEXITCODE), restarting in 5s" | Out-File $log -Append -Encoding utf8
  Start-Sleep -Seconds 5
}
