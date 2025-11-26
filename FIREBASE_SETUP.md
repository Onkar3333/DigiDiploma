# Firebase Admin SDK Setup Guide

This guide will help you set up Firebase Admin SDK for your backend to enable database operations.

## Prerequisites

1. A Firebase project (you already have one: `digidiploma-f106d`)
2. Node.js installed
3. Access to Firebase Console

## Method 1: Using Service Account JSON File (Recommended for Development)

### Step 1: Download Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **digidiploma-f106d**
3. Click on the **⚙️ Settings** icon (top left) → **Project settings**
4. Go to the **Service accounts** tab
5. Click **Generate new private key**
6. A JSON file will be downloaded (e.g., `digidiploma-f106d-firebase-adminsdk-xxxxx.json`)

### Step 2: Place the JSON File

1. Create a `backend` folder if it doesn't exist
2. Place the downloaded JSON file in the `backend` folder
3. **Important**: Add this file to `.gitignore` to keep it secure:
   ```
   backend/*-firebase-adminsdk-*.json
   backend/service-account-key.json
   ```

### Step 3: Update Environment Variables

Create or update `backend/.env` file with:

```env
# Firebase Admin SDK Configuration
GOOGLE_APPLICATION_CREDENTIALS=./backend/digidiploma-f106d-firebase-adminsdk-xxxxx.json
FIREBASE_PROJECT_ID=digidiploma-f106d
```

Replace `digidiploma-f106d-firebase-adminsdk-xxxxx.json` with your actual filename.

---

## Method 2: Using Environment Variables (Recommended for Production)

### Step 1: Get Service Account Details

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **digidiploma-f106d**
3. Click on the **⚙️ Settings** icon → **Project settings**
4. Go to the **Service accounts** tab
5. Click **Generate new private key**
6. Download the JSON file
7. Open the JSON file and copy the following values:
   - `project_id`
   - `private_key_id`
   - `private_key` (the entire key including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`)
   - `client_email`
   - `client_id`
   - `client_x509_cert_url`

### Step 2: Update Environment Variables

Create or update `backend/.env` file with:

```env
# Firebase Admin SDK Configuration
FIREBASE_PROJECT_ID=digidiploma-f106d
FIREBASE_PRIVATE_KEY_ID=your-private-key-id-here
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Private-Key-Here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@digidiploma-f106d.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id-here
FIREBASE_CLIENT_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40digidiploma-f106d.iam.gserviceaccount.com
```

**Important Notes:**
- Keep the `\n` characters in `FIREBASE_PRIVATE_KEY` - they are required
- Wrap the private key in double quotes
- Replace all placeholder values with your actual values from the JSON file

---

## Step 3: Verify Installation

1. Restart your backend server
2. Check the console logs - you should see:
   - `Firebase Admin initialized with service account` (Method 1)
   - OR `Firebase Admin initialized (ADC)` (Method 2)

3. Test the bulk import feature in the admin dashboard

---

## Troubleshooting

### Error: "Firebase is not initialized"

**Solution:**
1. Check that your `.env` file is in the `backend` folder
2. Verify all environment variables are set correctly
3. For Method 1: Ensure the JSON file path is correct
4. For Method 2: Ensure the private key includes `\n` characters
5. Restart your backend server after making changes

### Error: "Cannot read properties of undefined"

**Solution:**
- This means Firebase Admin SDK is not initialized
- Check the backend console logs for initialization errors
- Verify your service account has proper permissions in Firebase Console

### Error: "Permission denied"

**Solution:**
1. Go to Firebase Console → Project Settings → Service Accounts
2. Ensure the service account has **Editor** or **Owner** role
3. In Firestore Database, ensure the service account has write permissions

---

## Security Best Practices

1. **Never commit** your service account JSON file or `.env` file to Git
2. Add to `.gitignore`:
   ```
   backend/.env
   backend/*-firebase-adminsdk-*.json
   backend/service-account-key.json
   ```
3. For production, use environment variables (Method 2) or a secrets manager
4. Rotate your service account keys periodically

---

## Quick Setup Checklist

- [ ] Downloaded service account key from Firebase Console
- [ ] Created `backend/.env` file
- [ ] Added environment variables (Method 1 or Method 2)
- [ ] Added service account files to `.gitignore`
- [ ] Restarted backend server
- [ ] Verified Firebase initialization in console logs
- [ ] Tested bulk import feature

---

## Need Help?

If you're still having issues:
1. Check backend console logs for specific error messages
2. Verify your Firebase project ID matches: `digidiploma-f106d`
3. Ensure your service account has proper permissions
4. Try Method 1 (JSON file) if Method 2 (env vars) isn't working

