# 🔧 Render Root Directory Fix - Cannot Find server.js

## Problem
Render can't find `server.js` at `/opt/render/project/src/backend/server.js`

Error: `Cannot find module '/opt/render/project/src/backend/server.js'`

## Solution

The issue is with the **Root Directory** or **Start Command** configuration.

### Option 1: Verify Root Directory (Recommended)

1. Go to Render Dashboard → Your Service → **Settings**
2. Check **Root Directory** field:
   - Should be: `backend` (not `/backend` or `./backend`)
   - Make sure there are no spaces or extra characters
3. **Start Command** should be: `node server.js`
4. Click **Save Changes**
5. Go to **Manual Deploy** → **Clear build cache & deploy**

### Option 2: Use Absolute Path in Start Command

If Root Directory isn't working, try this:

1. Go to **Settings** → **Build & Deploy**
2. **Root Directory:** Leave **EMPTY** (or set to `.` for root)
3. **Start Command:** `cd backend && node server.js`
4. Click **Save Changes**
5. Redeploy

### Option 3: Check Repository Structure

Verify your GitHub repository has this structure:

```
DigiDiploma/
├── backend/
│   ├── server.js
│   ├── package.json
│   └── ...
├── src/
└── package.json
```

If `server.js` is not in the `backend` folder, that's the problem.

## Correct Configuration

### Recommended Setup:
```
Root Directory: backend
Build Command: npm install
Start Command: node server.js
```

### Alternative Setup (if Root Directory doesn't work):
```
Root Directory: [EMPTY or .]
Build Command: cd backend && npm install
Start Command: cd backend && node server.js
```

## Troubleshooting Steps

1. **Check Render Logs:**
   - Go to your service → **Logs** tab
   - Look for the directory structure Render sees
   - Check if it's finding the `backend` folder

2. **Verify GitHub Repository:**
   - Make sure `backend/server.js` exists in your repo
   - Check the file is committed and pushed

3. **Test Locally:**
   ```bash
   cd backend
   node server.js
   ```
   If this works locally, the issue is Render configuration.

4. **Check Render Environment:**
   - Go to **Settings** → **Environment**
   - Make sure all environment variables are set
   - Check if there are any path-related variables

## Most Common Issue

The **Root Directory** field is case-sensitive and must match exactly:
- ✅ Correct: `backend`
- ❌ Wrong: `Backend`, `./backend`, `/backend`, `backend/`

---

**After fixing, redeploy and check the logs to verify it's working!** 🚀

