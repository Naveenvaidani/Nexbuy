@echo off
title NexBuy Quick Start
color 0A

echo.
echo ====================================
echo        NEXBUY APPLICATION
echo ====================================
echo.
echo Starting servers...
echo.

cd /d "%~dp0"

:: Kill any existing processes on ports
taskkill /F /IM node.exe 2>nul

:: Start backend
start "NexBuy Backend" cmd /c "cd /d "%~dp0backend" && node server.js"

:: Wait 3 seconds
timeout /t 3 /nobreak >nul

:: Start frontend (serving only frontend directory)
start "NexBuy Frontend" cmd /c "cd /d "%~dp0frontend" && npx http-server . -p 3000 -c-1 --cors"

:: Wait 3 seconds
timeout /t 3 /nobreak >nul

:: Open browser
start http://127.0.0.1:3000

echo.
echo ====================================
echo   Application Started!
echo ====================================
echo.
echo Backend:  http://localhost:5000
echo Frontend: http://127.0.0.1:3000
echo.
echo Demo Login:
echo   Email: user@demo.com
echo   Password: password123
echo.
echo Servers are running in background.
echo Close this window anytime.
echo.
pause
