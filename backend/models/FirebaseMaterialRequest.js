import { db, isFirebaseReady } from '../lib/firebase.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

class FirebaseMaterialRequest {
  constructor(data) {
    this.id = data.id;
    this.userId = data.userId;
    this.userName = data.userName;
    this.userEmail = data.userEmail;
    this.subjectId = data.subjectId;
    this.subjectName = data.subjectName;
    this.subjectCode = data.subjectCode;
    this.branch = data.branch;
    this.semester = data.semester;
    this.title = data.title;
    this.description = data.description || '';
    this.materialType = data.materialType || 'pdf'; // pdf, video, notes, other
    this.priority = data.priority || 'medium'; // low, medium, high, urgent
    this.status = data.status || 'pending'; // pending, approved, rejected, fulfilled
    this.adminNotes = data.adminNotes || '';
    this.fulfilledBy = data.fulfilledBy || null; // admin user ID who fulfilled
    this.fulfilledAt = data.fulfilledAt;
    this.estimatedFulfillmentDate = data.estimatedFulfillmentDate;
    this.tags = data.tags || [];
    this.upvotes = data.upvotes || 0; // other students can upvote requests
    this.upvotedBy = data.upvotedBy || []; // array of user IDs who upvoted
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  // Create a new material request
  static async create(requestData) {
    try {
      const now = new Date();
      if (!isFirebaseReady) {
        const request = {
          id: await this._generateId(),
          userId: requestData.userId,
          userName: requestData.userName,
          userEmail: requestData.userEmail,
          subjectId: requestData.subjectId,
          subjectName: requestData.subjectName,
          subjectCode: requestData.subjectCode,
          branch: requestData.branch,
          semester: requestData.semester,
          title: requestData.title,
          description: requestData.description || '',
          materialType: requestData.materialType || 'pdf',
          priority: requestData.priority || 'medium',
          status: requestData.status || 'pending',
          adminNotes: requestData.adminNotes || '',
          fulfilledBy: requestData.fulfilledBy || null,
          fulfilledAt: requestData.fulfilledAt,
          estimatedFulfillmentDate: requestData.estimatedFulfillmentDate,
          tags: requestData.tags || [],
          upvotes: 0,
          upvotedBy: [],
          createdAt: now,
          updatedAt: now
        };
        await this._jsonInsert(request);
        return new FirebaseMaterialRequest(request);
      }

      const requestRef = db.collection('materialRequests').doc();
      const request = {
        id: requestRef.id,
        userId: requestData.userId,
        userName: requestData.userName,
        userEmail: requestData.userEmail,
        subjectId: requestData.subjectId,
        subjectName: requestData.subjectName,
        subjectCode: requestData.subjectCode,
        branch: requestData.branch,
        semester: requestData.semester,
        title: requestData.title,
        description: requestData.description || '',
        materialType: requestData.materialType || 'pdf',
        priority: requestData.priority || 'medium',
        status: requestData.status || 'pending',
        adminNotes: requestData.adminNotes || '',
        fulfilledBy: requestData.fulfilledBy || null,
        fulfilledAt: requestData.fulfilledAt,
        estimatedFulfillmentDate: requestData.estimatedFulfillmentDate,
        tags: requestData.tags || [],
        upvotes: 0,
        upvotedBy: [],
        createdAt: now,
        updatedAt: now
      };
      await requestRef.set(request);
      return new FirebaseMaterialRequest(request);
    } catch (error) {
      console.error('Error creating material request:', error);
      throw error;
    }
  }

  // Find request by ID
  static async findById(id) {
    try {
      if (!isFirebaseReady) {
        const all = await this._jsonAll();
        const found = all.find(r => r.id === id);
        return found ? new FirebaseMaterialRequest(found) : null;
      }
      const requestDoc = await db.collection('materialRequests').doc(id).get();
      if (!requestDoc.exists) return null;
      return new FirebaseMaterialRequest({ id: requestDoc.id, ...requestDoc.data() });
    } catch (error) {
      console.error('Error finding material request by ID:', error);
      return null;
    }
  }

  // Find requests with filters
  static async find(query = {}) {
    try {
      if (!isFirebaseReady) {
        const all = await this._jsonAll();
        const entries = Object.entries(query);
        const filtered = entries.length ? all.filter(r => entries.every(([k, v]) => r[k] === v)) : all;
        return filtered.map(r => new FirebaseMaterialRequest(r));
      }

      let queryRef = db.collection('materialRequests');
      
      // Apply filters
      for (const [field, value] of Object.entries(query)) {
        if (field !== 'id') {
          queryRef = queryRef.where(field, '==', value);
        }
      }
      
      // Add ordering
      queryRef = queryRef.orderBy('createdAt', 'desc');
      
      const snapshot = await queryRef.get();
      const requests = [];
      
      snapshot.forEach(doc => {
        requests.push(new FirebaseMaterialRequest({ id: doc.id, ...doc.data() }));
      });
      
      return requests;
    } catch (error) {
      console.error('Error finding material requests:', error);
      return [];
    }
  }

  // Find requests by user
  static async findByUser(userId) {
    try {
      return await this.find({ userId });
    } catch (error) {
      console.error('Error finding material requests by user:', error);
      return [];
    }
  }

  // Find requests by subject
  static async findBySubject(subjectId) {
    try {
      return await this.find({ subjectId });
    } catch (error) {
      console.error('Error finding material requests by subject:', error);
      return [];
    }
  }

  // Find pending requests
  static async findPending(filters = {}) {
    try {
      return await this.find({ status: 'pending', ...filters });
    } catch (error) {
      console.error('Error finding pending material requests:', error);
      return [];
    }
  }

  // Find popular requests (most upvoted)
  static async findPopular(limit = 10) {
    try {
      if (!isFirebaseReady) {
        const all = await this._jsonAll();
        const pendingRequests = all.filter(r => r.status === 'pending');
        pendingRequests.sort((a, b) => b.upvotes - a.upvotes);
        return pendingRequests.slice(0, limit).map(r => new FirebaseMaterialRequest(r));
      }

      const snapshot = await db.collection('materialRequests')
        .where('status', '==', 'pending')
        .orderBy('upvotes', 'desc')
        .limit(limit)
        .get();

      const requests = [];
      snapshot.forEach(doc => {
        requests.push(new FirebaseMaterialRequest({ id: doc.id, ...doc.data() }));
      });
      
      return requests;
    } catch (error) {
      console.error('Error finding popular material requests:', error);
      return [];
    }
  }

  // Upvote a request
  async upvote(userId) {
    try {
      if (this.upvotedBy.includes(userId)) {
        // Remove upvote
        this.upvotedBy = this.upvotedBy.filter(id => id !== userId);
        this.upvotes = Math.max(0, this.upvotes - 1);
      } else {
        // Add upvote
        this.upvotedBy.push(userId);
        this.upvotes++;
      }
      
      this.updatedAt = new Date();
      await this.save();
      return this;
    } catch (error) {
      console.error('Error upvoting material request:', error);
      throw error;
    }
  }

  // Update request status
  async updateStatus(status, adminNotes = '', fulfilledBy = null) {
    try {
      this.status = status;
      this.adminNotes = adminNotes;
      this.fulfilledBy = fulfilledBy;
      
      if (status === 'fulfilled') {
        this.fulfilledAt = new Date();
      }
      
      this.updatedAt = new Date();
      await this.save();
      return this;
    } catch (error) {
      console.error('Error updating material request status:', error);
      throw error;
    }
  }

  // Update request
  async save() {
    try {
      this.updatedAt = new Date();
      if (!isFirebaseReady) {
        await FirebaseMaterialRequest._jsonUpdate(this.id, this);
        return this;
      }
      await db.collection('materialRequests').doc(this.id).update({
        ...this,
        id: undefined
      });
      return this;
    } catch (error) {
      console.error('Error saving material request:', error);
      throw error;
    }
  }

  // Update by ID
  static async findByIdAndUpdate(id, updates) {
    try {
      if (!isFirebaseReady) {
        const all = await this._jsonAll();
        const request = all.find(r => r.id === id);
        if (request) {
          Object.assign(request, updates, { updatedAt: new Date() });
          await this._jsonWrite(all);
          return new FirebaseMaterialRequest(request);
        }
        return null;
      }

      const requestRef = db.collection('materialRequests').doc(id);
      const updateData = {
        ...updates,
        updatedAt: new Date()
      };
      
      await requestRef.update(updateData);
      
      const updatedDoc = await requestRef.get();
      if (!updatedDoc.exists) return null;
      
      return new FirebaseMaterialRequest({ id: updatedDoc.id, ...updatedDoc.data() });
    } catch (error) {
      console.error('Error updating material request:', error);
      throw error;
    }
  }

  // Delete request
  async delete() {
    try {
      if (!isFirebaseReady) {
        await FirebaseMaterialRequest._jsonDelete(this.id);
        return true;
      }
      await db.collection('materialRequests').doc(this.id).delete();
      return true;
    } catch (error) {
      console.error('Error deleting material request:', error);
      throw error;
    }
  }

  // Static method to delete by ID
  static async findByIdAndDelete(id) {
    try {
      const request = await this.findById(id);
      if (request) {
        await request.delete();
        return request;
      }
      return null;
    } catch (error) {
      console.error('Error deleting material request by ID:', error);
      throw error;
    }
  }

  // Get material request statistics
  static async getStats() {
    try {
      if (!isFirebaseReady) {
        const all = await this._jsonAll();
        return {
          total: all.length,
          pending: all.filter(r => r.status === 'pending').length,
          approved: all.filter(r => r.status === 'approved').length,
          rejected: all.filter(r => r.status === 'rejected').length,
          fulfilled: all.filter(r => r.status === 'fulfilled').length,
          averageUpvotes: all.length > 0 ? all.reduce((sum, r) => sum + r.upvotes, 0) / all.length : 0,
          topPriority: all.filter(r => r.priority === 'urgent').length
        };
      }

      const snapshot = await db.collection('materialRequests').get();
      const stats = {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        fulfilled: 0,
        averageUpvotes: 0,
        topPriority: 0
      };

      let totalUpvotes = 0;
      snapshot.forEach(doc => {
        const data = doc.data();
        stats.total++;
        stats[data.status] = (stats[data.status] || 0) + 1;
        totalUpvotes += data.upvotes || 0;
        if (data.priority === 'urgent') stats.topPriority++;
      });

      stats.averageUpvotes = stats.total > 0 ? totalUpvotes / stats.total : 0;
      return stats;
    } catch (error) {
      console.error('Error getting material request stats:', error);
      return { total: 0, pending: 0, approved: 0, rejected: 0, fulfilled: 0, averageUpvotes: 0, topPriority: 0 };
    }
  }

  // Check if user has already requested similar material
  static async hasSimilarRequest(userId, title, subjectId) {
    try {
      const userRequests = await this.findByUser(userId);
      return userRequests.some(r => 
        r.subjectId === subjectId && 
        r.title.toLowerCase().includes(title.toLowerCase()) &&
        r.status === 'pending'
      );
    } catch (error) {
      console.error('Error checking similar request:', error);
      return false;
    }
  }

  // -------- Local JSON fallback helpers --------
  static async _dbFile() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const dbDir = path.join(__dirname, '..', 'database');
    const requestsFile = path.join(dbDir, 'materialRequests.json');
    try { await fs.mkdir(dbDir, { recursive: true }); } catch {}
    return requestsFile;
  }

  static async _jsonAll() {
    const file = await this._dbFile();
    try {
      const raw = await fs.readFile(file, 'utf8');
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  static async _jsonWrite(all) {
    const file = await this._dbFile();
    await fs.writeFile(file, JSON.stringify(all, null, 2));
  }

  static async _jsonInsert(request) {
    const all = await this._jsonAll();
    all.push({ ...request, createdAt: request.createdAt, updatedAt: request.updatedAt });
    await this._jsonWrite(all);
  }

  static async _jsonUpdate(id, patch) {
    const all = await this._jsonAll();
    const idx = all.findIndex(r => r.id === id);
    if (idx === -1) return;
    all[idx] = { ...all[idx], ...patch, id };
    await this._jsonWrite(all);
  }

  static async _jsonDelete(id) {
    const all = await this._jsonAll();
    const filtered = all.filter(r => r.id !== id);
    await this._jsonWrite(filtered);
  }

  static async _generateId() {
    return 'req_' + Math.random().toString(36).slice(2, 10);
  }
}

export default FirebaseMaterialRequest;
