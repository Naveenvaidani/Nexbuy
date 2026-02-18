@echo off
echo ========================================
echo    NEXBUY - Starting Application
echo ========================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

:: Check if MongoDB is running
echo Checking MongoDB connection...
timeout /t 2 /nobreak >nul

:: Kill any existing processes
taskkill /F /IM node.exe 2>nul

:: Start Backend Server
echo.
echo [1/2] Starting Backend Server...
start "NexBuy Backend" cmd /k "cd /d %~dp0backend && set MONGODB_URI=mongodb://localhost:27017/nexbuy && set PORT=5000 && set JWT_SECRET=your-super-secret-jwt-key-change-in-production && set NODE_ENV=development && node server.js"
timeout /t 3 /nobreak >nul

:: Start Frontend Server
echo [2/2] Starting Frontend Server...
start "NexBuy Frontend" cmd /k "cd /d %~dp0frontend && npx http-server . -p 3000 -c-1 --cors"
timeout /t 3 /nobreak >nul

:: Open browser
echo.
echo ========================================
echo    Servers Started Successfully!
echo ========================================
echo.
echo Backend:  http://localhost:5000
echo Frontend: http://127.0.0.1:3000
echo.
echo Opening browser...
timeout /t 2 /nobreak >nul
start http://127.0.0.1:3000

echo.
echo Press any key to stop all servers...
pause >nul

:: Kill servers
taskkill /FI "WINDOWTITLE eq NexBuy Backend*" /F >nul 2>nul
taskkill /FI "WINDOWTITLE eq NexBuy Frontend*" /F >nul 2>nul

echo.
echo All servers stopped.
pause
