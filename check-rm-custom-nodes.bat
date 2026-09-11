@echo off
REM Diagnose why CUSTOM.rm* nodes show as "?" on this machine.
setlocal EnableExtensions
cd /d "%~dp0\.."

set "ROOT=%CD%"
set "BIN=%ROOT%\packages\cli\bin"
set "CUSTOM=%ROOT%\custom\n8n-nodes-rm-workflow"

echo === Check RM custom nodes ===
echo Root: %ROOT%
echo.

echo [1] Custom package
if exist "%CUSTOM%\package.json" (echo   OK package.json) else (echo   FAIL package.json)
if exist "%CUSTOM%\dist\nodes\RMWorkflow\RmUuid.node.js" (echo   OK RmUuid.node.js) else (echo   FAIL RmUuid.node.js — chay build)
if exist "%CUSTOM%\dist\nodes\RmWebAutoWorkflow\RmWebAutoWorkflow.node.js" (echo   OK RmWebAutoWorkflow.node.js) else (echo   FAIL Web)
echo   .node.js count:
powershell -NoProfile -Command "(Get-ChildItem -LiteralPath '%CUSTOM%\dist\nodes' -Recurse -Filter '*.node.js' -ErrorAction SilentlyContinue).Count"
echo.

echo [2] Runtime .env
if not exist "%BIN%\.env" (
  echo   FAIL thieu %BIN%\.env
) else (
  findstr /B /C:"N8N_CUSTOM_EXTENSIONS=" "%BIN%\.env"
  findstr /C:"CUSTOM.rmUuid" "%BIN%\.env" >nul && echo   OK NODES_INCLUDE co CUSTOM.rmUuid || echo   FAIL NODES_INCLUDE thieu CUSTOM.rmUuid
  echo.
  echo   Path trong .env co ton tai?
  powershell -NoProfile -Command ^
    "$line = (Get-Content '%BIN%\.env' | Where-Object { $_ -match '^N8N_CUSTOM_EXTENSIONS=' } | Select-Object -First 1);" ^
    "if (-not $line) { Write-Host '  FAIL: khong co N8N_CUSTOM_EXTENSIONS'; exit 0 };" ^
    "$p = ($line -replace '^N8N_CUSTOM_EXTENSIONS=','').Trim() -replace '/','\';" ^
    "if (Test-Path -LiteralPath $p) { Write-Host ('  OK exists: ' + $p) } else { Write-Host ('  FAIL NOT FOUND: ' + $p); Write-Host '  <- Day thuong la ly do node ? tren server' }"
)
echo.

echo [3] PM2
where pm2 >nul 2>&1 && pm2 status || echo   pm2 khong co / khong chay
echo.
echo Neu path FAIL: chay start-n8n-pm2.bat ^(da sync path theo may nay^).
echo Neu dist FAIL: trong custom\n8n-nodes-rm-workflow chay pnpm build.
pause
