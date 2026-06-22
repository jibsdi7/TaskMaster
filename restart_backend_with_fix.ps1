# Restart Backend with Windows Compatibility Fix
Write-Host "=" * 80
Write-Host "Restarting TaskMaster Backend with Windows Compatibility Fix"
Write-Host "=" * 80

# Stop any running backend processes
Write-Host "`nStopping existing backend processes..."
Get-Process -Name "python" -ErrorAction SilentlyContinue | Where-Object {$_.Path -like "*TaskMaster*"} | Stop-Process -Force
Start-Sleep -Seconds 2

# Navigate to backend directory
Set-Location -Path "backend"

# Activate virtual environment if it exists
if (Test-Path "../.venv/Scripts/Activate.ps1") {
    Write-Host "`nActivating virtual environment..."
    & "../.venv/Scripts/Activate.ps1"
}

# Start backend server
Write-Host "`nStarting backend server..."
Write-Host "Backend will run on: http://localhost:8000"
Write-Host "API docs available at: http://localhost:8000/docs"
Write-Host "`nPress Ctrl+C to stop the server"
Write-Host "=" * 80
Write-Host ""

# Run with explicit Python path
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Made with Bob
