# 🚀 DigiDiploma Deployment Guide

Complete guide to deploy DigiDiploma:
- **Frontend:** Vercel (Free)
- **Backend:** Render (Free tier available)
- **Domain:** Hostinger (DNS management)

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Frontend Deployment (Vercel)](#frontend-deployment-vercel)
3. [Backend Deployment (Render)](#backend-deployment-render)
4. [Domain Setup (Hostinger)](#domain-setup-hostinger)
5. [Environment Variables Setup](#environment-variables-setup)
6. [Database Configuration (MongoDB Atlas)](#database-configuration-mongodb-atlas)
7. [Post-Deployment Checklist](#post-deployment-checklist)
8. [Troubleshooting](#troubleshooting)

---

## ✅ Prerequisites

Before deploying, ensure you have:

- ✅ GitHub account (for Vercel & Render deployment)
- ✅ Vercel account (free tier available)
- ✅ Render account (free tier available)
- ✅ Hostinger account (for domain)
- ✅ MongoDB Atlas account (free tier available)
- ✅ Razorpay account (for payments)
- ✅ All environment variables ready

---

## 🌐 Frontend Deployment (Vercel)

### Step 1: Prepare Your Code

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. **Ensure `.env` is in `.gitignore`:**
   - Check that `.env` files are not committed to Git
   - Vercel will use environment variables from their dashboard

### Step 2: Deploy to Vercel

1. **Go to [Vercel Dashboard](https://vercel.com/dashboard)**
   - Sign up/Login with GitHub

2. **Import Your Project:**
   - Click "Add New Project"
   - Select your GitHub repository
   - Vercel will auto-detect it's a Vite/React project

3. **Configure Build Settings:**
   - **Framework Preset:** Vite
   - **Root Directory:** `./` (root)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

4. **Environment Variables:**
   - Go to Project Settings → Environment Variables
   - Add the following (you'll update these after backend is deployed):

   ```
   VITE_WS_URL=wss://your-backend.onrender.com
   VITE_RAZORPAY_KEY_ID=rzp_live_your_key_id
   ```

   **Note:** Update `VITE_WS_URL` after your backend is deployed on Render.

5. **Update vercel.json:**
   - Edit `vercel.json` in your project root
   - Replace `your-backend-domain.com` with your Render backend URL
   - Example: `https://digidiploma-backend.onrender.com`

6. **Deploy:**
   - Click "Deploy"
   - Wait for build to complete (2-5 minutes)
   - Your site will be live at `your-project.vercel.app`

### Step 3: Note Your Vercel URL

- After deployment, copy your Vercel URL
- Example: `https://digidiploma.vercel.app`
- You'll need this for backend CORS configuration

---

## 🖥️ Backend Deployment (Render)

### Step 1: Create Render Account

1. **Go to [Render Dashboard](https://render.com)**
   - Sign up/Login with GitHub

### Step 2: Create Web Service

1. **Click "New +" → "Web Service"**

2. **Connect Repository:**
   - Select your GitHub repository
   - Click "Connect"

3. **Configure Service:**
   - **Name:** `digidiploma-backend` (or any name you prefer)
   - **Region:** Choose closest to your users (e.g., Singapore, US East)
   - **Branch:** `main` (or your main branch)
   - **Root Directory:** `backend`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Instance Type:** 
     - **Free:** 512 MB RAM (good for testing)
     - **Starter:** $7/month (recommended for production)

4. **Environment Variables:**
   - Click "Add Environment Variable" for each:

   ```env
   # Server Configuration
   PORT=10000
   NODE_ENV=production
   FRONTEND_URL=https://your-frontend.vercel.app

   # MongoDB Atlas
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/digidiploma?retryWrites=true&w=majority

   # JWT Secret (generate a strong random string)
   JWT_SECRET=your-super-secure-jwt-secret-key-at-least-32-characters-long

   # Razorpay (Use LIVE keys for production)
   RAZORPAY_KEY_ID=rzp_live_your_live_key_id
   RAZORPAY_KEY_SECRET=your_live_key_secret
   RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

   # Cloudflare R2 Storage
   STORAGE_DRIVER=r2
   R2_ACCESS_KEY_ID=your-r2-access-key-id
   R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
   R2_ACCOUNT_ID=your-r2-account-id
   R2_BUCKET_NAME=digidiploma

   # Email Configuration (SMTP)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   SMTP_FROM=your-email@gmail.com
   SMTP_SECURE=false

   # Admin Credentials
   ADMIN_EMAIL=admin@eduportal.com
   ADMIN_PASSWORD=your-secure-admin-password
   ADMIN_ALERT_EMAIL=digidiploma06@gmail.com
   ```

   **Important:**
   - Replace `your-frontend.vercel.app` with your actual Vercel URL
   - Replace all placeholder values with your actual credentials

5. **Create Service:**
   - Click "Create Web Service"
   - Render will start building and deploying (5-10 minutes)

### Step 3: Get Your Backend URL

1. **After deployment completes:**
   - Your backend will be at: `https://digidiploma-backend.onrender.com`
   - Copy this URL

2. **Update Frontend (Vercel):**
   - Go back to Vercel Dashboard
   - Project Settings → Environment Variables
   - Update `VITE_WS_URL` to: `wss://digidiploma-backend.onrender.com`
   - Update `vercel.json` with your Render backend URL
   - Redeploy frontend (or wait for auto-deploy)

### Step 4: Configure Render Settings

1. **Auto-Deploy:**
   - Enabled by default
   - Every push to `main` branch will auto-deploy

2. **Health Check:**
   - Render automatically checks if your service is running
   - Ensure your backend has a health check endpoint or root route

3. **Free Tier Limitations:**
   - Service spins down after 15 minutes of inactivity
   - First request after spin-down takes ~30 seconds
   - Consider upgrading to Starter ($7/month) for production

---

## 🌍 Domain Setup (Hostinger)

### Step 1: Purchase Domain (if not done)

1. **Go to [Hostinger](https://www.hostinger.com)**
2. **Search and purchase domain:** `digidiploma.com` (or your preferred domain)
3. **Complete purchase**

### Step 2: Configure DNS for Frontend (Vercel)

1. **In Vercel Dashboard:**
   - Go to your project → Settings → Domains
   - Click "Add Domain"
   - Enter your domain: `digidiploma.com`
   - Vercel will show DNS records needed

2. **In Hostinger DNS Settings:**
   - Go to Hostinger → Domains → Your Domain → DNS / Name Servers
   - Click "Manage DNS Records"

3. **Add DNS Records:**
   - **For Root Domain (`digidiploma.com`):**
     ```
     Type: A
     Name: @
     Value: 76.76.21.21
     TTL: 3600
     ```

   - **For WWW (`www.digidiploma.com`):**
     ```
     Type: CNAME
     Name: www
     Value: cname.vercel-dns.com
     TTL: 3600
     ```

4. **Wait for DNS Propagation:**
   - Usually takes 5-30 minutes
   - Can take up to 48 hours (rare)

5. **Verify in Vercel:**
   - Vercel will automatically detect when DNS is configured
   - Your site will be accessible at `https://digidiploma.com`

### Step 3: Configure DNS for Backend (Render)

1. **In Render Dashboard:**
   - Go to your Web Service → Settings → Custom Domains
   - Click "Add Custom Domain"
   - Enter: `api.digidiploma.com` (or `backend.digidiploma.com`)

2. **Render will show DNS records:**
   - Copy the CNAME record shown

3. **In Hostinger DNS Settings:**
   - Add CNAME record:
     ```
     Type: CNAME
     Name: api (or backend)
     Value: [Render provides this - something like: digidiploma-backend.onrender.com]
     TTL: 3600
     ```

4. **Wait for DNS Propagation:**
   - Usually 5-30 minutes

5. **SSL Certificate:**
   - Render automatically provisions SSL certificate
   - Wait for "Certificate Provisioned" status

6. **Update Environment Variables:**
   - Update `FRONTEND_URL` in Render to: `https://digidiploma.com`
   - Update `VITE_WS_URL` in Vercel to: `wss://api.digidiploma.com`
   - Update `vercel.json` with: `https://api.digidiploma.com`

---

## 🔐 Environment Variables Setup

### Frontend (Vercel)

Go to Vercel Dashboard → Your Project → Settings → Environment Variables

```env
VITE_WS_URL=wss://api.digidiploma.com
VITE_RAZORPAY_KEY_ID=rzp_live_your_live_key_id
```

**Important:** 
- Use `VITE_` prefix for Vite environment variables
- Update after backend domain is configured
- Redeploy after updating variables

### Backend (Render)

Go to Render Dashboard → Your Service → Environment

All variables listed in Step 2 of Backend Deployment section above.

**Critical Variables:**
- `FRONTEND_URL`: Your Vercel domain (e.g., `https://digidiploma.com`)
- `PORT`: Set to `10000` (Render requirement)
- `MONGODB_URI`: Your MongoDB Atlas connection string
- `RAZORPAY_KEY_ID` & `RAZORPAY_KEY_SECRET`: Your Razorpay LIVE keys

---

## 🗄️ Database Configuration (MongoDB Atlas)

### Step 1: Create MongoDB Atlas Account

1. **Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)**
   - Sign up for free account

2. **Create Free Cluster:**
   - Click "Build a Database"
   - Choose "M0 FREE" tier
   - Select region closest to your Render region
   - Click "Create"

### Step 2: Configure Network Access

1. **Go to Network Access:**
   - Click "Add IP Address"
   - Click "Allow Access from Anywhere" (adds `0.0.0.0/0`)
   - Or add Render's IP ranges (check Render docs)

### Step 3: Create Database User

1. **Go to Database Access:**
   - Click "Add New Database User"
   - Choose "Password" authentication
   - Username: `digidiploma` (or your choice)
   - Password: Generate secure password (save it!)
   - Database User Privileges: "Atlas admin" (or "Read and write to any database")
   - Click "Add User"

### Step 4: Get Connection String

1. **Go to Clusters:**
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Example: `mongodb+srv://digidiploma:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`

2. **Update Connection String:**
   - Replace `<password>` with your database user password
   - Add database name: `?retryWrites=true&w=majority` → `digidiploma?retryWrites=true&w=majority`
   - Final: `mongodb+srv://digidiploma:yourpassword@cluster0.xxxxx.mongodb.net/digidiploma?retryWrites=true&w=majority`

3. **Add to Render Environment Variables:**
   - Variable: `MONGODB_URI`
   - Value: Your complete connection string

---

## ✅ Post-Deployment Checklist

### Frontend (Vercel)

- [ ] Site is accessible at Vercel URL
- [ ] Custom domain is configured and working
- [ ] Environment variables are set
- [ ] `vercel.json` is updated with backend URL
- [ ] API calls are working (check browser console)
- [ ] Razorpay payments are working (test mode first)
- [ ] All pages load correctly
- [ ] Images and assets load properly

### Backend (Render)

- [ ] Service is deployed and running
- [ ] Backend URL is accessible
- [ ] Custom domain is configured (if using)
- [ ] SSL certificate is provisioned
- [ ] Environment variables are set correctly
- [ ] MongoDB connection is working (check logs)
- [ ] API endpoints are responding
- [ ] File uploads are working
- [ ] Razorpay webhook is configured (if using)

### Domain (Hostinger)

- [ ] DNS records are added correctly
- [ ] DNS propagation is complete (check with `nslookup` or online tools)
- [ ] Frontend domain points to Vercel
- [ ] Backend domain points to Render
- [ ] SSL certificates are active (HTTPS working)

### Testing

- [ ] User registration works
- [ ] User login works
- [ ] Admin login works
- [ ] Material upload works
- [ ] Material download works
- [ ] Payment flow works (test with Razorpay test mode first)
- [ ] Email OTP works
- [ ] Notifications work
- [ ] WebSocket connections work

---

## 🔧 Troubleshooting

### Frontend Issues

**Problem: API calls failing (CORS errors)**
- Check `FRONTEND_URL` in Render environment variables matches your Vercel domain
- Ensure it includes `https://` protocol
- Check browser console for specific CORS error
- Verify `vercel.json` has correct backend URL

**Problem: Build fails on Vercel**
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Check Node.js version compatibility
- Look for TypeScript or linting errors

**Problem: Domain not working**
- Wait for DNS propagation (can take up to 48 hours)
- Check DNS records in Hostinger match Vercel requirements
- Verify domain is added in Vercel dashboard
- Use online DNS checker tools

### Backend Issues

**Problem: Backend not starting on Render**
- Check Render logs: Service → Logs
- Verify all environment variables are set
- Check `PORT` is set to `10000`
- Ensure `server.js` is in `backend` directory
- Verify `Start Command` is `node server.js`

**Problem: MongoDB connection fails**
- Verify `MONGODB_URI` is correct in Render environment variables
- Check MongoDB Atlas network access allows all IPs (`0.0.0.0/0`)
- Verify database user password is correct
- Check MongoDB Atlas logs

**Problem: Service spins down (Free tier)**
- Free tier spins down after 15 minutes of inactivity
- First request after spin-down takes ~30 seconds
- Consider upgrading to Starter plan ($7/month) for production
- Or use a ping service to keep it alive (not recommended)

**Problem: Custom domain not working**
- Wait for DNS propagation
- Verify CNAME record in Hostinger points to Render URL
- Check SSL certificate status in Render dashboard
- Ensure domain is added in Render → Settings → Custom Domains

### Payment Issues

**Problem: Razorpay not working**
- Verify you're using LIVE keys (not test keys) in production
- Check `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are set in Render
- Ensure webhook URL is configured in Razorpay dashboard:
  - Webhook URL: `https://api.digidiploma.com/api/payments/webhook`
  - Events: `payment.captured`, `payment_link.paid`
- Check Render logs for Razorpay errors

---

## ⚙️ Important Configuration Notes

### CORS Configuration

The backend automatically uses `FRONTEND_URL` environment variable for CORS.

1. **In Render Environment Variables:**
   ```env
   FRONTEND_URL=https://digidiploma.com
   ```

2. **Backend `server.js` uses:**
   ```javascript
   app.use(cors({
     origin: process.env.FRONTEND_URL || 'http://localhost:8080',
     // ... other options
   }));
   ```

3. **After updating `FRONTEND_URL`:**
   - Render will auto-restart the service
   - Or manually restart: Service → Manual Deploy → Clear build cache & deploy

### Vercel Configuration

1. **Update `vercel.json`:**
   - Replace `your-backend-domain.com` with your Render backend URL
   - Example: `https://api.digidiploma.com` or `https://digidiploma-backend.onrender.com`
   - This file proxies `/api/*` requests to your backend

2. **WebSocket Connections:**
   - Set `VITE_WS_URL` in Vercel environment variables
   - Format: `wss://api.digidiploma.com` (use `wss://` for secure WebSocket)
   - WebSocket will auto-detect production vs development

### Render Free Tier Considerations

- **Spin-down:** Service sleeps after 15 min inactivity
- **Cold start:** First request takes ~30 seconds after spin-down
- **Solution:** Upgrade to Starter plan ($7/month) for production
- **Alternative:** Use a ping service (not recommended, against ToS)

---

## 🔒 Security Checklist

Before going live:

- [ ] Change default admin password
- [ ] Use strong JWT_SECRET (32+ characters, random)
- [ ] Use Razorpay LIVE keys (not test keys)
- [ ] Enable HTTPS (SSL) on both frontend and backend (automatic)
- [ ] CORS is configured correctly (`FRONTEND_URL` in Render)
- [ ] MongoDB Atlas network access is configured
- [ ] All environment variables are set (no defaults in production)
- [ ] Regular backups of MongoDB (configure in MongoDB Atlas)
- [ ] Monitor logs for errors (Render dashboard)
- [ ] Test all payment flows before going live

---

## 📝 Deployment Summary

**Your Setup:**
- **Frontend:** `https://digidiploma.com` (Vercel)
- **Backend:** `https://api.digidiploma.com` (Render)
- **Database:** MongoDB Atlas (Free tier)
- **Domain:** Hostinger DNS management

**Cost Estimate:**
- Vercel: **Free** (or $20/month for Pro)
- Render: **Free** (or $7/month for Starter - recommended)
- MongoDB Atlas: **Free** (M0 tier)
- Hostinger Domain: **~$10-15/year**
- **Total:** ~$10-15/year (domain only) or ~$84-180/year (with Render Starter)

---

## 📞 Support

If you encounter issues:

1. **Check Render logs:** Service → Logs tab
2. **Check Vercel logs:** Project → Deployments → Click deployment → View logs
3. **Check MongoDB Atlas logs:** Clusters → Metrics
4. **Review environment variables** in both Vercel and Render
5. **Test API endpoints** manually with Postman/curl
6. **Check DNS propagation:** Use online DNS checker tools

---

## 🎉 Deployment Complete!

Once everything is deployed and tested:

1. ✅ Update Razorpay webhook URL to production
2. ✅ Switch from test keys to live keys
3. ✅ Test all features thoroughly
4. ✅ Monitor for any errors
5. ✅ Set up regular MongoDB backups
6. ✅ Consider upgrading Render to Starter plan for production

Your DigiDiploma platform is now live! 🚀

**Access:**
- Frontend: `https://digidiploma.com`
- Backend API: `https://api.digidiploma.com`
- Admin: `https://digidiploma.com/admin` (or your admin route)
