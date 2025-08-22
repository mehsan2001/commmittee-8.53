@echo off
echo Installing Google Cloud SDK for Firebase Storage CORS...
echo.
echo Option 1: Install Google Cloud SDK
echo Download from: https://cloud.google.com/sdk/docs/install
echo Run installer and restart your terminal
echo.
echo Option 2: Install Firebase CLI (includes gsutil)
echo.
echo Installing Firebase CLI...
npm install -g firebase-tools
echo.
echo After installation, run:
echo firebase login
echo firebase storage:rules:get --bucket keys1000-4ce89.firebasestorage.app
echo.
echo Then apply CORS:
echo gsutil cors set cors.json gs://keys1000-4ce89.firebasestorage.app
echo.
echo Or use Firebase CLI:
echo firebase storage:rules:update --bucket keys1000-4ce89.firebasestorage.app
echo.
pause