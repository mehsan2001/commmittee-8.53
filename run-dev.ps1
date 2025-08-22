# PowerShell script to run development server
param(
    [switch]$NoBuild
)

Write-Host "Starting development server..." -ForegroundColor Green
Write-Host "Current directory: $(Get-Location)" -ForegroundColor Yellow

# Check if npm is available
if (!(Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "npm is not found in PATH. Please install Node.js and npm." -ForegroundColor Red
    exit 1
}

# Run the dev script directly
Write-Host "Running: npm run dev" -ForegroundColor Cyan
try {
    npm run dev
} catch {
    Write-Host "Error starting dev server: $_" -ForegroundColor Red
    exit 1
}