
@echo off
echo ============================================
echo     Committee ROSCA App - Windows Setup
echo ============================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js version:
node --version
echo.

echo NPM version:
npm --version
echo.

REM Set environment variable
set NODE_ENV=development
echo Environment: %NODE_ENV%
echo.

REM Kill any existing processes on port 8000
echo Checking for existing processes on port 8000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000') do (
    echo Killing process with PID: %%a
    taskkill /f /pid %%a >nul 2>&1
)

echo Starting development server...
echo Server will be available at: http://localhost:8000
echo.
echo Press Ctrl+C to stop the server
echo.

REM Start the server directly
npx tsx server/index.ts

REM If direct method fails, try with cross-env
if %ERRORLEVEL% neq 0 (
    echo.
    echo Direct method failed, trying with cross-env...
    npx cross-env NODE_ENV=development npx tsx server/index.ts
)

pause
