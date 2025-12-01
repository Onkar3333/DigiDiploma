# 🚨 CRITICAL: Vercel Dashboard Configuration Fix

## ⚡ **DO THIS NOW - Manual Vercel Configuration**

Your assets are getting 404 because Vercel needs to be configured correctly. Follow these exact steps:

---

## 🎯 **Step 1: Go to Vercel Dashboard**

1. **Go to**: https://vercel.com/dashboard
2. **Find and click** your DigiDiploma project
3. **Click** the "Settings" tab

---

## ⚙️ **Step 2: Configure Build & Development Settings**

In Settings → **General** → Scroll to "Build & Development Settings":

### **Set These EXACT Values:**

```
Framework Preset: Vite

Build Command: npm run build

Output Directory: dist

Install Command: npm install

Root Directory: ./   (leave blank or set to ./)
```

### **Screenshot of What It Should Look Like:**
```
┌─────────────────────────────────────────┐
│ Build & Development Settings            │
├─────────────────────────────────────────┤
│ Framework Preset:     Vite              │
│ Build Command:        npm run build     │
│ Output Directory:     dist              │
│ Install Command:      npm install       │
│ Root Directory:       ./                │
└─────────────────────────────────────────┘
```

**Click "Save"** at the bottom!

---

## 🔄 **Step 3: Force Fresh Deployment**

1. Go to **"Deployments"** tab
2. Click **"..."** on the latest deployment
3. Select **"Redeploy"**
4. **IMPORTANT**: **UNCHECK** "Use existing Build Cache" ✅
5. Click **"Redeploy"**

This triggers a completely fresh build.

---

## 🔧 **Step 4: Set Environment Variables (If Not Done)**

Go to Settings → **Environment Variables**:

Add these (if not already added):

```bash
VITE_API_URL=https://api.digidiploma.in
VITE_BACKEND_URL=https://api.digidiploma.in

# Add your Firebase config
VITE_FIREBASE_API_KEY=your-key
VITE_FIREBASE_AUTH_DOMAIN=your-domain
VITE_FIREBASE_PROJECT_ID=your-project-id
# ... etc
```

Select **Production**, **Preview**, **Development** for each.

Click **Save**.

---

## ⏱️ **Step 5: Wait for Build**

**Watch the deployment:**
- Status will change: Building → Deploying → Ready
- **Takes**: 3-4 minutes
- **Watch for**: Any build errors in logs

### **If Build Fails:**
1. Click on the failed deployment
2. Read the **build logs**
3. Look for errors (usually TypeScript or dependency issues)

---

## 🧹 **Step 6: Clear Your Browser Cache**

**CRITICAL - You MUST do this:**

### **Chrome/Edge:**
```
1. Press F12 (DevTools)
2. Right-click Refresh button  
3. Click "Empty Cache and Hard Reload"
```

### **Or:**
```
1. Ctrl + Shift + Delete
2. Select "Cached images and files"
3. Time range: "All time"
4. Clear data
```

### **Or Test in Incognito:**
```
Ctrl + Shift + N
Visit: https://www.digidiploma.in/
```

---

## ✅ **Verification**

After Vercel shows "Ready" + you cleared cache:

### **Visit Your Site:**
```
https://www.digidiploma.in/
```

### **Check DevTools (F12):**

**Console Tab - Should See:**
```
✅ No 404 errors
✅ No "Failed to load module script" errors
✅ No crashes
```

**Network Tab - Should See:**
```
✅ index.html - 200 OK
✅ index-XXXXX.js - 200 OK (some hash)
✅ index-XXXXX.css - 200 OK (some hash)
✅ All assets loading
```

### **Test Registration:**
1. Click "Register"
2. Fill form
3. Click "Register" button
4. ✅ **Should work!**

---

## 🚨 **If STILL Getting 404s After Following All Steps**

### **Possible Issues:**

#### **Issue 1: Vercel is Not Finding Your Code**

**Check in Vercel Settings:**
- **Root Directory**: Should be blank or `./`
- **Not** `src` or `frontend` or anything else

#### **Issue 2: Build is Failing**

**Check build logs for:**
```
❌ Error: Cannot find module
❌ TypeScript errors
❌ Dependency errors
```

**Solution:**
1. Fix errors locally first
2. Test local build: `npm run build`
3. If it works locally, push to GitHub
4. Redeploy on Vercel

#### **Issue 3: Wrong GitHub Branch**

**In Vercel Settings → Git:**
- Production Branch should be: **main**
- Not master, dev, or anything else

#### **Issue 4: Vercel Using Wrong Import**

**In Vercel Settings → General:**
- Check **Git Repository** is correct
- Should be: `digidiploma06/DigiDiploma`

---

## 🔍 **Alternative: Check What Vercel Actually Built**

### **In Vercel Dashboard:**
1. Go to your project
2. Click on a deployment (the latest "Ready" one)
3. Click **"View Deployment"**
4. Try visiting: `https://[deployment-url]/assets/`
5. See if assets directory exists

If you can't browse `/assets/`, Vercel didn't build properly.

---

## 💡 **Nuclear Option: Delete & Reimport Project**

If nothing works:

### **1. In Vercel:**
1. Settings → **General** → Scroll to bottom
2. Click **"Delete Project"**
3. Confirm deletion

### **2. Reimport:**
1. Vercel Dashboard → **"Add New"** → **"Project"**
2. Import: `digidiploma06/DigiDiploma`
3. Configure:
   ```
   Framework: Vite
   Build Command: npm run build
   Output Directory: dist
   Root Directory: ./
   ```
4. Add environment variables
5. Deploy

This gives you a completely fresh start.

---

## 📋 **Critical Checklist**

Do these in Vercel Dashboard RIGHT NOW:

- [ ] Settings → Build Command = `npm run build`
- [ ] Settings → Output Directory = `dist`
- [ ] Settings → Framework = `Vite`
- [ ] Settings → Root Directory = `./` (blank)
- [ ] Click **Save**
- [ ] Go to Deployments → Redeploy (uncheck cache)
- [ ] Wait for "Ready" status
- [ ] Clear browser cache
- [ ] Test site

---

## 🎯 **Expected Vercel Build Log**

When building correctly, you should see:

```bash
> npm run build

vite v5.x.x building for production...
✓ 234 modules transformed
dist/index.html                   2.31 kB │ gzip: 0.89 kB
dist/assets/index-XXXXX.css      145.2 kB │ gzip: 23.4 kB
dist/assets/index-XXXXX.js       589.3 kB │ gzip: 189.1 kB

✓ built in 8.45s
Build Completed in [build output directory]
```

If you don't see this, the build is failing!

---

## 🆘 **Immediate Action Required**

**Right now, do these 3 things:**

1. ✅ **Go to Vercel Dashboard**
2. ✅ **Check Build Settings** (see Step 2 above)
3. ✅ **Redeploy without cache** (see Step 3 above)

Then wait 4 minutes and test.

---

**The Vercel configuration is the key! Set it up correctly in the dashboard NOW, then redeploy. 🚀**

