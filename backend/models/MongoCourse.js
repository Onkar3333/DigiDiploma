import mongoose from 'mongoose';
import { isMongoReady } from '../lib/mongodb.js';
import FirebaseCourse from './FirebaseCourse.js'; // Fallback

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  branch: { type: String, required: true, index: true },
  semester: { type: Number, required: true, index: true },
  subject: { type: String, required: true, index: true },
  poster: { type: String, default: null },
  coverPhoto: { type: String, default: null },
  resourceUrl: { type: String, default: null },
  lectures: { type: [mongoose.Schema.Types.Mixed], default: [] },
  createdBy: { type: String, default: null },
}, {
  timestamps: true
});

// Compound indexes for efficient queries
courseSchema.index({ branch: 1, semester: 1 });
courseSchema.index({ branch: 1, semester: 1, subject: 1 });

const CourseModel = mongoose.models.Course || mongoose.model('Course', courseSchema);

class MongoCourse {
  constructor(data) {
    this._id = data._id?.toString();
    this.id = this._id;
    this.title = data.title || '';
    this.description = data.description || '';
    this.branch = data.branch || '';
    this.semester = data.semester ?? null;
    this.subject = data.subject || '';
    this.poster = data.poster || null;
    this.coverPhoto = data.coverPhoto || data.poster || null;
    this.resourceUrl = data.resourceUrl || null;
    this.lectures = Array.isArray(data.lectures) ? data.lectures : [];
    this.createdBy = data.createdBy || null;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || data.createdAt || new Date();
  }

  toJSON() {
    return {
      id: this.id,
      _id: this._id,
      title: this.title,
      description: this.description,
      branch: this.branch,
      semester: this.semester,
      subject: this.subject,
      poster: this.poster,
      coverPhoto: this.coverPhoto,
      resourceUrl: this.resourceUrl,
      lectures: this.lectures,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  static async create(courseData) {
    if (isMongoReady) {
      try {
        const course = await CourseModel.create({
          title: courseData.title,
          description: courseData.description,
          branch: courseData.branch,
          semester: courseData.semester,
          subject: courseData.subject,
          poster: courseData.poster || null,
          coverPhoto: courseData.coverPhoto || null,
          resourceUrl: courseData.resourceUrl || null,
          lectures: courseData.lectures || [],
          createdBy: courseData.createdBy || null,
        });
        return new MongoCourse(course.toObject());
      } catch (error) {
        console.error('MongoDB course create error:', error);
        throw error;
      }
    }
    // Fallback to Firebase
    return await FirebaseCourse.create(courseData);
  }

  static async find(query = {}) {
    if (isMongoReady) {
      try {
        const courses = await CourseModel.find(query).sort({ createdAt: -1 });
        return courses.map(c => new MongoCourse(c.toObject()));
      } catch (error) {
        console.error('MongoDB course find error:', error);
        return [];
      }
    }
    // Fallback to Firebase
    return await FirebaseCourse.find(query);
  }

  static async findById(id) {
    if (isMongoReady) {
      try {
        const course = await CourseModel.findById(id);
        return course ? new MongoCourse(course.toObject()) : null;
      } catch (error) {
        console.error('MongoDB course findById error:', error);
        return null;
      }
    }
    // Fallback to Firebase
    return await FirebaseCourse.findById(id);
  }

  static async findByIdAndUpdate(id, updates) {
    if (isMongoReady) {
      try {
        const course = await CourseModel.findByIdAndUpdate(
          id,
          { ...updates, updatedAt: new Date() },
          { new: true }
        );
        return course ? new MongoCourse(course.toObject()) : null;
      } catch (error) {
        console.error('MongoDB course findByIdAndUpdate error:', error);
        throw error;
      }
    }
    // Fallback to Firebase
    return await FirebaseCourse.update(id, updates);
  }

  static async findByIdAndDelete(id) {
    if (isMongoReady) {
      try {
        const course = await CourseModel.findByIdAndDelete(id);
        return course ? new MongoCourse(course.toObject()) : null;
      } catch (error) {
        console.error('MongoDB course findByIdAndDelete error:', error);
        throw error;
      }
    }
    // Fallback to Firebase
    return await FirebaseCourse.delete(id);
  }
}

export default MongoCourse;

