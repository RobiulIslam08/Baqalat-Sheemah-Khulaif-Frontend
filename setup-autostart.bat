@echo off
:: ============================================
:: POS Auto-Start Setup Script
:: Works from any folder on any PC
:: ============================================

echo ============================================
echo   POS System Auto-Start Setup
echo ============================================
echo.

:: Go to the folder where this script is located
cd /d "%~dp0"

:: Step 0: Check Node.js
echo [Step 0/3] Checking Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org
    echo Then run this script again.
    pause
    exit /b 1
)
echo Node.js found!
echo.

:: Step 0.5: Check node_modules
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo ERROR: npm install failed!
        pause
        exit /b 1
    )
    echo Dependencies installed!
    echo.
)

:: Step 1: Build the project
echo [Step 1/3] Building POS application for production...
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Build failed! Please fix the errors above and try again.
    pause
    exit /b 1
)
echo Build successful!
echo.

:: Step 2: Create shortcut in Windows Startup folder
echo [Step 2/3] Adding POS server to Windows Startup...
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "VBS_SOURCE=%~dp0start-pos-silent.vbs"
set "SHORTCUT_PATH=%STARTUP_FOLDER%\POS-Server.lnk"

:: Use PowerShell to create a shortcut (works on all Windows 10/11)
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath = '%VBS_SOURCE%'; $s.WorkingDirectory = '%~dp0'; $s.Description = 'POS Server Auto-Start'; $s.Save()"

if %errorlevel% neq 0 (
    echo WARNING: Could not create startup shortcut automatically.
    echo Please manually copy start-pos-silent.vbs to:
    echo %STARTUP_FOLDER%
) else (
    echo Startup shortcut created successfully!
)
echo.

:: Step 3: Start the server now
echo [Step 3/3] Starting POS server now...
echo.
echo ============================================
echo   SETUP COMPLETE!
echo ============================================
echo.
echo   Your POS system is now configured to:
echo   - Auto-start when Windows boots
echo   - Run at http://localhost:6100
echo.
echo   The server is starting now...
echo   Press Ctrl+C to stop the server.
echo ============================================
echo.

node server.js
