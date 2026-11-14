@echo off
rem Double-click this file to start the whole RCPT project (database check, backend, website).
rem Extra options can be passed from a terminal, e.g.:  "Start RCPT.bat" --demo
title RCPT - Radiation-Coupled Physiological Twin
chcp 65001 >nul
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js is not installed.
  echo  Install the LTS version from https://nodejs.org, then double-click this file again.
  echo.
  pause
  exit /b 1
)

node run-all.mjs %*
echo.
pause
