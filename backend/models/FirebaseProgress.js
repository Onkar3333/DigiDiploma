import { db, isFirebaseReady } from '../lib/firebase.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

class FirebaseProgress {
  constructor(data) {
    this.id = data.id;
    this.userId = data.userId;
    this.contentId = data.contentId; // materialId, quizId, etc.
    this.contentType = data.contentType; // material, quiz, video, pdf
    this.subjectId = data.subjectId;
    this.subjectName = data.subjectName;
    this.branch = data.branch;
    this.semester = data.semester;
    this.progress = data.progress || 0; // percentage (0-100)
    this.timeSpent = data.timeSpent || 0; // in minutes
    this.lastPosition = data.lastPosition || 0; // for videos/PDFs (seconds/page)
    this.totalDuration = data.totalDuration || 0; // total content duration
    this.completed = data.completed || false;
    this.completedAt = data.completedAt;
    this.bookmarked = data.bookmarked || false;
    this.notes = data.notes || '';
    this.rating = data.rating || 0; // user rating (1-5)
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  // Create a new progress record
  static async create(progressData) {
    try {
      const now = new Date();
      if (!isFirebaseReady) {
        const progress = {
          id: await this._generateId(),
          userId: progressData.userId,
          contentId: progressData.contentId,
          contentType: progressData.contentType,
          subjectId: progressData.subjectId,
          subjectName: progressData.subjectName,
          branch: progressData.branch,
          semester: progressData.semester,
          progress: progressData.progress || 0,
          timeSpent: progressData.timeSpent || 0,
          lastPosition: progressData.lastPosition || 0,
          totalDuration: progressData.totalDuration || 0,
          completed: progressData.completed || false,
          completedAt: progressData.completedAt,
          bookmarked: progressData.bookmarked || false,
          notes: progressData.notes || '',
          rating: progressData.rating || 0,
          createdAt: now,
          updatedAt: now
        };
        await this._jsonInsert(progress);
        return new FirebaseProgress(progress);
      }

      const progressRef = db.collection('progress').doc();
      const progress = {
        id: progressRef.id,
        userId: progressData.userId,
        contentId: progressData.contentId,
        contentType: progressData.contentType,
        subjectId: progressData.subjectId,
        subjectName: progressData.subjectName,
        branch: progressData.branch,
        semester: progressData.semester,
        progress: progressData.progress || 0,
        timeSpent: progressData.timeSpent || 0,
        lastPosition: progressData.lastPosition || 0,
        totalDuration: progressData.totalDuration || 0,
        completed: progressData.completed || false,
        completedAt: progressData.completedAt,
        bookmarked: progressData.bookmarked || false,
        notes: progressData.notes || '',
        rating: progressData.rating || 0,
        createdAt: now,
        updatedAt: now
      };
      await progressRef.set(progress);
      return new FirebaseProgress(progress);
    } catch (error) {
      console.error('Error creating progress:', error);
      throw error;
    }
  }

  // Find progress by ID
  static async findById(id) {
    try {
      if (!isFirebaseReady) {
        const all = await this._jsonAll();
        const found = all.find(p => p.id === id);
        return found ? new FirebaseProgress(found) : null;
      }
      const progressDoc = await db.collection('progress').doc(id).get();
      if (!progressDoc.exists) return null;
      return new FirebaseProgress({ id: progressDoc.id, ...progressDoc.data() });
    } catch (error) {
      console.error('Error finding progress by ID:', error);
      return null;
    }
  }

  // Find progress by user and content
  static async findByUserAndContent(userId, contentId, contentType = null) {
    try {
      if (!isFirebaseReady) {
        const all = await this._jsonAll();
        const found = all.find(p => 
          p.userId === userId && 
          p.contentId === contentId && 
          (contentType === null || p.contentType === contentType)
        );
        return found ? new FirebaseProgress(found) : null;
      }

      let queryRef = db.collection('progress')
        .where('userId', '==', userId)
        .where('contentId', '==', contentId);

      if (contentType) {
        queryRef = queryRef.where('contentType', '==', contentType);
      }

      const snapshot = await queryRef.get();
      if (snapshot.empty) return null;

      const doc = snapshot.docs[0];
      return new FirebaseProgress({ id: doc.id, ...doc.data() });
    } catch (error) {
      console.error('Error finding progress by user and content:', error);
      return null;
    }
  }

  // Find all progress for user
  static async findByUser(userId, filters = {}) {
    try {
      if (!isFirebaseReady) {
        const all = await this._jsonAll();
        let userProgress = all.filter(p => p.userId === userId);
        
        // Apply filters
        const entries = Object.entries(filters);
        if (entries.length > 0) {
          userProgress = userProgress.filter(p => 
            entries.every(([k, v]) => p[k] === v)
          );
        }
        
        return userProgress.map(p => new FirebaseProgress(p));
      }

      let queryRef = db.collection('progress').where('userId', '==', userId);
      
      // Apply filters
      for (const [field, value] of Object.entries(filters)) {
        if (field !== 'id') {
          queryRef = queryRef.where(field, '==', value);
        }
      }
      
      queryRef = queryRef.orderBy('updatedAt', 'desc');
      
      const snapshot = await queryRef.get();
      const progress = [];
      
      snapshot.forEach(doc => {
        progress.push(new FirebaseProgress({ id: doc.id, ...doc.data() }));
      });
      
      return progress;
    } catch (error) {
      console.error('Error finding progress by user:', error);
      return [];
    }
  }

  // Find progress by subject
  static async findBySubject(subjectId, userId = null) {
    try {
      if (!isFirebaseReady) {
        const all = await this._jsonAll();
        let subjectProgress = all.filter(p => p.subjectId === subjectId);
        if (userId) {
          subjectProgress = subjectProgress.filter(p => p.userId === userId);
        }
        return subjectProgress.map(p => new FirebaseProgress(p));
      }

      let queryRef = db.collection('progress').where('subjectId', '==', subjectId);
      if (userId) {
        queryRef = queryRef.where('userId', '==', userId);
      }
      
      queryRef = queryRef.orderBy('updatedAt', 'desc');
      
      const snapshot = await queryRef.get();
      const progress = [];
      
      snapshot.forEach(doc => {
        progress.push(new FirebaseProgress({ id: doc.id, ...doc.data() }));
      });
      
      return progress;
    } catch (error) {
      console.error('Error finding progress by subject:', error);
      return [];
    }
  }

  // Get user's overall progress for semester
  static async getUserSemesterProgress(userId, semester, branch) {
    try {
      const progress = await this.findByUser(userId, { semester, branch });
      
      if (progress.length === 0) {
        return {
          totalContent: 0,
          completedContent: 0,
          averageProgress: 0,
          totalTimeSpent: 0,
          subjects: []
        };
      }

      const subjects = {};
      let totalTimeSpent = 0;
      let completedCount = 0;

      progress.forEach(p => {
        if (!subjects[p.subjectId]) {
          subjects[p.subjectId] = {
            subjectId: p.subjectId,
            subjectName: p.subjectName,
            totalContent: 0,
            completedContent: 0,
            averageProgress: 0,
            timeSpent: 0
          };
        }

        subjects[p.subjectId].totalContent++;
        subjects[p.subjectId].timeSpent += p.timeSpent;
        totalTimeSpent += p.timeSpent;

        if (p.completed) {
          subjects[p.subjectId].completedContent++;
          completedCount++;
        }
      });

      // Calculate average progress for each subject
      Object.values(subjects).forEach(subject => {
        const subjectProgress = progress.filter(p => p.subjectId === subject.subjectId);
        const totalProgress = subjectProgress.reduce((sum, p) => sum + p.progress, 0);
        subject.averageProgress = subjectProgress.length > 0 ? totalProgress / subjectProgress.length : 0;
      });

      return {
        totalContent: progress.length,
        completedContent: completedCount,
        averageProgress: progress.reduce((sum, p) => sum + p.progress, 0) / progress.length,
        totalTimeSpent,
        subjects: Object.values(subjects)
      };
    } catch (error) {
      console.error('Error getting user semester progress:', error);
      return {
        totalContent: 0,
        completedContent: 0,
        averageProgress: 0,
        totalTimeSpent: 0,
        subjects: []
      };
    }
  }

  // Update progress
  async save() {
    try {
      this.updatedAt = new Date();
      if (!isFirebaseReady) {
        await FirebaseProgress._jsonUpdate(this.id, this);
        return this;
      }
      await db.collection('progress').doc(this.id).update({
        ...this,
        id: undefined
      });
      return this;
    } catch (error) {
      console.error('Error saving progress:', error);
      throw error;
    }
  }

  // Update progress with new data
  static async updateProgress(userId, contentId, contentType, updateData) {
    try {
      let progress = await this.findByUserAndContent(userId, contentId, contentType);
      
      if (!progress) {
        // Create new progress record
        progress = await this.create({
          userId,
          contentId,
          contentType,
          ...updateData
        });
      } else {
        // Update existing progress
        Object.assign(progress, updateData);
        await progress.save();
      }
      
      return progress;
    } catch (error) {
      console.error('Error updating progress:', error);
      throw error;
    }
  }

  // Mark as completed
  async markCompleted() {
    try {
      this.completed = true;
      this.progress = 100;
      this.completedAt = new Date();
      await this.save();
      return this;
    } catch (error) {
      console.error('Error marking as completed:', error);
      throw error;
    }
  }

  // Toggle bookmark
  async toggleBookmark() {
    try {
      this.bookmarked = !this.bookmarked;
      await this.save();
      return this;
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      throw error;
    }
  }

  // Update by ID
  static async findByIdAndUpdate(id, updates) {
    try {
      if (!isFirebaseReady) {
        const all = await this._jsonAll();
        const progress = all.find(p => p.id === id);
        if (progress) {
          Object.assign(progress, updates, { updatedAt: new Date() });
          await this._jsonWrite(all);
          return new FirebaseProgress(progress);
        }
        return null;
      }

      const progressRef = db.collection('progress').doc(id);
      const updateData = {
        ...updates,
        updatedAt: new Date()
      };
      
      await progressRef.update(updateData);
      
      const updatedDoc = await progressRef.get();
      if (!updatedDoc.exists) return null;
      
      return new FirebaseProgress({ id: updatedDoc.id, ...updatedDoc.data() });
    } catch (error) {
      console.error('Error updating progress:', error);
      throw error;
    }
  }

  // Delete progress
  async delete() {
    try {
      if (!isFirebaseReady) {
        await FirebaseProgress._jsonDelete(this.id);
        return true;
      }
      await db.collection('progress').doc(this.id).delete();
      return true;
    } catch (error) {
      console.error('Error deleting progress:', error);
      throw error;
    }
  }

  // Static method to delete by ID
  static async findByIdAndDelete(id) {
    try {
      const progress = await this.findById(id);
      if (progress) {
        await progress.delete();
        return progress;
      }
      return null;
    } catch (error) {
      console.error('Error deleting progress by ID:', error);
      throw error;
    }
  }

  // Get progress statistics
  static async getStats(userId = null) {
    try {
      if (!isFirebaseReady) {
        const all = await this._jsonAll();
        let progress = all;
        if (userId) {
          progress = all.filter(p => p.userId === userId);
        }
        
        const total = progress.length;
        const completed = progress.filter(p => p.completed).length;
        const bookmarked = progress.filter(p => p.bookmarked).length;
        const averageProgress = total > 0 ? progress.reduce((sum, p) => sum + p.progress, 0) / total : 0;
        const totalTimeSpent = progress.reduce((sum, p) => sum + p.timeSpent, 0);
        
        return {
          total,
          completed,
          bookmarked,
          averageProgress,
          totalTimeSpent,
          completionRate: total > 0 ? (completed / total) * 100 : 0
        };
      }

      let queryRef = db.collection('progress');
      if (userId) {
        queryRef = queryRef.where('userId', '==', userId);
      }

      const snapshot = await queryRef.get();
      const stats = {
        total: 0,
        completed: 0,
        bookmarked: 0,
        averageProgress: 0,
        totalTimeSpent: 0,
        completionRate: 0
      };

      let totalProgress = 0;
      snapshot.forEach(doc => {
        const data = doc.data();
        stats.total++;
        if (data.completed) stats.completed++;
        if (data.bookmarked) stats.bookmarked++;
        totalProgress += data.progress || 0;
        stats.totalTimeSpent += data.timeSpent || 0;
      });

      if (stats.total > 0) {
        stats.averageProgress = totalProgress / stats.total;
        stats.completionRate = (stats.completed / stats.total) * 100;
      }

      return stats;
    } catch (error) {
      console.error('Error getting progress stats:', error);
      return { total: 0, completed: 0, bookmarked: 0, averageProgress: 0, totalTimeSpent: 0, completionRate: 0 };
    }
  }

  // -------- Local JSON fallback helpers --------
  static async _dbFile() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const dbDir = path.join(__dirname, '..', 'database');
    const progressFile = path.join(dbDir, 'progress.json');
    try { await fs.mkdir(dbDir, { recursive: true }); } catch {}
    return progressFile;
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

  static async _jsonInsert(progress) {
    const all = await this._jsonAll();
    all.push({ ...progress, createdAt: progress.createdAt, updatedAt: progress.updatedAt });
    await this._jsonWrite(all);
  }

  static async _jsonUpdate(id, patch) {
    const all = await this._jsonAll();
    const idx = all.findIndex(p => p.id === id);
    if (idx === -1) return;
    all[idx] = { ...all[idx], ...patch, id };
    await this._jsonWrite(all);
  }

  static async _jsonDelete(id) {
    const all = await this._jsonAll();
    const filtered = all.filter(p => p.id !== id);
    await this._jsonWrite(filtered);
  }

  static async _generateId() {
    return 'prog_' + Math.random().toString(36).slice(2, 10);
  }
}

export default FirebaseProgress;
