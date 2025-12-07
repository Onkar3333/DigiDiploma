# 🔑 How to Add Razorpay Live Keys to Render

## ⚠️ Important: Where to Add Keys

**✅ ADD KEYS TO: Render (Backend)** - `https://api.digidiploma.in`  
**❌ DO NOT ADD TO: Vercel (Frontend)** - Frontend gets keys from backend automatically

## Overview

Your backend is hosted on **Render** at `https://api.digidiploma.in`. The Razorpay keys need to be added to your Render backend service environment variables.

**Why only Render?** The backend creates Razorpay orders and sends the `keyId` to the frontend. The frontend doesn't need the keys directly.

## Step-by-Step Instructions

### Step 1: Login to Render Dashboard

1. Go to: https://dashboard.render.com/
2. Login with your Render account

### Step 2: Navigate to Your Backend Service

1. Click on your backend service (should be named something like "digidiploma-backend" or "api")
2. Or go directly to: https://dashboard.render.com/web/your-service-name

### Step 3: Add Environment Variables

1. In your service dashboard, click on **"Environment"** tab (in the left sidebar)
2. Scroll down to **"Environment Variables"** section
3. Click **"Add Environment Variable"** button

### Step 4: Add Razorpay Keys

Add these two environment variables:

#### Variable 1: RAZORPAY_KEY_ID
- **Key:** `RAZORPAY_KEY_ID`
- **Value:** `rzp_live_Rn4PVGuwyXoQQe` (your actual live key ID)
- Click **"Save Changes"**

#### Variable 2: RAZORPAY_KEY_SECRET
- **Key:** `RAZORPAY_KEY_SECRET`
- **Value:** `YOUR_LIVE_KEY_SECRET` (your actual live key secret - keep this secure!)
- Click **"Save Changes"**

#### Optional: RAZORPAY_WEBHOOK_SECRET (Recommended for Production)
- **Key:** `RAZORPAY_WEBHOOK_SECRET`
- **Value:** `your_webhook_secret` (if you've set up webhooks in Razorpay dashboard)
- Click **"Save Changes"**

### Step 5: Restart Your Service

After adding the environment variables:

1. Go to **"Events"** tab in your Render dashboard
2. Click **"Manual Deploy"** → **"Deploy latest commit"**
   - OR
3. Click **"Settings"** → Scroll down → Click **"Clear build cache & deploy"**

This will restart your service with the new environment variables.

### Step 6: Verify Keys Are Loaded

1. After deployment, check the **"Logs"** tab
2. Look for these messages:
   ```
   ✅ Razorpay initialized successfully
   ✅ Key ID: rzp_live_...
   ```

If you see these messages, your keys are loaded correctly!

## Quick Reference

**Where to add keys:** Render Dashboard → Your Backend Service → Environment Tab

**Required Variables:**
```
RAZORPAY_KEY_ID=rzp_live_YOUR_KEY_ID
RAZORPAY_KEY_SECRET=YOUR_KEY_SECRET
```

**Optional (for webhooks):**
```
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

## Important Notes

⚠️ **Security:**
- Never commit `.env` files to GitHub
- Never share your `RAZORPAY_KEY_SECRET` publicly
- The secret key should only be in Render's environment variables

✅ **Best Practices:**
- Use different keys for test and production
- Rotate keys periodically for security
- Monitor Razorpay dashboard for any suspicious activity

## Troubleshooting

### Keys Not Working?

1. **Check Key Format:**
   - Key ID should start with `rzp_live_` (for live) or `rzp_test_` (for test)
   - Key Secret should be a long string (usually 32+ characters)

2. **Verify in Razorpay Dashboard:**
   - Login to: https://dashboard.razorpay.com/
   - Go to: Settings → API Keys
   - Ensure you're using Live Mode keys (not Test Mode)

3. **Check Render Logs:**
   - Go to Render Dashboard → Your Service → Logs
   - Look for Razorpay initialization messages
   - Check for any error messages

4. **Test Configuration:**
   - After adding keys and restarting, test a payment
   - Check browser console for any errors
   - Check backend logs for payment-related errors

## Vercel (Frontend) - No Keys Needed

**Important:** You do NOT need to add Razorpay keys to Vercel!

The frontend gets the Razorpay key ID from the backend API when creating an order. The backend sends the key ID in the order creation response, and the frontend uses it to initialize Razorpay.

The flow is:
1. Frontend requests order creation from backend
2. Backend creates order using Razorpay keys (stored in Render)
3. Backend returns order details + key ID to frontend
4. Frontend uses the key ID to initialize Razorpay payment

So **only Render (backend) needs the Razorpay keys**.

## After Adding Keys

1. ✅ Keys added to Render environment variables
2. ✅ Service restarted
3. ✅ Check logs for "Razorpay initialized successfully"
4. ✅ Test payment flow
5. ✅ Verify payments work correctly

## Support

If you encounter issues:
- Check Render logs for errors
- Verify keys in Razorpay dashboard
- Test with a small amount first
- Check browser console for frontend errors

