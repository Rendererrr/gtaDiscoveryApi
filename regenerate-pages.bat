@echo off
REM Regenerate the GTA Discovery API with GitHub Pages URLs baked into the JSON
REM (image urls + cdnBase point at https://<owner>.github.io/<repo>/...).
REM Use this when serving the API from GitHub Pages instead of jsDelivr.

cd /d "%~dp0"
call "%~dp0regenerate.bat" --pages
