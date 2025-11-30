# 📧💳 Production Setup: Email/OTP & Razorpay Payment

## Overview
This guide will help you set up Email/OTP functionality and Razorpay payment integration for production.

---

## 📧 **Part 1: Email & OTP Setup**

### **Option A: Gmail (Recommended for Getting Started)**

Gmail is free and easy to set up, perfect for production with moderate email volume (up to 500 emails/day).

#### **Step 1: Create/Use Gmail Account**

Use your existing Gmail or create one:
- **Recommended**: `digidiploma06@gmail.com` (you mentioned this)

#### **Step 2: Enable 2-Factor Authentication**

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Click **2-Step Verification**
3. Follow the prompts to enable it
4. Verify with your phone

#### **Step 3: Generate App Password**

⚠️ **Important**: You **cannot** use your regular Gmail password for SMTP. You must use an **App Password**.

1. Go to [App Passwords](https://myaccount.google.com/apppasswords)
2. Select **App**: Choose "Mail" or "Other (Custom name)" → Type "DigiDiploma"
3. Select **Device**: Choose "Other (Custom name)" → Type "Production Server"
4. Click **Generate**
5. **Copy the 16-character password** (looks like: `abcd efgh ijkl mnop`)

#### **Step 4: Add to Render Environment Variables**

Go to your Render backend service → **Environment** tab:

```bash
# Gmail SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=digidiploma06@gmail.com
SMTP_PASS=abcd efgh ijkl mnop    # ← Your 16-char App Password (remove spaces)
SMTP_FROM=DigiDiploma <digidiploma06@gmail.com>
SMTP_REPLY_TO=digidiploma06@gmail.com
ADMIN_ALERT_EMAIL=digidiploma06@gmail.com
```

**Important**: 
- Remove spaces from the App Password: `abcdefghijklmnop`
- Use the EXACT email you set up 2FA on

---

### **Option B: Professional Email Service (Recommended for Scale)**

For higher volume or professional branding:

#### **SendGrid (Free Tier: 100 emails/day)**

1. Sign up: https://signup.sendgrid.com/
2. Verify your email
3. Create an API Key: Settings → API Keys → Create API Key
4. Get SMTP credentials

**Render Environment Variables:**
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG.your-sendgrid-api-key-here
SMTP_FROM=noreply@digidiploma.in
SMTP_REPLY_TO=support@digidiploma.in
```

#### **Mailgun (Free: 5,000 emails/month)**

1. Sign up: https://signup.mailgun.com/
2. Add your domain or use sandbox domain
3. Get SMTP credentials from Settings

**Render Environment Variables:**
```bash
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=postmaster@sandboxXXXXX.mailgun.org
SMTP_PASS=your-mailgun-smtp-password
SMTP_FROM=DigiDiploma <noreply@digidiploma.in>
```

#### **Resend (Modern & Simple)**

1. Sign up: https://resend.com/
2. Verify your domain or use their test domain
3. Get API key

**Render Environment Variables:**
```bash
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=resend
SMTP_PASS=re_your_api_key_here
SMTP_FROM=DigiDiploma <onboarding@resend.dev>
```

---

### **Option C: Custom Domain Email (Professional)**

If you want emails from `@digidiploma.in`:

#### **Using Hostinger Email**

Since you have your domain on Hostinger:

1. Login to Hostinger → **Email** → Create email account
2. Create: `noreply@digidiploma.in` or `support@digidiploma.in`
3. Get SMTP settings from Hostinger

**Typical Hostinger SMTP:**
```bash
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@digidiploma.in
SMTP_PASS=your-email-password
SMTP_FROM=DigiDiploma <noreply@digidiploma.in>
```

---

## 💳 **Part 2: Razorpay Payment Integration**

### **Step 1: Create Razorpay Account**

1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com/signup)
2. Sign up with your business details
3. Complete email verification

### **Step 2: Get Test Keys (Start Here)**

For development/testing:

1. Login to [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Switch to **Test Mode** (toggle on top left)
3. Go to **Settings** → **API Keys**
4. Click **Generate Test Key**
5. Copy both:
   - **Key ID**: `rzp_test_XXXXXXXXXXXXX`
   - **Key Secret**: `YYYYYYYYYYYYYYYYYY`

**Add to Render Environment Variables:**
```bash
RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXXX
RAZORPAY_KEY_SECRET=YYYYYYYYYYYYYYYYYY
```

### **Step 3: Test Payment Flow**

With test keys, you can test payments:

**Test Cards:**
```
Card Number: 4111 1111 1111 1111
CVV: Any 3 digits (e.g., 123)
Expiry: Any future date (e.g., 12/25)
Name: Any name
```

**Test UPI:**
```
UPI ID: success@razorpay
```

All test transactions will succeed automatically.

### **Step 4: Go Live (After Testing)**

When ready for real payments:

1. Complete **KYC Verification** in Razorpay Dashboard:
   - Business Details
   - Bank Account
   - ID Proof
   - Address Proof

2. Wait for approval (usually 24-48 hours)

3. Once approved, get **Live Keys**:
   - Switch to **Live Mode**
   - Go to **Settings** → **API Keys**
   - Generate Live Key
   - Copy **Key ID** (`rzp_live_XXXXX`) and **Key Secret**

4. **Update Render Environment Variables:**
```bash
# Replace test keys with live keys
RAZORPAY_KEY_ID=rzp_live_XXXXXXXXXXXXX
RAZORPAY_KEY_SECRET=YYYYYYYYYYYYYYYYYY
```

### **Step 5: Update Frontend with Razorpay Key**

Your frontend needs the Razorpay **Key ID** (public key):

**Add to Vercel Environment Variables:**
```bash
VITE_RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXXX
```

Or for live mode:
```bash
VITE_RAZORPAY_KEY_ID=rzp_live_XXXXXXXXXXXXX
```

**Important**: Only add the **Key ID**, never the **Key Secret** to frontend!

### **Step 6: Set Up Webhooks (Optional but Recommended)**

Webhooks notify your backend when payments succeed/fail:

1. In Razorpay Dashboard → **Settings** → **Webhooks**
2. Click **Create Webhook**
3. Enter Webhook URL: `https://api.digidiploma.in/api/payments/webhook`
4. Select events:
   - ✅ payment.authorized
   - ✅ payment.captured
   - ✅ payment.failed
5. Click **Create**
6. Copy the **Webhook Secret**

**Add to Render:**
```bash
RAZORPAY_WEBHOOK_SECRET=whsec_your_webhook_secret
```

---

## 🚀 **Complete Environment Variables Setup**

### **On Render (Backend)**

Go to your backend service → **Environment** tab and add:

```bash
# Email Configuration (Choose ONE option above)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=digidiploma06@gmail.com
SMTP_PASS=your-16-char-app-password
SMTP_FROM=DigiDiploma <digidiploma06@gmail.com>
SMTP_REPLY_TO=digidiploma06@gmail.com
ADMIN_ALERT_EMAIL=digidiploma06@gmail.com

# Razorpay Configuration (Test Mode First)
RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXXX
RAZORPAY_KEY_SECRET=YYYYYYYYYYYYYYYYYY
RAZORPAY_WEBHOOK_SECRET=whsec_your_secret

# Existing vars (keep these)
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret
FRONTEND_URL=https://digidiploma.in
# ... other vars
```

### **On Vercel (Frontend)**

Go to your frontend project → **Settings** → **Environment Variables**:

```bash
# Razorpay Public Key (safe to expose)
VITE_RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXXX
```

---

## ✅ **Testing Email/OTP**

After setting up SMTP credentials:

### **Test 1: Check Backend Logs**

Deploy and check Render logs:
```
✅ SMTP configured successfully
```

### **Test 2: Test Email Sending**

Create a test endpoint or use existing features that send emails:

1. Try **Password Reset** feature
2. Try **OTP verification**
3. Check if emails arrive

### **Common Issues:**

#### **"SMTP credentials are not configured"**

**Solution:**
- Verify environment variables are set in Render
- Check spelling of variable names
- Redeploy backend after adding vars

#### **"Invalid login: 535-5.7.8 Username and Password not accepted"**

**Solution:**
- You're using regular Gmail password instead of App Password
- Generate App Password (Step 3 above)
- Remove spaces from the password

#### **Emails not arriving**

**Check:**
1. Spam/Junk folder
2. Backend logs for errors
3. Gmail "Less secure app access" (should NOT be needed if using App Password)
4. Make sure 2FA is enabled

---

## ✅ **Testing Razorpay Payments**

After setting up Razorpay credentials:

### **Test 1: Create Payment Order**

Your backend should be able to create orders:

```bash
# Test endpoint
curl -X POST https://api.digidiploma.in/api/payments/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "amount": 100,
    "materialId": "test123"
  }'
```

Expected response:
```json
{
  "orderId": "order_XXXXXXXXXXXXX",
  "amount": 10000,
  "currency": "INR"
}
```

### **Test 2: Complete Payment Flow**

1. Login to your frontend
2. Try to purchase a material or subscribe
3. Razorpay checkout should open
4. Use test card: `4111 1111 1111 1111`
5. Payment should succeed

### **Common Issues:**

#### **"Razorpay is not configured"**

**Solution:**
- Add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to Render
- Redeploy backend

#### **Frontend: "Invalid key id"**

**Solution:**
- Add `VITE_RAZORPAY_KEY_ID` to Vercel
- Redeploy frontend
- Clear browser cache

#### **Payment succeeds but not recorded**

**Solution:**
- Check backend logs
- Verify payment verification logic
- Set up webhooks for reliable confirmation

---

## 💰 **Razorpay Pricing**

### **Transaction Fees:**

- **Domestic Cards**: 2% + ₹0
- **International Cards**: 3% + ₹0
- **UPI**: 0% (free) up to ₹2000, then 0.4%
- **Net Banking**: 2% + ₹0
- **Wallets**: 2% + ₹0

### **No Monthly Fees:**
- ✅ Free to use
- ✅ Pay only on successful transactions
- ✅ No setup cost
- ✅ No annual maintenance

---

## 📊 **Email Service Comparison**

| Service | Free Tier | Cost After | Domain Email | Best For |
|---------|-----------|------------|--------------|----------|
| **Gmail** | 500/day | N/A | No | Quick start |
| **SendGrid** | 100/day | $15/month (40K) | Yes | Scale |
| **Mailgun** | 5000/month | $35/month | Yes | Developers |
| **Resend** | 3000/month | $20/month (50K) | Yes | Modern apps |
| **Hostinger** | Unlimited* | $1-3/month | Yes | Custom domain |

*With email plan

---

## 🎯 **Quick Start Checklist**

### **Email Setup:**
- [ ] Create/use Gmail account
- [ ] Enable 2FA on Gmail
- [ ] Generate App Password
- [ ] Add SMTP variables to Render
- [ ] Redeploy backend
- [ ] Test email sending

### **Razorpay Setup:**
- [ ] Create Razorpay account
- [ ] Get test API keys
- [ ] Add keys to Render backend
- [ ] Add public key to Vercel frontend
- [ ] Test payment with test card
- [ ] Complete KYC for live mode
- [ ] Switch to live keys

---

## 📞 **Support Links**

### Email:
- **Gmail App Passwords**: https://myaccount.google.com/apppasswords
- **SendGrid**: https://docs.sendgrid.com/
- **Mailgun**: https://documentation.mailgun.com/

### Razorpay:
- **Dashboard**: https://dashboard.razorpay.com/
- **Documentation**: https://razorpay.com/docs/
- **Test Cards**: https://razorpay.com/docs/payments/payments/test-card-details/
- **Support**: https://razorpay.com/support/

---

## 🚨 **Security Best Practices**

### **Email:**
✅ Use App Passwords, not regular passwords
✅ Never commit SMTP credentials to git
✅ Use environment variables only
✅ Enable 2FA on email account
✅ Monitor for suspicious login attempts

### **Razorpay:**
✅ **NEVER** expose Key Secret in frontend
✅ Only Key ID goes to frontend
✅ Key Secret stays in backend environment variables
✅ Use test mode until fully tested
✅ Enable webhooks for payment confirmation
✅ Verify payment signature on backend
✅ Log all payment transactions

---

## 📝 **Next Steps**

1. **Start with Gmail** for email (easiest)
2. **Start with Razorpay test mode** for payments
3. **Test thoroughly** before going live
4. **Complete Razorpay KYC** for live payments
5. **Consider upgrading email service** if you grow

---

**Your production email and payment systems are ready to configure! 🚀**

Follow the steps above and you'll have both working in ~30 minutes.

