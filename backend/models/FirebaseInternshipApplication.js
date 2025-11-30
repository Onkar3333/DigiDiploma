import { db, isFirebaseReady } from '../lib/firebase.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

class FirebaseInternshipApplication {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.email = data.email;
    this.phone = data.phone;
    this.collegeName = data.collegeName;
    this.branch = data.branch;
    this.semester = data.semester;
    this.type = data.type;
    this.mode = data.mode;
    this.duration = data.duration;
    this.preferredLocation = data.preferredLocation || '';
    this.resumeUrl = data.resumeUrl || '';
    this.internshipType = data.internshipType;
    this.additionalNotes = data.additionalNotes || '';
    this.createdAt = data.createdAt || new Date();
    this.status = data.status || 'submitted';
    this.source = data.source || 'public';
    this.userId = data.userId || null;
    this.viewedAt = data.viewedAt || null;
  }

  static collectionName = 'internshipApplications';

  static async _dbFile() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const dbDir = path.join(__dirname, '..', 'database');
    await fs.mkdir(dbDir, { recursive: true });
    return path.join(dbDir, 'internshipApplications.json');
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

  static async _jsonInsert(record) {
    const all = await this._jsonAll();
    all.push(record);
    await this._jsonWrite(all);
  }

  static _generateId() {
    return 'internship_' + Math.random().toString(36).slice(2, 10);
  }

  static async create(data) {
    const now = new Date();
    if (!isFirebaseReady) {
      const record = {
        id: this._generateId(),
        ...data,
        createdAt: now,
      };
      await this._jsonInsert(record);
      return new FirebaseInternshipApplication(record);
    }

    const ref = db.collection(this.collectionName).doc();
    const record = {
      id: ref.id,
      ...data,
      createdAt: now,
    };
    await ref.set(record);
    return new FirebaseInternshipApplication(record);
  }

  static async find(query = {}) {
    if (!isFirebaseReady) {
      const all = await this._jsonAll();
      const filtered = Object.entries(query).length
        ? all.filter(record => Object.entries(query).every(([key, value]) => record[key] === value))
        : all;
      filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return filtered.map(record => new FirebaseInternshipApplication(record));
    }

    let collection = db.collection(this.collectionName);
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        collection = collection.where(key, '==', value);
      }
    }
    const snapshot = await collection.orderBy('createdAt', 'desc').get();
    const res = [];
    snapshot.forEach(doc => res.push(new FirebaseInternshipApplication({ id: doc.id, ...doc.data() })));
    return res;
  }

  static async findByEmailAndSemester(email, semester) {
    if (!email || !semester) return null;
    const res = await this.find({ email, semester });
    return res.length ? res[0] : null;
  }

  static async findAll() {
    return this.find({});
  }

  static async findById(id) {
    if (!id) return null;
    if (!isFirebaseReady) {
      const all = await this._jsonAll();
      const found = all.find(record => record.id === id);
      return found ? new FirebaseInternshipApplication(found) : null;
    }
    const doc = await db.collection(this.collectionName).doc(id).get();
    if (!doc.exists) return null;
    return new FirebaseInternshipApplication({ id: doc.id, ...doc.data() });
  }

  static async update(id, updates) {
    if (!id) return null;
    if (!isFirebaseReady) {
      const all = await this._jsonAll();
      const index = all.findIndex(r => r.id === id);
      if (index === -1) return null;
      all[index] = { ...all[index], ...updates };
      await this._jsonWrite(all);
      return new FirebaseInternshipApplication(all[index]);
    }
    const ref = db.collection(this.collectionName).doc(id);
    await ref.set(updates, { merge: true });
    const doc = await ref.get();
    if (!doc.exists) return null;
    return new FirebaseInternshipApplication({ id: doc.id, ...doc.data() });
  }

  static async delete(id) {
    if (!id) return;
    if (!isFirebaseReady) {
      const all = await this._jsonAll();
      const filtered = all.filter(record => record.id !== id);
      await this._jsonWrite(filtered);
      return;
    }
    await db.collection(this.collectionName).doc(id).delete();
  }
}

export default FirebaseInternshipApplication;

