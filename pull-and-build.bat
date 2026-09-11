@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

set "ROOT=%CD%"
set "CACHE_PUBLIC=%USERPROFILE%\.cache\n8n\public"
set "FE_DIST=%ROOT%\packages\frontend\editor-ui\dist"
set "CUSTOM_NODES=%ROOT%\custom\n8n-nodes-rm-workflow"
set "LOG=%ROOT%\pull-and-build.log"

echo === n8n: git pull + build ===
echo Root: %ROOT%
echo Log:  %LOG%
echo.

where git >nul 2>&1
if errorlevel 1 (
  echo ERROR: Chua cai git / git khong co trong PATH.
  goto :END
)

where pnpm >nul 2>&1
if errorlevel 1 (
  echo ERROR: Chua cai pnpm. Chay: corepack enable ^&^& corepack prepare pnpm@11.22.0 --activate
  goto :END
)

echo [1/5] git status ^(truoc pull^)
git status -sb
echo.

echo [2/5] git pull
git pull
if errorlevel 1 (
  echo.
  echo ERROR: git pull that bai. Kiem tra conflict / network / quyen remote.
  goto :END
)
echo.

echo [3/5] pnpm install
call pnpm install
if errorlevel 1 (
  echo.
  echo ERROR: pnpm install that bai.
  goto :END
)
echo.

echo [4/5] pnpm build ^(log -^> pull-and-build.log^)
echo Dang build... co the mat nhieu phut.
call pnpm build > "%LOG%" 2>&1
if errorlevel 1 (
  echo.
  echo ERROR: pnpm build that bai. Xem 40 dong cuoi log:
  echo ---
  powershell -NoProfile -Command "Get-Content -LiteralPath '%LOG%' -Tail 40"
  echo ---
  goto :END
)
echo Build OK.
echo.

if exist "%ROOT%\docker\kito-n8n\n8n.env" (
  echo [4a] Copy docker\kito-n8n\n8n.env -^> packages\cli\bin\.env
  if not exist "%ROOT%\packages\cli\bin" mkdir "%ROOT%\packages\cli\bin"
  copy /Y "%ROOT%\docker\kito-n8n\n8n.env" "%ROOT%\packages\cli\bin\.env" >nul
  echo Env OK.
  echo.
)

if exist "%CUSTOM_NODES%\package.json" (
  echo [4b] Build custom nodes: n8n-nodes-rm-workflow
  pushd "%CUSTOM_NODES%"
  call pnpm build >> "%LOG%" 2>&1
  if errorlevel 1 (
    popd
    echo ERROR: build custom nodes that bai. Xem log.
    powershell -NoProfile -Command "Get-Content -LiteralPath '%LOG%' -Tail 30"
    goto :END
  )
  popd
  echo Custom nodes OK.
  echo.
)

echo [5/5] Copy FE dist -^> %USERPROFILE%\.cache\n8n\public
if not exist "%FE_DIST%\index.html" (
  echo WARNING: Khong thay %FE_DIST%\index.html — bo qua copy cache.
) else (
  if not exist "%CACHE_PUBLIC%" mkdir "%CACHE_PUBLIC%"
  robocopy "%FE_DIST%" "%CACHE_PUBLIC%" /E /NFL /NDL /NJH /NJS
  set "RC=!ERRORLEVEL!"
  if !RC! GEQ 8 (
    echo ERROR: robocopy that bai ^(code !RC!^).
    goto :END
  )
  echo Copy FE OK.
)

echo.
echo === Done build ===
echo.

echo [6/6] Start n8n via PM2 ^(env + custom da co trong start-n8n-pm2.bat^)
if exist "%ROOT%\start-n8n-pm2.bat" (
  call "%ROOT%\start-n8n-pm2.bat"
  exit /b %ERRORLEVEL%
)

echo WARNING: Khong thay start-n8n-pm2.bat — tu start tay.
echo   start-n8n-pm2.bat
echo.
ping -n 9 127.0.0.1 >nul
exit /b 0

:END
echo.
echo Co loi — cua so se dong sau 20s, hoac bam phim bat ky...
ping -n 21 127.0.0.1 >nul
exit /b 1
