import { db, isFirebaseReady } from '../lib/firebase.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

class FirebaseNotice {
  constructor(data) {
    this.id = data.id;
    this.title = data.title;
    this.content = data.content;
    this.type = data.type || 'general';
    this.priority = data.priority || 'medium';
    this.targetAudience = data.targetAudience || 'all';
    this.targetBranch = data.targetBranch || null;
    this.isPinned = data.isPinned || false;
    this.expiresAt = data.expiresAt || null;
    this.attachments = data.attachments || [];
    this.tags = data.tags || [];
    this.createdBy = data.createdBy || null;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  // Create a new notice
  static async create(noticeData) {
    try {
      const now = new Date();
      if (!isFirebaseReady) {
        const notice = {
          id: await this._generateId(),
          title: noticeData.title,
          content: noticeData.content,
          type: noticeData.type || 'general',
          priority: noticeData.priority || 'medium',
          targetAudience: noticeData.targetAudience || 'all',
          targetBranch: noticeData.targetBranch || null,
          isActive: noticeData.isActive !== false, // default true
          isPinned: noticeData.isPinned || false,
          expiresAt: noticeData.expiresAt || null,
          attachments: noticeData.attachments || [],
          tags: noticeData.tags || [],
          createdBy: noticeData.createdBy || null,
          createdAt: now,
          updatedAt: now
        };
        await this._jsonInsert(notice);
        return new FirebaseNotice(notice);
      }

      const noticeRef = db.collection('notices').doc();
      const notice = {
        id: noticeRef.id,
        title: noticeData.title,
        content: noticeData.content,
        type: noticeData.type || 'general',
        priority: noticeData.priority || 'medium',
        targetAudience: noticeData.targetAudience || 'all',
        targetBranch: noticeData.targetBranch || null,
        isActive: noticeData.isActive !== false, // default true
        isPinned: noticeData.isPinned || false,
        expiresAt: noticeData.expiresAt || null,
        attachments: noticeData.attachments || [],
        tags: noticeData.tags || [],
        createdBy: noticeData.createdBy || null,
        createdAt: now,
        updatedAt: now
      };

      await noticeRef.set(notice);
      return new FirebaseNotice(notice);
    } catch (error) {
      console.error('Error creating notice:', error);
      throw error;
    }
  }

  // Find notice by ID
  static async findById(id) {
    try {
      if (!isFirebaseReady) {
        const all = await this._jsonAll();
        const found = all.find(n => n.id === id);
        return found ? new FirebaseNotice(found) : null;
      }
      const noticeDoc = await db.collection('notices').doc(id).get();
      if (!noticeDoc.exists) {
        return null;
      }
      return new FirebaseNotice({ id: noticeDoc.id, ...noticeDoc.data() });
    } catch (error) {
      console.error('Error finding notice by ID:', error);
      throw error;
    }
  }

  // Find notices with filters
  static async find(query = {}) {
    try {
      if (!isFirebaseReady) {
        const all = await this._jsonAll();
        const entries = Object.entries(query);
        const filtered = entries.length ? all.filter(n => entries.every(([k, v]) => n[k] === v)) : all;
        // Sort pinned first then createdAt desc
        filtered.sort((a, b) => {
          const pinDiff = (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0);
          if (pinDiff !== 0) return pinDiff;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        return filtered.map(n => new FirebaseNotice(n));
      }

      let queryRef = db.collection('notices');
      
      // Apply filters
      for (const [field, value] of Object.entries(query)) {
        if (field !== 'id' && field !== 'sort') {
          queryRef = queryRef.where(field, '==', value);
        }
      }
      
      // Add ordering (pinned first, then by creation date) - skip if index missing
      let orderedRef = queryRef;
      let usedOrdering = false;
      try {
        orderedRef = queryRef.orderBy('isPinned', 'desc').orderBy('createdAt', 'desc');
        usedOrdering = true;
      } catch (orderError) {
        if (orderError?.message?.includes('index')) {
          // skip ordering when index missing
          usedOrdering = false;
        } else {
          throw orderError;
        }
      }

      // Execute query, retry without ordering if Firestore demands an index at get() time
      let snapshot;
      try {
        snapshot = await (usedOrdering ? orderedRef : queryRef).get();
      } catch (getError) {
        if (getError?.message?.includes('index')) {
          // Retry without ordering
          snapshot = await queryRef.get();
          usedOrdering = false;
        } else {
          throw getError;
        }
      }

      const notices = [];
      snapshot.forEach(doc => {
        notices.push(new FirebaseNotice({ id: doc.id, ...doc.data() }));
      });

      // If we couldn't order in Firestore, sort in-memory
      if (!usedOrdering) {
        notices.sort((a, b) => {
          const pinDiff = (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0);
          if (pinDiff !== 0) return pinDiff;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      }

      return notices;
    } catch (error) {
      console.error('Error finding notices:', error);
      throw error;
    }
  }

  // Explicit JSON-local lookup regardless of Firebase readiness
  static async findLocal(query = {}) {
    const all = await this._jsonAll();
    const entries = Object.entries(query);
    const filtered = entries.length ? all.filter(n => entries.every(([k, v]) => n[k] === v)) : all;
    filtered.sort((a, b) => {
      const pinDiff = (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0);
      if (pinDiff !== 0) return pinDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return filtered.map(n => new FirebaseNotice(n));
  }

  // Find notices with sorting and limiting
  static async findWithOptions(query = {}, sortOptions = {}, limitCount = null) {
    try {
      let queryRef = db.collection('notices');
      
      // Apply filters
      for (const [field, value] of Object.entries(query)) {
        if (field !== 'id' && field !== 'sort') {
          queryRef = queryRef.where(field, '==', value);
        }
      }
      
      // Apply sorting
      if (sortOptions.createdAt) {
        queryRef = queryRef.orderBy('createdAt', sortOptions.createdAt);
      } else {
        // Default ordering (pinned first, then by creation date)
        queryRef = queryRef.orderBy('isPinned', 'desc').orderBy('createdAt', 'desc');
      }
      
      // Apply limit
      if (limitCount) {
        queryRef = queryRef.limit(limitCount);
      }
      
      const snapshot = await queryRef.get();
      const notices = [];
      
      snapshot.forEach(doc => {
        notices.push(new FirebaseNotice({ id: doc.id, ...doc.data() }));
      });
      
      return notices;
    } catch (error) {
      console.error('Error finding notices with options:', error);
      throw error;
    }
  }

  // Find public notices
  static async findPublic() {
    try {
      const snapshot = await db.collection('notices')
        .where('targetAudience', 'in', ['all', 'students'])
        .orderBy('isPinned', 'desc')
        .orderBy('createdAt', 'desc')
        .get();
      
      const notices = [];
      snapshot.forEach(doc => {
        notices.push(new FirebaseNotice({ id: doc.id, ...doc.data() }));
      });
      
      return notices;
    } catch (error) {
      console.error('Error finding public notices:', error);
      throw error;
    }
  }

  // Update notice
  async save() {
    try {
      this.updatedAt = new Date();
      if (!isFirebaseReady) {
        await FirebaseNotice._jsonUpdate(this.id, this);
        return this;
      }
      await db.collection('notices').doc(this.id).update({
        ...this,
        id: undefined // Don't update the ID
      });
      return this;
    } catch (error) {
      console.error('Error saving notice:', error);
      throw error;
    }
  }

  // Update by ID
  static async findByIdAndUpdate(id, updates) {
    try {
      if (!isFirebaseReady) {
        const all = await this._jsonAll();
        const notice = all.find(n => n.id === id);
        if (notice) {
          Object.assign(notice, updates, { updatedAt: new Date() });
          await this._jsonWrite(all);
          return new FirebaseNotice(notice);
        }
        return null;
      }

      const noticeRef = db.collection('notices').doc(id);
      const updateData = {
        ...updates,
        updatedAt: new Date()
      };
      
      await noticeRef.update(updateData);
      
      const updatedDoc = await noticeRef.get();
      if (!updatedDoc.exists) {
        return null;
      }
      
      return new FirebaseNotice({ id: updatedDoc.id, ...updatedDoc.data() });
    } catch (error) {
      console.error('Error updating notice:', error);
      throw error;
    }
  }

  // Delete notice
  async delete() {
    try {
      if (!isFirebaseReady) {
        await FirebaseNotice._jsonDelete(this.id);
        return true;
      }
      await db.collection('notices').doc(this.id).delete();
      return true;
    } catch (error) {
      console.error('Error deleting notice:', error);
      throw error;
    }
  }

  // Static method to delete by ID
  static async findByIdAndDelete(id) {
    try {
      const notice = await this.findById(id);
      if (notice) {
        await notice.delete();
        return notice;
      }
      return null;
    } catch (error) {
      console.error('Error deleting notice by ID:', error);
      throw error;
    }
  }

  // -------- Local JSON fallback helpers --------
  static async _dbFile() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const dbDir = path.join(__dirname, '..', 'database');
    const noticesFile = path.join(dbDir, 'notices.json');
    try { await fs.mkdir(dbDir, { recursive: true }); } catch {}
    return noticesFile;
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

  static async _jsonInsert(notice) {
    const all = await this._jsonAll();
    all.push({ ...notice, createdAt: notice.createdAt, updatedAt: notice.updatedAt });
    await this._jsonWrite(all);
  }

  static async _jsonUpdate(id, patch) {
    const all = await this._jsonAll();
    const idx = all.findIndex(n => n.id === id);
    if (idx === -1) return;
    all[idx] = { ...all[idx], ...patch, id };
    await this._jsonWrite(all);
  }

  static async _jsonDelete(id) {
    const all = await this._jsonAll();
    const filtered = all.filter(n => n.id !== id);
    await this._jsonWrite(filtered);
  }

  static async _generateId() {
    return 'notice_' + Math.random().toString(36).slice(2, 10);
  }

  // Mark notice as read by user
  async markAsRead(userId) {
    try {
      if (!isFirebaseReady) {
        const all = await FirebaseNotice._jsonAll();
        const notice = all.find(n => n.id === this.id);
        if (notice) {
          if (!notice.readBy) notice.readBy = [];
          const existingIndex = notice.readBy.findIndex(entry => 
            (entry.user?.toString?.() || entry.user) === userId
          );
          if (existingIndex === -1) {
            notice.readBy.push({ user: userId, readAt: new Date() });
            await FirebaseNotice._jsonWrite(all);
          }
        }
        return this;
      }

      const noticeRef = db.collection('notices').doc(this.id);
      const noticeDoc = await noticeRef.get();
      
      if (!noticeDoc.exists) {
        throw new Error('Notice not found');
      }
      
      const noticeData = noticeDoc.data();
      const readBy = noticeData.readBy || [];
      
      // Check if user already marked as read
      const existingIndex = readBy.findIndex(entry => 
        (entry.user?.toString?.() || entry.user) === userId
      );
      
      if (existingIndex === -1) {
        readBy.push({ user: userId, readAt: new Date() });
        await noticeRef.update({ readBy });
      }
      
      return this;
    } catch (error) {
      console.error('Error marking notice as read:', error);
      throw error;
    }
  }
}

export default FirebaseNotice;
