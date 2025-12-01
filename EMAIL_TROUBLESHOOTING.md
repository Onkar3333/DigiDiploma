# 📧 Email/OTP Troubleshooting Guide

## 🚨 **Error: Connection Timeout**

### **Problem:**
```
Error: Connection timeout
code: 'ETIMEDOUT'
command: 'CONN'
```

This happens when the SMTP server cannot be reached from your production server (Render).

---

## ✅ **Solution: Use Port 465 (SSL) Instead of 587 (TLS)**

Port 465 with SSL works more reliably on cloud platforms like Render.

### **Update Environment Variables on Render:**

Go to Render Dashboard → Your Backend Service → **Environment** tab:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465                              # ← Changed from 587 to 465
SMTP_SECURE=true                           # ← Set to true for SSL
SMTP_USER=digidiploma06@gmail.com
SMTP_PASS=your-16-char-app-password
SMTP_FROM=DigiDiploma <digidiploma06@gmail.com>
SMTP_REPLY_TO=digidiploma06@gmail.com
```

**Save and redeploy** your backend.

---

## 🔄 **Alternative Solutions**

If port 465 still doesn't work, try these options:

### **Option 1: Use SendGrid (Recommended for Production)**

SendGrid is specifically designed for cloud platforms and has better deliverability.

#### **Setup (5 minutes):**

1. **Sign up**: https://signup.sendgrid.com/
2. **Verify email**
3. **Create API Key**:
   - Settings → API Keys → Create API Key
   - Give it full "Mail Send" permissions
   - Copy the API key

4. **Update Render Environment Variables**:

```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=apikey                           # ← Literally the word "apikey"
SMTP_PASS=SG.your-actual-api-key-here     # ← Your SendGrid API key
SMTP_FROM=DigiDiploma <noreply@digidiploma.in>
SMTP_REPLY_TO=support@digidiploma.in
```

**Free Tier**: 100 emails/day (perfect for getting started)

---

### **Option 2: Use Mailgun**

1. **Sign up**: https://signup.mailgun.com/
2. **Verify email**
3. **Get SMTP credentials**: Dashboard → Sending → Domain Settings → SMTP Credentials

```bash
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=postmaster@sandboxXXXXX.mailgun.org  # From Mailgun dashboard
SMTP_PASS=your-mailgun-smtp-password
SMTP_FROM=DigiDiploma <noreply@digidiploma.in>
```

**Free Tier**: 5,000 emails/month for first 3 months

---

### **Option 3: Use Resend (Modern & Simple)**

1. **Sign up**: https://resend.com/
2. **Get API Key**: Dashboard → API Keys → Create
3. **Update variables**:

```bash
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=resend                           # ← Literally "resend"
SMTP_PASS=re_your_api_key_here            # ← Your Resend API key
SMTP_FROM=DigiDiploma <onboarding@resend.dev>
```

**Free Tier**: 3,000 emails/month

---

### **Option 4: Use Brevo (formerly Sendinblue)**

1. **Sign up**: https://www.brevo.com/
2. **Get SMTP credentials**: Settings → SMTP & API → SMTP
3. **Update variables**:

```bash
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-brevo-login-email
SMTP_PASS=your-brevo-smtp-key              # NOT your login password!
SMTP_FROM=DigiDiploma <noreply@digidiploma.in>
```

**Free Tier**: 300 emails/day

---

## 🔍 **Debugging Steps**

### **Step 1: Test SMTP Connection**

Add this test endpoint to your backend (temporarily):

```javascript
// In your server.js or routes
app.get('/test-email', async (req, res) => {
  try {
    const result = await mailService.sendMail({
      to: 'your-test-email@gmail.com',
      subject: 'Test Email',
      html: '<p>This is a test email from DigiDiploma</p>',
      text: 'This is a test email from DigiDiploma'
    });
    res.json({ success: true, messageId: result.messageId });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message,
      code: error.code 
    });
  }
});
```

Visit: `https://api.digidiploma.in/test-email`

### **Step 2: Check Render Logs**

Go to Render Dashboard → Your Service → **Logs**

Look for:
```
✅ SMTP configured successfully
```

Or errors like:
```
❌ Error sending email OTP: Connection timeout
```

### **Step 3: Verify Environment Variables**

In Render Dashboard → Environment tab:

- ✅ All SMTP variables are set
- ✅ No extra spaces in values
- ✅ App Password is correct (for Gmail)
- ✅ Port is 465 or 587

---

## 🚫 **Common Mistakes**

### **1. Using Regular Gmail Password**

❌ **Wrong**: Regular Gmail password
✅ **Correct**: 16-character App Password from https://myaccount.google.com/apppasswords

### **2. Spaces in App Password**

When Gmail shows: `abcd efgh ijkl mnop`

❌ **Wrong**: `abcd efgh ijkl mnop` (with spaces)
✅ **Correct**: `abcdefghijklmnop` (no spaces)

### **3. Wrong Port for Security Setting**

❌ **Wrong**: 
```bash
SMTP_PORT=587
SMTP_SECURE=true  # Wrong combination!
```

