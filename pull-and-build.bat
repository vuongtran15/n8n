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
echo === Done ===
echo Tiep theo ^(neu dang chay PM2^):
echo   stop-n8n-pm2.bat
echo   start-n8n-pm2.bat
echo Hoac: pm2 restart n8n-main
echo.
echo Cua so se tu dong sau 8s...
timeout /t 8 /nobreak >nul
exit /b 0

:END
echo.
echo Co loi — cua so se dong sau 20s, hoac bam phim bat ky...
timeout /t 20 >nul
exit /b 1
