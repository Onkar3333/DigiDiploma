import mongoose from 'mongoose';
import { isMongoReady } from '../lib/mongodb.js';
import crypto from 'crypto';

const downloadTokenSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  materialId: { type: String, required: true, index: true },
  paymentId: { type: String, default: null, index: true }, // Link to payment record
  expiresAt: { type: Date, required: true, index: true },
  used: { type: Boolean, default: false, index: true },
  usedAt: { type: Date, default: null },
  ipAddress: { type: String, default: null },
  userAgent: { type: String, default: null }
}, {
  timestamps: true
});

// Compound index for efficient queries
downloadTokenSchema.index({ userId: 1, materialId: 1, used: 1 });
downloadTokenSchema.index({ token: 1, used: 1, expiresAt: 1 });

// Auto-delete expired tokens (using TTL index)
downloadTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const DownloadTokenModel = mongoose.models.DownloadToken || mongoose.model('DownloadToken', downloadTokenSchema);

class MongoDownloadToken {
  constructor(data) {
    this._id = data._id?.toString();
    this.id = this._id;
    this.token = data.token;
    this.userId = data.userId;
    this.materialId = data.materialId;
    this.paymentId = data.paymentId || null;
    this.expiresAt = data.expiresAt;
    this.used = data.used || false;
    this.usedAt = data.usedAt || null;
    this.ipAddress = data.ipAddress || null;
    this.userAgent = data.userAgent || null;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  static async create(tokenData) {
    if (!isMongoReady) {
      throw new Error('MongoDB is not ready. Cannot create download token.');
    }

    try {
      // Default expiration: 24 hours from now
      const expiresAt = tokenData.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      const token = await DownloadTokenModel.create({
        token: tokenData.token || this.generateToken(),
        userId: tokenData.userId,
        materialId: tokenData.materialId,
        paymentId: tokenData.paymentId || null,
        expiresAt: expiresAt,
        used: false,
        ipAddress: tokenData.ipAddress || null,
        userAgent: tokenData.userAgent || null
      });

      return new MongoDownloadToken(token.toObject());
    } catch (error) {
      console.error('MongoDB download token create error:', error);
      throw error;
    }
  }

  static async findByToken(token) {
    if (!isMongoReady) {
      return null;
    }

    try {
      const tokenDoc = await DownloadTokenModel.findOne({ token, used: false });
      if (!tokenDoc) {
        return null;
      }

      // Check if token is expired
      if (new Date() > tokenDoc.expiresAt) {
        return null;
      }

      return new MongoDownloadToken(tokenDoc.toObject());
    } catch (error) {
      console.error('MongoDB download token findByToken error:', error);
      return null;
    }
  }

  static async findOne(query) {
    if (!isMongoReady) {
      return null;
    }

    try {
      const tokenDoc = await DownloadTokenModel.findOne(query);
      return tokenDoc ? new MongoDownloadToken(tokenDoc.toObject()) : null;
    } catch (error) {
      console.error('MongoDB download token findOne error:', error);
      return null;
    }
  }

  static async markAsUsed(token, ipAddress = null, userAgent = null) {
    if (!isMongoReady) {
      return null;
    }

    try {
      const tokenDoc = await DownloadTokenModel.findOneAndUpdate(
        { token, used: false },
        { 
          $set: { 
            used: true, 
            usedAt: new Date(),
            ipAddress: ipAddress || null,
            userAgent: userAgent || null,
            updatedAt: new Date()
          }
        },
        { new: true }
      );
      return tokenDoc ? new MongoDownloadToken(tokenDoc.toObject()) : null;
    } catch (error) {
      console.error('MongoDB download token markAsUsed error:', error);
      return null;
    }
  }

  static async findValidTokenForUser(userId, materialId) {
    if (!isMongoReady) {
      return null;
    }

    try {
      const tokenDoc = await DownloadTokenModel.findOne({
        userId,
        materialId,
        used: false,
        expiresAt: { $gt: new Date() }
      }).sort({ createdAt: -1 }); // Get the most recent valid token

      return tokenDoc ? new MongoDownloadToken(tokenDoc.toObject()) : null;
    } catch (error) {
      console.error('MongoDB download token findValidTokenForUser error:', error);
      return null;
    }
  }

  toJSON() {
    return {
      id: this.id,
      _id: this.id,
      token: this.token,
      userId: this.userId,
      materialId: this.materialId,
      paymentId: this.paymentId,
      expiresAt: this.expiresAt,
      used: this.used,
      usedAt: this.usedAt,
      ipAddress: this.ipAddress,
      userAgent: this.userAgent,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export default MongoDownloadToken;

