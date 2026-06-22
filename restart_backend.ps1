# Stop any running uvicorn processes
Get-Process -Name "python" -ErrorAction SilentlyContinue | Where-Object {$_.CommandLine -like "*uvicorn*"} | Stop-Process -Force

# Wait a moment
Start-Sleep -Seconds 2

# Start the backend server
Set-Location backend
& ..\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Made with Bob
