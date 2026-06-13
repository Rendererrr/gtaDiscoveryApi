@echo off
REM Regenerate the GTA Discovery API JSON from assets/ + src/data/.
REM Double-click this file, or run `regenerate` from a terminal.

cd /d "%~dp0"

echo Regenerating GTA Discovery API...
echo.

node src/build/index.mjs
set "EXITCODE=%ERRORLEVEL%"

echo.
if %EXITCODE% NEQ 0 (
  echo Build FAILED with exit code %EXITCODE%.
) else (
  echo Build complete. JSON written to api\.
)

REM Keep the window open when double-clicked so you can read the output.
pause
exit /b %EXITCODE%
