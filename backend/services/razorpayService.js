import Razorpay from 'razorpay';
import crypto from 'crypto';

class RazorpayService {
  constructor() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    
    if (!keyId || !keySecret) {
      console.warn('⚠️ Razorpay credentials not found. Payment features will be disabled.');
      this.razorpay = null;
    } else {
      this.razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret
      });
      console.log('✅ Razorpay initialized successfully');
    }
  }

  // Create an order for material purchase
  async createOrder(amount, currency = 'INR', receipt, notes = {}) {
    if (!this.razorpay) {
      throw new Error('Razorpay is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in environment variables.');
    }

    try {
      const options = {
        amount: amount * 100, // Convert to paise (Razorpay expects amount in smallest currency unit)
        currency: currency,
        receipt: receipt || `receipt_${Date.now()}`,
        notes: notes
      };

      const order = await this.razorpay.orders.create(options);
      return {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        status: order.status
      };
    } catch (error) {
      console.error('Error creating Razorpay order:', error);
      throw error;
    }
  }

  // Verify payment signature
  verifyPayment(orderId, paymentId, signature) {
    if (!this.razorpay) {
      throw new Error('Razorpay is not configured.');
    }

    try {
      const text = `${orderId}|${paymentId}`;
      const generatedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(text)
        .digest('hex');

      return generatedSignature === signature;
    } catch (error) {
      console.error('Error verifying payment signature:', error);
      return false;
    }
  }

  // Fetch payment details
  async getPayment(paymentId) {
    if (!this.razorpay) {
      throw new Error('Razorpay is not configured.');
    }

    try {
      const payment = await this.razorpay.payments.fetch(paymentId);
      return payment;
    } catch (error) {
      console.error('Error fetching payment:', error);
      throw error;
    }
  }

  // Refund payment
  async refundPayment(paymentId, amount = null, notes = {}) {
    if (!this.razorpay) {
      throw new Error('Razorpay is not configured.');
    }

    try {
      const refundOptions = {
        payment_id: paymentId,
        ...(amount && { amount: amount * 100 }), // Convert to paise if amount specified
        ...(Object.keys(notes).length > 0 && { notes })
      };

      const refund = await this.razorpay.payments.refund(paymentId, refundOptions);
      return refund;
    } catch (error) {
      console.error('Error processing refund:', error);
      throw error;
    }
  }

  // Check if Razorpay is configured
  isConfigured() {
    return this.razorpay !== null;
  }
}

export default new RazorpayService();

