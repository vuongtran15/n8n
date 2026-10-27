@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

set "ROOT=%CD%"
set "CACHE_PUBLIC=%USERPROFILE%\.cache\n8n\public"
set "RESET_LOG=%ROOT%\reset-build-start-n8n-pm2.log"
set "RESET_MODE=light"
set "MEM=3072"

REM Usage:
REM   reset-build-start-n8n-pm2.bat           -> pnpm reset (giu node_modules)
REM   reset-build-start-n8n-pm2.bat --full    -> pnpm reset --full --force (wipe manh)
REM   reset-build-start-n8n-pm2.bat --mem 4096

:parse
if "%~1"=="" goto :parsed
if /I "%~1"=="--full" (
  set "RESET_MODE=full"
  shift
  goto :parse
)
if /I "%~1"=="--mem" (
  if "%~2"=="" (
    echo ERROR: --mem can so MB
    exit /b 1
  )
  set "MEM=%~2"
  shift
  shift
  goto :parse
)
echo ERROR: Unknown arg %~1
echo Usage: reset-build-start-n8n-pm2.bat [--full] [--mem MB]
exit /b 1

:parsed
echo === Reset + Build + Start n8n PM2 ===
echo Root: %ROOT%
echo Mode: %RESET_MODE%  ^| mem: %MEM% MB
echo Log:  %RESET_LOG%
echo.

where pnpm >nul 2>&1
if errorlevel 1 (
  echo ERROR: Chua cai pnpm.
  goto :FAIL
)
where pm2 >nul 2>&1
if errorlevel 1 (
  echo ERROR: Chua cai pm2. Chay: npm i -g pm2
  goto :FAIL
)

echo [1/4] Stop PM2 / n8n...
call "%ROOT%\stop-n8n-pm2.bat"
echo.

echo [2/4] pnpm reset...
if /I "%RESET_MODE%"=="full" (
  echo   FULL: wipe untracked + node_modules + install + build
  call pnpm reset --full --force --mem %MEM% > "%RESET_LOG%" 2>&1
) else (
  echo   LIGHT: clean dist/.turbo + install + build
  call pnpm reset --mem %MEM% > "%RESET_LOG%" 2>&1
)
if errorlevel 1 (
  echo ERROR: pnpm reset that bai. 40 dong cuoi log:
  echo ---
  powershell -NoProfile -Command "Get-Content -LiteralPath '%RESET_LOG%' -Tail 40"
  echo ---
  goto :FAIL
)
echo   Reset/build OK.
echo.

echo [3/4] Clear FE cache ^(tranh {{BASE_PATH}} raw^)...
if exist "%CACHE_PUBLIC%" (
  rmdir /S /Q "%CACHE_PUBLIC%" 2>nul
  echo   Cleared %CACHE_PUBLIC%
) else (
  echo   Cache chua co — bo qua.
)
echo.

echo [4/4] Start PM2...
call "%ROOT%\start-n8n-pm2.bat"
if errorlevel 1 goto :FAIL

echo.
echo === Done ===
echo UI: xem N8N_EDITOR_BASE_URL trong packages\cli\bin\.env
echo Stop: stop-n8n-pm2.bat
exit /b 0

:FAIL
echo.
echo FAILED. Xem %RESET_LOG% neu co.
timeout /t 10 >nul
exit /b 1