✅ **Correct Option A** (SSL):
```bash
SMTP_PORT=465
SMTP_SECURE=true
```

✅ **Correct Option B** (STARTTLS):
```bash
SMTP_PORT=587
SMTP_SECURE=false
```

### **4. Not Enabling 2FA on Gmail**

Gmail requires 2FA to generate App Passwords:
1. Go to https://myaccount.google.com/security
2. Enable 2-Step Verification
3. Then generate App Password

---

## 📊 **Port Comparison**

| Port | Security | Best For | Render Compatible |
|------|----------|----------|-------------------|
| **465** | SSL/TLS | Production | ✅ Best Choice |
| **587** | STARTTLS | Development | ⚠️ Sometimes blocked |
| **25** | None/TLS | Legacy | ❌ Usually blocked |
| **2525** | STARTTLS | Alternative | ✅ Good backup |

---

## 🎯 **Recommended Setup for Production**

### **Best: SendGrid**

```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=apikey
SMTP_PASS=SG.your-api-key
SMTP_FROM=DigiDiploma <noreply@digidiploma.in>
```

**Why SendGrid?**
- ✅ Designed for cloud platforms
- ✅ Better deliverability
- ✅ No IP blocking issues
- ✅ Professional email analytics
- ✅ 100 free emails/day
- ✅ Easy custom domain setup

### **Alternative: Gmail with Port 465**

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=digidiploma06@gmail.com
SMTP_PASS=your-16-char-app-password
SMTP_FROM=DigiDiploma <digidiploma06@gmail.com>
```

**Limitations:**
- 500 emails/day limit
- May be blocked on some cloud platforms
- Less professional for business

---

## 🔧 **Testing Email Configuration**

### **Quick Test via Render Shell:**

1. Go to Render Dashboard → Your Service → **Shell**
2. Run:

```bash
node -e "require('./services/mailService.js').mailService.sendMail({
  to: 'your-email@gmail.com',
  subject: 'Test',
  html: '<p>Test email</p>',
  text: 'Test email'
}).then(r => console.log('✅ Success:', r.messageId)).catch(e => console.error('❌ Error:', e.message))"
```

This will immediately show if email sending works.

---

## 📝 **Environment Variable Template**

Copy this template and update with your values:

```bash
# EMAIL CONFIGURATION - Choose ONE option below

# Option 1: Gmail (Port 465 - SSL)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=digidiploma06@gmail.com
SMTP_PASS=                    # ← 16-char App Password (no spaces)
SMTP_FROM=DigiDiploma <digidiploma06@gmail.com>
SMTP_REPLY_TO=digidiploma06@gmail.com

# Option 2: SendGrid (Recommended)
# SMTP_HOST=smtp.sendgrid.net
# SMTP_PORT=465
# SMTP_SECURE=true
# SMTP_USER=apikey
# SMTP_PASS=                  # ← Your SendGrid API key
# SMTP_FROM=DigiDiploma <noreply@digidiploma.in>

# Option 3: Mailgun
# SMTP_HOST=smtp.mailgun.org
# SMTP_PORT=465
# SMTP_SECURE=true
# SMTP_USER=                  # ← From Mailgun dashboard
# SMTP_PASS=                  # ← From Mailgun dashboard
# SMTP_FROM=DigiDiploma <noreply@digidiploma.in>
```

---

## ✅ **Success Indicators**

After updating configuration:

1. **Render Logs Show**:
```
✅ SMTP configured successfully
Email service initialized with smtp.sendgrid.net:465
```

2. **Test Email Works**:
```bash
curl https://api.digidiploma.in/test-email
# Returns: {"success": true, "messageId": "..."}
```

3. **OTP Emails Arrive**:
- Try password reset
- Check email (and spam folder)
- Email should arrive within 10 seconds

---

## 🚨 **Still Not Working?**

### **Check Firewall/Network**

Render might be blocking outbound SMTP. Solutions:

1. **Use HTTP-based email services** (SendGrid API, AWS SES)
2. **Contact Render Support** to verify SMTP ports aren't blocked
3. **Try alternative ports**: 2525, 465, 587

### **Alternative: SendGrid API (Not SMTP)**

If SMTP continues to fail, use SendGrid's HTTP API:

```bash
# Just need API key, no SMTP
SENDGRID_API_KEY=SG.your-api-key
```

Then update your mail service to use `@sendgrid/mail` package.

---

## 📞 **Support Resources**

- **SendGrid Docs**: https://docs.sendgrid.com/
- **Mailgun Docs**: https://documentation.mailgun.com/
- **Gmail SMTP**: https://support.google.com/a/answer/176600
- **Render Support**: https://render.com/docs/support

---

## 🎯 **Quick Fix Checklist**

- [ ] Change `SMTP_PORT` to **465**
- [ ] Set `SMTP_SECURE` to **true**
- [ ] Verify App Password has no spaces
- [ ] Redeploy backend on Render
- [ ] Check Render logs for errors
- [ ] Test with test endpoint
- [ ] If still fails, switch to SendGrid

---

**Most connection timeout issues are solved by using Port 465 with SSL! 🚀**

If that doesn't work, SendGrid is your best alternative for production.

