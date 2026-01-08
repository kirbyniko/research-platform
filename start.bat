@echo off
cd /d "%~dp0"
echo Starting ICE Deaths Documentation Site...
echo.
echo Server will be available at: http://localhost:3001
echo Press Ctrl+C to stop the server
echo.
npm run dev
