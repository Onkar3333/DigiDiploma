# 🚀 Vercel Frontend Deployment Guide

## Overview
Deploy your DigiDiploma frontend to Vercel with custom domain support.

---

## 📋 Prerequisites

- ✅ GitHub repository with your frontend code
- ✅ Vercel account (free tier available)
- ✅ Custom domain `digidiploma.in` from Hostinger
- ✅ Backend already deployed on Render

---

## 🚀 **Step 1: Deploy to Vercel**

### Option A: Deploy via Vercel Dashboard (Recommended)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New** → **Project**
3. Import your GitHub repository: `digidiploma06/DigiDiploma`
4. Configure project settings:
   ```
   Framework Preset: Vite
   Root Directory: ./
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm install
   ```
5. Click **Deploy**

### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy (from project root)
vercel

# Deploy to production
vercel --prod
```

---

## 🔧 **Step 2: Configure Environment Variables**

### In Vercel Dashboard:

1. Go to your project → **Settings** → **Environment Variables**
2. Add these variables for **Production**, **Preview**, and **Development**:

```bash
# API Configuration
VITE_API_URL=https://api.digidiploma.in
VITE_BACKEND_URL=https://api.digidiploma.in

# Firebase Configuration
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id
VITE_FIREBASE_VAPID_KEY=your-vapid-key

# App Configuration
VITE_APP_NAME=DigiDiploma
VITE_APP_VERSION=1.0.0
VITE_APP_ENV=production
VITE_APP_DOMAIN=digidiploma.in
```

3. Click **Save**
4. Redeploy your application (Deployments → ... → Redeploy)

---

## 🌐 **Step 3: Add Custom Domain**

### In Vercel Dashboard:

1. Go to your project → **Settings** → **Domains**
2. Click **Add**
3. Enter: `digidiploma.in`
4. Click **Add**
5. Repeat for: `www.digidiploma.in`

### Set Primary Domain:

1. Click on `digidiploma.in`
2. Select **Make Primary**
3. This will auto-redirect `www` to non-www

### Vercel will show DNS configuration needed:

```
A Record
Name: @
Value: 76.76.21.21

CNAME Record
Name: www
Value: cname.vercel-dns.com
```

---

## 🔧 **Step 4: Configure DNS on Hostinger**

1. Login to [Hostinger](https://hpanel.hostinger.com)
2. Go to **Domains** → `digidiploma.in` → **DNS/Nameservers**
3. Add/Update these DNS records:

### A Record (Root Domain)
```
Type: A
Name: @ (or leave blank)
Points to: 76.76.21.21
TTL: 3600
```

### CNAME Record (WWW)
```
Type: CNAME
Name: www
Points to: cname.vercel-dns.com
TTL: 3600
```

### CNAME Record (API - for backend)
```
Type: CNAME
Name: api
Points to: digidiploma-backend.onrender.com
TTL: 3600
```

4. Click **Save Changes**

---

## ⏱️ **Step 5: Wait for DNS Propagation**

### Check DNS Status:

```bash
# Check root domain
nslookup digidiploma.in

# Check www
nslookup www.digidiploma.in

# Check API subdomain
nslookup api.digidiploma.in
```

Or use online tools:
- https://dnschecker.org
- https://www.whatsmydns.net

**Timeline:**
- Minimum: 5-30 minutes
- Maximum: 24-48 hours
- Average: 30 minutes - 2 hours

---

## ✅ **Step 6: Verify Deployment**

### Check Vercel Status:

1. Go to Vercel Dashboard → Your Project → **Domains**
2. All domains should show **Valid Configuration** ✅
3. SSL certificates should be **Active** 🔒

### Test Your Website:

```bash
# Test root domain
curl -I https://digidiploma.in

# Test www (should redirect to digidiploma.in)
curl -I https://www.digidiploma.in

# Test API backend
curl https://api.digidiploma.in/api/health
```

### Manual Testing:

1. Visit https://digidiploma.in in browser
2. Check for SSL (green lock icon)
3. Try logging in
4. Open browser DevTools → Network tab
5. Verify API calls go to `https://api.digidiploma.in`

---

## 🔄 **Automatic Deployments**

Vercel automatically deploys when you push to GitHub:

- **Production**: Pushes to `main` branch → `https://digidiploma.in`
- **Preview**: Pull requests → `https://your-pr.vercel.app`
- **Development**: Other branches → `https://branch-name.vercel.app`

---

## 📁 **Project Structure for Vercel**

Ensure your project has:

