# ⚡ Quick Razorpay Keys Setup

## 🎯 Where to Add Your Razorpay Live Keys

### ✅ Render (Backend) - REQUIRED
**URL:** https://dashboard.render.com/

**Steps:**
1. Login to Render Dashboard
2. Click on your backend service (the one at `api.digidiploma.in`)
3. Go to **"Environment"** tab
4. Click **"Add Environment Variable"**
5. Add these two variables:

```
RAZORPAY_KEY_ID=rzp_live_Rn4PVGuwyXoQQe
RAZORPAY_KEY_SECRET=your_live_key_secret_here
```

6. Click **"Save Changes"**
7. Restart your service (go to "Events" → "Manual Deploy")

### ❌ Vercel (Frontend) - NOT NEEDED
**You do NOT need to add Razorpay keys to Vercel!**

The frontend automatically gets the `keyId` from the backend when creating orders.

---

## 🔍 How to Verify Keys Are Working

1. **Check Render Logs:**
   - Go to Render Dashboard → Your Service → Logs
   - Look for: `✅ Razorpay initialized successfully`
   - Look for: `✅ Key ID: rzp_live_...`

2. **Test Payment:**
   - Go to your website: https://www.digidiploma.in
   - Try to purchase a material
   - Check browser console for errors
   - Check Render logs for payment-related messages

---

## 📝 Your Current Setup

- **Frontend:** Vercel (https://www.digidiploma.in)
- **Backend:** Render (https://api.digidiploma.in)
- **Keys Location:** Render Environment Variables

---

## ⚠️ Important Notes

1. **Never commit `.env` files** to GitHub
2. **Never share your `RAZORPAY_KEY_SECRET`** publicly
3. **Use Live keys** for production (keys starting with `rzp_live_`)
4. **Restart service** after adding environment variables

---

## 🆘 Troubleshooting

**Keys not working?**
- Verify keys in Razorpay Dashboard: https://dashboard.razorpay.com/app/keys
- Check Render logs for initialization errors
- Ensure keys start with `rzp_live_` (for live mode)
- Make sure you restarted the service after adding keys

**Payment failing?**
- Check browser console for errors
- Check Render logs for payment errors
- Verify order creation is successful
- Test with a small amount first

---

## 📞 Quick Links

- **Render Dashboard:** https://dashboard.render.com/
- **Razorpay Dashboard:** https://dashboard.razorpay.com/
- **Your Website:** https://www.digidiploma.in
- **Your API:** https://api.digidiploma.in

