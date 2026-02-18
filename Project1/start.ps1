# NexBuy Startup Script for PowerShell
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   NEXBUY - Starting Application" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Node.js is not installed!" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Get script directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path

# Set execution policy for this session
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force

Write-Host "[1/3] Stopping existing processes..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "[2/3] Starting Backend Server..." -ForegroundColor Green

# Start Backend in new window
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$scriptPath\backend'; `$env:MONGODB_URI='mongodb://localhost:27017/nexbuy'; `$env:PORT='5001'; `$env:JWT_SECRET='your-super-secret-jwt-key-change-in-production'; `$env:NODE_ENV='development'; node server.js"
) -WindowStyle Normal

Start-Sleep -Seconds 3

Write-Host "[3/3] Starting Frontend Server..." -ForegroundColor Green

# Start Frontend in new window
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force; cd '$scriptPath\frontend'; npx http-server . -p 3000 -c-1 --cors"
) -WindowStyle Normal

Start-Sleep -Seconds 3

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Servers Started Successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend:  http://localhost:5001" -ForegroundColor Yellow
Write-Host "Frontend: http://127.0.0.1:3000" -ForegroundColor Yellow
Write-Host ""
Write-Host "[3/3] Opening browser..." -ForegroundColor Green

Start-Sleep -Seconds 2
Start-Process "http://127.0.0.1:3000"

Write-Host ""
Write-Host "Application is running!" -ForegroundColor Green
Write-Host ""
Write-Host "Demo Login:" -ForegroundColor Cyan
Write-Host "  Email: user@demo.com" -ForegroundColor White
Write-Host "  Password: password123" -ForegroundColor White
Write-Host ""
Write-Host "To stop servers, close the backend and frontend windows." -ForegroundColor Yellow
Write-Host ""
Read-Host "Press Enter to exit this window (servers will keep running)"
