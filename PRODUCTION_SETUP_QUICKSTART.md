# ⚡ Production Setup - Quick Start

## 📧 **Email/OTP Setup (5 minutes)**

### **Using Gmail** (Easiest):

1. **Enable 2FA**: https://myaccount.google.com/security
2. **Generate App Password**: https://myaccount.google.com/apppasswords
3. **Add to Render** (Backend → Environment):

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=digidiploma06@gmail.com
SMTP_PASS=your-16-char-app-password-no-spaces
SMTP_FROM=DigiDiploma <digidiploma06@gmail.com>
SMTP_REPLY_TO=digidiploma06@gmail.com
```

4. **Redeploy backend**
5. **Test**: Try password reset or OTP feature

---

## 💳 **Razorpay Payment Setup (10 minutes)**

### **Step 1: Get Test Keys**

1. Sign up: https://dashboard.razorpay.com/signup
2. Switch to **Test Mode** (top left toggle)
3. **Settings** → **API Keys** → **Generate Test Key**
4. Copy **Key ID** and **Key Secret**

### **Step 2: Add to Render** (Backend)

```bash
RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXXX
RAZORPAY_KEY_SECRET=YYYYYYYYYYYYYYYYYY
```

### **Step 3: Add to Vercel** (Frontend)

```bash
VITE_RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXXX
```

### **Step 4: Test Payment**

Use test card:
```
Card: 4111 1111 1111 1111
CVV: 123
Expiry: 12/25
```

### **Step 5: Go Live** (When Ready)

1. Complete KYC in Razorpay Dashboard
2. Get live keys (rzp_live_XXXXX)
3. Replace test keys with live keys

---

## ✅ **Verification**

### Email Working:
```bash
# Check Render logs for:
✅ SMTP configured successfully

# Test:
- Try password reset
- Check email arrives
```

### Razorpay Working:
```bash
# Check Render logs for:
✅ Razorpay initialized successfully
✅ Key ID: rzp_test_...

# Test:
- Try payment
- Use test card
- Payment succeeds
```

---

## 🚨 **Troubleshooting**

### Email Not Sending:

```bash
# Problem: "Invalid login"
Solution: Use App Password, not regular password

# Problem: "SMTP not configured"
Solution: Check env vars in Render, redeploy

# Problem: Emails not arriving
Solution: Check spam folder, verify App Password
```

### Payment Not Working:

```bash
# Problem: "Razorpay not configured"
Solution: Add RAZORPAY_KEY_ID and KEY_SECRET to Render

# Problem: "Invalid key id" on frontend
Solution: Add VITE_RAZORPAY_KEY_ID to Vercel

# Problem: Payment succeeds but not recorded
Solution: Check backend logs, verify signature
```

---

## 📖 **Full Documentation**

See `PRODUCTION_EMAIL_PAYMENT_SETUP.md` for:
- Detailed setup instructions
- Alternative email providers
- Webhook configuration
- Security best practices
- Pricing information

---

## 🎯 **Quick Checklist**

**Email:**
- [ ] Gmail App Password generated
- [ ] SMTP vars added to Render
- [ ] Backend redeployed
- [ ] Email test successful

**Razorpay:**
- [ ] Account created
- [ ] Test keys obtained
- [ ] Backend vars set
- [ ] Frontend var set
- [ ] Test payment successful
- [ ] KYC completed (for live)

---

**Total Setup Time: ~15 minutes**

Both systems will be fully functional in production! 🚀

