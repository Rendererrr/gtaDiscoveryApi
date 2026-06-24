@echo off
REM Purge the jsDelivr CDN cache for the GTA Discovery API.
REM
REM jsDelivr caches @main aggressively (~12h), so a fresh `git push` won't show on
REM cdn.jsdelivr.net until the cache expires or is purged. (GitHub Pages updates on its
REM own within a few minutes -- only jsDelivr needs this.)
REM
REM Usage:
REM   purge                 purge the common files (combined hashes + textures + top-level)
REM   purge changed         purge every api/ file changed in the LAST commit (HEAD~1..HEAD)
REM   purge <path> [<path>] purge specific repo-relative paths, e.g.  purge api/textures/hashes.json
setlocal enabledelayedexpansion
cd /d "%~dp0"

set "OWNER=Rendererrr"
set "REPO=gtaDiscoveryApi"
set "BRANCH=main"
set "BASE=https://purge.jsdelivr.net/gh/%OWNER%/%REPO%@%BRANCH%/"

if "%~1"=="" (
  set "FILES=api/hashes.json api/index.json api/categories.json api/dlc.json api/textures/index.json api/textures/hashes.json api/textures/dicthashes.json"
) else if /i "%~1"=="changed" (
  set "FILES="
  for /f "delims=" %%f in ('git diff --name-only HEAD~1 HEAD -- api/') do set "FILES=!FILES! %%f"
) else (
  set "FILES=%*"
)

if "!FILES!"=="" (
  echo Nothing to purge.
  pause
  exit /b 0
)

echo Purging jsDelivr cache for %REPO%@%BRANCH% ...
echo.
set "COUNT=0"
for %%f in (!FILES!) do (
  set /a COUNT+=1
  echo  - %%f
  curl -s -o nul "%BASE%%%f"
)
echo.
echo Done. Purged !COUNT! file(s). jsDelivr re-fetches from GitHub on the next request.
pause
