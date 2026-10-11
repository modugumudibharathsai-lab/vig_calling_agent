@echo off
set "PATH=C:\Program Files\nodejs;%PATH%"

echo ==========================================================
echo   Starting AI-Powered Personal Call Agent Full-Stack
echo ==========================================================

echo [1/3] Starting Backend (Port 8000)...
start "AI Call Agent Backend :8000" cmd /k "cd backend && python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

echo [2/3] Starting Telephony Bridge (Port 8001)...
start "Telephony Bridge :8001" cmd /k "cd telephony && python -m uvicorn bridge:app --host 127.0.0.1 --port 8001 --reload"

echo [3/3] Starting Next.js Dashboard (Port 3000)...
start "Next.js Dashboard :3000" cmd /k "cd frontend && npm run dev"

echo.
echo All services launched! Access Dashboard at: http://localhost:3000
