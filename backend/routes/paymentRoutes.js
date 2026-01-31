import express from "express";
const router = express.Router();
import Razorpay from "razorpay";
import crypto from "crypto";
import { authenticateToken, authenticateOptional } from "../middleware/auth.js";
import Payment from "../models/Payment.js";
import Material from "../models/Material.js";
import DownloadToken from "../models/DownloadToken.js";

// Initialize Razorpay - sanitize keys to avoid 401 from hidden chars
function sanitizeKey(val) {
  if (typeof val !== 'string') return '';
  return val.replace(/["'\r\n]/g, '').trim();
}

function getRazorpayInstance() {
  const keyId = sanitizeKey(process.env.RAZORPAY_KEY_ID);
  const keySecret = sanitizeKey(process.env.RAZORPAY_KEY_SECRET);
  if (!keyId || !keySecret) return null;
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

let razorpayInstance = null;
try {
  razorpayInstance = getRazorpayInstance();
  if (razorpayInstance) {
    const keyId = sanitizeKey(process.env.RAZORPAY_KEY_ID);
    console.log("✅ Razorpay initialized (live keys):", keyId?.substring(0, 12) + "...");
  } else {
    console.warn("⚠️ Razorpay keys missing in .env");
  }
} catch (error) {
  console.error("❌ Razorpay init error:", error.message);
}

// Verify order exists in Razorpay (for debugging and validation)
router.get("/verify-order/:orderId", authenticateToken, async (req, res) => {
  try {
    if (!razorpayInstance) {
      return res.status(503).json({ 
        error: "Payment service is not configured" 
      });
    }

    const { orderId } = req.params;
    
    if (!orderId || !orderId.startsWith('order_')) {
      return res.status(400).json({ 
        error: "Invalid order ID format",
        details: "Order ID must start with 'order_'"
      });
    }

    try {
      const order = await razorpayInstance.orders.fetch(orderId);
      
      console.log('✅ Order verified in Razorpay:', {
        orderId: order.id,
        status: order.status,
        amount: order.amount,
        currency: order.currency
      });

      res.status(200).json({
        exists: true,
        order: {
          id: order.id,
          status: order.status,
          amount: order.amount,
          currency: order.currency,
          receipt: order.receipt,
          created_at: order.created_at
        }
      });
    } catch (razorpayError) {
      console.error('❌ Order not found in Razorpay:', {
        orderId: orderId,
        error: razorpayError.error,
        description: razorpayError.error?.description
      });

      return res.status(404).json({
        exists: false,
        error: "Order not found in Razorpay",
        details: razorpayError.error?.description || "The order does not exist or has been deleted"
      });
    }
  } catch (error) {
    console.error('Error verifying order:', error);
    res.status(500).json({ 
      error: "Failed to verify order",
      details: error.message 
    });
  }
});

// Check Razorpay configuration status (for debugging) - requires auth
router.get("/config-status", authenticateToken, async (req, res) => {
  try {
    const hasKeyId = !!process.env.RAZORPAY_KEY_ID;
    const hasKeySecret = !!process.env.RAZORPAY_KEY_SECRET;
    const isInitialized = !!razorpayInstance;
    
    res.status(200).json({
      configured: isInitialized,
      hasKeyId,
      hasKeySecret,
      keyIdPrefix: process.env.RAZORPAY_KEY_ID?.substring(0, 12) || 'not set',
      keySecretLength: process.env.RAZORPAY_KEY_SECRET?.length || 0,
      message: isInitialized 
        ? "Razorpay is configured and ready" 
        : "Razorpay is not configured. Check backend/.env and restart server."
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to check configuration", details: error.message });
  }
});

// Public Razorpay availability check (no auth) - for Materials page to show Pay button
router.get("/razorpay-available", (req, res) => {
  try {
    const configured = !!razorpayInstance;
    res.status(200).json({
      configured,
      message: configured ? "Razorpay is available for payments" : "Payment gateway not configured"
    });
  } catch (error) {
    res.status(500).json({ configured: false, error: error.message });
  }
});

// Verify Razorpay keys work (no auth) - for debugging 401 errors
router.get("/verify-keys", async (req, res) => {
  try {
    const keyId = sanitizeKey(process.env.RAZORPAY_KEY_ID);
    const keySecret = sanitizeKey(process.env.RAZORPAY_KEY_SECRET);
    if (!keyId || !keySecret) {
      return res.status(200).json({ ok: false, error: "Keys missing in .env", keyIdLen: keyId?.length || 0, keySecretLen: keySecret?.length || 0 });
    }
    const instance = getRazorpayInstance();
    if (!instance) {
      return res.status(200).json({ ok: false, error: "Failed to create Razorpay instance" });
    }
    // Minimal API call - 404 (order not found) = auth passed; 401 = auth failed
    try {
      await instance.orders.fetch("order_verify_test_123");
    } catch (e) {
      if (e?.statusCode === 404 || (e?.error?.description && e.error.description.includes('not found'))) {
        return res.status(200).json({ ok: true, message: "Keys work (404 for fake order = auth passed)" });
      }
      if (e?.statusCode === 401 || (e?.error?.description && e.error.description.includes('Authentication failed'))) {
        return res.status(200).json({
          ok: false,
          error: "Keys invalid",
          hint: "Re-copy Key ID and Secret from Razorpay Dashboard > Settings > API Keys. Generate a new key pair if needed."
        });
      }
      throw e;
    }
    res.status(200).json({ ok: true });
  } catch (err) {
    const is401 = err?.statusCode === 401 || err?.error?.code === 'BAD_REQUEST_ERROR';
    res.status(200).json({
      ok: false,
      error: is401 ? "Authentication failed - keys invalid" : err?.message,
      hint: is401 ? "Re-copy both keys from Razorpay Dashboard > Settings > API Keys." : null
    });
  }
});

// Create Razorpay payment link with UPI QR code (supports guest checkout - NO auth required)
router.post("/create-payment-link", async (req, res) => {
  try {
    if (!razorpayInstance) {
      console.warn("⚠️ Razorpay not configured - payment link creation failed");
      return res.status(503).json({ 
        error: "Payment service is not configured. Please contact administrator.",  
        code: "PAYMENT_NOT_CONFIGURED",
        details: "Razorpay credentials are missing. Please configure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env"
      });
    }

    const { materialId, guestId } = req.body;
    let userId = null;
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      const secret = process.env.JWT_SECRET;
      if (token && secret) {
        const jwt = await import('jsonwebtoken');
        const User = (await import('../models/User.js')).default;
        const decoded = jwt.default.verify(token, secret);
        const user = await User.findById(decoded.userId) || await User.findOne({ id: decoded.userId });
        if (user) userId = user.id || user._id;
      }
    } catch (_) { /* optional auth - ignore */ }
    const effectiveGuestId = guestId || null;

    if (!materialId) {
      return res.status(400).json({ error: "Material ID is required" });
    }
    if (!userId && !effectiveGuestId) {
      return res.status(400).json({ error: "Provide guestId in request body for guest checkout" });
    }

    const material = await Material.findById(materialId);
    if (!material) {
      return res.status(404).json({ error: "Material not found" });
    }

    if (material.accessType !== 'paid') {
      return res.status(400).json({ 
        error: "This material is not a paid material" 
      });
    }

    const purchaseQuery = userId ? { userId, materialId } : { guestId: effectiveGuestId, materialId };
    const existingPayment = await Payment.findOne({
      ...purchaseQuery,
      status: 'completed'
    });

    if (existingPayment) {
      return res.status(400).json({ 
        error: "You have already purchased this material",
        alreadyPurchased: true
      });
    }

    const price = Number(material.price) || 0;
    const amountInPaise = Math.round(price * 100);

    if (amountInPaise <= 0) {
      return res.status(400).json({ error: "Invalid material price" });
    }
    if (amountInPaise < 100) {
      return res.status(400).json({ error: "Amount too small", details: "Minimum payment is ₹1" });
    }

    const paymentLinkOptions = {
      amount: amountInPaise,
      currency: "INR",
      description: `Purchase: ${material.title || 'Material'}`,
      customer: { name: 'Customer' },
      notify: { sms: false, email: false },
      reminder_enable: false,
      notes: {
        materialId: String(materialId),
        materialTitle: (material.title || '').substring(0, 100),
        ...(userId && { userId: String(userId) }),
        ...(effectiveGuestId && { guestId: String(effectiveGuestId) }),
      },
      callback_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/materials?materialId=${materialId}`,
      callback_method: 'get'
    };

    let paymentLink;
    try {
      paymentLink = await razorpayInstance.paymentLink.create(paymentLinkOptions);
    } catch (razorpayErr) {
      console.error('Razorpay payment link error:', razorpayErr?.error || razorpayErr);
      const desc = razorpayErr?.error?.description || razorpayErr?.message || String(razorpayErr);
      const isAuth = razorpayErr?.statusCode === 401 || razorpayErr?.error?.code === 'BAD_REQUEST_ERROR';
      return res.status(500).json({
        error: isAuth ? 'Razorpay authentication failed' : 'Payment link creation failed',
        details: isAuth
          ? 'Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env. Use live keys (rzp_live_) for production.'
          : desc
      });
    }
    const orderId = `order_${paymentLink.id}`;

    const payment = await Payment.create({
      userId: userId || undefined,
      guestId: effectiveGuestId || undefined,
      materialId,
      razorpayOrderId: orderId,
      amount: amountInPaise,
      currency: "INR",
      status: 'pending',
      metadata: {
        materialTitle: material.title,
        materialSubjectCode: material.subjectCode,
        paymentLinkId: paymentLink.id,
        paymentMethod: 'upi_qr'
      }
    });

    res.status(200).json({
      paymentLinkId: paymentLink.id,
      shortUrl: paymentLink.short_url,
      qrCode: paymentLink.qr_code, // QR code image URL
      amount: paymentLink.amount,
      currency: paymentLink.currency,
      orderId: orderId,
      paymentId: payment.id
    });
  } catch (error) {
    console.error("Error creating payment link:", error);
    const message = error?.error?.description || error?.message || String(error);
    res.status(500).json({ 
      error: "Failed to create payment link",
      details: message
    });
  }
});

// Create Razorpay order for material purchase (supports guest checkout - NO auth required)
router.post("/create-order", async (req, res) => {
  try {
    if (!razorpayInstance) {
      console.warn("Razorpay not configured - order creation failed");
      console.warn("⚠️ Check if RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are set in backend/.env");
      console.warn("⚠️ Current env check:", {
        hasKeyId: !!process.env.RAZORPAY_KEY_ID,
        hasKeySecret: !!process.env.RAZORPAY_KEY_SECRET,
        keyIdLength: process.env.RAZORPAY_KEY_ID?.length || 0,
        keySecretLength: process.env.RAZORPAY_KEY_SECRET?.length || 0
      });
      return res.status(503).json({ 
        error: "Payment service is not configured. Please contact administrator.",
        code: "PAYMENT_NOT_CONFIGURED",
        details: "Razorpay credentials are missing. Please configure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env and restart the server"
      });
    }

    const { materialId, guestId } = req.body;
    let userId = null;
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      const secret = process.env.JWT_SECRET;
      if (token && secret) {
        const jwt = await import('jsonwebtoken');
        const User = (await import('../models/User.js')).default;
        const decoded = jwt.default.verify(token, secret);
        const user = await User.findById(decoded.userId) || await User.findOne({ id: decoded.userId });
        if (user) userId = user.id || user._id;
      }
    } catch (_) { /* optional auth - ignore */ }
    const effectiveGuestId = guestId || null;

    if (!materialId) {
      return res.status(400).json({ error: "Material ID is required" });
    }
    if (!userId && !effectiveGuestId) {
      return res.status(400).json({ error: "Provide guestId in request body for guest checkout" });
    }

    // Fetch the material
    const material = await Material.findById(materialId);
    if (!material) {
      return res.status(404).json({ error: "Material not found" });
    }

    // Check if material is paid
    if (material.accessType !== 'paid') {
      return res.status(400).json({ 
        error: "This material is not a paid material" 
      });
    }

    const purchaseQuery = userId
      ? { userId, materialId }
      : { guestId: effectiveGuestId, materialId };

    const existingPayment = await Payment.findOne({
      ...purchaseQuery,
      status: 'completed'
    });

    if (existingPayment) {
      return res.status(400).json({ 
        error: "You have already purchased this material",
        alreadyPurchased: true
      });
    }

    const pendingPayment = await Payment.findOne({
      ...purchaseQuery,
      status: 'pending'
    });

    if (pendingPayment) {
      // Return existing order details
      return res.status(200).json({
        orderId: pendingPayment.razorpayOrderId,
        amount: pendingPayment.amount,
        currency: pendingPayment.currency,
        keyId: process.env.RAZORPAY_KEY_ID
      });
    }

    const price = Number(material.price) || 0;
    const amountInPaise = Math.round(price * 100);

    if (amountInPaise <= 0 || !Number.isInteger(amountInPaise)) {
      return res.status(400).json({ 
        error: "Invalid material price",
        details: `Price must be greater than 0. Received: ${price}, Converted: ${amountInPaise}`
      });
    }

    // Validate amount is within Razorpay limits (minimum 1 INR = 100 paise)
    if (amountInPaise < 100) {
      return res.status(400).json({ 
        error: "Amount too small",
        details: "Minimum payment amount is ₹1.00 (100 paise)"
      });
    }

    const shortMaterialId = (materialId ?? '').toString().substring(0, 8);
    const shortId = (userId || effectiveGuestId || '').toString().substring(0, 8);
    const timestamp = Date.now().toString().slice(-8);
    const receipt = `mat_${shortMaterialId}_${shortId}_${timestamp}`.substring(0, 40);
    
    const notes = {
      materialId: (materialId ?? '').toString(),
      materialTitle: (material.title || '').substring(0, 100),
      ...(userId && { userId: String(userId) }),
      ...(effectiveGuestId && { guestId: String(effectiveGuestId) }),
    };
    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt,
      notes,
    };

    console.log('Creating Razorpay order:', {
      amount: amountInPaise,
      currency: options.currency,
      receipt: receipt,
      materialId: materialId
    });

    let order;
    try {
      order = await razorpayInstance.orders.create(options);
      
      // Validate order response
      if (!order || !order.id) {
        console.error('❌ Invalid order response from Razorpay:', order);
        return res.status(500).json({
          error: 'Invalid order response from payment gateway',
          details: 'Order creation succeeded but received invalid response'
        });
      }

      // Ensure order amount matches what we sent
      if (order.amount !== amountInPaise) {
        console.warn('⚠️ Order amount mismatch:', {
          expected: amountInPaise,
          received: order.amount
        });
      }

      console.log('✅ Razorpay order created successfully:', {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        status: order.status,
        receipt: order.receipt
      });
    } catch (razorpayError) {
      console.error('❌ Razorpay order creation failed:', razorpayError?.error || razorpayError);
      const isAuth = razorpayError?.statusCode === 401 || razorpayError?.error?.code === 'BAD_REQUEST_ERROR';
      const desc = razorpayError?.error?.description || razorpayError?.message || 'Unknown error';
      return res.status(isAuth ? 500 : 400).json({
        error: isAuth ? 'Razorpay authentication failed' : (razorpayError?.error?.description || 'Failed to create payment order'),
        details: isAuth
          ? 'Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env'
          : desc,
        code: razorpayError?.error?.code || 'ORDER_CREATION_FAILED'
      });
    }

    const payment = await Payment.create({
      userId: userId || undefined,
      guestId: effectiveGuestId || undefined,
      materialId,
      razorpayOrderId: order.id,
      amount: amountInPaise,
      currency: "INR",
      status: 'pending',
      metadata: {
        materialTitle: material.title,
        materialSubjectCode: material.subjectCode
      }
    });

    console.log('✅ Payment record created:', {
      paymentId: payment.id,
      orderId: order.id,
      materialId,
      userId
    });

    // Validate and sanitize key ID before sending
    const keyId = process.env.RAZORPAY_KEY_ID?.trim();
    if (!keyId) {
      return res.status(500).json({ 
        error: "Razorpay key ID is not configured",
        details: "Please set RAZORPAY_KEY_ID in backend/.env"
      });
    }

    // Ensure key format is correct
    if (!keyId.startsWith('rzp_live_') && !keyId.startsWith('rzp_test_')) {
      console.error('⚠️ Invalid Razorpay key format:', keyId.substring(0, 20) + '...');
      return res.status(500).json({ 
        error: "Invalid Razorpay key format",
        details: "Key must start with rzp_live_ or rzp_test_"
      });
    }

    // Verify order status before returning (important for v2 API)
    if (order.status !== 'created') {
      console.warn('⚠️ Order status is not "created":', order.status);
    }

    // Double-check order is valid before sending to frontend
    if (!order.id || order.status !== 'created') {
      console.error('❌ Order validation failed:', {
        hasId: !!order.id,
        status: order.status,
        expectedStatus: 'created'
      });
      return res.status(500).json({
        error: 'Order validation failed',
        details: `Order status is ${order.status}, expected 'created'`
      });
    }

    // Return order details with all required information
    const responseData = {
      orderId: order.id,
      amount: order.amount, // Already in paise
      currency: order.currency || 'INR',
      keyId: keyId,
      paymentId: payment.id,
      orderStatus: order.status, // Include status for debugging
      receipt: order.receipt // Include receipt for reference
    };

    console.log('📤 Sending order response to frontend:', {
      orderId: responseData.orderId,
      orderIdLength: responseData.orderId.length,
      amount: responseData.amount,
      amountInRupees: (responseData.amount / 100).toFixed(2),
      currency: responseData.currency,
      orderStatus: responseData.orderStatus,
      keyIdPrefix: responseData.keyId.substring(0, 12) + '...',
      keyIdLength: responseData.keyId.length
    });

    res.status(200).json(responseData);
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    res.status(500).json({ 
      error: "Failed to create payment order",
      details: error.message 
    });
  }
});

// Verify payment and update payment status (works for both logged-in and guest)
router.post("/verify-payment", authenticateOptional, async (req, res) => {
  try {
    if (!razorpayInstance) {
      return res.status(503).json({ 
        error: "Payment service is not configured" 
      });
    }

    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ 
        error: "Payment verification data is required" 
      });
    }

    const payment = await Payment.findOne({ razorpayOrderId });

    if (!payment) {
      return res.status(404).json({ error: "Payment record not found" });
    }

    if (payment.status === 'completed') {
      return res.status(200).json({ 
        success: true,
        message: "Payment already verified",
        payment: payment.toJSON()
      });
    }

    // Verify the signature
    const text = `${razorpayOrderId}|${razorpayPaymentId}`;
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(text)
      .digest("hex");

    if (generatedSignature !== razorpaySignature) {
      // Update payment status to failed
      await Payment.findOneAndUpdate(
        { razorpayOrderId },
        { 
          status: 'failed',
          razorpayPaymentId,
          razorpaySignature
        }
      );

      return res.status(400).json({ 
        error: "Payment verification failed: Invalid signature" 
      });
    }

    // Verify with Razorpay API
    try {
      const razorpayPayment = await razorpayInstance.payments.fetch(razorpayPaymentId);
      
      if (razorpayPayment.status !== 'captured' && razorpayPayment.status !== 'authorized') {
        await Payment.findOneAndUpdate(
          { razorpayOrderId },
          { 
            status: 'failed',
            razorpayPaymentId,
            razorpaySignature
          }
        );

        return res.status(400).json({ 
          error: `Payment not successful. Status: ${razorpayPayment.status}` 
        });
      }

      // Update payment record
      const updatedPayment = await Payment.findOneAndUpdate(
        { razorpayOrderId },
        { 
          status: 'completed',
          razorpayPaymentId,
          razorpaySignature,
          paymentMethod: razorpayPayment.method || null
        }
      );

      if (updatedPayment && updatedPayment.userId) {
        const material = await Material.findById(updatedPayment.materialId);
        if (material && material.accessType === 'paid') {
          try {
            await DownloadToken.create({
              userId: updatedPayment.userId,
              materialId: updatedPayment.materialId,
              paymentId: updatedPayment.id,
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
            });
          } catch (tokenError) {
            console.error("⚠️ Failed to generate download token:", tokenError);
          }
        }
      }

      res.status(200).json({
        success: true,
        message: "Payment verified successfully",
        payment: updatedPayment.toJSON()
      });
    } catch (razorpayError) {
      console.error("Razorpay API verification error:", razorpayError);
      return res.status(500).json({ 
        error: "Failed to verify payment with Razorpay",
        details: razorpayError.message 
      });
    }
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({ 
      error: "Failed to verify payment",
      details: error.message 
    });
  }
});

// Check if user or guest has purchased a material (NO auth required - public endpoint)
router.get("/check-purchase/:materialId", async (req, res) => {
  try {
    const { materialId } = req.params;
    const guestId = req.query.guestId;

    let userId = null;
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      const secret = process.env.JWT_SECRET;
      if (token && secret) {
        const jwt = await import('jsonwebtoken');
        const User = (await import('../models/User.js')).default;
        const decoded = jwt.default.verify(token, secret);
        const user = await User.findById(decoded.userId) || await User.findOne({ id: decoded.userId });
        if (user) userId = user.id || user._id;
      }
    } catch (_) { /* optional - ignore */ }

    if (userId) {
      const payment = await Payment.findOne({
        userId,
        materialId,
        status: 'completed'
      });
      return res.status(200).json({
        hasPurchased: !!payment,
        payment: payment ? payment.toJSON() : null
      });
    }
    if (!guestId) {
      return res.status(200).json({ hasPurchased: false, payment: null });
    }

    const payment = await Payment.findOne({
      guestId,
      materialId,
      status: 'completed'
    });

    res.status(200).json({
      hasPurchased: !!payment,
      payment: payment ? payment.toJSON() : null
    });
  } catch (error) {
    console.error("Error checking purchase:", error);
    res.status(500).json({ 
      error: "Failed to check purchase status",
      details: error.message 
    });
  }
});

// Get user's purchase history
router.get("/my-purchases", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const payments = await Payment.find({
      userId,
      status: 'completed'
    }, {
      sort: { createdAt: -1 },
      limit: 100
    });

    // Fetch material details for each purchase
    const purchasesWithMaterials = await Promise.all(
      payments.map(async (payment) => {
        const material = await Material.findById(payment.materialId);
        return {
          payment: payment.toJSON(),
          material: material ? material.toJSON() : null
        };
      })
    );

    res.status(200).json({
      purchases: purchasesWithMaterials
    });
  } catch (error) {
    console.error("Error fetching purchase history:", error);
    res.status(500).json({ 
      error: "Failed to fetch purchase history",
      details: error.message 
    });
  }
});

// Razorpay Webhook endpoint (for payment verification)
// This endpoint should be configured in Razorpay Dashboard
// URL: https://yourdomain.com/api/payments/webhook
router.post("/webhook", express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    if (!razorpayInstance) {
      console.error("❌ Razorpay not initialized, cannot process webhook");
      return res.status(503).json({ error: "Payment service not configured" });
    }

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];
    const webhookBody = req.body;

    // Webhook secret is optional - only verify signature if both secret and signature are provided
    // In development, webhooks may not be configured, which is fine
    if (webhookSecret && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(webhookBody.toString())
        .digest('hex');

      if (signature !== expectedSignature) {
        console.error("❌ Invalid webhook signature");
        return res.status(400).json({ error: "Invalid signature" });
      }
      console.log("✅ Webhook signature verified");
    } else if (!webhookSecret) {
      console.warn("⚠️ RAZORPAY_WEBHOOK_SECRET not set - webhook signature verification skipped (OK for development)");
    } else {
      console.warn("⚠️ Webhook signature header missing - verification skipped");
    }

    const event = JSON.parse(webhookBody.toString());
    console.log(`📥 Webhook event received: ${event.event}`);

    // Handle payment_link.paid event (for UPI QR code payments)
    if (event.event === 'payment_link.paid') {
      const paymentLinkData = event.payload.payment_link.entity;
      const paymentLinkId = paymentLinkData.id;
      const paymentId = paymentLinkData.payments?.[0]?.id;

      console.log(`💰 Payment Link Paid - Link ID: ${paymentLinkId}, Payment ID: ${paymentId}`);

      // Find the payment record by payment link ID
      const payment = await Payment.findOne({ 
        'metadata.paymentLinkId': paymentLinkId 
      });

      if (!payment) {
        console.error(`❌ Payment record not found for payment link: ${paymentLinkId}`);
        return res.status(200).json({ received: true }); // Still return 200
      }

      // Verify payment with Razorpay API
      try {
        if (paymentId) {
          const razorpayPayment = await razorpayInstance.payments.fetch(paymentId);
          
          if (razorpayPayment.status === 'captured' || razorpayPayment.status === 'authorized') {
            // Update payment status
            await Payment.findOneAndUpdate(
              { 'metadata.paymentLinkId': paymentLinkId },
              {
                status: 'completed',
                razorpayPaymentId: paymentId,
                razorpaySignature: razorpayPayment.signature || null,
                paymentMethod: razorpayPayment.method || 'upi'
              }
            );

            if (payment.userId) {
              const material = await Material.findById(payment.materialId);
              if (material && material.accessType === 'paid') {
                try {
                  await DownloadToken.create({
                    userId: payment.userId,
                    materialId: payment.materialId,
                    paymentId: payment.id,
                    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
                  });
                } catch (e) { /* ignore */ }
              }
            }
            console.log(`✅ Payment verified via payment link - Link: ${paymentLinkId}`);
          }
        }
      } catch (razorpayError) {
        console.error("❌ Error verifying payment with Razorpay:", razorpayError);
      }
    }
    // Handle payment.captured event (for regular checkout payments)
    else if (event.event === 'payment.captured') {
      const paymentData = event.payload.payment.entity;
      const orderId = paymentData.order_id;
      const paymentLinkId = paymentData.notes?.payment_link_id || paymentData.notes?.paymentLinkId;

      console.log(`💰 Payment captured - Order ID: ${orderId}, Payment ID: ${paymentData.id}, Payment Link ID: ${paymentLinkId || 'N/A'}`);

      // Find the payment record by order ID or payment link ID
      let payment = await Payment.findOne({ razorpayOrderId: orderId });
      
      // If not found by order ID, try to find by payment link ID in metadata
      if (!payment && paymentLinkId) {
        payment = await Payment.findOne({ 
          'metadata.paymentLinkId': paymentLinkId 
        });
      }

      if (!payment) {
        console.error(`❌ Payment record not found for order: ${orderId}`);
        return res.status(404).json({ error: "Payment record not found" });
      }

      // Verify payment with Razorpay API
      try {
        const razorpayPayment = await razorpayInstance.payments.fetch(paymentData.id);
        
        if (razorpayPayment.status === 'captured' || razorpayPayment.status === 'authorized') {
          // Update payment status
          await Payment.findOneAndUpdate(
            { razorpayOrderId: orderId },
            {
              status: 'completed',
              razorpayPaymentId: paymentData.id,
              razorpaySignature: paymentData.signature || null,
              paymentMethod: razorpayPayment.method || null
            }
          );

          if (payment.userId) {
            const material = await Material.findById(payment.materialId);
            if (material && material.accessType === 'paid') {
              try {
                await DownloadToken.create({
                  userId: payment.userId,
                  materialId: payment.materialId,
                  paymentId: payment.id,
                  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
                });
              } catch (e) { /* ignore */ }
            }
          }

          console.log(`✅ Payment verified and completed via webhook - Order: ${orderId}`);
        } else {
          console.warn(`⚠️ Payment not captured - Status: ${razorpayPayment.status}`);
          await Payment.findOneAndUpdate(
            { razorpayOrderId: orderId },
            { status: 'failed' }
          );
        }
      } catch (razorpayError) {
        console.error("❌ Error verifying payment with Razorpay:", razorpayError);
        return res.status(500).json({ error: "Failed to verify payment" });
      }
    }

    // Always return 200 to acknowledge receipt
    res.status(200).json({ received: true });
  } catch (error) {
    console.error("❌ Webhook processing error:", error);
    // Still return 200 to prevent Razorpay from retrying
    res.status(200).json({ error: "Webhook processing failed", details: error.message });
  }
});

// Generate secure download link for purchased material
router.post("/generate-download-link", authenticateToken, async (req, res) => {
  try {
    const { materialId } = req.body;
    const userId = req.user.id;

    if (!materialId) {
      return res.status(400).json({ error: "Material ID is required" });
    }

    // Verify user has purchased the material
    const payment = await Payment.findOne({
      userId,
      materialId,
      status: 'completed'
    });

    if (!payment) {
      return res.status(403).json({ 
        error: "You must purchase this material before downloading",
        requiresPayment: true
      });
    }

    // Check if there's a valid existing token
    let downloadToken = await DownloadToken.findValidTokenForUser(userId, materialId);

    if (!downloadToken) {
      // Generate new token
      downloadToken = await DownloadToken.create({
        userId,
        materialId,
        paymentId: payment.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      });
    }

    // Generate secure download URL
    const baseUrl = process.env.FRONTEND_URL || req.protocol + '://' + req.get('host');
    const downloadUrl = `${baseUrl}/api/materials/secure-download/${downloadToken.token}`;

    res.status(200).json({
      downloadUrl,
      expiresAt: downloadToken.expiresAt,
      token: downloadToken.token
    });
  } catch (error) {
    console.error("Error generating download link:", error);
    res.status(500).json({ 
      error: "Failed to generate download link",
      details: error.message 
    });
  }
});

export default router;
