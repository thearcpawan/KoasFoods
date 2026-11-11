@echo off
rem Double-click to run the Koas Foods site at http://localhost:5173
rem Keep this window open while you use the site; close it to stop the server.
cd /d "%~dp0"

where node >nul 2>nul || (
  echo Node.js is not installed. Get it from https://nodejs.org and try again.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing packages, first run only...
  call npm install || (pause & exit /b 1)
)

rem If the server is already running, just open the browser.
powershell -NoProfile -Command "try { Invoke-WebRequest http://localhost:5173/ -UseBasicParsing -TimeoutSec 2 | Out-Null; exit 0 } catch { exit 1 }"
if %errorlevel%==0 (
  echo The site is already running.
  start "" http://localhost:5173/
  exit /b 0
)

call npm run dev -- --open
echo.
echo The server stopped. Read any error above, then press a key to close.
pause
