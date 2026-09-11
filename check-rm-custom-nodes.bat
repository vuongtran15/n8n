@echo off
REM Diagnose why CUSTOM.rm* nodes show as "?" on this machine.
REM Double-click OK — cua so se dung cho den khi ban bam phim.
setlocal EnableExtensions
cd /d "%~dp0"

set "ROOT=%CD%"
set "BIN=%ROOT%\packages\cli\bin"
set "CUSTOM=%ROOT%\custom\n8n-nodes-rm-workflow"
set "LOG=%ROOT%\check-rm-custom-nodes.log"

echo === Check RM custom nodes === > "%LOG%"
call :out Root: %ROOT%
call :out.

call :out [1] Custom package
if exist "%CUSTOM%\package.json" (call :out   OK package.json) else (call :out   FAIL package.json)
if exist "%CUSTOM%\dist\nodes\RMWorkflow\RmUuid.node.js" (call :out   OK RmUuid.node.js) else (call :out   FAIL RmUuid.node.js — can build)
if exist "%CUSTOM%\dist\nodes\RmWebAutoWorkflow\RmWebAutoWorkflow.node.js" (call :out   OK RmWebAutoWorkflow.node.js) else (call :out   FAIL Web)
for /f %%C in ('powershell -NoProfile -Command "(Get-ChildItem -LiteralPath '%CUSTOM%\dist\nodes' -Recurse -Filter '*.node.js' -ErrorAction SilentlyContinue).Count"') do set "NODE_COUNT=%%C"
call :out   .node.js count: %NODE_COUNT%
call :out.

call :out [2] Runtime .env
if not exist "%BIN%\.env" (
  call :out   FAIL thieu %BIN%\.env
) else (
  for /f "usebackq delims=" %%L in (`findstr /B /C:"N8N_CUSTOM_EXTENSIONS=" "%BIN%\.env"`) do call :out   %%L
  findstr /C:"CUSTOM.rmUuid" "%BIN%\.env" >nul
  if errorlevel 1 (call :out   FAIL NODES_INCLUDE thieu CUSTOM.rmUuid) else (call :out   OK NODES_INCLUDE co CUSTOM.rmUuid)
  call :out.
  call :out   Path trong .env co ton tai?
  powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$line = (Get-Content -LiteralPath '%BIN%\.env' | Where-Object { $_ -match '^N8N_CUSTOM_EXTENSIONS=' } | Select-Object -First 1);" ^
    "if (-not $line) { '  FAIL: khong co N8N_CUSTOM_EXTENSIONS' | Tee-Object -FilePath '%LOG%' -Append; exit 0 };" ^
    "$p = ($line -replace '^N8N_CUSTOM_EXTENSIONS=','').Trim() -replace '/','\';" ^
    "if (Test-Path -LiteralPath $p) { ('  OK exists: ' + $p) | Tee-Object -FilePath '%LOG%' -Append }" ^
    "else { ('  FAIL NOT FOUND: ' + $p) | Tee-Object -FilePath '%LOG%' -Append; '  <- Day thuong la ly do node ? tren server' | Tee-Object -FilePath '%LOG%' -Append }"
)
call :out.

call :out [3] PM2
where pm2 >nul 2>&1
if errorlevel 1 (
  call :out   pm2 khong co trong PATH
) else (
  pm2 status
  pm2 status >> "%LOG%" 2>&1
)
call :out.
call :out Neu path FAIL: chay start-n8n-pm2.bat
call :out Neu dist FAIL: start-n8n-pm2.bat se build custom
call :out.
call :out Log da ghi: %LOG%
call :out.
echo ========================================
echo  Bam phim bat ky de dong cua so...
echo ========================================
pause >nul
exit /b 0

:out
echo %*
echo %*>> "%LOG%"
goto :eof
