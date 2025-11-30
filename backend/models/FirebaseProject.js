import { db } from '../lib/firebase.js';

class FirebaseProject {
  constructor(data) {
    this.id = data.id;
    this.title = data.title;
    this.description = data.description || '';
    this.technologies = data.technologies || [];
    this.githubUrl = data.githubUrl || '';
    this.liveUrl = data.liveUrl || '';
    this.imageUrl = data.imageUrl || '';
    this.studentId = data.studentId;
    this.studentName = data.studentName;
    this.branch = data.branch;
    this.semester = data.semester;
    this.status = data.status || 'pending'; // pending, approved, rejected
    this.approvedBy = data.approvedBy || null;
    this.approvedAt = data.approvedAt || null;
    this.tags = data.tags || [];
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  // Create a new project
  static async create(projectData) {
    try {
      const projectRef = db.collection('projects').doc();
      const project = {
        id: projectRef.id,
        title: projectData.title,
        description: projectData.description || '',
        technologies: projectData.technologies || [],
        githubUrl: projectData.githubUrl || '',
        liveUrl: projectData.liveUrl || '',
        imageUrl: projectData.imageUrl || '',
        studentId: projectData.studentId,
        studentName: projectData.studentName,
        branch: projectData.branch,
        semester: projectData.semester,
        status: projectData.status || 'pending',
        approvedBy: projectData.approvedBy || null,
        approvedAt: projectData.approvedAt || null,
        tags: projectData.tags || [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await projectRef.set(project);
      return new FirebaseProject(project);
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }

  // Find project by ID
  static async findById(id) {
    try {
      const projectDoc = await db.collection('projects').doc(id).get();
      if (!projectDoc.exists) {
        return null;
      }
      return new FirebaseProject({ id: projectDoc.id, ...projectDoc.data() });
    } catch (error) {
      console.error('Error finding project by ID:', error);
      throw error;
    }
  }

  // Find projects with filters
  static async find(query = {}) {
    try {
      let queryRef = db.collection('projects');
      
      // Apply filters
      for (const [field, value] of Object.entries(query)) {
        if (field !== 'id') {
          queryRef = queryRef.where(field, '==', value);
        }
      }
      
      // Add ordering by creation date
      queryRef = queryRef.orderBy('createdAt', 'desc');
      
      const snapshot = await queryRef.get();
      const projects = [];
      
      snapshot.forEach(doc => {
        projects.push(new FirebaseProject({ id: doc.id, ...doc.data() }));
      });
      
      return projects;
    } catch (error) {
      console.error('Error finding projects:', error);
      throw error;
    }
  }

  // Find approved projects
  static async findApproved() {
    try {
      const snapshot = await db.collection('projects')
        .where('status', '==', 'approved')
        .orderBy('createdAt', 'desc')
        .get();
      
      const projects = [];
      snapshot.forEach(doc => {
        projects.push(new FirebaseProject({ id: doc.id, ...doc.data() }));
      });
      
      return projects;
    } catch (error) {
      console.error('Error finding approved projects:', error);
      throw error;
    }
  }

  // Find projects by student
  static async findByStudent(studentId) {
    try {
      const snapshot = await db.collection('projects')
        .where('studentId', '==', studentId)
        .orderBy('createdAt', 'desc')
        .get();
      
      const projects = [];
      snapshot.forEach(doc => {
        projects.push(new FirebaseProject({ id: doc.id, ...doc.data() }));
      });
      
      return projects;
    } catch (error) {
      console.error('Error finding projects by student:', error);
      throw error;
    }
  }

  // Update project
  async save() {
    try {
      this.updatedAt = new Date();
      await db.collection('projects').doc(this.id).update({
        ...this,
        id: undefined // Don't update the ID
      });
      return this;
    } catch (error) {
      console.error('Error saving project:', error);
      throw error;
    }
  }

  // Update by ID
  static async findByIdAndUpdate(id, updates) {
    try {
      const projectRef = db.collection('projects').doc(id);
      const updateData = {
        ...updates,
        updatedAt: new Date()
      };
      
      await projectRef.update(updateData);
      
      const updatedDoc = await projectRef.get();
      if (!updatedDoc.exists) {
        return null;
      }
      
      return new FirebaseProject({ id: updatedDoc.id, ...updatedDoc.data() });
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  }

  // Approve project
  static async approve(id, approvedBy) {
    try {
      const projectRef = db.collection('projects').doc(id);
      await projectRef.update({
        status: 'approved',
        approvedBy: approvedBy,
        approvedAt: new Date(),
        updatedAt: new Date()
      });
      
      return true;
    } catch (error) {
      console.error('Error approving project:', error);
      throw error;
    }
  }

  // Reject project
  static async reject(id, approvedBy) {
    try {
      const projectRef = db.collection('projects').doc(id);
      await projectRef.update({
        status: 'rejected',
        approvedBy: approvedBy,
        approvedAt: new Date(),
        updatedAt: new Date()
      });
      
      return true;
    } catch (error) {
      console.error('Error rejecting project:', error);
      throw error;
    }
  }

  // Delete project
  async delete() {
    try {
      await db.collection('projects').doc(this.id).delete();
      return true;
    } catch (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  }

  // Static method to delete by ID
  static async findByIdAndDelete(id) {
    try {
      const project = await this.findById(id);
      if (project) {
        await project.delete();
        return project;
      }
      return null;
    } catch (error) {
      console.error('Error deleting project by ID:', error);
      throw error;
    }
  }
}

export default FirebaseProject;
