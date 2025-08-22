@echo off
echo Starting development server for Windows...
cd /d "%~dp0"
set NODE_ENV=development
echo Setting environment variable NODE_ENV=development
echo Starting server with tsx...
npx tsx server/index.ts
if %ERRORLEVEL% neq 0 (
    echo Error occurred, trying with cross-env...
    npx cross-env NODE_ENV=development npx tsx server/index.ts
)