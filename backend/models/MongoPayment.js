import mongoose from 'mongoose';
import { isMongoReady } from '../lib/mongodb.js';

const paymentSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  materialId: { type: String, required: true, index: true },
  razorpayOrderId: { type: String, required: true, unique: true, index: true },
  razorpayPaymentId: { type: String, default: null, index: true },
  razorpaySignature: { type: String, default: null },
  amount: { type: Number, required: true }, // Amount in paise (smallest currency unit)
  currency: { type: String, default: 'INR' },
  status: { 
    type: String, 
    enum: ['pending', 'completed', 'failed', 'refunded'], 
    default: 'pending',
    index: true 
  },
  paymentMethod: { type: String, default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, {
  timestamps: true
});

// Compound index for efficient queries
paymentSchema.index({ userId: 1, materialId: 1 });
paymentSchema.index({ razorpayOrderId: 1, status: 1 });

const PaymentModel = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);

class MongoPayment {
  constructor(data) {
    this._id = data._id?.toString();
    this.id = this._id;
    this.userId = data.userId;
    this.materialId = data.materialId;
    this.razorpayOrderId = data.razorpayOrderId;
    this.razorpayPaymentId = data.razorpayPaymentId || null;
    this.razorpaySignature = data.razorpaySignature || null;
    this.amount = data.amount;
    this.currency = data.currency || 'INR';
    this.status = data.status || 'pending';
    this.paymentMethod = data.paymentMethod || null;
    this.metadata = data.metadata || {};
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static async create(paymentData) {
    if (!isMongoReady) {
      throw new Error('MongoDB is not ready. Cannot create payment.');
    }

    try {
      const payment = await PaymentModel.create({
        userId: paymentData.userId,
        materialId: paymentData.materialId,
        razorpayOrderId: paymentData.razorpayOrderId,
        razorpayPaymentId: paymentData.razorpayPaymentId || null,
        razorpaySignature: paymentData.razorpaySignature || null,
        amount: paymentData.amount,
        currency: paymentData.currency || 'INR',
        status: paymentData.status || 'pending',
        paymentMethod: paymentData.paymentMethod || null,
        metadata: paymentData.metadata || {}
      });

      return new MongoPayment(payment.toObject());
    } catch (error) {
      console.error('MongoDB payment create error:', error);
      throw error;
    }
  }

  static async findById(id) {
    if (!isMongoReady) {
      return null;
    }

    try {
      const payment = await PaymentModel.findById(id);
      return payment ? new MongoPayment(payment.toObject()) : null;
    } catch (error) {
      console.error('MongoDB payment findById error:', error);
      return null;
    }
  }

  static async findOne(query) {
    if (!isMongoReady) {
      return null;
    }

    try {
      const payment = await PaymentModel.findOne(query);
      return payment ? new MongoPayment(payment.toObject()) : null;
    } catch (error) {
      console.error('MongoDB payment findOne error:', error);
      return null;
    }
  }

  static async find(query = {}, options = {}) {
    if (!isMongoReady) {
      return [];
    }

    try {
      let mongoQuery = PaymentModel.find(query);
      
      if (options.sort) {
        mongoQuery = mongoQuery.sort(options.sort);
      } else {
        mongoQuery = mongoQuery.sort({ createdAt: -1 });
      }

      if (options.limit) {
        mongoQuery = mongoQuery.limit(options.limit);
      }

      const payments = await mongoQuery.exec();
      return payments.map(p => new MongoPayment(p.toObject()));
    } catch (error) {
      console.error('MongoDB payment find error:', error);
      return [];
    }
  }

  static async findByIdAndUpdate(id, updates) {
    if (!isMongoReady) {
      return null;
    }

    try {
      const payment = await PaymentModel.findByIdAndUpdate(
        id,
        { $set: { ...updates, updatedAt: new Date() } },
        { new: true, runValidators: true }
      );
      return payment ? new MongoPayment(payment.toObject()) : null;
    } catch (error) {
      console.error('MongoDB payment findByIdAndUpdate error:', error);
      return null;
    }
  }

  static async findOneAndUpdate(query, updates) {
    if (!isMongoReady) {
      return null;
    }

    try {
      const payment = await PaymentModel.findOneAndUpdate(
        query,
        { $set: { ...updates, updatedAt: new Date() } },
        { new: true, runValidators: true }
      );
      return payment ? new MongoPayment(payment.toObject()) : null;
    } catch (error) {
      console.error('MongoDB payment findOneAndUpdate error:', error);
      return null;
    }
  }

  async save() {
    if (!isMongoReady) {
      throw new Error('MongoDB is not ready');
    }

    try {
      const updated = await PaymentModel.findByIdAndUpdate(
        this.id,
        { 
          $set: {
            userId: this.userId,
            materialId: this.materialId,
            razorpayOrderId: this.razorpayOrderId,
            razorpayPaymentId: this.razorpayPaymentId,
            razorpaySignature: this.razorpaySignature,
            amount: this.amount,
            currency: this.currency,
            status: this.status,
            paymentMethod: this.paymentMethod,
            metadata: this.metadata,
            updatedAt: new Date()
          }
        },
        { new: true, runValidators: true }
      );
      
      if (updated) {
        Object.assign(this, updated.toObject());
        return this;
      }
      throw new Error('Payment not found');
    } catch (error) {
      console.error('MongoDB payment save error:', error);
      throw error;
    }
  }

  toJSON() {
    return {
      id: this.id,
      _id: this.id,
      userId: this.userId,
      materialId: this.materialId,
      razorpayOrderId: this.razorpayOrderId,
      razorpayPaymentId: this.razorpayPaymentId,
      razorpaySignature: this.razorpaySignature,
      amount: this.amount,
      currency: this.currency,
      status: this.status,
      paymentMethod: this.paymentMethod,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export default MongoPayment;

