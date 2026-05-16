@echo off
setlocal EnableExtensions

set "ROOT=%~dp0"

pushd "%ROOT%" >nul 2>&1 || (
	echo Failed to access project root: %ROOT%
	pause
	exit /b 1
)

echo Starting SPARTAN-G backend and frontend...

if not exist "%ROOT%node_modules" (
	echo Installing workspace dependencies...
	call npm install
	if errorlevel 1 (
		echo Dependency installation failed.
		popd
		pause
		exit /b 1
	)
)

start "SPARTAN-G Backend" cmd /k "cd /d ""%ROOT%"" && npm run dev --workspace backend"
start "SPARTAN-G Frontend" cmd /k "cd /d ""%ROOT%"" && npm run dev --workspace frontend"

echo.
echo Both servers are starting in separate windows.
echo Backend: http://localhost:4000
echo Frontend: http://localhost:5173
echo.
popd >nul 2>&1
endlocal