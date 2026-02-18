@echo off
echo ========================================
echo Starting NexBuy with AI Services
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8 or higher
    pause
    exit /b 1
)

REM Check if Node is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js
    pause
    exit /b 1
)

echo [1/5] Installing Python dependencies...
cd python-services
if not exist venv (
    echo Creating Python virtual environment...
    python -m venv venv
)
call venv\Scripts\activate.bat
pip install -r requirements.txt
cd ..

echo.
echo [2/5] Starting Backend Server (Port 5000)...
cd backend
start "NexBuy Backend" cmd /k "npm start"
cd ..

timeout /t 5 /nobreak >nul

echo.
echo [3/5] Starting Voice Service (Port 5001)...
cd python-services
start "Voice Service" cmd /k "venv\Scripts\activate.bat && python voice_service.py"
cd ..

timeout /t 3 /nobreak >nul

echo.
echo [4/5] Starting Visual Service (Port 5002)...
cd python-services
start "Visual Service" cmd /k "venv\Scripts\activate.bat && python visual_service.py"
cd ..

timeout /t 3 /nobreak >nul

echo.
echo [5/5] Starting Frontend (Port 3001)...
cd frontend
start "NexBuy Frontend" cmd /k "npx http-server -p 3001 -c-1"
cd ..

timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo All Services Started Successfully!
echo ========================================
echo.
echo Backend API:     http://localhost:5000
echo Voice Service:   http://localhost:5001
echo Visual Service:  http://localhost:5002
echo Frontend:        http://localhost:3001
echo.
echo Opening browser...
start http://localhost:3001

echo.
echo Press any key to stop all services...
pause >nul

echo.
echo Stopping all services...
taskkill /FI "WINDOWTITLE eq NexBuy Backend" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Voice Service" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Visual Service" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq NexBuy Frontend" /T /F >nul 2>&1

echo All services stopped.
pause
