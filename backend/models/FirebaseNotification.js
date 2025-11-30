import { db, isFirebaseReady } from '../lib/firebase.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

class FirebaseNotification {
  constructor(data) {
    this.id = data.id;
    this.userId = data.userId;
    this.title = data.title;
    this.message = data.message;
    this.type = data.type || 'info'; // info, success, warning, error, announcement
    this.category = data.category || 'general'; // general, subscription, quiz, material, offer, system
    this.priority = data.priority || 'medium'; // low, medium, high, urgent
    this.isRead = data.isRead || false;
    this.isEmailSent = data.isEmailSent || false;
    this.isPushSent = data.isPushSent || false;
    this.actionUrl = data.actionUrl || null;
    this.actionText = data.actionText || null;
    this.metadata = data.metadata || {}; // Additional data like subscriptionId, quizId, etc.
    this.scheduledFor = data.scheduledFor || null; // For scheduled notifications
    this.sentAt = data.sentAt;
    this.readAt = data.readAt;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  // Create a new notification
  static async create(notificationData) {
    try {
      const now = new Date();
      if (!isFirebaseReady) {
        const notification = {
          id: await this._generateId(),
          userId: notificationData.userId,
          title: notificationData.title,
          message: notificationData.message,
          type: notificationData.type || 'info',
          category: notificationData.category || 'general',
          priority: notificationData.priority || 'medium',
          isRead: false,
          isEmailSent: false,
          isPushSent: false,
          actionUrl: notificationData.actionUrl || null,
          actionText: notificationData.actionText || null,
          metadata: notificationData.metadata || {},
          scheduledFor: notificationData.scheduledFor || null,
          sentAt: notificationData.sentAt || now,
          readAt: null,
          createdAt: now,
          updatedAt: now
        };
        await this._jsonInsert(notification);
        return new FirebaseNotification(notification);
      }

      const notificationRef = db.collection('notifications').doc();
      const notification = {
        id: notificationRef.id,
        userId: notificationData.userId,
        title: notificationData.title,
        message: notificationData.message,
        type: notificationData.type || 'info',
        category: notificationData.category || 'general',
        priority: notificationData.priority || 'medium',
        isRead: false,
        isEmailSent: false,
        isPushSent: false,
        actionUrl: notificationData.actionUrl || null,
        actionText: notificationData.actionText || null,
        metadata: notificationData.metadata || {},
        scheduledFor: notificationData.scheduledFor || null,
        sentAt: notificationData.sentAt || now,
        readAt: null,
        createdAt: now,
        updatedAt: now
      };
      await notificationRef.set(notification);
      return new FirebaseNotification(notification);
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Find notification by ID
  static async findById(id) {
    try {
      if (!isFirebaseReady) {
        const all = await this._jsonAll();
        const found = all.find(n => n.id === id);
        return found ? new FirebaseNotification(found) : null;
      }
      const notificationDoc = await db.collection('notifications').doc(id).get();
      if (!notificationDoc.exists) return null;
      return new FirebaseNotification({ id: notificationDoc.id, ...notificationDoc.data() });
    } catch (error) {
      console.error('Error finding notification by ID:', error);
      return null;
    }
  }

  // Find notifications for user
  static async findByUser(userId, filters = {}) {
    try {
      if (!isFirebaseReady) {
        const all = await this._jsonAll();
        let userNotifications = all.filter(n => n.userId === userId);
        
        // Apply filters
        const entries = Object.entries(filters);
        if (entries.length > 0) {
          userNotifications = userNotifications.filter(n => 
            entries.every(([k, v]) => n[k] === v)
          );
        }
        
        return userNotifications.map(n => new FirebaseNotification(n));
      }

      let queryRef = db.collection('notifications').where('userId', '==', userId);
      
      // Apply filters
      for (const [field, value] of Object.entries(filters)) {
        if (field !== 'id') {
          queryRef = queryRef.where(field, '==', value);
        }
      }
      
      queryRef = queryRef.orderBy('createdAt', 'desc');
      
      const snapshot = await queryRef.get();
      const notifications = [];
      
      snapshot.forEach(doc => {
        notifications.push(new FirebaseNotification({ id: doc.id, ...doc.data() }));
      });
      
      return notifications;
    } catch (error) {
      console.error('Error finding notifications by user:', error);
      return [];
    }
  }

  // Find unread notifications for user
  static async findUnreadByUser(userId) {
    try {
      return await this.findByUser(userId, { isRead: false });
    } catch (error) {
      console.error('Error finding unread notifications:', error);
      return [];
    }
  }

  // Find notifications by category
  static async findByCategory(category) {
    try {
      if (!isFirebaseReady) {
        const all = await this._jsonAll();
        const categoryNotifications = all.filter(n => n.category === category);
        return categoryNotifications.map(n => new FirebaseNotification(n));
      }

      const snapshot = await db.collection('notifications')
        .where('category', '==', category)
        .orderBy('createdAt', 'desc')
        .get();

      const notifications = [];
      snapshot.forEach(doc => {
        notifications.push(new FirebaseNotification({ id: doc.id, ...doc.data() }));
      });
      
      return notifications;
    } catch (error) {
      console.error('Error finding notifications by category:', error);
      return [];
    }
  }

  // Find scheduled notifications
  static async findScheduled() {
    try {
      const now = new Date();
      if (!isFirebaseReady) {
        const all = await this._jsonAll();
        const scheduledNotifications = all.filter(n => 
          n.scheduledFor && new Date(n.scheduledFor) <= now
        );
        return scheduledNotifications.map(n => new FirebaseNotification(n));
      }

      const snapshot = await db.collection('notifications')
        .where('scheduledFor', '<=', now)
        .orderBy('scheduledFor', 'asc')
        .get();

      const notifications = [];
      snapshot.forEach(doc => {
        notifications.push(new FirebaseNotification({ id: doc.id, ...doc.data() }));
      });
      
      return notifications;
    } catch (error) {
      console.error('Error finding scheduled notifications:', error);
      return [];
    }
  }

  // Mark as read
  async markAsRead() {
    try {
      this.isRead = true;
      this.readAt = new Date();
      this.updatedAt = new Date();
      await this.save();
      return this;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Mark as unread
  async markAsUnread() {
    try {
      this.isRead = false;
      this.readAt = null;
      this.updatedAt = new Date();
      await this.save();
      return this;
    } catch (error) {
      console.error('Error marking notification as unread:', error);
      throw error;
    }
  }

  // Mark email as sent
  async markEmailSent() {
    try {
      this.isEmailSent = true;
      this.updatedAt = new Date();
      await this.save();
      return this;
    } catch (error) {
      console.error('Error marking email as sent:', error);
      throw error;
    }
  }

  // Mark push as sent
  async markPushSent() {
    try {
      this.isPushSent = true;
      this.updatedAt = new Date();
      await this.save();
      return this;
    } catch (error) {
      console.error('Error marking push as sent:', error);
      throw error;
    }
  }

  // Update notification
  async save() {
    try {
      this.updatedAt = new Date();
      if (!isFirebaseReady) {
        await FirebaseNotification._jsonUpdate(this.id, this);
        return this;
      }
      await db.collection('notifications').doc(this.id).update({
        ...this,
        id: undefined
      });
      return this;
    } catch (error) {
      console.error('Error saving notification:', error);
      throw error;
    }
  }

  // Update by ID
  static async findByIdAndUpdate(id, updates) {
    try {
      if (!isFirebaseReady) {
        const all = await this._jsonAll();
        const notification = all.find(n => n.id === id);
        if (notification) {
          Object.assign(notification, updates, { updatedAt: new Date() });
          await this._jsonWrite(all);
          return new FirebaseNotification(notification);
        }
        return null;
      }

      const notificationRef = db.collection('notifications').doc(id);
      const updateData = {
        ...updates,
        updatedAt: new Date()
      };
      
      await notificationRef.update(updateData);
      
      const updatedDoc = await notificationRef.get();
      if (!updatedDoc.exists) return null;
      
      return new FirebaseNotification({ id: updatedDoc.id, ...updatedDoc.data() });
    } catch (error) {
      console.error('Error updating notification:', error);
      throw error;
    }
  }

  // Delete notification
  async delete() {
    try {
      if (!isFirebaseReady) {
        await FirebaseNotification._jsonDelete(this.id);
        return true;
      }
      await db.collection('notifications').doc(this.id).delete();
      return true;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  // Static method to delete by ID
  static async findByIdAndDelete(id) {
    try {
      const notification = await this.findById(id);
      if (notification) {
        await notification.delete();
        return notification;
      }
      return null;
    } catch (error) {
      console.error('Error deleting notification by ID:', error);
      throw error;
    }
  }

  // Mark all notifications as read for user
  static async markAllAsRead(userId) {
    try {
      if (!isFirebaseReady) {
        const all = await this._jsonAll();
        const userNotifications = all.filter(n => n.userId === userId && !n.isRead);
        userNotifications.forEach(n => {
          n.isRead = true;
          n.readAt = new Date();
          n.updatedAt = new Date();
        });
        await this._jsonWrite(all);
        return userNotifications.length;
      }

      const snapshot = await db.collection('notifications')
        .where('userId', '==', userId)
        .where('isRead', '==', false)
        .get();

      const batch = db.batch();
      const now = new Date();

      snapshot.forEach(doc => {
        batch.update(doc.ref, {
          isRead: true,
          readAt: now,
          updatedAt: now
        });
      });

      await batch.commit();
      return snapshot.size;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Get notification statistics
  static async getStats(userId = null) {
    try {
      if (!isFirebaseReady) {
        const all = await this._jsonAll();
        let notifications = all;
        if (userId) {
          notifications = all.filter(n => n.userId === userId);
        }
        
        return {
          total: notifications.length,
          unread: notifications.filter(n => !n.isRead).length,
          read: notifications.filter(n => n.isRead).length,
          emailSent: notifications.filter(n => n.isEmailSent).length,
          pushSent: notifications.filter(n => n.isPushSent).length,
          byType: notifications.reduce((acc, n) => {
            acc[n.type] = (acc[n.type] || 0) + 1;
            return acc;
          }, {}),
          byCategory: notifications.reduce((acc, n) => {
            acc[n.category] = (acc[n.category] || 0) + 1;
            return acc;
          }, {})
        };
      }

      let queryRef = db.collection('notifications');
      if (userId) {
        queryRef = queryRef.where('userId', '==', userId);
      }

      const snapshot = await queryRef.get();
      const stats = {
        total: 0,
        unread: 0,
        read: 0,
        emailSent: 0,
        pushSent: 0,
        byType: {},
        byCategory: {}
      };

      snapshot.forEach(doc => {
        const data = doc.data();
        stats.total++;
        if (data.isRead) stats.read++;
        else stats.unread++;
        if (data.isEmailSent) stats.emailSent++;
        if (data.isPushSent) stats.pushSent++;
        
        stats.byType[data.type] = (stats.byType[data.type] || 0) + 1;
        stats.byCategory[data.category] = (stats.byCategory[data.category] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Error getting notification stats:', error);
      return { total: 0, unread: 0, read: 0, emailSent: 0, pushSent: 0, byType: {}, byCategory: {} };
    }
  }

  // -------- Local JSON fallback helpers --------
  static async _dbFile() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const dbDir = path.join(__dirname, '..', 'database');
    const notificationsFile = path.join(dbDir, 'notifications.json');
    try { await fs.mkdir(dbDir, { recursive: true }); } catch {}
    return notificationsFile;
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

  static async _jsonInsert(notification) {
    const all = await this._jsonAll();
    all.push({ ...notification, createdAt: notification.createdAt, updatedAt: notification.updatedAt });
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
    return 'notif_' + Math.random().toString(36).slice(2, 10);
  }
}

export default FirebaseNotification;
