@echo off
REM Sync docker/kito-n8n/n8n.env -> packages/cli/bin/.env
REM and rewrite N8N_CUSTOM_EXTENSIONS to THIS machine's absolute custom path.
REM Usage: call scripts\sync-n8n-env.cmd   (from repo root, or set ROOT)
setlocal EnableExtensions EnableDelayedExpansion

if not defined ROOT set "ROOT=%CD%"
set "BIN=%ROOT%\packages\cli\bin"
set "TEMPLATE=%ROOT%\docker\kito-n8n\n8n.env"
set "CUSTOM_NODES=%ROOT%\custom\n8n-nodes-rm-workflow"
set "ENV_FILE=%BIN%\.env"

if not exist "%TEMPLATE%" (
  echo ERROR: Thieu %TEMPLATE%
  exit /b 1
)

if not exist "%BIN%" mkdir "%BIN%"
copy /Y "%TEMPLATE%" "%ENV_FILE%" >nul
if errorlevel 1 (
  echo ERROR: Khong copy duoc .env
  exit /b 1
)

REM Absolute path with forward slashes (n8n / dotenv friendly on Win + Linux-style)
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$root = $env:ROOT; if (-not $root) { $root = (Get-Location).Path };" ^
  "$custom = (Resolve-Path -LiteralPath (Join-Path $root 'custom\n8n-nodes-rm-workflow')).Path -replace '\\','/';" ^
  "$envFile = Join-Path $root 'packages\cli\bin\.env';" ^
  "$c = Get-Content -LiteralPath $envFile -Raw;" ^
  "if ($c -notmatch '(?m)^N8N_CUSTOM_EXTENSIONS=') { $c = $c.TrimEnd() + \"`r`nN8N_CUSTOM_EXTENSIONS=$custom`r`n\" }" ^
  "else { $c = [regex]::Replace($c, '(?m)^N8N_CUSTOM_EXTENSIONS=.*$', \"N8N_CUSTOM_EXTENSIONS=$custom\") };" ^
  "if ($c -notmatch 'CUSTOM\.rmUuid') { Write-Host 'WARNING: NODES_INCLUDE thieu CUSTOM.rmUuid — kiem tra docker/kito-n8n/n8n.env' };" ^
  "Set-Content -LiteralPath $envFile -Value $c -NoNewline -Encoding utf8;" ^
  "Write-Host ('  N8N_CUSTOM_EXTENSIONS=' + $custom);" ^
  "if (-not (Test-Path -LiteralPath ($custom -replace '/','\'))) { Write-Host 'ERROR: custom path khong ton tai'; exit 1 }"

if errorlevel 1 exit /b 1

if not exist "%CUSTOM_NODES%\package.json" (
  echo ERROR: Thieu %CUSTOM_NODES%\package.json
  exit /b 1
)

echo   Env synced: %ENV_FILE%
exit /b 0
