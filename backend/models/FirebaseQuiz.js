import { db, isFirebaseReady } from '../lib/firebase.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

class FirebaseQuiz {
  constructor(data) {
    this.id = data.id;
    this.title = data.title;
    this.description = data.description || '';
    this.subjectId = data.subjectId;
    this.subjectName = data.subjectName;
    this.subjectCode = data.subjectCode;
    this.branch = data.branch;
    this.semester = data.semester;
    this.questions = data.questions || [];
    this.timeLimit = data.timeLimit || 30; // minutes
    this.maxAttempts = data.maxAttempts || 3;
    this.passingScore = data.passingScore || 60; // percentage
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.createdBy = data.createdBy;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  // Create a new quiz
  static async create(quizData) {
    try {
      const now = new Date();
      if (!isFirebaseReady) {
        const quiz = {
          id: await this._generateId(),
          title: quizData.title,
          description: quizData.description || '',
          subjectId: quizData.subjectId,
          subjectName: quizData.subjectName,
          subjectCode: quizData.subjectCode,
          branch: quizData.branch,
          semester: quizData.semester,
          questions: quizData.questions || [],
          timeLimit: quizData.timeLimit || 30,
          maxAttempts: quizData.maxAttempts || 3,
          passingScore: quizData.passingScore || 60,
          isActive: quizData.isActive !== undefined ? quizData.isActive : true,
          createdBy: quizData.createdBy,
          createdAt: now,
          updatedAt: now
        };
        await this._jsonInsert(quiz);
        return new FirebaseQuiz(quiz);
      }

      const quizRef = db.collection('quizzes').doc();
      const quiz = {
        id: quizRef.id,
        title: quizData.title,
        description: quizData.description || '',
        subjectId: quizData.subjectId,
        subjectName: quizData.subjectName,
        subjectCode: quizData.subjectCode,
        branch: quizData.branch,
        semester: quizData.semester,
        questions: quizData.questions || [],
        timeLimit: quizData.timeLimit || 30,
        maxAttempts: quizData.maxAttempts || 3,
        passingScore: quizData.passingScore || 60,
        isActive: quizData.isActive !== undefined ? quizData.isActive : true,
        createdBy: quizData.createdBy,
        createdAt: now,
        updatedAt: now
      };
      await quizRef.set(quiz);
      return new FirebaseQuiz(quiz);
    } catch (error) {
      console.error('Error creating quiz:', error);
      throw error;
    }
  }

  // Find quiz by ID
  static async findById(id) {
    try {
      if (!isFirebaseReady) {
        const all = await this._jsonAll();
        const found = all.find(q => q.id === id);
        return found ? new FirebaseQuiz(found) : null;
      }
      const quizDoc = await db.collection('quizzes').doc(id).get();
      if (!quizDoc.exists) return null;
      return new FirebaseQuiz({ id: quizDoc.id, ...quizDoc.data() });
    } catch (error) {
      console.error('Error finding quiz by ID:', error);
      return null;
    }
  }

  // Find quizzes with filters
  static async find(query = {}) {
    try {
      if (!isFirebaseReady) {
        const all = await this._jsonAll();
        const entries = Object.entries(query);
        const filtered = entries.length ? all.filter(q => entries.every(([k, v]) => q[k] === v)) : all;
        return filtered.map(q => new FirebaseQuiz(q));
      }

      let queryRef = db.collection('quizzes');
      
      // Apply filters
      for (const [field, value] of Object.entries(query)) {
        if (field !== 'id') {
          queryRef = queryRef.where(field, '==', value);
        }
      }
      
      // Add ordering
      queryRef = queryRef.orderBy('createdAt', 'desc');
      
      const snapshot = await queryRef.get();
      const quizzes = [];
      
      snapshot.forEach(doc => {
        quizzes.push(new FirebaseQuiz({ id: doc.id, ...doc.data() }));
      });
      
      return quizzes;
    } catch (error) {
      console.error('Error finding quizzes:', error);
      return [];
    }
  }

  // Find quizzes by subject
  static async findBySubject(subjectId) {
    try {
      return await this.find({ subjectId, isActive: true });
    } catch (error) {
      console.error('Error finding quizzes by subject:', error);
      return [];
    }
  }

  // Find quizzes by semester and branch
  static async findBySemesterBranch(semester, branch) {
    try {
      return await this.find({ semester, branch, isActive: true });
    } catch (error) {
      console.error('Error finding quizzes by semester and branch:', error);
      return [];
    }
  }

  // Update quiz
  async save() {
    try {
      this.updatedAt = new Date();
      if (!isFirebaseReady) {
        await FirebaseQuiz._jsonUpdate(this.id, this);
        return this;
      }
      await db.collection('quizzes').doc(this.id).update({
        ...this,
        id: undefined
      });
      return this;
    } catch (error) {
      console.error('Error saving quiz:', error);
      throw error;
    }
  }

  // Update by ID
  static async findByIdAndUpdate(id, updates) {
    try {
      if (!isFirebaseReady) {
        const all = await this._jsonAll();
        const quiz = all.find(q => q.id === id);
        if (quiz) {
          Object.assign(quiz, updates, { updatedAt: new Date() });
          await this._jsonWrite(all);
          return new FirebaseQuiz(quiz);
        }
        return null;
      }

      const quizRef = db.collection('quizzes').doc(id);
      const updateData = {
        ...updates,
        updatedAt: new Date()
      };
      
      await quizRef.update(updateData);
      
      const updatedDoc = await quizRef.get();
      if (!updatedDoc.exists) return null;
      
      return new FirebaseQuiz({ id: updatedDoc.id, ...updatedDoc.data() });
    } catch (error) {
      console.error('Error updating quiz:', error);
      throw error;
    }
  }

  // Delete quiz
  async delete() {
    try {
      if (!isFirebaseReady) {
        await FirebaseQuiz._jsonDelete(this.id);
        return true;
      }
      await db.collection('quizzes').doc(this.id).delete();
      return true;
    } catch (error) {
      console.error('Error deleting quiz:', error);
      throw error;
    }
  }

  // Static method to delete by ID
  static async findByIdAndDelete(id) {
    try {
      const quiz = await this.findById(id);
      if (quiz) {
        await quiz.delete();
        return quiz;
      }
      return null;
    } catch (error) {
      console.error('Error deleting quiz by ID:', error);
      throw error;
    }
  }

  // Get quiz statistics
  static async getStats() {
    try {
      if (!isFirebaseReady) {
        const all = await this._jsonAll();
        return {
          total: all.length,
          active: all.filter(q => q.isActive).length,
          inactive: all.filter(q => !q.isActive).length,
          averageQuestions: all.reduce((sum, q) => sum + q.questions.length, 0) / all.length || 0
        };
      }

      const snapshot = await db.collection('quizzes').get();
      const stats = {
        total: 0,
        active: 0,
        inactive: 0,
        averageQuestions: 0
      };

      let totalQuestions = 0;
      snapshot.forEach(doc => {
        const data = doc.data();
        stats.total++;
        if (data.isActive) stats.active++;
        else stats.inactive++;
        totalQuestions += data.questions.length || 0;
      });

      stats.averageQuestions = stats.total > 0 ? totalQuestions / stats.total : 0;
      return stats;
    } catch (error) {
      console.error('Error getting quiz stats:', error);
      return { total: 0, active: 0, inactive: 0, averageQuestions: 0 };
    }
  }

  // -------- Local JSON fallback helpers --------
  static async _dbFile() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const dbDir = path.join(__dirname, '..', 'database');
    const quizzesFile = path.join(dbDir, 'quizzes.json');
    try { await fs.mkdir(dbDir, { recursive: true }); } catch {}
    return quizzesFile;
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

  static async _jsonInsert(quiz) {
    const all = await this._jsonAll();
    all.push({ ...quiz, createdAt: quiz.createdAt, updatedAt: quiz.updatedAt });
    await this._jsonWrite(all);
  }

  static async _jsonUpdate(id, patch) {
    const all = await this._jsonAll();
    const idx = all.findIndex(q => q.id === id);
    if (idx === -1) return;
    all[idx] = { ...all[idx], ...patch, id };
    await this._jsonWrite(all);
  }

  static async _jsonDelete(id) {
    const all = await this._jsonAll();
    const filtered = all.filter(q => q.id !== id);
    await this._jsonWrite(filtered);
  }

  static async _generateId() {
    return 'quiz_' + Math.random().toString(36).slice(2, 10);
  }
}

export default FirebaseQuiz;
