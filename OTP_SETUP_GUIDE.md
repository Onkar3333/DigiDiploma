# OTP Verification Setup Guide

This guide explains how to set up real email and SMS OTP verification for the DigiDiploma registration system.

## Email OTP Setup

### Using Gmail (Recommended for Development)

1. **Enable 2-Factor Authentication** on your Gmail account:
   - Go to [Google Account Security](https://myaccount.google.com/security)
   - Enable 2-Step Verification

2. **Generate App Password**:
   - Go to [App Passwords](https://myaccount.google.com/apppasswords)
   - Select "Mail" and "Other (Custom name)"
   - Enter "DigiDiploma" as the name
   - Copy the generated 16-character password

3. **Configure Environment Variables**:
   Add to your `backend/.env` file:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-16-char-app-password
   SMTP_FROM=your-email@gmail.com
   ```

### Using Other Email Providers

For other SMTP providers (Outlook, Yahoo, custom SMTP), update the configuration:

```env
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587  # or 465 for SSL
SMTP_USER=your-email@domain.com
SMTP_PASS=your-password
SMTP_FROM=your-email@domain.com
```

**Note**: Some providers may require different ports:
- Gmail: 587 (TLS) or 465 (SSL)
- Outlook: 587
- Yahoo: 587 or 465

## SMS OTP Setup (Twilio)

### Step 1: Create Twilio Account

1. Sign up for a free trial at [Twilio](https://www.twilio.com/try-twilio)
2. Verify your phone number
3. Get free trial credits ($15.50 for testing)

### Step 2: Get Twilio Credentials

1. Go to [Twilio Console](https://console.twilio.com/)
2. Find your **Account SID** and **Auth Token** on the dashboard
3. Get a **Phone Number**:
   - Go to Phone Numbers > Manage > Buy a number
   - Select a number (free trial includes one number)
   - Copy the phone number (format: +1234567890)

### Step 3: Install Twilio Package

```bash
cd backend
npm install twilio
```

### Step 4: Configure Environment Variables

Add to your `backend/.env` file:
```env
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

### Step 5: Test SMS Sending

The system will automatically:
- Format phone numbers (adds +91 for Indian numbers if needed)
- Send SMS with OTP code
- Handle errors gracefully

## Development Mode

If email/SMS services are not configured:
- OTP codes are logged to the server console
- Users can check the terminal for OTP codes
- The system continues to work for testing

## Production Deployment

### Email Service Options:

1. **Gmail** (Free, but limited)
   - Good for low volume
   - 500 emails/day limit on free accounts

2. **SendGrid** (Free tier: 100 emails/day)
   - Sign up at [SendGrid](https://sendgrid.com/)
   - Use SMTP settings provided

3. **Resend** (Free tier: 3,000 emails/month)
   - Modern API-based service
   - Better deliverability

4. **AWS SES** (Pay as you go)
   - Very cost-effective for high volume
   - Requires AWS account

### SMS Service Options:

1. **Twilio** (Recommended)
   - Free trial: $15.50 credit
   - Pay-as-you-go pricing
   - Global coverage

2. **AWS SNS** (Alternative)
   - Cost-effective for high volume
   - Requires AWS account

3. **TextLocal** (India-focused)
   - Good for Indian numbers
   - Affordable pricing

## Troubleshooting

### Email Not Sending

1. **Check SMTP credentials**:
   - Verify username and password are correct
   - For Gmail, ensure you're using App Password, not regular password

2. **Check firewall/network**:
   - Ensure port 587 or 465 is not blocked
   - Some networks block SMTP ports

3. **Check logs**:
   - Server console will show detailed error messages
   - Look for authentication errors or connection timeouts

### SMS Not Sending

1. **Verify Twilio credentials**:
   - Check Account SID and Auth Token
   - Ensure phone number format is correct (+country code)

2. **Check Twilio account status**:
   - Verify account is active
   - Check if trial credits are exhausted

3. **Phone number format**:
   - System auto-formats Indian numbers (+91)
   - Ensure phone number is in international format

### OTP Not Received

1. **Check spam/junk folder** (for email)
2. **Check server console** for OTP code (development mode)
3. **Verify email/phone number** is correct
4. **Check OTP expiration** (10 minutes)

## Security Notes

- OTPs expire after 10 minutes
- OTPs are stored in memory (use Redis in production)
- Rate limiting is applied to prevent abuse
- OTPs are cleared after successful verification

## Environment Variables Summary

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com

# SMS Configuration
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

## Testing

1. **Test Email OTP**:
   - Enter email in registration form
   - Click "Send OTP"
   - Check email inbox for code
   - Enter code to verify

2. **Test SMS OTP**:
   - Enter phone number in registration form
   - Click "Send OTP"
   - Check SMS inbox for code
   - Enter code to verify

3. **Test Without Configuration**:
   - System works in console mode
   - OTP codes appear in server terminal
   - Useful for development/testing

