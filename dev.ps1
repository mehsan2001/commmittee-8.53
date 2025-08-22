# PowerShell script to run development server in Windows
Write-Host "Starting development server for Windows..." -ForegroundColor Green

# Set environment variable for Windows
$env:NODE_ENV = "development"

# Kill any existing processes on ports 8000
Write-Host "Checking for existing processes on port 8000..." -ForegroundColor Yellow
try {
    $processes = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
    if ($processes) {
        foreach ($processId in $processes) {
            Write-Host "Killing process with PID: $processId" -ForegroundColor Red
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        }
    }
} catch {
    Write-Host "No existing processes found on port 8000" -ForegroundColor Green
}

Write-Host "Starting development server..." -ForegroundColor Cyan

# Use npx to run tsx directly with environment variable
try {
    npx tsx server/index.ts
} catch {
    Write-Host "Error starting development server: $_" -ForegroundColor Red
    Write-Host "Trying alternative method..." -ForegroundColor Yellow
    
    # Alternative: use cross-env if available
    try {
        npx cross-env NODE_ENV=development npx tsx server/index.ts
    } catch {
        Write-Host "Cross-env method failed. Please ensure Node.js and npm are properly installed." -ForegroundColor Red
        exit 1
    }
}
