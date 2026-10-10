@echo off
rem Start Support Staff from this checkout (dev mode: no installer needed).
rem Double-click this file, or run it from a terminal.
cd /d "%~dp0"
if not exist node_modules\electron\dist\electron.exe (
  echo Installing dependencies first...
  call npm install
)
call npm start
