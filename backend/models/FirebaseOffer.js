import { db, isFirebaseReady } from '../lib/firebase.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

class FirebaseOffer {
  constructor(data) {
    this.id = data.id;
    this.title = data.title;
    this.description = data.description || '';
    this.discountType = data.discountType || 'percentage'; // percentage, fixed, free
    this.discountValue = data.discountValue || 0;
    this.originalPrice = data.originalPrice || 0;
    this.discountedPrice = data.discountedPrice || 0;
    this.subscriptionType = data.subscriptionType || 'semester'; // semester, annual, lifetime
    this.branch = data.branch || 'all'; // specific branch or 'all'
    this.semester = data.semester || 'all'; // specific semester or 'all'
    this.startDate = data.startDate;
    this.endDate = data.endDate;
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.maxUses = data.maxUses || null; // null for unlimited
    this.usedCount = data.usedCount || 0;
    this.conditions = data.conditions || []; // Array of conditions
    this.createdBy = data.createdBy;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  // Create a new offer
  static async create(offerData) {
    try {
      const now = new Date();
      if (!isFirebaseReady) {
        const offer = {
          id: await this._generateId(),
          title: offerData.title,
          description: offerData.description || '',
          discountType: offerData.discountType || 'percentage',
          discountValue: offerData.discountValue || 0,
          originalPrice: offerData.originalPrice || 0,
          discountedPrice: offerData.discountedPrice || 0,
          subscriptionType: offerData.subscriptionType || 'semester',
          branch: offerData.branch || 'all',
          semester: offerData.semester || 'all',
          startDate: offerData.startDate,
          endDate: offerData.endDate,
          isActive: offerData.isActive !== undefined ? offerData.isActive : true,
          maxUses: offerData.maxUses || null,
          usedCount: 0,
          conditions: offerData.conditions || [],
          createdBy: offerData.createdBy,
          createdAt: now,
          updatedAt: now
        };
        await this._jsonInsert(offer);
        return new FirebaseOffer(offer);
      }

      const offerRef = db.collection('offers').doc();
      const offer = {
        id: offerRef.id,
        title: offerData.title,
        description: offerData.description || '',
        discountType: offerData.discountType || 'percentage',
        discountValue: offerData.discountValue || 0,
        originalPrice: offerData.originalPrice || 0,
        discountedPrice: offerData.discountedPrice || 0,
        subscriptionType: offerData.subscriptionType || 'semester',
        branch: offerData.branch || 'all',
        semester: offerData.semester || 'all',
        startDate: offerData.startDate,
        endDate: offerData.endDate,
        isActive: offerData.isActive !== undefined ? offerData.isActive : true,
        maxUses: offerData.maxUses || null,
        usedCount: 0,
        conditions: offerData.conditions || [],
        createdBy: offerData.createdBy,
        createdAt: now,
        updatedAt: now
      };
      await offerRef.set(offer);
      return new FirebaseOffer(offer);
    } catch (error) {
      console.error('Error creating offer:', error);
      throw error;
    }
  }

  // Find offer by ID
  static async findById(id) {
    try {
      if (!isFirebaseReady) {
        const all = await this._jsonAll();
        const found = all.find(o => o.id === id);
        return found ? new FirebaseOffer(found) : null;
      }
      const offerDoc = await db.collection('offers').doc(id).get();
      if (!offerDoc.exists) return null;
      return new FirebaseOffer({ id: offerDoc.id, ...offerDoc.data() });
    } catch (error) {
      console.error('Error finding offer by ID:', error);
      return null;
    }
  }

  // Find active offers
  static async findActive(query = {}) {
    try {
      const now = new Date();
      if (!isFirebaseReady) {
        const all = await this._jsonAll();
        let activeOffers = all.filter(o => 
          o.isActive && 
          new Date(o.startDate) <= now && 
          new Date(o.endDate) >= now &&
          (o.maxUses === null || o.usedCount < o.maxUses)
        );
        
        // Apply additional filters
        const entries = Object.entries(query);
        if (entries.length > 0) {
          activeOffers = activeOffers.filter(o => 
            entries.every(([k, v]) => o[k] === v || o[k] === 'all')
          );
        }
        
        return activeOffers.map(o => new FirebaseOffer(o));
      }

      let queryRef = db.collection('offers')
        .where('isActive', '==', true)
        .where('startDate', '<=', now)
        .where('endDate', '>=', now);

      // Apply additional filters
      for (const [field, value] of Object.entries(query)) {
        if (field !== 'id') {
          queryRef = queryRef.where(field, '==', value);
        }
      }

      queryRef = queryRef.orderBy('createdAt', 'desc');
      
      const snapshot = await queryRef.get();
      const offers = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        // Check maxUses condition
        if (data.maxUses === null || data.usedCount < data.maxUses) {
          offers.push(new FirebaseOffer({ id: doc.id, ...data }));
        }
      });
      
      return offers;
    } catch (error) {
      console.error('Error finding active offers:', error);
      return [];
    }
  }

  // Find offers with filters
  static async find(query = {}) {
    try {
      if (!isFirebaseReady) {
        const all = await this._jsonAll();
        const entries = Object.entries(query);
        const filtered = entries.length ? all.filter(o => entries.every(([k, v]) => o[k] === v)) : all;
        return filtered.map(o => new FirebaseOffer(o));
      }

      let queryRef = db.collection('offers');
      
      // Apply filters
      for (const [field, value] of Object.entries(query)) {
        if (field !== 'id') {
          queryRef = queryRef.where(field, '==', value);
        }
      }
      
      // Add ordering
      queryRef = queryRef.orderBy('createdAt', 'desc');
      
      const snapshot = await queryRef.get();
      const offers = [];
      
      snapshot.forEach(doc => {
        offers.push(new FirebaseOffer({ id: doc.id, ...doc.data() }));
      });
      
      return offers;
    } catch (error) {
      console.error('Error finding offers:', error);
      return [];
    }
  }

  // Find offers applicable to user
  static async findApplicable(userBranch, userSemester, subscriptionType = 'semester') {
    try {
      const applicableOffers = [];
      
      // Get all active offers
      const activeOffers = await this.findActive();
      
      for (const offer of activeOffers) {
        // Check if offer applies to user's branch
        if (offer.branch !== 'all' && offer.branch !== userBranch) {
          continue;
        }
        
        // Check if offer applies to user's semester
        if (offer.semester !== 'all' && offer.semester !== userSemester) {
          continue;
        }
        
        // Check if offer applies to subscription type
        if (offer.subscriptionType !== subscriptionType) {
          continue;
        }
        
        applicableOffers.push(offer);
      }
      
      return applicableOffers;
    } catch (error) {
      console.error('Error finding applicable offers:', error);
      return [];
    }
  }

  // Check if offer is valid
  isValid() {
    const now = new Date();
    return this.isActive && 
           new Date(this.startDate) <= now && 
           new Date(this.endDate) >= now &&
           (this.maxUses === null || this.usedCount < this.maxUses);
  }

  // Calculate discounted price
  calculateDiscountedPrice(originalPrice) {
    if (this.discountType === 'percentage') {
      return originalPrice * (1 - this.discountValue / 100);
    } else if (this.discountType === 'fixed') {
      return Math.max(0, originalPrice - this.discountValue);
    } else if (this.discountType === 'free') {
      return 0;
    }
    return originalPrice;
  }

  // Use offer (increment used count)
  async use() {
    try {
      if (!this.isValid()) {
        throw new Error('Offer is not valid');
      }
      
      this.usedCount++;
      this.updatedAt = new Date();
      await this.save();
      return this;
    } catch (error) {
      console.error('Error using offer:', error);
      throw error;
    }
  }

  // Update offer
  async save() {
    try {
      this.updatedAt = new Date();
      if (!isFirebaseReady) {
        await FirebaseOffer._jsonUpdate(this.id, this);
        return this;
      }
      await db.collection('offers').doc(this.id).update({
        ...this,
        id: undefined
      });
      return this;
    } catch (error) {
      console.error('Error saving offer:', error);
      throw error;
    }
  }

  // Update by ID
  static async findByIdAndUpdate(id, updates) {
    try {
      if (!isFirebaseReady) {
        const all = await this._jsonAll();
        const offer = all.find(o => o.id === id);
        if (offer) {
          Object.assign(offer, updates, { updatedAt: new Date() });
          await this._jsonWrite(all);
          return new FirebaseOffer(offer);
        }
        return null;
      }

      const offerRef = db.collection('offers').doc(id);
      const updateData = {
        ...updates,
        updatedAt: new Date()
      };
      
      await offerRef.update(updateData);
      
      const updatedDoc = await offerRef.get();
      if (!updatedDoc.exists) return null;
      
      return new FirebaseOffer({ id: updatedDoc.id, ...updatedDoc.data() });
    } catch (error) {
      console.error('Error updating offer:', error);
      throw error;
    }
  }

  // Delete offer
  async delete() {
    try {
      if (!isFirebaseReady) {
        await FirebaseOffer._jsonDelete(this.id);
        return true;
      }
      await db.collection('offers').doc(this.id).delete();
      return true;
    } catch (error) {
      console.error('Error deleting offer:', error);
      throw error;
    }
  }

  // Static method to delete by ID
  static async findByIdAndDelete(id) {
    try {
      const offer = await this.findById(id);
      if (offer) {
        await offer.delete();
        return offer;
      }
      return null;
    } catch (error) {
      console.error('Error deleting offer by ID:', error);
      throw error;
    }
  }

  // Get offer statistics
  static async getStats() {
    try {
      if (!isFirebaseReady) {
        const all = await this._jsonAll();
        const now = new Date();
        return {
          total: all.length,
          active: all.filter(o => o.isActive && new Date(o.startDate) <= now && new Date(o.endDate) >= now).length,
          expired: all.filter(o => new Date(o.endDate) < now).length,
          totalUses: all.reduce((sum, o) => sum + o.usedCount, 0),
          totalSavings: all.reduce((sum, o) => sum + (o.originalPrice - o.discountedPrice) * o.usedCount, 0)
        };
      }

      const snapshot = await db.collection('offers').get();
      const stats = {
        total: 0,
        active: 0,
        expired: 0,
        totalUses: 0,
        totalSavings: 0
      };

      const now = new Date();
      snapshot.forEach(doc => {
        const data = doc.data();
        stats.total++;
        
        if (new Date(data.endDate) < now) {
          stats.expired++;
        } else if (data.isActive && new Date(data.startDate) <= now) {
          stats.active++;
        }
        
        stats.totalUses += data.usedCount || 0;
        stats.totalSavings += (data.originalPrice - data.discountedPrice) * (data.usedCount || 0);
      });

      return stats;
    } catch (error) {
      console.error('Error getting offer stats:', error);
      return { total: 0, active: 0, expired: 0, totalUses: 0, totalSavings: 0 };
    }
  }

  // -------- Local JSON fallback helpers --------
  static async _dbFile() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const dbDir = path.join(__dirname, '..', 'database');
    const offersFile = path.join(dbDir, 'offers.json');
    try { await fs.mkdir(dbDir, { recursive: true }); } catch {}
    return offersFile;
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

  static async _jsonInsert(offer) {
    const all = await this._jsonAll();
    all.push({ ...offer, createdAt: offer.createdAt, updatedAt: offer.updatedAt });
    await this._jsonWrite(all);
  }

  static async _jsonUpdate(id, patch) {
    const all = await this._jsonAll();
    const idx = all.findIndex(o => o.id === id);
    if (idx === -1) return;
    all[idx] = { ...all[idx], ...patch, id };
    await this._jsonWrite(all);
  }

  static async _jsonDelete(id) {
    const all = await this._jsonAll();
    const filtered = all.filter(o => o.id !== id);
    await this._jsonWrite(filtered);
  }

  static async _generateId() {
    return 'offer_' + Math.random().toString(36).slice(2, 10);
  }
}

export default FirebaseOffer;
