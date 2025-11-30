import mongoose from 'mongoose';
import { isMongoReady } from '../lib/mongodb.js';

const noticeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  type: { type: String, default: 'general', index: true },
  priority: { type: String, default: 'medium', index: true },
  targetAudience: { type: String, default: 'all', index: true },
  targetBranch: { type: String, default: null, index: true },
  isPinned: { type: Boolean, default: false, index: true },
  isActive: { type: Boolean, default: true, index: true },
  expiresAt: { type: Date, default: null },
  attachments: { type: [String], default: [] },
  tags: { type: [String], default: [] },
  createdBy: { type: String, default: null, index: true },
  readBy: { 
    type: [{
      user: { type: String, required: true },
      readAt: { type: Date, default: Date.now }
    }], 
    default: [] 
  },
  views: { type: Number, default: 0 }
}, {
  timestamps: true
});

// Indexes for efficient queries
noticeSchema.index({ isPinned: -1, createdAt: -1 });
noticeSchema.index({ targetAudience: 1, targetBranch: 1, isActive: 1 });

const NoticeModel = mongoose.models.Notice || mongoose.model('Notice', noticeSchema);

class MongoNotice {
  constructor(data) {
    this._id = data._id?.toString();
    this.id = this._id;
    this.title = data.title;
    this.content = data.content;
    this.type = data.type || 'general';
    this.priority = data.priority || 'medium';
    this.targetAudience = data.targetAudience || 'all';
    this.targetBranch = data.targetBranch || null;
    this.isPinned = data.isPinned || false;
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.expiresAt = data.expiresAt || null;
    this.attachments = data.attachments || [];
    this.tags = data.tags || [];
    this.createdBy = data.createdBy || null;
    this.readBy = Array.isArray(data.readBy) ? data.readBy : [];
    this.views = data.views || 0;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static async create(noticeData) {
    if (!isMongoReady) {
      throw new Error('MongoDB is not ready. Cannot create notice.');
    }

    try {
      const notice = await NoticeModel.create({
        title: noticeData.title,
        content: noticeData.content,
        type: noticeData.type || 'general',
        priority: noticeData.priority || 'medium',
        targetAudience: noticeData.targetAudience || 'all',
        targetBranch: noticeData.targetBranch || null,
        isPinned: noticeData.isPinned || false,
        isActive: noticeData.isActive !== false,
        expiresAt: noticeData.expiresAt || null,
        attachments: noticeData.attachments || [],
        tags: noticeData.tags || [],
        createdBy: noticeData.createdBy || null,
      });

      return new MongoNotice(notice.toObject());
    } catch (error) {
      console.error('MongoDB notice create error:', error);
      throw error;
    }
  }

  static async findById(id) {
    if (!isMongoReady) {
      return null;
    }

    try {
      const notice = await NoticeModel.findById(id);
      return notice ? new MongoNotice(notice.toObject()) : null;
    } catch (error) {
      console.error('MongoDB notice findById error:', error);
      return null;
    }
  }

  static async find(query = {}, options = {}) {
    if (!isMongoReady) {
      return [];
    }

    try {
      let mongoQuery = NoticeModel.find(query);
      
      if (options.sort) {
        mongoQuery = mongoQuery.sort(options.sort);
      } else {
        mongoQuery = mongoQuery.sort({ isPinned: -1, createdAt: -1 });
      }

      if (options.limit) {
        mongoQuery = mongoQuery.limit(options.limit);
      }

      const notices = await mongoQuery.exec();
      return notices.map(n => new MongoNotice(n.toObject()));
    } catch (error) {
      console.error('MongoDB notice find error:', error);
      return [];
    }
  }

  static async findOne(query) {
    if (!isMongoReady) {
      return null;
    }

    try {
      const notice = await NoticeModel.findOne(query);
      return notice ? new MongoNotice(notice.toObject()) : null;
    } catch (error) {
      console.error('MongoDB notice findOne error:', error);
      return null;
    }
  }

  async save() {
    if (!isMongoReady) {
      throw new Error('MongoDB is not ready');
    }

    try {
      const updated = await NoticeModel.findByIdAndUpdate(
        this.id,
        { $set: { ...this, id: undefined, _id: undefined, updatedAt: new Date() } },
        { new: true, runValidators: true }
      );
      
      if (updated) {
        Object.assign(this, updated.toObject());
        return this;
      }
      throw new Error('Notice not found');
    } catch (error) {
      console.error('MongoDB notice save error:', error);
      throw error;
    }
  }

  async delete() {
    if (!isMongoReady) {
      throw new Error('MongoDB is not ready');
    }

    try {
      await NoticeModel.findByIdAndDelete(this.id);
      return true;
    } catch (error) {
      console.error('MongoDB notice delete error:', error);
      throw error;
    }
  }

  static async findByIdAndDelete(id) {
    if (!isMongoReady) {
      return null;
    }

    try {
      const notice = await NoticeModel.findByIdAndDelete(id);
      return notice ? new MongoNotice(notice.toObject()) : null;
    } catch (error) {
      console.error('MongoDB notice findByIdAndDelete error:', error);
      return null;
    }
  }

  async markAsRead(userId) {
    if (!isMongoReady) {
      throw new Error('MongoDB is not ready');
    }

    try {
      // Check if user already marked as read
      const notice = await NoticeModel.findById(this.id);
      if (!notice) {
        throw new Error('Notice not found');
      }

      const readBy = notice.readBy || [];
      const existingIndex = readBy.findIndex(entry => 
        (entry.user?.toString?.() || entry.user) === userId
      );

      if (existingIndex === -1) {
        // Add user to readBy array
        readBy.push({ 
          user: userId, 
          readAt: new Date() 
        });
        
        await NoticeModel.findByIdAndUpdate(
          this.id,
          { 
            $set: { 
              readBy,
              updatedAt: new Date()
            } 
          },
          { new: true }
        );
        
        // Update local instance
        this.readBy = readBy;
      }
      
      return this;
    } catch (error) {
      console.error('MongoDB notice markAsRead error:', error);
      throw error;
    }
  }

  toJSON() {
    return {
      id: this.id,
      _id: this.id,
      title: this.title,
      content: this.content,
      type: this.type,
      priority: this.priority,
      targetAudience: this.targetAudience,
      targetBranch: this.targetBranch,
      isPinned: this.isPinned,
      isActive: this.isActive,
      expiresAt: this.expiresAt,
      attachments: this.attachments,
      tags: this.tags,
      createdBy: this.createdBy,
      readBy: this.readBy || [],
      views: this.views || 0,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export default MongoNotice;