```
DigiDiploma/
├── src/                    # React/Vite source code
├── public/                 # Static assets
├── index.html             # Entry HTML
├── package.json           # Dependencies
├── vite.config.ts         # Vite configuration
├── vercel.json           # Vercel configuration (optional)
└── .env.example          # Environment variables template
```

---

## ⚙️ **Optional: vercel.json Configuration**

Create `vercel.json` in project root for advanced configuration:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        }
      ]
    }
  ]
}
```

---

## 🔧 **Troubleshooting**

### Build Fails on Vercel

**Check build logs:**
1. Vercel Dashboard → Your Project → Deployments
2. Click on failed deployment
3. View **Build Logs**

**Common issues:**
- Missing dependencies → Add to `package.json`
- TypeScript errors → Fix in code or set `"skipLibCheck": true`
- Environment variables not set → Add in Vercel dashboard

### Domain Not Working

**DNS not configured:**
- Verify DNS records in Hostinger
- Use `nslookup` or dnschecker.org
- Wait for propagation

**SSL Certificate Issues:**
- Vercel auto-provisions SSL
- Can take 10-30 minutes
- Check Vercel Dashboard → Domains

### API Calls Failing

**CORS Errors:**
- Your backend is already configured ✅
- Verify `VITE_API_URL` is set correctly in Vercel
- Check browser console for exact error

**Wrong API URL:**
- Ensure environment variables are set in Vercel
- Redeploy after adding env vars
- Check Network tab in DevTools

### Redirect Loop

**www to non-www:**
- Set `digidiploma.in` as primary in Vercel
- Don't set both as primary
- Clear browser cache

---

## 📊 **Vercel Dashboard Overview**

### Key Sections:

1. **Deployments** - View all deployments and logs
2. **Domains** - Manage custom domains and SSL
3. **Settings** - Environment variables, build settings
4. **Analytics** - Traffic and performance (Pro plan)
5. **Logs** - Runtime and build logs

---

## 💰 **Vercel Pricing**

### Free Tier (Hobby):
- ✅ Unlimited personal projects
- ✅ Automatic HTTPS
- ✅ 100 GB bandwidth/month
- ✅ Serverless functions
- ✅ Web analytics (basic)
- ✅ Custom domains

Perfect for DigiDiploma! 🎉

### Pro Tier ($20/month):
- Team collaboration
- More bandwidth
- Advanced analytics
- Priority support

---

## 🎯 **Deployment Checklist**

- [ ] GitHub repository pushed
- [ ] Vercel account created
- [ ] Project imported to Vercel
- [ ] Environment variables set
- [ ] Initial deployment successful
- [ ] Custom domains added (digidiploma.in, www.digidiploma.in)
- [ ] DNS records configured on Hostinger
- [ ] DNS propagated
- [ ] SSL certificates active
- [ ] Website accessible at https://digidiploma.in
- [ ] www redirects to non-www
- [ ] API calls working to api.digidiploma.in
- [ ] No CORS errors
- [ ] Login/authentication working

---

## 🔗 **Useful Links**

- **Vercel Documentation**: https://vercel.com/docs
- **Vercel CLI Docs**: https://vercel.com/docs/cli
- **Vite Deployment Guide**: https://vitejs.dev/guide/static-deploy.html#vercel
- **Custom Domains**: https://vercel.com/docs/concepts/projects/domains

---

## 🚀 **Next Steps After Deployment**

1. **Monitor Performance**:
   - Check Vercel Analytics
   - Monitor API response times
   - Track errors in browser console

2. **Set Up CI/CD**:
   - Already automated via GitHub integration ✅
   - Every push to main = automatic deployment

3. **Enable Web Vitals**:
   - Vercel provides automatic Web Vitals tracking
   - Monitor Core Web Vitals for SEO

4. **Configure Caching**:
   - Vercel handles caching automatically
   - Configure `Cache-Control` headers if needed

---

## 📈 **Production Best Practices**

✅ **Always set environment variables in Vercel dashboard**
✅ **Never commit `.env` files to git**
✅ **Use `env.example` as template for team members**
✅ **Monitor build times and optimize if needed**
✅ **Enable Vercel Analytics for insights**
✅ **Set up custom error pages (404, 500)**
✅ **Test on multiple devices and browsers**

---

**Your DigiDiploma frontend is production-ready on Vercel! 🎉**

For backend deployment, see `DEPLOYMENT_GUIDE.md` (Render)
For domain setup, see `DOMAIN_SETUP_GUIDE.md`

