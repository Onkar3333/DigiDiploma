import { db, admin, isFirebaseReady } from '../lib/firebase.js';

class FirebaseMaterial {
  constructor(data) {
    this.id = data.id;
    this.title = data.title;
    this.type = data.type;
    this.url = data.url;
    this.description = data.description || '';
    this.subjectId = data.subjectId;
    this.subjectName = data.subjectName;
    this.subjectCode = data.subjectCode;
    // Support both single branch (legacy) and branches array (new)
    this.branch = data.branch || (data.branches && data.branches[0]) || '';
    this.branches = data.branches || (data.branch ? [data.branch] : []);
    this.semester = data.semester;
    // Academic resource category (e.g. syllabus, model_answer_papers, etc.)
    this.resourceType = data.resourceType || 'notes';
    // Access type: 'free', 'drive_protected', 'paid'
    this.accessType = data.accessType || 'free';
    // Price for paid materials (in INR)
    this.price = data.price || 0;
    // Google Drive URL for drive protected materials
    this.googleDriveUrl = data.googleDriveUrl || null;
    // Storage type: 'r2' or 'local' (for file deletion)
    this.storageType = data.storageType || (data.url?.includes('r2.cloudflarestorage.com') || data.url?.includes('/api/materials/proxy/r2/') ? 'r2' : 'local');
    this.tags = data.tags || [];
    this.coverPhoto = data.coverPhoto || null; // Cover photo URL
    this.downloads = data.downloads || 0;
    this.rating = data.rating || 0;
    this.ratingCount = data.ratingCount || 0;
    this.uploadedBy = data.uploadedBy || null;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  // Create a new material
  static async create(materialData) {
    try {
      // Check if Firebase is ready and db is available
      if (!isFirebaseReady || !db) {
        throw new Error('Firebase is not ready. Cannot create material.');
      }
      
      const materialRef = db.collection('materials').doc();
      // Support both single branch (legacy) and branches array (new)
      const branches = materialData.branches || (materialData.branch ? [materialData.branch] : []);
      const branch = materialData.branch || (branches.length > 0 ? branches[0] : '');
      
      // Detect storage type from URL (use provided storageType or detect from URL)
      const storageType = materialData.storageType || 
                         (materialData.url?.includes('r2.cloudflarestorage.com') || 
                          materialData.url?.includes('/api/materials/proxy/r2/') 
                          ? 'r2' : 'local');
      
      const material = {
        id: materialRef.id,
        title: materialData.title,
        type: materialData.type,
        url: materialData.url,
        description: materialData.description || '',
        subjectId: materialData.subjectId,
        subjectName: materialData.subjectName,
        subjectCode: materialData.subjectCode,
        branch: branch, // Keep for backward compatibility
        branches: branches, // New: array of branches
        semester: materialData.semester,
        // Academic resource category (syllabus, manual_answer, etc.)
        resourceType: materialData.resourceType || 'notes',
        // Access type: 'free', 'drive_protected', 'paid'
        accessType: materialData.accessType || 'free',
        // Price for paid materials (in INR)
        price: materialData.price || 0,
        // Google Drive URL for drive protected materials
        googleDriveUrl: materialData.googleDriveUrl || null,
        // Storage type: 'r2' or 'local' (for deletion)
        storageType: storageType,
        tags: materialData.tags || [],
        coverPhoto: materialData.coverPhoto || null, // Cover photo URL
        downloads: 0,
        rating: 0,
        ratingCount: 0,
        uploadedBy: materialData.uploadedBy || null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await materialRef.set(material);
      return new FirebaseMaterial(material);
    } catch (error) {
      console.error('Error creating material:', error);
      throw error;
    }
  }

  // Find material by ID
  static async findById(id) {
    try {
      if (!isFirebaseReady || !db) {
        console.log('Firebase not ready, returning null for material findById');
        return null;
      }
      const materialDoc = await db.collection('materials').doc(id).get();
      if (!materialDoc.exists) {
        return null;
      }
      return new FirebaseMaterial({ id: materialDoc.id, ...materialDoc.data() });
    } catch (error) {
      console.error('Error finding material by ID:', error);
      return null;
    }
  }

  // Find materials with filters
  static async find(query = {}) {
    try {
      // Check if Firebase is ready and db is available
      if (!isFirebaseReady || !db) {
        console.log('Firebase not ready, returning empty materials array');
        return [];
      }
      
      let queryRef = db.collection('materials');
      
      // Apply filters
      for (const [field, value] of Object.entries(query)) {
        if (field !== 'id') {
          queryRef = queryRef.where(field, '==', value);
        }
      }
      
      // Add ordering by creation date
      queryRef = queryRef.orderBy('createdAt', 'desc');
      
      const snapshot = await queryRef.get();
      const materials = [];
      
      snapshot.forEach(doc => {
        materials.push(new FirebaseMaterial({ id: doc.id, ...doc.data() }));
      });
      
      return materials;
    } catch (error) {
      console.error('Error finding materials:', error);
      // Return empty array instead of throwing to prevent crashes
      return [];
    }
  }

  // Find materials by subject code
  static async findBySubjectCode(subjectCode) {
    try {
      // Check if Firebase is ready and db is available
      if (!isFirebaseReady || !db) {
        console.log('Firebase not ready, returning empty materials array');
        return [];
      }
      
      const snapshot = await db.collection('materials')
        .where('subjectCode', '==', subjectCode)
        .orderBy('createdAt', 'desc')
        .get();
      
      const materials = [];
      snapshot.forEach(doc => {
        materials.push(new FirebaseMaterial({ id: doc.id, ...doc.data() }));
      });
      
      return materials;
    } catch (error) {
      console.error('Error finding materials by subject code:', error);
      // Return empty array instead of throwing to prevent crashes
      return [];
    }
  }

  // Update material
  async save() {
    try {
      if (!isFirebaseReady || !db) {
        throw new Error('Firebase is not ready. Cannot save material.');
      }
      this.updatedAt = new Date();
      await db.collection('materials').doc(this.id).update({
        ...this,
        id: undefined // Don't update the ID
      });
      return this;
    } catch (error) {
      console.error('Error saving material:', error);
      throw error;
    }
  }

  // Update by ID
  static async findByIdAndUpdate(id, updates) {
    try {
      if (!isFirebaseReady || !db) {
        throw new Error('Firebase is not ready. Cannot update material.');
      }
      const materialRef = db.collection('materials').doc(id);
      const updateData = {
        ...updates,
        updatedAt: new Date()
      };
      
      await materialRef.update(updateData);
      
      const updatedDoc = await materialRef.get();
      if (!updatedDoc.exists) {
        return null;
      }
      
      return new FirebaseMaterial({ id: updatedDoc.id, ...updatedDoc.data() });
    } catch (error) {
      console.error('Error updating material:', error);
      throw error;
    }
  }

  // Increment download count
  static async incrementDownloads(id) {
    try {
      if (!isFirebaseReady || !db) {
        console.log('Firebase not ready, skipping download count increment');
        return null;
      }
      const materialRef = db.collection('materials').doc(id);
      await materialRef.update({
        downloads: admin.firestore.FieldValue.increment(1),
        updatedAt: new Date()
      });
      const updatedDoc = await materialRef.get();
      if (!updatedDoc.exists) {
        return null;
      }
      return new FirebaseMaterial({ id: updatedDoc.id, ...updatedDoc.data() });
    } catch (error) {
      console.error('Error incrementing downloads:', error);
      throw error;
    }
  }

  // Update rating
  static async updateRating(id, rating) {
    try {
      if (!isFirebaseReady || !db) {
        throw new Error('Firebase is not ready. Cannot update rating.');
      }
      const materialRef = db.collection('materials').doc(id);
      const material = await this.findById(id);
      
      if (!material) {
        throw new Error('Material not found');
      }
      
      const newRatingCount = material.ratingCount + 1;
      const newRating = ((material.rating * material.ratingCount) + rating) / newRatingCount;
      
      await materialRef.update({
        rating: newRating,
        ratingCount: newRatingCount,
        updatedAt: new Date()
      });
      const updatedDoc = await materialRef.get();
      if (!updatedDoc.exists) {
        return null;
      }
      return new FirebaseMaterial({ id: updatedDoc.id, ...updatedDoc.data() });
    } catch (error) {
      console.error('Error updating rating:', error);
      throw error;
    }
  }

  // Delete material
  async delete() {
    try {
      if (!isFirebaseReady || !db) {
        throw new Error('Firebase is not ready. Cannot delete material.');
      }
      await db.collection('materials').doc(this.id).delete();
      return true;
    } catch (error) {
      console.error('Error deleting material:', error);
      throw error;
    }
  }

  // Static method to delete by ID
  static async findByIdAndDelete(id) {
    try {
      const material = await this.findById(id);
      if (material) {
        await material.delete();
        return material;
      }
      return null;
    } catch (error) {
      console.error('Error deleting material by ID:', error);
      throw error;
    }
  }
}

export default FirebaseMaterial;
