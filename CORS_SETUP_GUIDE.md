# Firebase Storage CORS Setup Guide

## 🚨 Problem: CORS Error During Image Upload

When uploading payment receipts or other images, you're getting a CORS (Cross-Origin Resource Sharing) error.

## ✅ Solution: Configure Firebase Storage CORS

### Method 1: Firebase CLI (Recommended)

#### Step 1: Install Firebase CLI

```bash
npm install -g firebase-tools
```

#### Step 2: Login to Firebase

```bash
firebase login
```

#### Step 3: Install Google Cloud SDK (includes gsutil)

Download and install from: https://cloud.google.com/sdk/docs/install

#### Step 4: Apply CORS Configuration

```bash
gsutil cors set cors.json gs://keys1000-4ce89.firebasestorage.app
```

#### Step 5: Verify Configuration

```bash
gsutil cors get gs://keys1000-4ce89.firebasestorage.app
```

### Method 2: Firebase Console (Alternative)

#### Step 1: Access Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **Storage**

#### Step 2: Update Storage Rules

1. Click on **Rules** tab
2. Update your storage rules to allow cross-origin requests:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
      // Allow CORS preflight requests
      allow read, write: if request.method == 'OPTIONS';
    }
  }
}
```

#### Step 3: Enable CORS Headers (Advanced)

For more control, use the Cloud Storage JSON API:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **Storage** → **Browser**
3. Find your bucket: `keys1000-4ce89.firebasestorage.app`
4. Click **Configuration** → **CORS**
5. Add the following configuration:

```json
[
  {
    "origin": ["http://localhost:3000", "https://yourdomain.com"],
    "method": ["GET", "POST", "PUT", "DELETE", "HEAD"],
    "responseHeader": ["Content-Type", "Authorization", "X-Requested-With"],
    "maxAgeSeconds": 3600
  }
]
```

### Method 3: PowerShell/Command Prompt (Windows)

#### Step 1: Install Firebase Tools

```powershell
npm install -g firebase-tools
```

#### Step 2: Set Path (if needed)

```powershell
$env:PATH += ";$env:APPDATA\npm"
```

#### Step 3: Login

```powershell
firebase login
```

#### Step 4: Apply CORS

```powershell
firebase storage:rules:get --bucket keys1000-4ce89.firebasestorage.app
```

## 🔄 After Setup

1. **Restart your development server**
2. **Clear browser cache**
3. **Test the image upload** in your payment form

## 📋 Troubleshooting

### If gsutil is not found:

- Make sure Google Cloud SDK is installed
- Restart your terminal/command prompt
- Check if gsutil is in your PATH

### If Firebase CLI is not found:

- Run: `npm install -g firebase-tools`
- Add npm global bin to PATH: `%APPDATA%\npm`

### Still getting CORS errors?

- Check if the bucket name is correct: `keys1000-4ce89.firebasestorage.app`
- Verify your cors.json file syntax
- Try using a different browser
- Check browser developer tools for specific error messages

## 📁 Files Created

- `cors.json` - CORS configuration file
- `install-gcloud.bat` - Windows installation script
- `CORS_SETUP_GUIDE.md` - This comprehensive guide

## 🔗 Additional Resources

- [Firebase Storage CORS Documentation](https://firebase.google.com/docs/storage/web/download-files#cors_configuration)
- [Google Cloud Storage CORS Guide](https://cloud.google.com/storage/docs/cross-origin)
