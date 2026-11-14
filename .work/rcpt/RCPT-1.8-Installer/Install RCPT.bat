@echo off
title Installing RCPT
echo Installing RCPT (needs internet once, about 110 MB)...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1" -Src "%~dp0payload"
if errorlevel 1 (echo. & echo Install failed. Check your internet connection and try again. & pause & exit /b 1)
