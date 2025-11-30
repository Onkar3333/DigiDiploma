import mongoose from 'mongoose';
import { isMongoReady } from '../lib/mongodb.js';

const materialSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { type: String, required: true, enum: ['pdf', 'video', 'notes', 'link'] },
  url: { type: String, default: '' },
  description: { type: String, default: '' },
  subjectId: { type: String, required: true, index: true },
  subjectName: { type: String, default: '' },
  subjectCode: { type: String, required: true, index: true },
  // Support both single branch (legacy) and branches array (new)
  branch: { type: String, default: '', index: true },
  branches: { type: [String], default: [], index: true },
  semester: { type: String, required: true, index: true },
  resourceType: { type: String, default: 'notes', index: true },
  // Access type: 'free', 'drive_protected', 'paid'
  accessType: { type: String, enum: ['free', 'drive_protected', 'paid'], default: 'free', index: true },
  price: { type: Number, default: 0 },
  googleDriveUrl: { type: String, default: null },
  // Storage type: 'r2' or 'local'
  storageType: { type: String, enum: ['r2', 'local'], default: 'r2' },
  tags: { type: [String], default: [] },
  coverPhoto: { type: String, default: null },
  downloads: { type: Number, default: 0 },
  rating: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
  uploadedBy: { type: String, default: null, index: true },
}, {
  timestamps: true
});

// Indexes for efficient queries
materialSchema.index({ subjectCode: 1, branch: 1, semester: 1 });
materialSchema.index({ branches: 1, semester: 1 });
materialSchema.index({ resourceType: 1, accessType: 1 });

const MaterialModel = mongoose.models.Material || mongoose.model('Material', materialSchema);

