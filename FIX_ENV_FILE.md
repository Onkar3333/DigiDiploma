# 🔧 Fix Firebase .env File

## Problem
Firebase environment variables exist in `backend/.env` but aren't being loaded correctly.

## Solution

The `FIREBASE_PRIVATE_KEY` in your `.env` file needs to be wrapped in **double quotes** to preserve the `\n` characters.

### Current Format (WRONG):
```env
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDCEOEEA2e6KuHI\noSsCE6MyPzfMcM63Eld4+nybUI6W9Mb9hOBDEegHe0BwTNkNwFVuMD7toSDm7Ml2\n...
```

### Correct Format (RIGHT):
```env
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDCEOEEA2e6KuHI\noSsCE6MyPzfMcM63Eld4+nybUI6W9Mb9hOBDEegHe0BwTNkNwFVuMD7toSDm7Ml2\n..."
```

## Quick Fix

1. Open `backend/.env` file
2. Find the line starting with `FIREBASE_PRIVATE_KEY=`
3. Add double quotes around the entire value:
   - Change: `FIREBASE_PRIVATE_KEY=-----BEGIN...`
   - To: `FIREBASE_PRIVATE_KEY="-----BEGIN..."`

4. Make sure the quotes are at the very beginning and end of the value
5. Save the file
6. Test again: `node backend/check-firebase-status.js`

## After Fixing

Once the .env file is fixed, you should see:
```
✅ Firebase Admin initialized with service account
📊 Firebase Ready: ✅ YES
```

Then you can run the import:
```bash
node backend/import-subjects-bulk.js backend/subjects.json
```

