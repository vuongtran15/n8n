@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo === Stop n8n PM2 ===
echo.

where pm2 >nul 2>&1
if errorlevel 1 (
  echo ERROR: Chua cai pm2. Chay: npm i -g pm2
  timeout /t 8 >nul
  exit /b 1
)

echo [1/3] pm2 delete / stop apps...
call pm2 delete n8n-main n8n-worker-1 n8n-worker-2 >nul 2>&1
call pm2 stop all >nul 2>&1
call pm2 delete all >nul 2>&1
call pm2 save --force >nul 2>&1

echo [2/3] pm2 kill ^(tat daemon^)...
call pm2 kill >nul 2>&1

echo [3/3] Kill process / cua so node.exe con sot...
taskkill /F /FI "WINDOWTITLE eq n8n-main*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq n8n-worker*" >nul 2>&1
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$rx = '(?i)([\\/]n8n(\.cmd)?(\s|$)|n8n worker|pm2-n8n\.cjs|os-normalize\.mjs.*n8n|packages[\\/]cli[\\/]bin|@n8n[\\/]task-runner|task-runner|PM2)';" ^
  "Get-CimInstance Win32_Process -Filter \"name = 'node.exe'\" |" ^
  "  Where-Object { $_.CommandLine -and ($_.CommandLine -match $rx) } |" ^
  "  ForEach-Object { Write-Host ('  kill PID ' + $_.ProcessId); Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"

for %%Q in (201 5679 5680 5681) do (
  for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":%%Q " ^| findstr LISTENING') do (
    echo   taskkill PID %%P ^(port %%Q^)
    taskkill /F /PID %%P >nul 2>&1
  )
)

echo.
echo Done. n8n / PM2 da tat.
echo Cua so se dong sau 3s...
timeout /t 3 /nobreak >nul
exit /b 0
