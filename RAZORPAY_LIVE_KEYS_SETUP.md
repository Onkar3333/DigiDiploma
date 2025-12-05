# Razorpay Live Keys Setup Guide

## Overview
This guide will help you configure your live Razorpay payment gateway keys for production use.

## Steps to Get Your Live Razorpay Keys

1. **Login to Razorpay Dashboard**
   - Go to: https://dashboard.razorpay.com/
   - Login with your Razorpay account

2. **Complete KYC Verification (if not done)**
   - Navigate to: Settings > Account & Settings
   - Complete the KYC verification process
   - This is required to activate Live Mode

3. **Switch to Live Mode**
   - In the Razorpay Dashboard, toggle from "Test Mode" to "Live Mode"
   - You'll see a confirmation dialog - confirm the switch

4. **Get Your Live Keys**
   - Go to: Settings > API Keys
   - Click on "Generate Key" if you haven't already
   - Copy your **Key ID** (starts with `rzp_live_`)
   - Copy your **Key Secret** (click "Reveal" to see it)

5. **Update Environment Variables**
   - Open `backend/.env` file
   - Update the following variables:
     ```
     RAZORPAY_KEY_ID=rzp_live_YOUR_ACTUAL_KEY_ID
     RAZORPAY_KEY_SECRET=YOUR_ACTUAL_KEY_SECRET
     ```
   - **IMPORTANT**: Never commit `.env` file to version control!

6. **Restart Your Backend Server**
   - After updating the environment variables, restart your backend server
   - The server will automatically load the new keys

## Webhook Setup (Recommended for Production)

1. **Create Webhook in Razorpay Dashboard**
   - Go to: Settings > Webhooks
   - Click "Add New Webhook"
   - Enter your webhook URL: `https://your-domain.com/api/payments/webhook`
   - Select events to listen to:
     - `payment.captured`
     - `payment_link.paid`
   - Save the webhook

2. **Get Webhook Secret**
   - After creating the webhook, copy the "Webhook Secret"
   - Add it to your `backend/.env`:
     ```
     RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here
     ```

3. **Restart Backend Server**
   - Restart the server to load the webhook secret

## Verification

After setting up your live keys:

1. **Check Backend Logs**
   - When the server starts, you should see:
     ```
     ✅ Razorpay initialized successfully
     ✅ Key ID: rzp_live_...
     ```

2. **Test Payment Flow**
   - Try making a test payment (use a small amount)
   - Verify that the payment goes through
   - Check that payment records are created in your database

## Security Notes

- ⚠️ **NEVER** share your Razorpay keys publicly
- ⚠️ **NEVER** commit `.env` file to Git
- ⚠️ Keep your Key Secret secure and private
- ✅ Use environment variables for all sensitive data
- ✅ Rotate keys periodically for security

## Troubleshooting

### "Razorpay is not configured" error
- Check that `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are set in `backend/.env`
- Verify the keys start with `rzp_live_` (not `rzp_test_`)
- Restart the backend server after updating environment variables

### Payment not going through
- Verify you're using Live Mode keys (not Test Mode)
- Check that your Razorpay account is activated and KYC is complete
- Verify the amount is correct (Razorpay expects amount in paise - smallest currency unit)

### Webhook not working
- Verify the webhook URL is accessible from the internet
- Check that `RAZORPAY_WEBHOOK_SECRET` is set correctly
- Check backend logs for webhook errors

## Support

For Razorpay-specific issues:
- Razorpay Support: https://razorpay.com/support/
- Razorpay Documentation: https://razorpay.com/docs/

For application-specific issues:
- Check backend logs for detailed error messages
- Verify all environment variables are set correctly

