@echo off
echo Setting up Firebase Storage CORS configuration...
echo.
echo Since gcloud CLI is not available, please follow these steps:
echo.
echo 1. Install Firebase CLI:
echo    npm install -g firebase-tools
echo.
echo 2. Login to Firebase:
echo    firebase login
echo.
echo 3. Apply CORS configuration:
echo    gsutil cors set cors.json gs://keys1000-4ce89.firebasestorage.app
echo.
echo 4. Verify the configuration:
echo    gsutil cors get gs://keys1000-4ce89.firebasestorage.app
echo.
echo Alternative: Use Firebase Console
echo    Go to Firebase Console → Storage → Rules → Edit Rules
echo    Add CORS configuration manually
echo.
pause