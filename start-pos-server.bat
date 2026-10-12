@echo off
:: POS Server Startup Script
:: Auto-detects its own location — works from any folder on any PC

:: Go to the folder where this script is located
cd /d "%~dp0"

:: Check if node is available
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo =============================================
    echo   ERROR: Node.js is not installed!
    echo   Please install Node.js from https://nodejs.org
    echo =============================================
    pause
    exit /b 1
)

:: Check if node_modules exists, if not install dependencies
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo Dependencies installation failed!
        pause
        exit /b 1
    )
)

:: Check if dist folder exists, if not build the project
if not exist "dist\index.html" (
    echo Building POS application...
    call npm run build
    if %errorlevel% neq 0 (
        echo Build failed! Please check for errors.
        pause
        exit /b 1
    )
)

:: Start the server
echo Starting POS Server on http://localhost:5173 ...
node server.js
