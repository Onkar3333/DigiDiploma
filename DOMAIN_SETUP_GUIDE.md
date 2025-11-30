# 🌐 Custom Domain Setup Guide - digidiploma.in

## Overview
This guide will help you configure your custom domain `digidiploma.in` purchased from Hostinger with your DigiDiploma application.

---

## 📋 **What You'll Set Up**

- **Backend API**: `https://api.digidiploma.in`
- **Frontend**: `https://digidiploma.in` or `https://www.digidiploma.in`
- **SSL Certificates**: Automatically provisioned (Free via Let's Encrypt)

---

## 🔧 **Step 1: Configure DNS Records on Hostinger**

### Login to Hostinger
1. Go to [Hostinger](https://www.hostinger.com)
2. Login to your account
3. Navigate to **Domains** → Select `digidiploma.in`
4. Click on **DNS / Nameservers**

### Add DNS Records

#### **For Backend API (Render)**

Add a **CNAME Record**:
```
Type: CNAME
Name: api
Points to: digidiploma-backend.onrender.com
TTL: 3600 (or leave as default)
```

✅ This makes your API accessible at: `https://api.digidiploma.in`

#### **For Frontend** (Choose based on where you host)

**Option A: Hosting on Render**
```
Type: CNAME
Name: www
Points to: your-frontend-app.onrender.com
TTL: 3600

Type: A
Name: @ (root domain)
Points to: 216.24.57.1 (Render's IP - verify current IP in Render docs)
TTL: 3600
```

**Option B: Hosting on Vercel**
```
Type: CNAME
Name: www
Points to: cname.vercel-dns.com
TTL: 3600

Type: A
Name: @
Points to: 76.76.21.21 (Vercel's IP)
TTL: 3600
```

**Option C: Hosting on Netlify**
```
Type: CNAME
Name: www
Points to: your-site.netlify.app
TTL: 3600

Type: A
Name: @
Points to: 75.2.60.5 (Netlify's IP)
TTL: 3600
```

---

## 🎯 **Step 2: Configure Custom Domain on Render**

### For Backend:

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Select your service: **digidiploma-backend**
3. Click **Settings** tab
4. Scroll to **Custom Domain** section
5. Click **Add Custom Domain**
6. Enter: `api.digidiploma.in`
7. Click **Save**

**Wait for DNS verification** (can take 5 minutes to 48 hours)

Render will:
- ✅ Verify DNS records
- ✅ Automatically provision SSL certificate
- ✅ Enable HTTPS

### For Frontend (if hosting on Render):

Repeat the same process but add:
- `digidiploma.in` (root domain)
- `www.digidiploma.in` (www subdomain)

---

## 🔐 **Step 3: Update Environment Variables on Render**

### Backend Environment Variables

In your Render backend service, add/update these environment variables:

```bash
# Frontend URL (your domain)
FRONTEND_URL=https://digidiploma.in

# API URL (for backend reference)
API_URL=https://api.digidiploma.in

# Your existing variables
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret-key
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
# ... other variables
```

### Frontend Environment Variables

In your frontend (Vite/React), update `.env.production`:

```bash
VITE_API_URL=https://api.digidiploma.in
VITE_BACKEND_URL=https://api.digidiploma.in
```

---

## 🚀 **Step 4: Update Frontend Code**

If you have hardcoded URLs in your frontend, update them:

### Example: `src/lib/api.ts` or similar

```typescript
// Before
const API_URL = 'http://localhost:5000/api';

// After
const API_URL = import.meta.env.VITE_API_URL || 'https://api.digidiploma.in/api';
```

---

## ✅ **Step 5: Verify Everything Works**

### Test Backend API

```bash
# Health check
curl https://api.digidiploma.in/api/health

# Root endpoint
curl https://api.digidiploma.in/

# Public notices
curl https://api.digidiploma.in/api/notices/public
```

### Test Frontend

1. Visit `https://digidiploma.in`
2. Try logging in
3. Check browser console for any CORS errors
4. Verify API calls are going to `api.digidiploma.in`

---

## 🔧 **Troubleshooting**

### DNS Not Resolving

**Check DNS propagation:**
```bash
# Windows
nslookup api.digidiploma.in

# Linux/Mac
dig api.digidiploma.in
```

Or use online tools:
- https://dnschecker.org
- https://whatsmydns.net

**If not resolved:**
- Wait up to 48 hours (usually much faster)
- Clear your DNS cache
- Verify DNS records are correct in Hostinger

### CORS Errors

Your backend is already configured to accept requests from:
- `https://digidiploma.in`
- `https://www.digidiploma.in`
- `https://api.digidiploma.in`

If you get CORS errors:
1. Check browser console for the exact error
2. Verify `FRONTEND_URL` environment variable on Render
3. Ensure your frontend is making requests to the correct domain

### SSL Certificate Not Working

If you see "Not Secure" warning:
1. Wait for Render to provision SSL (can take 10-30 minutes)
2. Check Render dashboard → Your service → Settings → Custom Domain
3. Look for SSL status (should show "Active")

### Backend Not Accessible

1. Verify DNS CNAME is pointing to correct Render URL
2. Check Render service is running (not crashed)
3. Check Render logs for errors
4. Verify custom domain is added in Render dashboard

---

## 📊 **DNS Records Summary**

After setup, your DNS should look like this:

| Type  | Name | Value | Purpose |
|-------|------|-------|---------|
| CNAME | api  | digidiploma-backend.onrender.com | Backend API |
| CNAME | www  | your-frontend.onrender.com | Frontend (www) |
| A     | @    | [Your host IP] | Frontend (root) |

---

## 🎯 **Expected URLs**

After complete setup:

- **Frontend**: https://digidiploma.in
- **Frontend (www)**: https://www.digidiploma.in
- **Backend API**: https://api.digidiploma.in
- **API Health**: https://api.digidiploma.in/api/health
- **User Login**: https://api.digidiploma.in/api/users/login

---

## 🔄 **Redirect www to non-www (Optional)**

To redirect `www.digidiploma.in` → `digidiploma.in`, add this to your frontend hosting:

**On Render:** Create a `_redirects` file:
```
https://www.digidiploma.in/* https://digidiploma.in/:splat 301!
```

**On Vercel:** Add to `vercel.json`:
```json
{
  "redirects": [
    {
      "source": "https://www.digidiploma.in/:path*",
      "destination": "https://digidiploma.in/:path*",
      "permanent": true
    }
  ]
}
```

---

## 📧 **Email Configuration (Optional)**

If you want email like `admin@digidiploma.in`:

1. Go to Hostinger → **Email**
2. Create email accounts
3. Use Hostinger's email settings with your app

---

## 🎉 **Success Checklist**

- [ ] DNS records added on Hostinger
- [ ] DNS propagated (check with `nslookup` or online tools)
- [ ] Custom domain added on Render
- [ ] SSL certificate active on Render
- [ ] Environment variables updated
- [ ] Backend accessible at `https://api.digidiploma.in`
- [ ] Frontend accessible at `https://digidiploma.in`
- [ ] No CORS errors
- [ ] Login/API calls working
- [ ] HTTPS working (green lock icon)

---

## 📞 **Support**

If you encounter issues:

1. **Hostinger Support**: For DNS and domain issues
2. **Render Support**: For deployment and SSL issues
3. **Check Logs**: Render dashboard → Your service → Logs

---

## 🎓 **Your Application URLs**

**Production:**
- Frontend: https://digidiploma.in
- Backend: https://api.digidiploma.in

**Development:**
- Frontend: http://localhost:5173
- Backend: http://localhost:5000

---

## ⏱️ **Timeline**

| Task | Expected Time |
|------|---------------|
| Add DNS records | 5 minutes |
| DNS propagation | 5 minutes - 48 hours (usually 30 min) |
| Add custom domain on Render | 2 minutes |
| SSL provisioning | 10-30 minutes |
| Update environment variables | 5 minutes |
| Testing | 10 minutes |

**Total**: ~1-2 hours (accounting for DNS propagation)

---

Good luck! 🚀 Your DigiDiploma application will be live on your custom domain soon!

