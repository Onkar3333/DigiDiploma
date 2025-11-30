import { db, isFirebaseReady } from '../lib/firebase.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

class FirebaseQuizAttempt {
  constructor(data) {
    this.id = data.id;
    this.userId = data.userId;
    this.quizId = data.quizId;
    this.quizTitle = data.quizTitle;
    this.subjectId = data.subjectId;
    this.subjectName = data.subjectName;
    this.branch = data.branch;
    this.semester = data.semester;
    this.answers = data.answers || []; // Array of { questionId, selectedAnswer, isCorrect }
    this.score = data.score || 0;
    this.totalQuestions = data.totalQuestions || 0;
    this.correctAnswers = data.correctAnswers || 0;
    this.wrongAnswers = data.wrongAnswers || 0;
    this.percentage = data.percentage || 0;
    this.passed = data.passed || false;
    this.timeSpent = data.timeSpent || 0; // in minutes
    this.timeLimit = data.timeLimit || 30;
    this.attemptNumber = data.attemptNumber || 1;
    this.status = data.status || 'completed'; // started, completed, abandoned
    this.completedAt = data.completedAt;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  // Create a new quiz attempt
  static async create(attemptData) {
    try {
      const now = new Date();
      if (!isFirebaseReady) {
        const attempt = {
          id: await this._generateId(),
          userId: attemptData.userId,
          quizId: attemptData.quizId,
          quizTitle: attemptData.quizTitle,
          subjectId: attemptData.subjectId,
          subjectName: attemptData.subjectName,
          branch: attemptData.branch,
          semester: attemptData.semester,
          answers: attemptData.answers || [],
          score: attemptData.score || 0,
          totalQuestions: attemptData.totalQuestions || 0,
          correctAnswers: attemptData.correctAnswers || 0,
          wrongAnswers: attemptData.wrongAnswers || 0,
          percentage: attemptData.percentage || 0,
          passed: attemptData.passed || false,
          timeSpent: attemptData.timeSpent || 0,
          timeLimit: attemptData.timeLimit || 30,
          attemptNumber: attemptData.attemptNumber || 1,
          status: attemptData.status || 'completed',
          completedAt: attemptData.completedAt || now,
          createdAt: now,
          updatedAt: now
        };
        await this._jsonInsert(attempt);
        return new FirebaseQuizAttempt(attempt);
      }

      const attemptRef = db.collection('quizAttempts').doc();
      const attempt = {
        id: attemptRef.id,
        userId: attemptData.userId,
        quizId: attemptData.quizId,
        quizTitle: attemptData.quizTitle,
        subjectId: attemptData.subjectId,
        subjectName: attemptData.subjectName,
        branch: attemptData.branch,
        semester: attemptData.semester,
        answers: attemptData.answers || [],
        score: attemptData.score || 0,
        totalQuestions: attemptData.totalQuestions || 0,
        correctAnswers: attemptData.correctAnswers || 0,
        wrongAnswers: attemptData.wrongAnswers || 0,
        percentage: attemptData.percentage || 0,
        passed: attemptData.passed || false,
        timeSpent: attemptData.timeSpent || 0,
        timeLimit: attemptData.timeLimit || 30,
        attemptNumber: attemptData.attemptNumber || 1,
        status: attemptData.status || 'completed',
        completedAt: attemptData.completedAt || now,
        createdAt: now,
        updatedAt: now
      };
      await attemptRef.set(attempt);
      return new FirebaseQuizAttempt(attempt);
    } catch (error) {
      console.error('Error creating quiz attempt:', error);
      throw error;
    }
  }

  // Find attempt by ID
  static async findById(id) {
    try {
      if (!isFirebaseReady) {
        const all = await this._jsonAll();
        const found = all.find(a => a.id === id);
        return found ? new FirebaseQuizAttempt(found) : null;
      }
      const attemptDoc = await db.collection('quizAttempts').doc(id).get();
      if (!attemptDoc.exists) return null;
      return new FirebaseQuizAttempt({ id: attemptDoc.id, ...attemptDoc.data() });
    } catch (error) {
      console.error('Error finding quiz attempt by ID:', error);
      return null;
    }
  }

  // Find attempts by user
  static async findByUser(userId, quizId = null) {
    try {
      if (!isFirebaseReady) {
        const all = await this._jsonAll();
        let userAttempts = all.filter(a => a.userId === userId);
        if (quizId) {
          userAttempts = userAttempts.filter(a => a.quizId === quizId);
        }
        return userAttempts.map(a => new FirebaseQuizAttempt(a));
      }

      let queryRef = db.collection('quizAttempts').where('userId', '==', userId);
      if (quizId) {
        queryRef = queryRef.where('quizId', '==', quizId);
      }
      
      queryRef = queryRef.orderBy('createdAt', 'desc');
      
      const snapshot = await queryRef.get();
      const attempts = [];
      
      snapshot.forEach(doc => {
        attempts.push(new FirebaseQuizAttempt({ id: doc.id, ...doc.data() }));
      });
      
      return attempts;
    } catch (error) {
      console.error('Error finding quiz attempts by user:', error);
      return [];
    }
  }

  // Find attempts by quiz
  static async findByQuiz(quizId) {
    try {
      if (!isFirebaseReady) {
        const all = await this._jsonAll();
        const quizAttempts = all.filter(a => a.quizId === quizId);
        return quizAttempts.map(a => new FirebaseQuizAttempt(a));
      }

      const snapshot = await db.collection('quizAttempts')
        .where('quizId', '==', quizId)
        .orderBy('createdAt', 'desc')
        .get();

      const attempts = [];
      snapshot.forEach(doc => {
        attempts.push(new FirebaseQuizAttempt({ id: doc.id, ...doc.data() }));
      });
      
      return attempts;
    } catch (error) {
      console.error('Error finding quiz attempts by quiz:', error);
      return [];
    }
  }

  // Get user's best attempt for a quiz
  static async getBestAttempt(userId, quizId) {
    try {
      const attempts = await this.findByUser(userId, quizId);
      if (attempts.length === 0) return null;
      
      return attempts.reduce((best, current) => {
        return current.score > best.score ? current : best;
      });
    } catch (error) {
      console.error('Error getting best attempt:', error);
      return null;
    }
  }

  // Get user's latest attempt for a quiz
  static async getLatestAttempt(userId, quizId) {
    try {
      const attempts = await this.findByUser(userId, quizId);
      if (attempts.length === 0) return null;
      
      return attempts[0]; // Already sorted by createdAt desc
    } catch (error) {
      console.error('Error getting latest attempt:', error);
      return null;
    }
  }

  // Check if user can attempt quiz
  static async canAttempt(userId, quizId, maxAttempts) {
    try {
      const attempts = await this.findByUser(userId, quizId);
      return attempts.length < maxAttempts;
    } catch (error) {
      console.error('Error checking if user can attempt:', error);
      return false;
    }
  }

  // Update attempt
  async save() {
    try {
      this.updatedAt = new Date();
      if (!isFirebaseReady) {
        await FirebaseQuizAttempt._jsonUpdate(this.id, this);
        return this;
      }
      await db.collection('quizAttempts').doc(this.id).update({
        ...this,
        id: undefined
      });
      return this;
    } catch (error) {
      console.error('Error saving quiz attempt:', error);
      throw error;
    }
  }

  // Update by ID
  static async findByIdAndUpdate(id, updates) {
    try {
      if (!isFirebaseReady) {
        const all = await this._jsonAll();
        const attempt = all.find(a => a.id === id);
        if (attempt) {
          Object.assign(attempt, updates, { updatedAt: new Date() });
          await this._jsonWrite(all);
          return new FirebaseQuizAttempt(attempt);
        }
        return null;
      }

      const attemptRef = db.collection('quizAttempts').doc(id);
      const updateData = {
        ...updates,
        updatedAt: new Date()
      };
      
      await attemptRef.update(updateData);
      
      const updatedDoc = await attemptRef.get();
      if (!updatedDoc.exists) return null;
      
      return new FirebaseQuizAttempt({ id: updatedDoc.id, ...updatedDoc.data() });
    } catch (error) {
      console.error('Error updating quiz attempt:', error);
      throw error;
    }
  }

  // Delete attempt
  async delete() {
    try {
      if (!isFirebaseReady) {
        await FirebaseQuizAttempt._jsonDelete(this.id);
        return true;
      }
      await db.collection('quizAttempts').doc(this.id).delete();
      return true;
    } catch (error) {
      console.error('Error deleting quiz attempt:', error);
      throw error;
    }
  }

  // Static method to delete by ID
  static async findByIdAndDelete(id) {
    try {
      const attempt = await this.findById(id);
      if (attempt) {
        await attempt.delete();
        return attempt;
      }
      return null;
    } catch (error) {
      console.error('Error deleting quiz attempt by ID:', error);
      throw error;
    }
  }

  // Get quiz attempt statistics
  static async getStats(quizId = null) {
    try {
      if (!isFirebaseReady) {
        const all = await this._jsonAll();
        let attempts = all;
        if (quizId) {
          attempts = all.filter(a => a.quizId === quizId);
        }
        
        const total = attempts.length;
        const passed = attempts.filter(a => a.passed).length;
        const averageScore = total > 0 ? attempts.reduce((sum, a) => sum + a.score, 0) / total : 0;
        const averageTime = total > 0 ? attempts.reduce((sum, a) => sum + a.timeSpent, 0) / total : 0;
        
        return {
          total,
          passed,
          failed: total - passed,
          passRate: total > 0 ? (passed / total) * 100 : 0,
          averageScore,
          averageTime
        };
      }

      let queryRef = db.collection('quizAttempts');
      if (quizId) {
        queryRef = queryRef.where('quizId', '==', quizId);
      }

      const snapshot = await queryRef.get();
      const stats = {
        total: 0,
        passed: 0,
        failed: 0,
        passRate: 0,
        averageScore: 0,
        averageTime: 0
      };

      let totalScore = 0;
      let totalTime = 0;

      snapshot.forEach(doc => {
        const data = doc.data();
        stats.total++;
        if (data.passed) stats.passed++;
        else stats.failed++;
        totalScore += data.score || 0;
        totalTime += data.timeSpent || 0;
      });

      if (stats.total > 0) {
        stats.passRate = (stats.passed / stats.total) * 100;
        stats.averageScore = totalScore / stats.total;
        stats.averageTime = totalTime / stats.total;
      }

      return stats;
    } catch (error) {
      console.error('Error getting quiz attempt stats:', error);
      return { total: 0, passed: 0, failed: 0, passRate: 0, averageScore: 0, averageTime: 0 };
    }
  }

  // -------- Local JSON fallback helpers --------
  static async _dbFile() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const dbDir = path.join(__dirname, '..', 'database');
    const attemptsFile = path.join(dbDir, 'quizAttempts.json');
    try { await fs.mkdir(dbDir, { recursive: true }); } catch {}
    return attemptsFile;
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

  static async _jsonInsert(attempt) {
    const all = await this._jsonAll();
    all.push({ ...attempt, createdAt: attempt.createdAt, updatedAt: attempt.updatedAt });
    await this._jsonWrite(all);
  }

  static async _jsonUpdate(id, patch) {
    const all = await this._jsonAll();
    const idx = all.findIndex(a => a.id === id);
    if (idx === -1) return;
    all[idx] = { ...all[idx], ...patch, id };
    await this._jsonWrite(all);
  }

  static async _jsonDelete(id) {
    const all = await this._jsonAll();
    const filtered = all.filter(a => a.id !== id);
    await this._jsonWrite(filtered);
  }

  static async _generateId() {
    return 'attempt_' + Math.random().toString(36).slice(2, 10);
  }
}

export default FirebaseQuizAttempt;
