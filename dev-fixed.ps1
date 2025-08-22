#!/usr/bin/env pwsh

# Function to kill processes on a given port
function Kill-ProcessOnPort {
    param (
        [int]$Port
    )
    Write-Host "Checking for process on port $Port..."
    try {
        $processId = (Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue).OwningProcess
        if ($processId) {
            $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
            if ($process) {
                Write-Host "Process found on port $Port with PID $processId. Killing it..."
                Stop-Process -Id $processId -Force
                Write-Host "Process killed."
            } else {
                Write-Host "No process found running with PID $processId."
            }
        } else {
            Write-Host "No process found listening on port $Port."
        }
    } catch {
        Write-Host "Could not find any process on port $Port."
    }
}

# Kill processes on ports 3000 and 5173
Kill-ProcessOnPort -Port 3000
Kill-ProcessOnPort -Port 5173

# Start the server and client directly
Write-Host "Starting development servers..."
Write-Host "Starting server on port 3000..."
Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WorkingDirectory "." -NoNewWindow

Write-Host "Development servers started!"
Write-Host "Server should be running on http://localhost:3000"