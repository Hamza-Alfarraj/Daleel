@echo off
cd /d "%~dp0"
where firebase.cmd >nul 2>nul
if errorlevel 1 (
  echo Firebase CLI is missing. Install it with: npm install -g firebase-tools
  pause
  exit /b 1
)
call firebase.cmd deploy --project daleel-4838c --only "hosting,firestore:rules"
if errorlevel 1 (
  echo Deployment failed. If authentication expired, run: firebase.cmd login
  pause
  exit /b 1
)
echo Site: https://daleel-4838c.web.app
pause
