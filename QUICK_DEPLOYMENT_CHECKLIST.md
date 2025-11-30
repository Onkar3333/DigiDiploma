# ⚡ Quick Deployment Checklist

**Setup:**
- Frontend: Vercel
- Backend: Render
- Domain: Hostinger

## Before You Start

- [ ] Push all code to GitHub
- [ ] Test locally that everything works
- [ ] Have all API keys ready (Razorpay, MongoDB, etc.)

---

## Frontend (Vercel) - 15 minutes

1. **Go to [vercel.com](https://vercel.com)**
   - Sign up/Login with GitHub

2. **Import Project**
   - Click "Add New Project"
   - Select your GitHub repo
   - Vercel auto-detects Vite

3. **Add Environment Variables**
   ```
   VITE_WS_URL=wss://your-backend-domain.com
   VITE_RAZORPAY_KEY_ID=rzp_live_your_key_id
   ```

4. **Update vercel.json**
   - Replace `your-backend-domain.com` with your actual backend domain

5. **Deploy**
   - Click "Deploy"
   - Wait 2-5 minutes
   - Your site is live! 🎉

---

## Backend (Render) - 20 minutes

### 1. Create Render Account
- Go to [render.com](https://render.com)
- Sign up with GitHub

### 2. Create Web Service
- Click "New +" → "Web Service"
- Connect your GitHub repository

### 3. Configure Service
- **Name:** `digidiploma-backend`
- **Root Directory:** `backend` ← Important!
- **Build Command:** 
  - If allowed: Leave **EMPTY**
  - If required: Use `npm install`
- **Start Command:** `node server.js` ← This is where node server.js goes
- **Instance Type:** Free (or Starter $7/month for production)

⚠️ **Critical:** 
- Do NOT put `node server.js` in Build Command (that's for Start Command)
- Do NOT use `npm run build` or `npm audit fix` in Build Command
- If you see "Cannot find module" errors, Build Command is incorrectly set

### 4. Add Environment Variables
Click "Add Environment Variable" for each:

```env
PORT=10000
NODE_ENV=production
FRONTEND_URL=https://your-frontend.vercel.app
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret-key
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=...
# ... (see full guide for complete list)
```

### 5. Deploy
- Click "Create Web Service"
- Wait 5-10 minutes for deployment
- Copy your backend URL: `https://digidiploma-backend.onrender.com`

### 6. Update Frontend
- Go to Vercel → Environment Variables
- Update `VITE_WS_URL` to: `wss://digidiploma-backend.onrender.com`
- Update `vercel.json` with Render backend URL

---

## MongoDB Atlas - 10 minutes

1. **Create Account:** [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)

2. **Create Cluster:** Free M0 tier

3. **Network Access:**
   - Add IP: `0.0.0.0/0` (or your server IP)

4. **Database User:**
   - Create user with password

5. **Get Connection String:**
   - Clusters → Connect → Connect your application
   - Copy and replace `<password>`
   - Add to backend `.env` as `MONGODB_URI`

---

## Domain Setup (Hostinger) - 15 minutes

### 1. Purchase Domain (if needed)
- Go to Hostinger
- Purchase `digidiploma.com` (or your domain)

### 2. Frontend Domain (Vercel)
1. Vercel → Project → Settings → Domains
2. Add: `digidiploma.com`
3. Vercel shows DNS records needed

### 3. Backend Domain (Render)
1. Render → Service → Settings → Custom Domains
2. Add: `api.digidiploma.com`
3. Render shows CNAME record

### 4. Configure DNS in Hostinger
1. Hostinger → Domains → Your Domain → DNS
2. Add records:

**For Frontend:**
```
Type: A
Name: @
Value: 76.76.21.21
```

```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

**For Backend:**
```
Type: CNAME
Name: api
Value: [Render provides this]
```

### 5. Wait & Update
- Wait 5-30 minutes for DNS propagation
- Update environment variables with new domains

---

## Final Steps

1. **Update vercel.json** with your Render backend URL
2. **Update Render environment variables** with your Vercel frontend URL
3. **Update Vercel environment variables** with your Render backend URL
4. **Wait for DNS propagation** (5-30 minutes)
5. **Test everything!**

---

## Common Issues

**CORS Error?**
- Check `FRONTEND_URL` in Render environment variables
- Ensure it matches your Vercel domain exactly
- Render auto-restarts after env changes

**API Not Working?**
- Check `vercel.json` has correct Render backend URL
- Check Render service is running (dashboard)
- Check Render logs for errors

**Backend Spinning Down?**
- Free tier sleeps after 15 min inactivity
- First request takes ~30 seconds
- Upgrade to Starter ($7/month) for production

**WebSocket Not Connecting?**
- Check `VITE_WS_URL` in Vercel
- Ensure backend supports WebSocket (Nginx config)

---

## Need More Details?

See `DEPLOYMENT_GUIDE.md` for complete step-by-step instructions.

