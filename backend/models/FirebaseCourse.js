import { db, isFirebaseReady } from '../lib/firebase.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

class FirebaseCourse {
  constructor(data) {
    this.id = data.id;
    this.title = data.title;
    this.description = data.description;
    this.branch = data.branch;
    this.semester = data.semester; // number or string
    this.subject = data.subject;
    this.poster = data.poster || null; // base64 or URL (legacy)
    this.coverPhoto = data.coverPhoto || null; // Cover photo URL (hero image)
    this.resourceUrl = data.resourceUrl || null; // External course link
    this.lectures = data.lectures || []; // [{name,url}]
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.createdBy = data.createdBy || null;
  }

  static async findLocal(query = {}) {
    const all = await this._jsonAll();
    const entries = Object.entries(query);
    const filtered = entries.length ? all.filter(c => entries.every(([k, v]) => c[k] === v)) : all;
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return filtered.map(c => new FirebaseCourse(c));
  }

  static async create(courseData) {
    const now = new Date();
    if (!isFirebaseReady) {
      const course = {
        id: await this._generateId(),
        title: courseData.title,
        description: courseData.description,
        branch: courseData.branch,
        semester: courseData.semester,
        subject: courseData.subject,
        poster: courseData.poster || null,
        coverPhoto: courseData.coverPhoto || null,
        resourceUrl: courseData.resourceUrl || null,
        lectures: courseData.lectures || [],
        createdAt: now,
        updatedAt: now,
        createdBy: courseData.createdBy || null
      };
      await this._jsonInsert(course);
      return new FirebaseCourse(course);
    }
    const ref = db.collection('courses').doc();
    const course = {
      id: ref.id,
      title: courseData.title,
      description: courseData.description,
      branch: courseData.branch,
      semester: courseData.semester,
      subject: courseData.subject,
      poster: courseData.poster || null,
      coverPhoto: courseData.coverPhoto || null,
      resourceUrl: courseData.resourceUrl || null,
      lectures: courseData.lectures || [],
      createdAt: now,
      updatedAt: now,
      createdBy: courseData.createdBy || null
    };
    await ref.set(course);
    return new FirebaseCourse(course);
  }

  static async find(query = {}) {
    try {
      if (!isFirebaseReady) {
        const all = await this._jsonAll();
        const entries = Object.entries(query);
        const filtered = entries.length ? all.filter(c => entries.every(([k, v]) => c[k] === v)) : all;
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return filtered.map(c => new FirebaseCourse(c));
      }
      let q = db.collection('courses');
      for (const [k, v] of Object.entries(query)) {
        if (k !== 'id') q = q.where(k, '==', v);
      }
      // Try ordered query first; if index error, retry without ordering then sort in memory
      let snapshot;
      let ordered = true;
      try {
        snapshot = await q.orderBy('createdAt', 'desc').get();
      } catch (err) {
        ordered = false;
        snapshot = await q.get();
      }
      const res = [];
      snapshot.forEach(doc => res.push(new FirebaseCourse({ id: doc.id, ...doc.data() })));
      if (!ordered) {
        res.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }
      return res;
    } catch (error) {
      console.error('Error finding courses:', error);
      throw error;
    }
  }

  static async update(id, updates = {}) {
    if (!id) throw new Error('Course ID is required for update');
    const now = new Date();
    const data = {
      ...updates,
      updatedAt: now,
    };

    if (!isFirebaseReady) {
      const all = await this._jsonAll();
      const index = all.findIndex(course => course.id === id || course._id === id);
      if (index === -1) throw new Error('Course not found');
      const updated = {
        ...all[index],
        ...data,
        id: all[index].id,
        updatedAt: now,
      };
      all[index] = updated;
      await this._jsonWrite(all);
      return new FirebaseCourse(updated);
    }

    const ref = db.collection('courses').doc(id);
    const doc = await ref.get();
    if (!doc.exists) throw new Error('Course not found');
    await ref.update(data);
    const updated = { id, ...doc.data(), ...data };
    return new FirebaseCourse(updated);
  }

  static async delete(id) {
    if (!id) throw new Error('Course ID is required for deletion');
    if (!isFirebaseReady) {
      const all = await this._jsonAll();
      const filtered = all.filter(course => (course.id || course._id) !== id);
      await this._jsonWrite(filtered);
      return { deleted: true };
    }
    const ref = db.collection('courses').doc(id);
    await ref.delete();
    return { deleted: true };
  }

  // JSON fallback utils
  static async _dbFile() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const dbDir = path.join(__dirname, '..', 'database');
    const file = path.join(dbDir, 'courses.json');
    try { await fs.mkdir(dbDir, { recursive: true }); } catch {}
    return file;
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
  static async _jsonInsert(course) {
    const all = await this._jsonAll();
    all.push({ ...course });
    await this._jsonWrite(all);
  }
  static async _generateId() {
    return 'course_' + Math.random().toString(36).slice(2, 10);
  }
}

export default FirebaseCourse;


