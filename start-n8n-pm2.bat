@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "ROOT=%CD%"
set "BIN=%ROOT%\packages\cli\bin"
set "PORT=201"

echo === n8n via PM2 (main + 2 workers) ===
echo.
echo Luu y: PM2 chay NEN. Stop: stop-n8n-pm2.bat
echo Xem log: pm2 logs ^| Trang thai: pm2 status
echo.

where pm2 >nul 2>&1
if errorlevel 1 (
  echo ERROR: Chua cai pm2. Chay: npm i -g pm2
  goto :END
)

if not exist "%BIN%\n8n" (
  echo ERROR: Khong tim thay %BIN%\n8n
  goto :END
)

if not exist "%BIN%\.env" (
  if exist "%ROOT%\docker\kito-n8n\n8n.env" (
    echo Copy docker\kito-n8n\n8n.env -^> packages\cli\bin\.env
    copy /Y "%ROOT%\docker\kito-n8n\n8n.env" "%BIN%\.env" >nul
  ) else (
    echo ERROR: Thieu packages\cli\bin\.env
    goto :END
  )
)

echo.
echo [1/4] Stop PM2 / n8n cu...
call pm2 delete n8n-main n8n-worker-1 n8n-worker-2 >nul 2>&1
call pm2 kill >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq n8n-main*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq n8n-worker*" >nul 2>&1
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$rx = '(?i)([\\/]n8n(\.cmd)?(\s|$)|n8n worker|pm2-n8n\.cjs|os-normalize\.mjs.*n8n|packages[\\/]cli[\\/]bin|@n8n[\\/]task-runner|task-runner)';" ^
  "Get-CimInstance Win32_Process -Filter \"name = 'node.exe'\" |" ^
  "  Where-Object { $_.CommandLine -and ($_.CommandLine -match $rx) } |" ^
  "  ForEach-Object { Write-Host ('  kill node PID ' + $_.ProcessId); Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"
for %%Q in (%PORT% 5679 5680 5681) do (
  for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":%%Q " ^| findstr LISTENING') do (
    echo   taskkill PID %%P ^(port %%Q^)
    taskkill /F /PID %%P >nul 2>&1
  )
)
timeout /t 2 /nobreak >nul

echo.
echo [2/4] Start ecosystem.config.cjs
call pm2 start "%ROOT%\ecosystem.config.cjs" --no-vizion
if errorlevel 1 (
  echo.
  echo ERROR: pm2 start that bai.
  goto :END
)

echo.
echo [3/4] Save
call pm2 save

echo.
echo [4/4] Status
call pm2 status

echo.
echo Done. Lenh thuong dung:
echo   pm2 status
echo   pm2 logs
echo   stop-n8n-pm2.bat
echo.
echo UI: https://ros.reginamiracle.com:%PORT%/
echo.
echo Cua so se tu dong sau 5s ^(PM2 van chay nen^)...
timeout /t 5 /nobreak >nul
exit /b 0

:END
echo.
echo Co loi — cua so se dong sau 15s, hoac bam phim bat ky...
timeout /t 15 >nul
exit /b 1
