import mongoose from 'mongoose';
import { isMongoReady } from '../lib/mongodb.js';

const projectSchema = new mongoose.Schema({
  id: { type: String, unique: true, index: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  category: { type: String, required: true, index: true },
  branch: { type: String, required: true, index: true },
  semester: { type: Number, required: true, index: true },
  studentId: { type: String, required: true, index: true },
  studentName: { type: String, required: true },
  githubLink: { type: String, default: '' },
  demoLink: { type: String, default: '' },
  collaborators: { type: [String], default: [] },
  mentor: { type: String, default: '' },
  timeline: { type: String, default: '' },
  difficulty: { type: String, default: '' },
  tags: { type: [String], default: [] },
  techStack: { type: [String], default: [] },
  teamMembers: { type: [String], default: [] },
  projectType: { type: String, default: 'mini' },
  projectCategory: { type: String, default: 'mini' },
  academicYear: { type: String, default: null },
  simulationLink: { type: String, default: null },
  coverPhoto: { type: String, default: null },
  pdfUrl: { type: String, default: '' },
  imageUrls: { type: [String], default: [] },
  videoUrl: { type: String, default: '' },
  isPublic: { type: Boolean, default: true, index: true },
  isAdminProject: { type: Boolean, default: false, index: true },
  status: { type: String, default: 'pending', index: true },
  views: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  timelineMilestones: { type: [String], default: [] },
  coverPhotoBlurHash: { type: String, default: null },
  administratorNotes: { type: String, default: '' },
  adminFeedback: { type: String, default: '' },
}, {
  timestamps: true,
});

projectSchema.index({ branch: 1, semester: 1, status: 1 });
projectSchema.index({ studentId: 1, status: 1 });
projectSchema.index({ isAdminProject: 1, status: 1 });

const ProjectModel = mongoose.models.Project || mongoose.model('Project', projectSchema);

const toPlain = (doc) => {
  if (!doc) return null;
  const data = doc.toObject ? doc.toObject() : doc;
  return {
    ...data,
    _id: data._id?.toString(),
    createdAt: data.createdAt instanceof Date ? data.createdAt.toISOString() : data.createdAt,
    updatedAt: data.updatedAt instanceof Date ? data.updatedAt.toISOString() : data.updatedAt,
  };
};

class MongoProject {
  static isReady() {
    return isMongoReady && mongoose.connection?.readyState === 1;
  }

  static normalizePayload(payload) {
    if (!payload) return payload;
    const sanitize = { ...payload };
    if (sanitize.semester !== undefined) {
      const parsed = parseInt(sanitize.semester, 10);
      sanitize.semester = Number.isNaN(parsed) ? null : parsed;
    }
    if (sanitize.createdAt) sanitize.createdAt = new Date(sanitize.createdAt);
    if (sanitize.updatedAt) sanitize.updatedAt = new Date(sanitize.updatedAt);
    return sanitize;
  }

  static async create(projectData) {
    if (!this.isReady()) throw new Error('MongoDB not ready for project creation');
    const payload = this.normalizePayload(projectData);
    const doc = await ProjectModel.create(payload);
    return toPlain(doc);
  }

  static async findById(id) {
    if (!this.isReady()) return null;
    const doc = await ProjectModel.findOne({ id });
    return toPlain(doc);
  }

  static async find(filters = {}, options = {}) {
    if (!this.isReady()) return { projects: [], total: 0 };
    const query = {};
    if (filters.category) query.category = filters.category;
    if (filters.branch) query.branch = filters.branch;
    if (filters.semester) {
      const sem = parseInt(filters.semester, 10);
      if (!Number.isNaN(sem)) query.semester = sem;
    }
    if (filters.status) query.status = filters.status;
    if (filters.studentId) query.studentId = filters.studentId;
    if (filters.isPublic !== undefined) query.isPublic = filters.isPublic;
    if (filters.projectType) query.projectType = filters.projectType;
    if (filters.difficulty) query.difficulty = filters.difficulty;
    if (filters.isAdminProject !== undefined) query.isAdminProject = filters.isAdminProject;

    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const [docs, total] = await Promise.all([
      ProjectModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      ProjectModel.countDocuments(query),
    ]);

    return {
      projects: docs.map((doc) => toPlain(doc)),
      total,
    };
  }

  static async updateById(id, updates) {
    if (!this.isReady()) return null;
    const payload = this.normalizePayload({ ...updates, updatedAt: new Date().toISOString() });
    const doc = await ProjectModel.findOneAndUpdate({ id }, payload, { new: true });
    return toPlain(doc);
  }

  static async deleteById(id) {
    if (!this.isReady()) return false;
    const result = await ProjectModel.findOneAndDelete({ id });
    return !!result;
  }

  static async incrementLikes(id) {
    if (!this.isReady()) return null;
    const doc = await ProjectModel.findOneAndUpdate(
      { id },
      { $inc: { likes: 1 } },
      { new: true }
    );
    return toPlain(doc);
  }

  static async recordView(id) {
    if (!this.isReady()) return null;
    const doc = await ProjectModel.findOneAndUpdate(
      { id },
      { $inc: { views: 1 } },
      { new: true }
    );
    return toPlain(doc);
  }

  static async hasApprovedProjectWithDocument(studentId) {
    if (!this.isReady()) return false;
    const count = await ProjectModel.countDocuments({
      studentId,
      status: 'approved',
      pdfUrl: { $exists: true, $ne: '' },
    });
    return count > 0;
  }
}

export default MongoProject;
export { ProjectModel };

