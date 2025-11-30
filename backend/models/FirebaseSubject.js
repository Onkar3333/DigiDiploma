import { db, isFirebaseReady } from '../lib/firebase.js';

const subjectCache = new Map();
const CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutes

const getCacheKey = (query, options) => {
  return JSON.stringify({
    query,
    orderBy: options?.orderBy !== false,
  });
};

const getCachedSubjects = (key) => {
  const cached = subjectCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
    subjectCache.delete(key);
    return null;
  }
  return cached.data;
};

const setCachedSubjects = (key, data) => {
  subjectCache.set(key, { data, timestamp: Date.now() });
};

const isQuotaError = (error) => {
  return error?.code === 8 || (error?.message || '').includes('Quota exceeded');
};

class FirebaseSubject {
  constructor(data) {
    this.id = data.id;
    this._id = data.id || data._id; // Support both _id and id
    this.name = data.name;
    this.code = data.code;
    this.branch = data.branch;
    this.semester = data.semester;
    this.credits = data.credits || 4;
    this.hours = data.hours || 60;
    this.type = data.type || 'Theory';
    this.description = data.description || '';
    this.isActive = data.isActive !== undefined ? data.isActive : true; // Default to active
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  // Create a new subject
  static async create(subjectData) {
    if (!isFirebaseReady || !db) {
      throw new Error('Firebase is not initialized. Please check your Firebase configuration.');
    }
    
    try {
      const subjectRef = db.collection('subjects').doc();
      const subject = {
        id: subjectRef.id,
        name: subjectData.name,
        code: subjectData.code,
        branch: subjectData.branch,
        semester: parseInt(subjectData.semester),
        credits: subjectData.credits || 4,
        hours: subjectData.hours || 60,
        type: subjectData.type || 'Theory',
        description: subjectData.description || '',
        isActive: subjectData.isActive !== undefined ? subjectData.isActive : true, // Default to active
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await subjectRef.set(subject);
      return new FirebaseSubject(subject);
    } catch (error) {
      console.error('Error creating subject:', error);
      throw error;
    }
  }

  // Find subject by ID
  static async findById(id) {
    if (!isFirebaseReady || !db) {
      return null;
    }
    
    try {
      const subjectDoc = await db.collection('subjects').doc(id).get();
      if (!subjectDoc.exists) {
        return null;
      }
      return new FirebaseSubject({ id: subjectDoc.id, ...subjectDoc.data() });
    } catch (error) {
      console.error('Error finding subject by ID:', error);
      throw error;
    }
  }

  // Find subjects with filters
  static async find(query = {}, options = {}) {
    // If Firebase is not ready, return empty array for now
    if (!isFirebaseReady || !db) {
      console.log('Firebase not ready, returning empty subjects array');
      return [];
    }

    const cacheKey = getCacheKey(query, options);
    const cached = getCachedSubjects(cacheKey);
    if (cached) {
      console.log('📦 Serving subjects from cache');
      return cached;
    }

    try {
      let queryRef = db.collection('subjects');
      
      console.log(`🔍 FirebaseSubject.find() called with query:`, JSON.stringify(query), 'options:', JSON.stringify(options));
      
      // Apply filters
      for (const [field, value] of Object.entries(query)) {
        if (field !== 'id') {
          queryRef = queryRef.where(field, '==', value);
          console.log(`   Applied filter: ${field} == ${value}`);
        }
      }
      
      // Add ordering only if requested (to avoid index requirement for simple queries)
      if (options.orderBy !== false) {
        try {
          queryRef = queryRef.orderBy('semester', 'asc').orderBy('name', 'asc');
          console.log(`   Applied ordering: semester asc, name asc`);
        } catch (orderError) {
          // If ordering fails (index not created), continue without ordering
          if (orderError.message && orderError.message.includes('index')) {
            console.log(`   ⚠️ Ordering failed (index missing), continuing without ordering`);
            // Skip ordering for now
          } else {
            throw orderError;
          }
        }
      } else {
        console.log(`   Ordering disabled (orderBy: false)`);
      }
      
      const snapshot = await queryRef.get();
      const subjects = [];
      
      console.log(`📊 Firestore query returned ${snapshot.size} documents`);
      snapshot.forEach((doc, index) => {
        const data = doc.data();
        if (index < 5) { // Log first 5 for debugging
          console.log(`   Doc ${index + 1}: ${data.code || 'NO CODE'} - ${data.name || 'NO NAME'} (${data.branch || 'NO BRANCH'}, Sem ${data.semester || 'NO SEM'})`);
        }
        subjects.push(new FirebaseSubject({ id: doc.id, ...data }));
      });
      if (snapshot.size > 5) {
        console.log(`   ... and ${snapshot.size - 5} more documents`);
      }
      
      console.log(`✅ Returning ${subjects.length} subjects`);
      setCachedSubjects(cacheKey, subjects);
      return subjects;
    } catch (error) {
      // If error is about index, try without ordering
      if (error.message && error.message.includes('index') && options.orderBy !== false) {
        try {
          let queryRef = db.collection('subjects');
          for (const [field, value] of Object.entries(query)) {
            if (field !== 'id') {
              queryRef = queryRef.where(field, '==', value);
            }
          }
          const snapshot = await queryRef.get();
          const subjects = [];
          snapshot.forEach(doc => {
            subjects.push(new FirebaseSubject({ id: doc.id, ...doc.data() }));
          });
          return subjects;
        } catch (retryError) {
          console.error('Error finding subjects (retry failed):', retryError);
          return [];
        }
      }
      if (isQuotaError(error)) {
        console.warn('⚠️ Firestore quota exceeded while fetching subjects. Using cached data if available.');
        const fallback = getCachedSubjects(cacheKey);
        if (fallback) {
          return fallback;
        }
      }
      console.error('Error finding subjects:', error);
      return [];
    }
  }

  // Get distinct branches
  static async distinct(field) {
    // If Firebase is not ready, return empty array for now
    if (!isFirebaseReady || !db) {
      console.log('Firebase not ready, returning empty branches array');
      return [];
    }

    try {
      const snapshot = await db.collection('subjects').get();
      const values = new Set();
      
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data[field] !== undefined) {
          values.add(data[field]);
        }
      });
      
      return Array.from(values);
    } catch (error) {
      console.error('Error getting distinct values:', error);
      return [];
    }
  }

  // Update subject
  async save() {
    if (!isFirebaseReady || !db) {
      throw new Error('Firebase is not initialized. Please check your Firebase configuration.');
    }
    
    try {
      this.updatedAt = new Date();
      await db.collection('subjects').doc(this.id).update({
        ...this,
        id: undefined // Don't update the ID
      });
      return this;
    } catch (error) {
      console.error('Error saving subject:', error);
      throw error;
    }
  }

  // Update by ID
  static async findByIdAndUpdate(id, updates) {
    if (!isFirebaseReady || !db) {
      throw new Error('Firebase is not initialized. Please check your Firebase configuration.');
    }
    
    try {
      const subjectRef = db.collection('subjects').doc(id);
      const updateData = {
        ...updates,
        updatedAt: new Date()
      };
      
      await subjectRef.update(updateData);
      
      const updatedDoc = await subjectRef.get();
      if (!updatedDoc.exists) {
        return null;
      }
      
      return new FirebaseSubject({ id: updatedDoc.id, ...updatedDoc.data() });
    } catch (error) {
      console.error('Error updating subject:', error);
      throw error;
    }
  }

  // Delete subject
  async delete() {
    if (!isFirebaseReady || !db) {
      throw new Error('Firebase is not initialized. Please check your Firebase configuration.');
    }
    
    try {
      await db.collection('subjects').doc(this.id).delete();
      return true;
    } catch (error) {
      console.error('Error deleting subject:', error);
      throw error;
    }
  }

  // Static method to delete by ID
  static async findByIdAndDelete(id) {
    try {
      const subject = await this.findById(id);
      if (subject) {
        await subject.delete();
        return subject;
      }
      return null;
    } catch (error) {
      console.error('Error deleting subject by ID:', error);
      throw error;
    }
  }

  // Delete all subjects
  static async deleteAll() {
    if (!isFirebaseReady || !db) {
      throw new Error('Firebase is not initialized. Please check your Firebase configuration.');
    }
    
    try {
      const snapshot = await db.collection('subjects').get();
      let totalCount = 0;
      
      // Firebase batch operations are limited to 500 operations per batch
      // So we need to split into multiple batches if there are more than 500 subjects
      const batchSize = 500;
      const docs = [];
      snapshot.forEach((doc) => {
        docs.push(doc);
      });
      
      console.log(`🗑️ Starting deletion of ${docs.length} subjects...`);
      
      // Process in batches of 500
      for (let i = 0; i < docs.length; i += batchSize) {
        const batch = db.batch();
        const batchDocs = docs.slice(i, i + batchSize);
        
        batchDocs.forEach((doc) => {
          batch.delete(doc.ref);
        });
        
        await batch.commit();
        totalCount += batchDocs.length;
        console.log(`✅ Deleted batch: ${batchDocs.length} subjects (Total: ${totalCount}/${docs.length})`);
      }
      
      console.log(`✅ Successfully deleted all ${totalCount} subjects from Firebase`);
      return totalCount;
    } catch (error) {
      console.error('Error deleting all subjects:', error);
      throw error;
    }
  }

  // Delete all subjects by branch
  static async deleteAllByBranch(branch) {
    if (!isFirebaseReady || !db) {
      throw new Error('Firebase is not initialized. Please check your Firebase configuration.');
    }
    
    try {
      const snapshot = await db.collection('subjects').where('branch', '==', branch).get();
      let totalCount = 0;
      
      // Firebase batch operations are limited to 500 operations per batch
      const batchSize = 500;
      const docs = [];
      snapshot.forEach((doc) => {
        docs.push(doc);
      });
      
      console.log(`🗑️ Starting deletion of ${docs.length} subjects for branch "${branch}"...`);
      
      // Process in batches of 500
      for (let i = 0; i < docs.length; i += batchSize) {
        const batch = db.batch();
        const batchDocs = docs.slice(i, i + batchSize);
        
        batchDocs.forEach((doc) => {
          batch.delete(doc.ref);
        });
        
        await batch.commit();
        totalCount += batchDocs.length;
        console.log(`✅ Deleted batch: ${batchDocs.length} subjects (Total: ${totalCount}/${docs.length})`);
      }
      
      console.log(`✅ Successfully deleted all ${totalCount} subjects for branch "${branch}" from Firebase`);
      return totalCount;
    } catch (error) {
      console.error(`Error deleting subjects for branch "${branch}":`, error);
      throw error;
    }
  }
}

export default FirebaseSubject;
  