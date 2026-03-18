@echo off
echo ===========================================
echo   JMC-TEST PROFESSIONAL PORTAL - LAUNCHER
echo ===========================================
echo.
echo [1/3] Checking dependencies...
echo [1/3] Checking dependencies...
if not exist "node_modules" (
    echo    Installing dependencies... This may take a minute.
    call npm install
) else (
    echo    Dependencies verified.
)

echo.
echo [2/3] Starting Database Server...
start "JMC-TEST Backend" /min cmd /k "npm start"
timeout /t 5 >nul

echo.
echo [3/3] Opening Application...
start "" "http://localhost:3000"

echo.
echo ===========================================
echo   SUCCESS! The portal is running.
echo   - Backend Server is running in a minimal window.
echo   - Your default browser has opened the portal.
echo   - Close this window or the minimized server window to stop.
echo ===========================================
pause
