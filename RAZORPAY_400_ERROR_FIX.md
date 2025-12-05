# Razorpay 400 Bad Request Error - Debugging Guide

## Error Description
```
POST https://api.razorpay.com/v2/standard_checkout/preferences?key_id=rzp_live_... 400 (Bad Request)
```

This error occurs when Razorpay's SDK tries to initialize the checkout but receives invalid parameters.

## What We've Fixed

### 1. Enhanced Order Validation
- ✅ Added validation to ensure order ID starts with `order_`
- ✅ Added validation for amount format (must be integer in paise)
- ✅ Added validation for key ID format (must start with `rzp_live_` or `rzp_test_`)
- ✅ Added 500ms delay after order creation to prevent race conditions

### 2. Improved Logging
- ✅ Added detailed console logs at every step
- ✅ Logs show order ID, amount, currency, and key ID prefix
- ✅ Error logs include full error details for debugging

### 3. Better Error Handling
- ✅ Specific error messages for different failure types
- ✅ User-friendly error messages in toast notifications
- ✅ Detailed error logging for debugging

## Debugging Steps

### Step 1: Check Browser Console
When you try to make a payment, look for these logs in order:

1. **Order Creation:**
   ```
   📦 Order data received from server: {...}
   ✅ Order data validated: {...}
   ```

2. **Payment Initialization:**
   ```
   🚀 Initializing Razorpay payment: {...}
   📋 Razorpay options prepared: {...}
   🎯 Opening Razorpay checkout...
   ```

3. **If Error Occurs:**
   ```
   ❌ Payment initialization error: {...}
   ```

### Step 2: Check Backend Console
Look for these logs:

1. **Order Creation:**
   ```
   Creating Razorpay order: {...}
   ✅ Razorpay order created successfully: {...}
   📤 Sending order response to frontend: {...}
   ```

2. **If Order Creation Fails:**
   ```
   ❌ Razorpay order creation failed: {...}
   ```

### Step 3: Verify Your Configuration

1. **Check `backend/.env`:**
   ```env
   RAZORPAY_KEY_ID=rzp_live_YOUR_KEY
   RAZORPAY_KEY_SECRET=YOUR_SECRET
   ```
   - Key must start with `rzp_live_` (for live) or `rzp_test_` (for test)
   - No extra spaces or characters
   - Key must be complete (not truncated)

2. **Verify in Razorpay Dashboard:**
   - Login to https://dashboard.razorpay.com/
   - Go to Settings > API Keys
   - Ensure your live keys are active
   - Ensure KYC is complete for live mode

3. **Restart Backend Server:**
   ```bash
   # Stop server (Ctrl+C)
   # Restart
   npm start
   # or
   node server.js
   ```

### Step 4: Test Order Creation

Test if orders are being created correctly:

```bash
# In browser console, test order creation:
fetch('/api/payments/create-order', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({ materialId: 'YOUR_MATERIAL_ID' })
})
.then(r => r.json())
.then(console.log)
```

Expected response:
```json
{
  "orderId": "order_...",
  "amount": 10000,
  "currency": "INR",
  "keyId": "rzp_live_...",
  "orderStatus": "created"
}
```

## Common Causes of 400 Error

### 1. Invalid Order ID
- **Symptom:** Order ID doesn't start with `order_`
- **Fix:** Ensure order is created successfully before initializing payment
- **Check:** Look for `✅ Razorpay order created successfully` in backend logs

### 2. Order Doesn't Exist
- **Symptom:** Order was created but doesn't exist in Razorpay
- **Fix:** Check if order creation succeeded in backend logs
- **Check:** Verify order ID in Razorpay dashboard

### 3. Amount Mismatch
- **Symptom:** Amount in order doesn't match amount sent to Razorpay
- **Fix:** Ensure amount is in paise (smallest currency unit)
- **Check:** Amount should be integer (e.g., ₹100 = 10000 paise)

### 4. Key Mismatch
- **Symptom:** Key used to create order doesn't match key used for payment
- **Fix:** Ensure same key is used for both order creation and payment
- **Check:** Verify `RAZORPAY_KEY_ID` in backend/.env matches the key in frontend

### 5. Order State Issue
- **Symptom:** Order is not in "created" state
- **Fix:** Ensure order status is "created" before initializing payment
- **Check:** Look for `orderStatus: "created"` in order response

## Testing Locally

1. **Start Backend:**
   ```bash
   cd backend
   npm start
   ```

2. **Start Frontend:**
   ```bash
   npm run dev
   ```

3. **Test Payment Flow:**
   - Login to your app
   - Navigate to Materials page
   - Click on a paid material
   - Click "Pay" button
   - Check browser console for logs
   - Check backend console for logs

4. **Verify:**
   - Order is created successfully
   - Payment modal opens
   - No 400 errors in console

## If Error Persists

1. **Check Razorpay Dashboard:**
   - Verify account is active
   - Check for any account restrictions
   - Verify KYC status

2. **Check Network Tab:**
   - Open DevTools > Network
   - Look for the `/v2/standard_checkout/preferences` request
   - Check request payload
   - Check response details

3. **Contact Support:**
   - Share console logs (both browser and backend)
   - Share order ID
   - Share key ID prefix (first 12 characters)
   - Share error details

## Additional Notes

- The 500ms delay after order creation helps prevent race conditions
- All validation happens before calling Razorpay SDK
- Error messages are user-friendly and specific
- Detailed logs help identify the exact issue

## Next Steps

1. ✅ Test locally with the enhanced logging
2. ✅ Check console logs when making a payment
3. ✅ Verify order creation succeeds
4. ✅ Ensure payment modal opens without errors
5. ✅ Push to GitHub once working locally
6. ✅ Test on production (https://www.digidiploma.in/)

