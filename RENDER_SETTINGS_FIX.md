# 🔧 Render Settings Fix - Build Command Error

## Problem
Render is trying to run `node server.js` as the **Build Command**, but it should be the **Start Command** instead.

Error: `Cannot find module '/opt/render/project/src/backend/server.js'`

## Solution

### Step 1: Go to Render Dashboard
1. Open [Render Dashboard](https://dashboard.render.com)
2. Click on your service (`digidiploma-backend`)

### Step 2: Fix Settings
1. Go to **Settings** tab
2. Scroll to **Build & Deploy** section

3. **Build Command:**
   - If Render requires a value (won't let you leave empty), use: `npm install`
   - This is safe because Render needs to install dependencies anyway
   - Do NOT put `node server.js` here (that goes in Start Command)
   - Do NOT put `npm run build` or `npm audit fix` here

4. **Start Command:**
   - Should be: `node server.js`
   - This is where `node server.js` belongs

5. **Root Directory:**
   - Should be: `backend`
   - This tells Render where your backend code is

6. Click **Save Changes**

### Step 3: Verify Settings
Your settings should look like this:

```
Name: digidiploma-backend
Region: [Your chosen region]
Branch: main
Root Directory: backend
Runtime: Node
Build Command: npm install
Start Command: node server.js
Instance Type: Free (or Starter)
```

**Note:** If Render allows you to leave Build Command empty, do that. If it requires a value, use `npm install`.

### Step 4: Redeploy
1. Go to **Manual Deploy** tab
2. Click **Clear build cache & deploy**
3. Wait for deployment

## Why This Happens

- **Build Command** runs BEFORE the service starts (for building/compiling)
- **Start Command** runs AFTER build (to start your server)
- Backend doesn't need to build, so Build Command should be empty
- Render automatically runs `npm install` before the start command

## Common Mistakes

❌ **Wrong:**
- Build Command: `node server.js` ← This causes the error
- Build Command: `npm run build` ← Backend doesn't build
- Build Command: `npm audit fix` ← Causes errors

✅ **Correct:**
- Build Command: `npm install` (if Render requires a value)
- Build Command: [EMPTY] (if Render allows it)
- Start Command: `node server.js`

---

**After fixing, your backend should deploy successfully!** 🚀

