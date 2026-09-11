@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

set "ROOT=%CD%"
set "BIN=%ROOT%\packages\cli\bin"
set "CUSTOM_NODES=%ROOT%\custom\n8n-nodes-rm-workflow"
set "FE_DIST=%ROOT%\packages\frontend\editor-ui\dist"
set "CACHE_PUBLIC=%USERPROFILE%\.cache\n8n\public"
set "PORT=201"
set "CUSTOM_LOG=%ROOT%\start-n8n-pm2-custom.log"

echo === n8n via PM2 (main + 2 workers) ===
echo Root: %ROOT%
echo.
echo Luu y: PM2 chay NEN. Stop: stop-n8n-pm2.bat
echo Xem log: pm2 logs ^| Trang thai: pm2 status
echo.

where pm2 >nul 2>&1
if errorlevel 1 (
  echo ERROR: Chua cai pm2. Chay: npm i -g pm2
  goto :END
)

where pnpm >nul 2>&1
if errorlevel 1 (
  echo ERROR: Chua cai pnpm. Can de build custom nodes.
  goto :END
)

if not exist "%BIN%\n8n" (
  echo ERROR: Khong tim thay %BIN%\n8n
  echo Hay chay pull-and-build.bat truoc ^(build monorepo^).
  goto :END
)

echo [0/5] Sync env + build custom nodes
if exist "%ROOT%\docker\kito-n8n\n8n.env" (
  echo   Copy docker\kito-n8n\n8n.env -^> packages\cli\bin\.env
  if not exist "%BIN%" mkdir "%BIN%"
  copy /Y "%ROOT%\docker\kito-n8n\n8n.env" "%BIN%\.env" >nul
) else (
  if not exist "%BIN%\.env" (
    echo ERROR: Thieu packages\cli\bin\.env va docker\kito-n8n\n8n.env
    goto :END
  )
  echo   Dung .env san co ^(khong co docker\kito-n8n\n8n.env^)
)

if exist "%CUSTOM_NODES%\package.json" (
  echo   Build custom: n8n-nodes-rm-workflow
  pushd "%CUSTOM_NODES%"
  call pnpm build > "%CUSTOM_LOG%" 2>&1
  if errorlevel 1 (
    popd
    echo ERROR: build custom nodes that bai. 30 dong cuoi log:
    echo ---
    powershell -NoProfile -Command "Get-Content -LiteralPath '%CUSTOM_LOG%' -Tail 30"
    echo ---
    goto :END
  )
  popd
  if not exist "%CUSTOM_NODES%\dist\nodes\RMWorkflow\RmUuid.node.js" (
    echo ERROR: Thieu dist custom ^(RmUuid^). Build co ve khong ra file.
    goto :END
  )
  echo   Custom nodes OK.
) else (
  echo   WARNING: Khong thay %CUSTOM_NODES% — bo qua build custom.
)

if exist "%FE_DIST%\index.html" (
  echo   Copy FE dist -^> %CACHE_PUBLIC%
  if not exist "%CACHE_PUBLIC%" mkdir "%CACHE_PUBLIC%"
  robocopy "%FE_DIST%" "%CACHE_PUBLIC%" /E /NFL /NDL /NJH /NJS >nul
  set "RC=!ERRORLEVEL!"
  if !RC! GEQ 8 (
    echo WARNING: robocopy FE that bai ^(code !RC!^) — van tiep tuc start.
  ) else (
    echo   FE cache OK.
  )
) else (
  echo   WARNING: Khong thay FE dist — bo qua copy cache.
)
echo.

echo [1/5] Stop PM2 / n8n cu...
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
ping -n 3 127.0.0.1 >nul

echo.
echo [2/5] Start ecosystem.config.cjs
call pm2 start "%ROOT%\ecosystem.config.cjs" --no-vizion
if errorlevel 1 (
  echo.
  echo ERROR: pm2 start that bai.
  goto :END
)

echo.
echo [3/5] Save
call pm2 save

echo.
echo [4/5] Status
call pm2 status

echo.
echo [5/5] Done
echo Lenh thuong dung:
echo   pm2 status
echo   pm2 logs
echo   stop-n8n-pm2.bat
echo.
echo UI: https://ros.reginamiracle.com:%PORT%/
echo Custom: N8N_CUSTOM_EXTENSIONS + NODES_INCLUDE trong packages\cli\bin\.env
echo.
echo Cua so se tu dong sau 5s ^(PM2 van chay nen^)...
ping -n 6 127.0.0.1 >nul
exit /b 0

:END
echo.
echo Co loi — cua so se dong sau 15s, hoac bam phim bat ky...
ping -n 16 127.0.0.1 >nul
exit /b 1
