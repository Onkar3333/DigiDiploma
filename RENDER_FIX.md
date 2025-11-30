# 🔧 Quick Fix for Render Build Error

## Problem
Render is trying to run `npm audit fix --force` which is failing due to vulnerabilities in dependencies (like `xlsx`).

## Solution

The backend **does NOT need a build command**. Follow these steps:

### Step 1: Go to Render Dashboard
1. Open [Render Dashboard](https://dashboard.render.com)
2. Click on your service (`digidiploma-backend`)

### Step 2: Fix Build Settings
1. Go to **Settings** tab
2. Scroll to **Build & Deploy** section
3. Find **Build Command** field
4. **DELETE everything** - leave it completely **EMPTY**
5. Verify **Start Command** is: `node server.js`
6. Click **Save Changes**

### Step 3: Redeploy
1. Go to **Manual Deploy** tab
2. Click **Clear build cache & deploy**
3. Wait for deployment to complete

## Why This Works

- Backend is plain Node.js - no build step needed
- `npm install` happens automatically before start
- Vulnerabilities in dependencies (like `xlsx`) don't prevent the app from running
- The backend only needs to install dependencies and start the server

## Correct Configuration

```
Build Command: [EMPTY - nothing here]
Start Command: node server.js
Root Directory: backend
```

## If You Still See Errors

If you still see build errors after clearing the build command:

1. Check **Environment Variables** are all set
2. Check **Start Command** is exactly: `node server.js`
3. Check **Root Directory** is: `backend`
4. Check Render logs for specific errors

---

**Note:** The `xlsx` vulnerability is in a frontend dependency. The backend doesn't use it, so it's safe to ignore for backend deployment.

