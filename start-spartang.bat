@echo off
setlocal

set "ROOT=%~dp0"

echo Starting SPARTAN-G backend and frontend...
start "SPARTAN-G Backend" cmd /k "cd /d ""%ROOT%"" && npm run dev --workspace backend"
start "SPARTAN-G Frontend" cmd /k "cd /d ""%ROOT%"" && npm run dev --workspace frontend"

echo.
echo Both servers are starting in separate windows.
echo Backend: http://localhost:4000
echo Frontend: http://localhost:5173
echo.
endlocal