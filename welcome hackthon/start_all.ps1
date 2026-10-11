Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Starting AI-Powered Personal Call Agent Full-Stack      " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$env:Path = "C:\Program Files\nodejs;" + $env:Path

# Start Backend on Port 8000
Write-Host "[1/3] Starting Python Intelligence Backend (Port 8000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

# Start Telephony Bridge on Port 8001
Write-Host "[2/3] Starting Telephony & Android Bridge (Port 8001)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\telephony'; python -m uvicorn bridge:app --host 127.0.0.1 --port 8001 --reload"

# Start Frontend on Port 3000
Write-Host "[3/3] Starting Next.js Antigravity Visual Dashboard (Port 3000)..." -ForegroundColor Magenta
Start-Process powershell -ArgumentList "-NoExit", "-Command", "$env:Path = 'C:\Program Files\nodejs;' + $env:Path; cd '$PSScriptRoot\frontend'; npm run dev"

Write-Host "`nAll services launched! Dashboard will be available at: http://localhost:3000" -ForegroundColor Cyan
