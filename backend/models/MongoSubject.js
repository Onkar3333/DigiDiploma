import mongoose from 'mongoose';
import { isMongoReady } from '../lib/mongodb.js';
import FirebaseSubject from './FirebaseSubject.js'; // Fallback

const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true }, // Removed unique: true - code is unique per branch, not globally
  branch: { type: String, required: false, index: true }, // Optional for common subjects
  semester: { type: Number, required: true, index: true },
  credits: { type: Number, default: 4 },
  hours: { type: Number, default: 60 },
  type: { type: String, default: 'Theory' },
  description: { type: String, default: '' },
  isActive: { type: Boolean, default: true, index: true },
  isCommon: { type: Boolean, default: false, index: true }, // New: indicates if subject is common across all branches
}, {
  timestamps: true
});

// Compound unique index: code must be unique per branch (same code can exist in different branches)
// IMPORTANT: If you get index errors, run: node backend/scripts/fix-subject-index.js
// This will drop the old unique index on 'code' and create the compound index
subjectSchema.index({ code: 1, branch: 1 }, { unique: true, name: 'code_branch_unique' });

// Compound index for efficient branch + semester queries
subjectSchema.index({ branch: 1, semester: 1 });

const SubjectModel = mongoose.models.Subject || mongoose.model('Subject', subjectSchema);

class MongoSubject {
  constructor(data) {
    this._id = data._id?.toString();
    this.id = this._id;
    this.name = data.name;
    this.code = data.code;
    this.branch = data.branch;
    this.semester = data.semester;
    this.credits = data.credits || 4;
    this.hours = data.hours || 60;
    this.type = data.type || 'Theory';
    this.description = data.description || '';
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.isCommon = data.isCommon !== undefined ? data.isCommon : false;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static async create(subjectData) {
    if (isMongoReady) {
      try {
        // Normalize code to uppercase for consistency
        const normalizedData = {
          ...subjectData,
          code: subjectData.code?.trim().toUpperCase() || subjectData.code
        };
        const subject = await SubjectModel.create(normalizedData);
        return new MongoSubject(subject.toObject());
      } catch (error) {
        // Handle duplicate key error (code + branch combination already exists)
        if (error.code === 11000) {
          const duplicateField = error.keyPattern ? Object.keys(error.keyPattern)[0] : 'code';
          throw new Error(`Subject with code ${subjectData.code} already exists for branch ${subjectData.branch}`);
        }
        console.error('MongoDB subject create error:', error);
        return await FirebaseSubject.create(subjectData);
      }
    }
    return await FirebaseSubject.create(subjectData);
  }

  static async findById(id) {
    if (isMongoReady) {
      try {
        const subject = await SubjectModel.findById(id);
        return subject ? new MongoSubject(subject.toObject()) : null;
      } catch (error) {
        console.error('MongoDB subject findById error:', error);
      }
    }
    return await FirebaseSubject.findById(id);
  }

  static async find(query = {}, options = {}) {
    if (isMongoReady) {
      try {
        // Convert regex query to proper MongoDB query if needed
        let mongoQuery = SubjectModel.find(query);
        
        if (options.orderBy !== false) {
          mongoQuery = mongoQuery.sort({ semester: 1, name: 1 });
        }
        
        const subjects = await mongoQuery.exec();
        console.log(`📚 MongoSubject.find() - Query: ${JSON.stringify(query)}, Found: ${subjects.length} subjects`);
        return subjects.map(s => new MongoSubject(s.toObject()));
      } catch (error) {
        console.error('MongoDB subject find error:', error);
        // Return empty array instead of falling back to Firebase
        return [];
      }
    }
    // Don't fall back to Firebase - return empty array
    console.warn('⚠️ MongoDB not ready, returning empty subjects array');
    return [];
  }

  static async distinct(field) {
    if (isMongoReady) {
      try {
        const values = await SubjectModel.distinct(field);
        return values;
      } catch (error) {
        console.error('MongoDB subject distinct error:', error);
      }
    }
    return await FirebaseSubject.distinct(field);
  }

  async save() {
    if (isMongoReady) {
      try {
        const updated = await SubjectModel.findByIdAndUpdate(
          this.id,
          { $set: { ...this, id: undefined, _id: undefined } },
          { new: true, runValidators: true }
        );
        if (updated) {
          Object.assign(this, updated.toObject());
          return this;
        }
      } catch (error) {
        console.error('MongoDB subject save error:', error);
      }
    }
    const firebaseSubject = await FirebaseSubject.findById(this.id);
    if (firebaseSubject) {
      Object.assign(firebaseSubject, this);
      return await firebaseSubject.save();
    }
    return this;
  }

  async delete() {
    if (isMongoReady) {
      try {
        await SubjectModel.findByIdAndDelete(this.id);
        return true;
      } catch (error) {
        console.error('MongoDB subject delete error:', error);
      }
    }
    const firebaseSubject = await FirebaseSubject.findById(this.id);
    if (firebaseSubject) return await firebaseSubject.delete();
    return false;
  }

  static async findByIdAndUpdate(id, updates) {
    if (isMongoReady) {
      try {
        // Normalize code to uppercase if provided
        if (updates.code) {
          updates.code = updates.code.trim().toUpperCase();
        }
        
        const subject = await SubjectModel.findByIdAndUpdate(
          id,
          { $set: { ...updates, updatedAt: new Date() } },
          { new: true, runValidators: true }
        );
        return subject ? new MongoSubject(subject.toObject()) : null;
      } catch (error) {
        // Handle duplicate key error (code + branch combination already exists)
        if (error.code === 11000) {
          const duplicateField = error.keyPattern ? Object.keys(error.keyPattern)[0] : 'code';
          throw new Error(`Subject with code ${updates.code} already exists for branch ${updates.branch || 'this branch'}`);
        }
        console.error('MongoDB subject findByIdAndUpdate error:', error);
        throw error;
      }
    }
    // Fallback to Firebase if MongoDB is not ready
    return await FirebaseSubject.findByIdAndUpdate(id, updates);
  }

  static async findByIdAndDelete(id) {
    if (isMongoReady) {
      try {
        const subject = await SubjectModel.findByIdAndDelete(id);
        return subject ? new MongoSubject(subject.toObject()) : null;
      } catch (error) {
        console.error('MongoDB subject findByIdAndDelete error:', error);
        return null;
      }
    }
    // Fallback to Firebase if MongoDB is not ready
    const firebaseSubject = await FirebaseSubject.findById(id);
    if (firebaseSubject) {
      await firebaseSubject.delete();
      return firebaseSubject;
    }
    return null;
  }
}

export default MongoSubject;

