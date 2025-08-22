# Proxy API Implementation for CORS Issues

## Overview

This implementation uses a proxy API endpoint to bypass CORS (Cross-Origin Resource Sharing) issues when uploading files to Firebase Storage.

## Files Modified

### Server-Side Changes

- **server/routes.ts**: Added `/api/upload-receipt` proxy endpoint that handles file uploads to Firebase Storage
- **Dependencies**: Added firebase-admin, multer, and @types/multer

### Client-Side Changes

- **client/src/services/firestore.ts**: Added new `uploadReceiptViaProxy()` function
- **client/src/pages/user/MyPayments.tsx**: Updated to use proxy API instead of direct Firebase Storage upload

## How It Works

### Proxy API Endpoint (`/api/upload-receipt`)

1. **File Upload**: Accepts multipart/form-data with file and paymentId
2. **Firebase Admin**: Uses Firebase Admin SDK to bypass client-side CORS restrictions
3. **Storage**: Saves files to Firebase Storage with organized naming convention
4. **Public Access**: Makes uploaded files publicly accessible
5. **Response**: Returns the public URL of the uploaded file

### Client Usage

Replace direct Firebase Storage calls with the new proxy API:

```typescript
// OLD (causes CORS issues)
import { uploadFile } from "@/services/firestore";
const url = await uploadFile(file, "path/to/file");

// NEW (bypasses CORS)
import { uploadReceiptViaProxy } from "@/services/firestore";
const url = await uploadReceiptViaProxy(file, paymentId);
```

## Benefits

- ✅ **No CORS Errors**: Server-side upload bypasses browser CORS restrictions
- ✅ **Better Security**: Firebase Admin SDK credentials stay on server
- ✅ **Organized Storage**: Automatic file naming with user ID and timestamp
- ✅ **Public URLs**: Immediate access to uploaded files
- ✅ **Error Handling**: Better error messages and handling

## File Structure

```
receipts/
└── {userId}/
    └── {timestamp}_{originalFilename}
```

## Usage Instructions

1. The proxy API is automatically available at `/api/upload-receipt`
2. Use `uploadReceiptViaProxy(file, paymentId)` instead of direct Firebase Storage calls
3. Files are automatically saved to Firebase Storage and made publicly accessible
4. The function returns a public URL that can be used immediately

## Testing

- Upload receipts through the payment submission form in MyPayments page
- Check Firebase Storage bucket for uploaded files
- Verify public URLs are accessible in browser

## Troubleshooting

- Ensure Firebase Admin SDK service account key is present in `attached_assets/`
- Check server logs for any upload errors
- Verify Firebase Storage bucket name matches in server configuration
