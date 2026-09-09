@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "ROOT=%CD%"
set "BIN=%ROOT%\packages\cli\bin"
set "PORT=201"

echo === n8n PROD: main + 2 workers ===
echo Root: %ROOT%

if not exist "%BIN%\n8n" (
  echo ERROR: Khong tim thay %BIN%\n8n
  echo Hay chay tu thu muc root repo n8n.
  pause
  exit /b 1
)

if not exist "%BIN%\.env" (
  if exist "%ROOT%\docker\kito-n8n\n8n.env" (
    echo Copy docker\kito-n8n\n8n.env -^> packages\cli\bin\.env
    copy /Y "%ROOT%\docker\kito-n8n\n8n.env" "%BIN%\.env" >nul
  ) else (
    echo ERROR: Thieu packages\cli\bin\.env
    pause
    exit /b 1
  )
)

echo.
echo [1/3] Kill het n8n + worker dang chay...

REM Cua so bat/cmd da start truoc do
taskkill /F /FI "WINDOWTITLE eq n8n-main*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq n8n-worker*" >nul 2>&1

REM Moi node.exe lien quan n8n main / worker / task-runner / pnpm start
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$rx = '(?i)([\\/]n8n(\.cmd)?(\s|$)|n8n worker|os-normalize\.mjs.*n8n|packages[\\/]cli[\\/]bin|@n8n[\\/]task-runner|task-runner)';" ^
  "Get-CimInstance Win32_Process -Filter \"name = 'node.exe'\" |" ^
  "  Where-Object { $_.CommandLine -and ($_.CommandLine -match $rx) } |" ^
  "  ForEach-Object { Write-Host ('  kill node PID ' + $_.ProcessId); Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"

REM Port main + task broker cua main/worker (neu con soat)
for %%Q in (%PORT% 5679 5680 5681) do (
  for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":%%Q " ^| findstr LISTENING') do (
    echo   taskkill PID %%P ^(port %%Q^)
    taskkill /F /PID %%P >nul 2>&1
  )
)

timeout /t 2 /nobreak >nul
echo   Done kill.

echo.
echo [2/3] Start main: pnpm start
start "n8n-main" /D "%ROOT%" cmd /k pnpm start

echo Doi main khoi dong...
timeout /t 12 /nobreak >nul

echo.
echo [3/3] Start 2 workers ^(broker port rieng: 5680 / 5681^)
REM Main giu 5679; moi worker can N8N_RUNNERS_BROKER_PORT rieng tren cung may
start "n8n-worker-1" /D "%BIN%" cmd /k "set N8N_RUNNERS_BROKER_PORT=5680&& node n8n worker"
start "n8n-worker-2" /D "%BIN%" cmd /k "set N8N_RUNNERS_BROKER_PORT=5681&& node n8n worker"

echo.
echo Done.
echo   - Main window:    n8n-main
echo   - Worker windows: n8n-worker-1, n8n-worker-2
echo   - UI: https://ros.reginamiracle.com:%PORT%
echo.
echo Dong cua so nay khong dung process. De stop: dong 3 cua so kia, hoac chay lai bat ^(auto kill^).
echo.
pause
endlocal
