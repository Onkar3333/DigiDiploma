# Razorpay Payment Troubleshooting Guide

## Common Errors and Solutions

### Error: `POST https://api.razorpay.com/v2/standard_checkout/preferences 400 (Bad Request)`

This error typically occurs when:

1. **Invalid Razorpay Key Format**
   - Ensure your `RAZORPAY_KEY_ID` in `backend/.env` starts with `rzp_live_` or `rzp_test_`
   - Check that there are no extra spaces or characters
   - Verify the key is complete (not truncated)

2. **Key Not Activated**
   - For live keys: Ensure your Razorpay account KYC is complete
   - Verify the key is active in Razorpay Dashboard
   - Check that you've switched from Test Mode to Live Mode

3. **Order Creation Issues**
   - Verify the order was created successfully before initializing payment
   - Check backend logs for order creation errors
   - Ensure the order ID is valid and not expired

4. **SDK Version Issues**
   - Clear browser cache and reload
   - The SDK should load from: `https://checkout.razorpay.com/v1/checkout.js`
   - Try hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

### Error: `data:;base64,= net::ERR_INVALID_URL`

This error is related to material URLs, not Razorpay. It occurs when:
- A material URL is empty or malformed
- The URL normalization is failing
- This is handled in the code and shouldn't affect payments

## Verification Steps

### 1. Check Backend Configuration

```bash
# In backend/.env, verify:
RAZORPAY_KEY_ID=rzp_live_YOUR_KEY_HERE
RAZORPAY_KEY_SECRET=YOUR_SECRET_HERE
```

### 2. Test Backend Configuration

```bash
# Check if Razorpay is configured
curl http://localhost:5000/api/payments/config-status
```

Expected response:
```json
{
  "configured": true,
  "hasKeyId": true,
  "hasKeySecret": true,
  "keyIdPrefix": "rzp_live_",
  "message": "Razorpay is configured and ready"
}
```

### 3. Check Browser Console

When initiating a payment, check the browser console for:
- Razorpay script loading errors
- Order creation errors
- Payment initialization errors

### 4. Verify Order Creation

Check backend logs when creating an order:
```
✅ Razorpay order created: { orderId: 'order_...', amount: ..., status: 'created' }
```

## Common Fixes

### Fix 1: Restart Backend Server

After updating environment variables:
```bash
# Stop the server (Ctrl+C)
# Restart it
npm start
# or
node server.js
```

### Fix 2: Clear Browser Cache

1. Open browser DevTools (F12)
2. Right-click on refresh button
3. Select "Empty Cache and Hard Reload"

### Fix 3: Verify Key Format

Your `RAZORPAY_KEY_ID` should look like:
- Test: `rzp_test_1234567890ABCDEF`
- Live: `rzp_live_1234567890ABCDEF`

### Fix 4: Check Network Tab

In browser DevTools > Network tab:
- Look for the order creation request: `/api/payments/create-order`
- Check if it returns 200 OK with valid order data
- Verify the `keyId` in the response is correct

### Fix 5: Test with Test Keys First

If using live keys, try switching to test keys temporarily:
```
RAZORPAY_KEY_ID=rzp_test_YOUR_TEST_KEY
RAZORPAY_KEY_SECRET=YOUR_TEST_SECRET
```

## Debugging Steps

1. **Enable Console Logging**
   - Open browser console (F12)
   - Look for Razorpay-related errors
   - Check network requests to Razorpay API

2. **Check Backend Logs**
   - Look for Razorpay initialization messages
   - Check for order creation errors
   - Verify payment verification logs

3. **Test Order Creation**
   ```javascript
   // In browser console, test order creation:
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

4. **Verify Razorpay SDK**
   ```javascript
   // In browser console:
   console.log(window.Razorpay); // Should show the Razorpay constructor
   ```

## Still Having Issues?

1. **Check Razorpay Dashboard**
   - Login to https://dashboard.razorpay.com/
   - Verify your account is active
   - Check for any account restrictions

2. **Contact Razorpay Support**
   - If the issue persists, contact Razorpay support
   - Provide them with:
     - Your key ID (first 12 characters)
     - Error message
     - Order ID (if available)

3. **Check Application Logs**
   - Review backend server logs
   - Check for any error messages
   - Verify all environment variables are set

## Prevention

- Always validate keys before deploying
- Use test keys in development
- Keep keys secure and never commit to Git
- Regularly rotate keys for security
- Monitor Razorpay dashboard for any issues