class MongoMaterial {
  constructor(data) {
    this._id = data._id?.toString();
    this.id = this._id;
    this.title = data.title;
    this.type = data.type;
    this.url = data.url || '';
    this.description = data.description || '';
    this.subjectId = data.subjectId;
    this.subjectName = data.subjectName || '';
    this.subjectCode = data.subjectCode;
    this.branch = data.branch || (data.branches && data.branches[0]) || '';
    this.branches = data.branches || (data.branch ? [data.branch] : []);
    this.semester = data.semester;
    this.resourceType = data.resourceType || 'notes';
    // CRITICAL: Preserve accessType exactly as stored - only default to 'free' if truly missing
    const validTypes = ['free', 'drive_protected', 'paid'];
    if (data.accessType && validTypes.includes(data.accessType)) {
      this.accessType = data.accessType;
    } else {
      // Only default to 'free' if accessType is truly missing or invalid
      this.accessType = 'free';
      if (data.accessType) {
        console.warn(`⚠️ MongoMaterial constructor: Invalid accessType "${data.accessType}", defaulting to 'free'`);
      }
    }
    this.price = data.price || 0;
    this.googleDriveUrl = data.googleDriveUrl || null;
    this.storageType = data.storageType || 'r2';
    this.tags = data.tags || [];
    this.coverPhoto = data.coverPhoto || null;
    this.downloads = data.downloads || 0;
    this.rating = data.rating || 0;
    this.ratingCount = data.ratingCount || 0;
    this.uploadedBy = data.uploadedBy || null;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static async create(materialData) {
    if (!isMongoReady) {
      throw new Error('MongoDB is not ready. Cannot create material.');
    }

    try {
      // Support both single branch (legacy) and branches array (new)
      const branches = materialData.branches || (materialData.branch ? [materialData.branch] : []);
      const branch = materialData.branch || (branches.length > 0 ? branches[0] : '');
      
      // Detect storage type from URL
      const storageType = materialData.storageType || 
                         (materialData.url?.includes('r2.cloudflarestorage.com') || 
                          materialData.url?.includes('/api/materials/proxy/r2/') 
                          ? 'r2' : 'local');

      // CRITICAL: Determine accessType BEFORE creating the material
      const validTypes = ['free', 'drive_protected', 'paid'];
      let finalAccessType = 'free';
      if (materialData.accessType && validTypes.includes(materialData.accessType)) {
        finalAccessType = materialData.accessType;
        console.log(`✅ MongoMaterial.create: Using accessType: "${finalAccessType}"`);
      } else {
        console.warn(`⚠️ MongoMaterial.create: Invalid or missing accessType: "${materialData.accessType}", defaulting to 'free'`);
        console.warn(`⚠️ Material data keys:`, Object.keys(materialData));
      }
      
      // CRITICAL: Explicitly set accessType - don't rely on schema default
      const materialDataForDB = {
        title: materialData.title,
        type: materialData.type,
        url: materialData.url || '',
        description: materialData.description || '',
        subjectId: materialData.subjectId,
        subjectName: materialData.subjectName || '',
        subjectCode: materialData.subjectCode,
        branch: branch,
        branches: branches,
        semester: materialData.semester,
        resourceType: materialData.resourceType || 'notes',
        accessType: finalAccessType, // EXPLICITLY set - don't rely on default
        price: (finalAccessType === 'paid' && materialData.price) ? Number(materialData.price) : 0,
        googleDriveUrl: finalAccessType === 'drive_protected' ? (materialData.googleDriveUrl || null) : null,
        storageType: storageType,
        tags: materialData.tags || [],
        coverPhoto: materialData.coverPhoto || null,
        uploadedBy: materialData.uploadedBy || null,
      };
      
      console.log(`📤 MongoMaterial.create: Creating material with accessType: "${finalAccessType}"`);
      console.log(`📤 MongoMaterial.create: Material data for DB:`, JSON.stringify({
        title: materialDataForDB.title,
        accessType: materialDataForDB.accessType,
        price: materialDataForDB.price,
        googleDriveUrl: materialDataForDB.googleDriveUrl
      }, null, 2));
      
      const material = await MaterialModel.create(materialDataForDB);

      // CRITICAL: Get the raw material object from MongoDB to verify accessType was saved
      const rawMaterial = material.toObject();
      console.log(`✅ MongoMaterial.create: Material saved to DB with accessType: "${rawMaterial.accessType}"`);
      console.log(`✅ MongoMaterial.create: Full raw material from DB:`, JSON.stringify({
        _id: rawMaterial._id,
        title: rawMaterial.title,
        accessType: rawMaterial.accessType,
        price: rawMaterial.price,
        googleDriveUrl: rawMaterial.googleDriveUrl
      }, null, 2));
      
      const createdMaterial = new MongoMaterial(rawMaterial);
      console.log(`✅ MongoMaterial.create: Material object created with accessType: "${createdMaterial.accessType}"`);
      
      if (createdMaterial.accessType !== rawMaterial.accessType) {
        console.error(`❌ CRITICAL: accessType lost in constructor! DB: "${rawMaterial.accessType}", Object: "${createdMaterial.accessType}"`);
      }
      
      return createdMaterial;
    } catch (error) {
      console.error('MongoDB material create error:', error);
      throw error;
    }
  }

  static async findById(id) {
    if (!isMongoReady) {
      return null;
    }

    try {
      const material = await MaterialModel.findById(id);
      return material ? new MongoMaterial(material.toObject()) : null;
    } catch (error) {
      console.error('MongoDB material findById error:', error);
      return null;
    }
  }

  static async find(query = {}, options = {}) {
    if (!isMongoReady) {
      return [];
    }

    try {
      let mongoQuery = MaterialModel.find(query);
      
      if (options.sort) {
        mongoQuery = mongoQuery.sort(options.sort);
      } else {
        mongoQuery = mongoQuery.sort({ createdAt: -1 });
      }

      if (options.limit) {
        mongoQuery = mongoQuery.limit(options.limit);
      }

      const materials = await mongoQuery.exec();
      return materials.map(m => new MongoMaterial(m.toObject()));
    } catch (error) {
      console.error('MongoDB material find error:', error);
      return [];
    }
  }

  static async findOne(query) {
    if (!isMongoReady) {
      return null;
    }

    try {
      const material = await MaterialModel.findOne(query);
      return material ? new MongoMaterial(material.toObject()) : null;
    } catch (error) {
      console.error('MongoDB material findOne error:', error);
      return null;
    }
  }

  async save() {
    if (!isMongoReady) {
      throw new Error('MongoDB is not ready');
    }

    try {
      const updated = await MaterialModel.findByIdAndUpdate(
        this.id,
        { 
          $set: {
            title: this.title,
            type: this.type,
            url: this.url,
            description: this.description,
            subjectId: this.subjectId,
            subjectName: this.subjectName,
            subjectCode: this.subjectCode,
            branch: this.branch,
            branches: this.branches,
            semester: this.semester,
            resourceType: this.resourceType,
            accessType: this.accessType,
            price: this.price,
            googleDriveUrl: this.googleDriveUrl,
            storageType: this.storageType,
            tags: this.tags,
            coverPhoto: this.coverPhoto,
            downloads: this.downloads,
            rating: this.rating,
            ratingCount: this.ratingCount,
            uploadedBy: this.uploadedBy,
            updatedAt: new Date()
          }
        },
        { new: true, runValidators: true }
      );
      
      if (updated) {
        Object.assign(this, updated.toObject());
        return this;
      }
      throw new Error('Material not found');
    } catch (error) {
      console.error('MongoDB material save error:', error);
      throw error;
    }
  }

  async delete() {
    if (!isMongoReady) {
      throw new Error('MongoDB is not ready');
    }

    try {
      await MaterialModel.findByIdAndDelete(this.id);
      return true;
    } catch (error) {
      console.error('MongoDB material delete error:', error);
      throw error;
    }
  }

  static async findByIdAndDelete(id) {
    if (!isMongoReady) {
      return null;
    }

    try {
      const material = await MaterialModel.findByIdAndDelete(id);
      return material ? new MongoMaterial(material.toObject()) : null;
    } catch (error) {
      console.error('MongoDB material findByIdAndDelete error:', error);
      return null;
    }
  }

  static async findByIdAndUpdate(id, updates) {
    if (!isMongoReady) {
      return null;
    }

    try {
      const material = await MaterialModel.findByIdAndUpdate(
        id,
        { $set: { ...updates, updatedAt: new Date() } },
        { new: true, runValidators: true }
      );
      return material ? new MongoMaterial(material.toObject()) : null;
    } catch (error) {
      console.error('MongoDB material findByIdAndUpdate error:', error);
      return null;
    }
  }

  static async incrementDownloads(id) {
    if (!isMongoReady) {
      return null;
    }

    try {
      const material = await MaterialModel.findByIdAndUpdate(
        id,
        { $inc: { downloads: 1 } },
        { new: true }
      );
      return material ? new MongoMaterial(material.toObject()) : null;
    } catch (error) {
      console.error('MongoDB material incrementDownloads error:', error);
      return null;
    }
  }

  static async updateRating(id, rating) {
    if (!isMongoReady) {
      return null;
    }

    try {
      const material = await MaterialModel.findById(id);
      if (!material) return null;

      const currentRating = material.rating || 0;
      const currentCount = material.ratingCount || 0;
      const newCount = currentCount + 1;
      const newRating = ((currentRating * currentCount) + rating) / newCount;

      const updated = await MaterialModel.findByIdAndUpdate(
        id,
        { 
          $set: { 
            rating: newRating,
            ratingCount: newCount,
            updatedAt: new Date()
          }
        },
        { new: true }
      );
      return updated ? new MongoMaterial(updated.toObject()) : null;
    } catch (error) {
      console.error('MongoDB material updateRating error:', error);
      return null;
    }
  }

  toJSON() {
    return {
      id: this.id,
      _id: this.id,
      title: this.title,
      type: this.type,
      url: this.url,
      description: this.description,
      subjectId: this.subjectId,
      subjectName: this.subjectName,
      subjectCode: this.subjectCode,
      branch: this.branch,
      branches: this.branches,
      semester: this.semester,
      resourceType: this.resourceType,
      accessType: this.accessType,
      price: this.price,
      googleDriveUrl: this.googleDriveUrl,
      storageType: this.storageType,
      tags: this.tags,
      coverPhoto: this.coverPhoto,
      downloads: this.downloads,
      rating: this.rating,
      ratingCount: this.ratingCount,
      uploadedBy: this.uploadedBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export default MongoMaterial;

