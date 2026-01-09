@echo off
cd /d "%~dp0"
title ICE Deaths Documentation Site

echo ========================================
echo   ICE Deaths Documentation Site
echo ========================================
echo.

:: Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    echo.
)

:: Check if PostgreSQL connection works (optional)
echo Starting development server...
echo.
echo Server will be available at: http://localhost:3000
echo Dashboard: http://localhost:3000/dashboard
echo Incidents: http://localhost:3000/incidents
echo.
echo Press Ctrl+C to stop the server
echo ----------------------------------------
echo.

:: Open browser after a short delay
start "" cmd /c "timeout /t 3 >nul && start http://localhost:3000"

:: Start the dev server
npm run dev
