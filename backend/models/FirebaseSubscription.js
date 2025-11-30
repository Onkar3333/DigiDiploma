import { db, isFirebaseReady } from '../lib/firebase.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

class FirebaseSubscription {
  constructor(data) {
    this.id = data.id;
    this.userId = data.userId;
    this.semester = data.semester;
    this.branch = data.branch;
    this.subscriptionType = data.subscriptionType || 'semester'; // semester, annual, lifetime
    this.status = data.status || 'active'; // active, expired, cancelled, pending
    this.startDate = data.startDate;
    this.endDate = data.endDate;
    this.price = data.price;
    this.paymentId = data.paymentId || null; // Mock payment ID or real payment gateway ID
    this.paymentMethod = data.paymentMethod || 'razorpay'; // razorpay, stripe, mock
    this.features = data.features || ['materials', 'quizzes', 'notices']; // Accessible features
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  // Create a new subscription
  static async create(subscriptionData) {
    try {
      const now = new Date();
      if (!isFirebaseReady) {
        const subscription = {
          id: await this._generateId(),
          userId: subscriptionData.userId,
          semester: subscriptionData.semester,
          branch: subscriptionData.branch,
          subscriptionType: subscriptionData.subscriptionType || 'semester',
          status: subscriptionData.status || 'active',
          startDate: subscriptionData.startDate || now,
          endDate: subscriptionData.endDate,
          price: subscriptionData.price,
          paymentId: subscriptionData.paymentId || null,
          paymentMethod: subscriptionData.paymentMethod || 'razorpay',
          features: subscriptionData.features || ['materials', 'quizzes', 'notices'],
          createdAt: now,
          updatedAt: now
        };
        await this._jsonInsert(subscription);
        return new FirebaseSubscription(subscription);
      }

      const subscriptionRef = db.collection('subscriptions').doc();
      const subscription = {
        id: subscriptionRef.id,
        userId: subscriptionData.userId,
        semester: subscriptionData.semester,
        branch: subscriptionData.branch,
        subscriptionType: subscriptionData.subscriptionType || 'semester',
        status: subscriptionData.status || 'active',
        startDate: subscriptionData.startDate || now,
        endDate: subscriptionData.endDate,
        price: subscriptionData.price,
        paymentId: subscriptionData.paymentId || null,
        paymentMethod: subscriptionData.paymentMethod || 'razorpay',
        features: subscriptionData.features || ['materials', 'quizzes', 'notices'],
        createdAt: now,
        updatedAt: now
      };
      await subscriptionRef.set(subscription);
      return new FirebaseSubscription(subscription);
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
  }

  // Find subscription by ID
  static async findById(id) {
    try {
      if (!isFirebaseReady) {
        const all = await this._jsonAll();
        const found = all.find(s => s.id === id);
        return found ? new FirebaseSubscription(found) : null;
      }
      const subscriptionDoc = await db.collection('subscriptions').doc(id).get();
      if (!subscriptionDoc.exists) return null;
      return new FirebaseSubscription({ id: subscriptionDoc.id, ...subscriptionDoc.data() });
    } catch (error) {
      console.error('Error finding subscription by ID:', error);
      return null;
    }
  }

  // Find active subscription for user
  static async findActiveByUser(userId, semester = null) {
    try {
      if (!isFirebaseReady) {
        const all = await this._jsonAll();
        const activeSubscriptions = all.filter(s => 
          s.userId === userId && 
          s.status === 'active' && 
          new Date(s.endDate) > new Date()
        );
        if (semester) {
          return activeSubscriptions.find(s => s.semester === semester) || null;
        }
        return activeSubscriptions.length > 0 ? new FirebaseSubscription(activeSubscriptions[0]) : null;
      }

      let queryRef = db.collection('subscriptions')
        .where('userId', '==', userId)
        .where('status', '==', 'active');

      if (semester) {
        queryRef = queryRef.where('semester', '==', semester);
      }

      const snapshot = await queryRef.get();
      if (snapshot.empty) return null;

      const doc = snapshot.docs[0];
      return new FirebaseSubscription({ id: doc.id, ...doc.data() });
    } catch (error) {
      console.error('Error finding active subscription:', error);
      return null;
    }
  }

  // Find all subscriptions for user
  static async findByUser(userId) {
    try {
      if (!isFirebaseReady) {
        const all = await this._jsonAll();
        const userSubscriptions = all.filter(s => s.userId === userId);
        return userSubscriptions.map(s => new FirebaseSubscription(s));
      }

      const snapshot = await db.collection('subscriptions')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();

      const subscriptions = [];
      snapshot.forEach(doc => {
        subscriptions.push(new FirebaseSubscription({ id: doc.id, ...doc.data() }));
      });
      return subscriptions;
    } catch (error) {
      console.error('Error finding user subscriptions:', error);
      return [];
    }
  }

  // Check if user has access to feature
  static async hasAccess(userId, feature, semester = null) {
    try {
      const subscription = await this.findActiveByUser(userId, semester);
      if (!subscription) return false;
      
      return subscription.features.includes(feature) && 
             new Date(subscription.endDate) > new Date();
    } catch (error) {
      console.error('Error checking access:', error);
      return false;
    }
  }

  // Update subscription
  async save() {
    try {
      this.updatedAt = new Date();
      if (!isFirebaseReady) {
        await FirebaseSubscription._jsonUpdate(this.id, this);
        return this;
      }
      await db.collection('subscriptions').doc(this.id).update({
        ...this,
        id: undefined
      });
      return this;
    } catch (error) {
      console.error('Error saving subscription:', error);
      throw error;
    }
  }

  // Update status
  static async updateStatus(id, status) {
    try {
      if (!isFirebaseReady) {
        const all = await this._jsonAll();
        const subscription = all.find(s => s.id === id);
        if (subscription) {
          subscription.status = status;
          subscription.updatedAt = new Date();
          await this._jsonWrite(all);
          return new FirebaseSubscription(subscription);
        }
        return null;
      }

      const subscriptionRef = db.collection('subscriptions').doc(id);
      await subscriptionRef.update({
        status,
        updatedAt: new Date()
      });

      const updatedDoc = await subscriptionRef.get();
      if (!updatedDoc.exists) return null;
      return new FirebaseSubscription({ id: updatedDoc.id, ...updatedDoc.data() });
    } catch (error) {
      console.error('Error updating subscription status:', error);
      throw error;
    }
  }

  // Delete subscription
  async delete() {
    try {
      if (!isFirebaseReady) {
        await FirebaseSubscription._jsonDelete(this.id);
        return true;
      }
      await db.collection('subscriptions').doc(this.id).delete();
      return true;
    } catch (error) {
      console.error('Error deleting subscription:', error);
      throw error;
    }
  }

  // Static method to delete by ID
  static async findByIdAndDelete(id) {
    try {
      const subscription = await this.findById(id);
      if (subscription) {
        await subscription.delete();
        return subscription;
      }
      return null;
    } catch (error) {
      console.error('Error deleting subscription by ID:', error);
      throw error;
    }
  }

  // Get subscription statistics
  static async getStats() {
    try {
      if (!isFirebaseReady) {
        const all = await this._jsonAll();
        return {
          total: all.length,
          active: all.filter(s => s.status === 'active').length,
          expired: all.filter(s => s.status === 'expired').length,
          cancelled: all.filter(s => s.status === 'cancelled').length,
          revenue: all.reduce((sum, s) => sum + (s.price || 0), 0)
        };
      }

      const snapshot = await db.collection('subscriptions').get();
      const stats = {
        total: 0,
        active: 0,
        expired: 0,
        cancelled: 0,
        revenue: 0
      };

      snapshot.forEach(doc => {
        const data = doc.data();
        stats.total++;
        stats[data.status] = (stats[data.status] || 0) + 1;
        stats.revenue += data.price || 0;
      });

      return stats;
    } catch (error) {
      console.error('Error getting subscription stats:', error);
      return { total: 0, active: 0, expired: 0, cancelled: 0, revenue: 0 };
    }
  }

  // -------- Local JSON fallback helpers --------
  static async _dbFile() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const dbDir = path.join(__dirname, '..', 'database');
    const subscriptionsFile = path.join(dbDir, 'subscriptions.json');
    try { await fs.mkdir(dbDir, { recursive: true }); } catch {}
    return subscriptionsFile;
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

  static async _jsonInsert(subscription) {
    const all = await this._jsonAll();
    all.push({ ...subscription, createdAt: subscription.createdAt, updatedAt: subscription.updatedAt });
    await this._jsonWrite(all);
  }

  static async _jsonUpdate(id, patch) {
    const all = await this._jsonAll();
    const idx = all.findIndex(s => s.id === id);
    if (idx === -1) return;
    all[idx] = { ...all[idx], ...patch, id };
    await this._jsonWrite(all);
  }

  static async _jsonDelete(id) {
    const all = await this._jsonAll();
    const filtered = all.filter(s => s.id !== id);
    await this._jsonWrite(filtered);
  }

  static async _generateId() {
    return 'sub_' + Math.random().toString(36).slice(2, 10);
  }
}

export default FirebaseSubscription;
