import express from "express";
const router = express.Router();
import { authenticateToken, requireAdmin } from "../middleware/auth.js";
// MongoDB only - no Firebase
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import notificationService from '../websocket.js';
import { validate, projectRequestSchema, adminReplySchema } from '../middleware/validation.js';
import { mailService } from '../services/mailService.js';
import MongoProject from '../models/MongoProject.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_PATH = path.resolve(__dirname, '../database/projects.json');
const REQUESTS_PATH = path.resolve(__dirname, '../database/project_requests.json');
const PROJECT_REQUESTS_COLLECTION = 'projectRequests';
const LEGACY_PROJECT_REQUESTS_COLLECTION = 'project_requests';
const ADMIN_ALERT_EMAIL = process.env.ADMIN_ALERT_EMAIL || 'digidiploma06@gmail.com';
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const PATH_STYLE_R2_BASE = (R2_ACCOUNT_ID && R2_BUCKET_NAME)
  ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}`
  : null;
const LEGACY_R2_HOST_REGEX = R2_ACCOUNT_ID
  ? new RegExp(`^https://[^/]+\\.${R2_ACCOUNT_ID}\\.r2\\.cloudflarestorage\\.com`)
  : null;
const DEFAULT_BRANCH = 'General';

function readLocalProjects() {
  try {
    if (!fs.existsSync(DATA_PATH)) return [];
    const raw = fs.readFileSync(DATA_PATH, 'utf-8');
    return JSON.parse(raw || '[]');
  } catch { return []; }
}

function writeLocalProjects(items) {
  try {
    const dir = path.dirname(DATA_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_PATH, JSON.stringify(items, null, 2), 'utf-8');
  } catch {}
}

function readLocalRequests() {
  try {
    if (!fs.existsSync(REQUESTS_PATH)) return [];
    const raw = fs.readFileSync(REQUESTS_PATH, 'utf-8');
    return JSON.parse(raw || '[]');
  } catch { return []; }
}

function writeLocalRequests(items) {
  try {
    const dir = path.dirname(REQUESTS_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(REQUESTS_PATH, JSON.stringify(items, null, 2), 'utf-8');
  } catch {}
}

const normalizeTimestamp = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value?._seconds) return new Date(value._seconds * 1000).toISOString();
  if (value instanceof Date) return value.toISOString();
  return null;
};

const adaptRequestReplyHistory = (history = []) =>
  history.map((entry) => ({
    subject: entry.subject,
    messageText: entry.messageText || entry.body || entry.message || '',
    headerText: entry.headerText || 'DigiDiploma Support',
    footerText: entry.footerText || '© DigiDiploma. All rights reserved.',
    sentAt: normalizeTimestamp(entry.sentAt || entry.at) || new Date().toISOString(),
    adminName: entry.adminName || entry.by || null,
    adminId: entry.adminId || null
  }));

const normalizeRequestRecord = (request) => {
  if (!request) return null;
  return {
    id: request.id,
    type: 'project',
    name: request.name,
    email: request.email,
    phone: request.phone || '',
    branch: request.branch || '',
    semester: request.semester || '',
    projectIdea: request.projectIdea || request.title || '',
    title: request.projectIdea || request.title || '',
    subject: request.projectIdea || request.title || '',
    description: request.description || '',
    requiredTools: request.requiredTools || '',
    deadline: request.deadline || '',
    notes: request.notes || '',
    status: request.status === 'replied' ? 'replied' : 'new',
    workflowStatus: request.workflowStatus || request.status || 'pending',
    createdAt: normalizeTimestamp(request.createdAt) || new Date().toISOString(),
    viewedAt: normalizeTimestamp(request.viewedAt),
    replyHistory: adaptRequestReplyHistory(request.replyHistory || []),
    adminAlertEmailSentAt: normalizeTimestamp(request.adminAlertEmailSentAt)
  };
};

const normalizeStorageUrl = (url) => {
  if (!url || !LEGACY_R2_HOST_REGEX || !PATH_STYLE_R2_BASE) return url;
  if (LEGACY_R2_HOST_REGEX.test(url)) {
    const suffix = url.replace(LEGACY_R2_HOST_REGEX, '');
    return `${PATH_STYLE_R2_BASE}${suffix}`;
  }
  return url;
};

const transformProjectRecord = (project) => {
  if (!project) return project;
  const clone = { ...project };
  if (clone.coverPhoto) clone.coverPhoto = normalizeStorageUrl(clone.coverPhoto);
  if (clone.pdfUrl) clone.pdfUrl = normalizeStorageUrl(clone.pdfUrl);
  if (Array.isArray(clone.imageUrls)) {
    clone.imageUrls = clone.imageUrls.map((url) => normalizeStorageUrl(url));
  }
  return clone;
};

const transformProjectList = (list = []) => list.map((item) => transformProjectRecord(item)).filter(Boolean);

const getCurrentAcademicYear = () => {
  const now = new Date();
  const year = now.getFullYear();
  return now.getMonth() >= 6 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
};

const resolveBranch = (branch, userBranch, fallbackCategory) => {
  return branch || userBranch || fallbackCategory || DEFAULT_BRANCH;
};

const resolveSemester = (semester, userSemester) => {
  const parsed = Number.parseInt(semester, 10);
  if (!Number.isNaN(parsed)) return parsed;
  const userParsed = Number.parseInt(userSemester, 10);
  if (!Number.isNaN(userParsed)) return userParsed;
  return 0;
};

const buildProjectAlertHtml = (payload) => `
  <div style="font-family:Inter,Arial,sans-serif;max-width:640px;margin:auto;padding:24px;background:#f8fafc;border-radius:16px;border:1px solid #e2e8f0;color:#0f172a;">
    <h2 style="margin-top:0;margin-bottom:16px;">New Project Request</h2>
    <p style="margin:4px 0;"><strong>Name:</strong> ${payload.name}</p>
    <p style="margin:4px 0;"><strong>Email:</strong> ${payload.email}</p>
    ${payload.phone ? `<p style="margin:4px 0;"><strong>Phone:</strong> ${payload.phone}</p>` : ''}
    <p style="margin:4px 0;"><strong>Branch/Sem:</strong> ${payload.branch || '-'} / ${payload.semester || '-'}</p>
    <p style="margin:4px 0;"><strong>Project Idea:</strong> ${payload.projectIdea}</p>
    <p style="margin:12px 0;white-space:pre-wrap;border-left:3px solid #2563eb;padding-left:12px;">${payload.description}</p>
    ${payload.requiredTools ? `<p style="margin:4px 0;"><strong>Tools:</strong> ${payload.requiredTools}</p>` : ''}
    ${payload.deadline ? `<p style="margin:4px 0;"><strong>Deadline:</strong> ${payload.deadline}</p>` : ''}
    ${payload.notes ? `<p style="margin:4px 0;"><strong>Notes:</strong> ${payload.notes}</p>` : ''}
    <p style="font-size:12px;color:#64748b;margin-top:24px;">DigiDiploma Alert • ${new Date().toLocaleString()}</p>
  </div>
`;

const buildRequestReplyHtml = ({ headerText, messageText, footerText, subject, name }) => `
  <div style="font-family:Inter,Arial,sans-serif;max-width:640px;margin:auto;color:#0f172a;border-radius:18px;overflow:hidden;border:1px solid #e2e8f0;">
    <div style="background:linear-gradient(90deg,#2563eb,#7c3aed);color:#fff;padding:20px 28px;">
      <h2 style="margin:0;">${headerText}</h2>
      <p style="margin:4px 0 0;font-size:14px;opacity:0.9;">Re: ${subject}</p>
    </div>
    <div style="padding:28px;background:#ffffff;">
      <p style="margin:0 0 16px;">Hi ${name || 'there'},</p>
      <div style="margin:0 0 20px;line-height:1.6;white-space:pre-wrap;">${messageText}</div>
      <div style="margin:24px 0 12px;">
        <p style="margin:0 0 8px;font-weight:600;">Follow us for updates:</p>
        <ul style="padding-left:18px;margin:0;color:#2563eb;">
          <li>Instagram: <a href="https://www.instagram.com/digi_diploma.in?igsh=eHM5MjZteHVmbjlv" target="_blank">instagram.com/digi_diploma.in</a></li>
          <li>LinkedIn: <a href="https://www.linkedin.com/in/chaitanya-zagade-766051294" target="_blank">linkedin.com/in/chaitanya-zagade-766051294</a></li>
          <li>YouTube: <a href="https://www.youtube.com/@DigiDiploma" target="_blank">youtube.com/@DigiDiploma</a></li>
        </ul>
      </div>
      <p style="margin:24px 0 0;font-size:13px;color:#475569;">${footerText}</p>
    </div>
  </div>
`;

const getRequestRecord = async (id) => {
  // Use local JSON storage (MongoDB can be added later if needed)
  const items = readLocalRequests();
  const index = items.findIndex((item) => item.id === id);
  if (index !== -1) {
    return { storage: 'local', items, index, data: items[index] };
  }
  return null;
};

const saveLocalRequestRecord = (record) => {
  const items = readLocalRequests();
  const idx = items.findIndex((item) => item.id === record.id);
  if (idx !== -1) {
    items[idx] = record;
  } else {
    items.unshift(record);
  }
  writeLocalRequests(items);
};

// Check if student can download (must have uploaded at least 1 approved project with documentation)
const parseBoolean = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return undefined;
};

async function canStudentDownload(studentId) {
  try {
    if (MongoProject.isReady()) {
      return MongoProject.hasApprovedProjectWithDocument(studentId);
    }
    // Use local JSON storage as fallback
    const projects = readLocalProjects();
    const studentProjects = projects.filter(p => p.studentId === studentId && p.status === 'approved' && p.pdfUrl);
    return studentProjects.length >= 1;
  } catch { return false; }
}

async function saveProjectRecord(data) {
  if (MongoProject.isReady()) {
    const stored = await MongoProject.create(data);
    return transformProjectRecord(stored);
  }
  // Use local JSON storage as fallback
  const items = readLocalProjects();
  items.unshift(data);
  writeLocalProjects(items);
  return transformProjectRecord(data);
}

async function listProjects(filterOptions) {
  const adminFlag = parseBoolean(filterOptions.isAdminProject);
  const publicFlag = parseBoolean(filterOptions.isPublic);
  if (MongoProject.isReady()) {
    const result = await MongoProject.find({
      ...filterOptions,
      isAdminProject: adminFlag,
      isPublic: publicFlag,
    }, { page: filterOptions.page, limit: filterOptions.limit });
    return {
      projects: transformProjectList(result.projects),
      total: result.total,
    };
  }
  // Use MongoDB or local JSON storage (Firebase removed)

  let projects = readLocalProjects();
  const { status, branch, semester, category, studentId, isAdminProject, difficulty } = filterOptions;
  if (status) projects = projects.filter(p => p.status === status);
  if (branch) projects = projects.filter(p => p.branch === branch);
  if (semester) projects = projects.filter(p => p.semester === parseInt(semester));
  if (category) projects = projects.filter(p => p.category === category);
  if (studentId) projects = projects.filter(p => p.studentId === studentId);
  if (difficulty) projects = projects.filter(p => p.difficulty === difficulty);
  if (adminFlag !== undefined) projects = projects.filter(p => p.isAdminProject === adminFlag);
  if (publicFlag !== undefined) projects = projects.filter(p => p.isPublic === publicFlag);
  projects.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return { projects: transformProjectList(projects), total: projects.length };
}

async function getProjectById(projectId) {
  if (MongoProject.isReady()) {
    const doc = await MongoProject.findById(projectId);
    return transformProjectRecord(doc);
  }
  // Use MongoDB or local JSON storage
  const projects = readLocalProjects();
  const local = projects.find(p => p.id === projectId) || null;
  return transformProjectRecord(local);
}

async function updateProjectRecord(projectId, updates) {
  if (MongoProject.isReady()) {
    const updated = await MongoProject.updateById(projectId, updates);
    return transformProjectRecord(updated);
  }
  // Use MongoDB or local JSON storage
  const projects = readLocalProjects();
  const idx = projects.findIndex(p => p.id === projectId);
  if (idx === -1) return null;
  projects[idx] = { ...projects[idx], ...updates };
  writeLocalProjects(projects);
  return transformProjectRecord(projects[idx]);
}

async function deleteProjectRecord(projectId) {
  if (MongoProject.isReady()) {
    return MongoProject.deleteById(projectId);
  }
  // Use MongoDB or local JSON storage
  const projects = readLocalProjects();
  const filtered = projects.filter(p => p.id !== projectId);
  writeLocalProjects(filtered);
  return true;
}

async function incrementProjectLikes(projectId) {
  if (MongoProject.isReady()) {
    const updated = await MongoProject.incrementLikes(projectId);
    return transformProjectRecord(updated);
  }
  // Use MongoDB or local JSON storage
  const projects = readLocalProjects();
  const idx = projects.findIndex(p => p.id === projectId);
  if (idx === -1) return null;
  projects[idx].likes = (projects[idx].likes || 0) + 1;
  writeLocalProjects(projects);
  return transformProjectRecord(projects[idx]);
}

// Create a new project (student or admin)
router.post("/create", authenticateToken, async (req, res) => {
  try {
    const {
      title, description, category, techStack, studentId, studentName, 
      branch, semester, githubLink, demoLink, collaborators, mentor,
      timeline, difficulty, tags, isPublic, pdfUrl, imageUrls, videoUrl,
      projectType, teamMembers, isAdminProject, coverPhoto,
      simulationLink, academicYear, projectCategory
    } = req.body;

    if (!title || !description || !category) {
      return res.status(400).json({ error: "Required fields are missing." });
    }

    const user = req.user;
    const resolvedBranch = resolveBranch(branch, user?.branch, category);
    const resolvedSemester = resolveSemester(semester, user?.semester);
    const resolvedAcademicYear = academicYear || getCurrentAcademicYear();
    const data = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      title, description, category, techStack: techStack || [], 
      studentId: studentId || user.id, 
      studentName: studentName || user.name,
      branch: resolvedBranch,
      semester: resolvedSemester,
      githubLink, demoLink, collaborators: collaborators || [],
      mentor, timeline, difficulty, tags: tags || [],
      isPublic: isPublic !== false,
      pdfUrl, imageUrls: imageUrls || [], videoUrl,
      projectType: projectType || 'mini',
      projectCategory: projectCategory || projectType || 'mini',
      academicYear: resolvedAcademicYear,
      simulationLink: simulationLink || null,
      teamMembers: teamMembers || [],
      isAdminProject: isAdminProject === true || user.userType === 'admin',
      coverPhoto: coverPhoto || null, // Cover photo URL
      status: user.userType === 'admin' ? 'approved' : 'pending',
      views: 0,
      likes: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const storedProject = await saveProjectRecord(data);

    res.status(201).json({ message: "Project created successfully", project: storedProject });
  } catch (err) {
    console.error("Error creating project:", err);
    res.status(500).json({ error: "Failed to create project" });
  }
});

// Get public projects (no authentication required)
// Returns both public admin projects and approved student projects
router.get("/public", async (req, res) => {
  try {
    const { 
      category, branch, semester, 
      page = 1, limit = 20 
    } = req.query;
    const pageNum = Number.parseInt(page, 10) || 1;
    const limitNum = Number.parseInt(limit, 10) || 20;

    // Fetch approved projects (both admin and student)
    const { projects: fetchedProjects } = await listProjects({
      status: 'approved',
      branch,
      semester,
      category,
      page: pageNum,
      limit: limitNum,
    });

    let projects = Array.isArray(fetchedProjects) ? [...fetchedProjects] : [];
    
    // Return:
    // 1. Public admin projects
    // 2. Approved student projects (for sharing)
    projects = projects.filter(p => 
      (p.isAdminProject && p.isPublic && p.status === 'approved') ||
      (!p.isAdminProject && p.status === 'approved')
    );

    const totalFiltered = projects.length;
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedProjects = projects.slice(startIndex, endIndex);
    
    res.status(200).json({
      projects: paginatedProjects,
      pagination: {
        current: pageNum,
        total: Math.ceil(totalFiltered / limitNum),
        count: paginatedProjects.length,
        totalProjects: totalFiltered
      }
    });
  } catch (err) {
    console.error("Error fetching public projects:", err);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

// Get a specific public project by ID (no authentication required)
// Allows sharing of both admin projects and approved student projects
router.get("/:id/public", async (req, res) => {
  try {
    let project;
    if (MongoProject.isReady()) {
      project = await MongoProject.findById(req.params.id);
    } else {
      const projects = readLocalProjects();
      project = projects.find(p => p.id === req.params.id);
    }

    if (!project) return res.status(404).json({ error: "Project not found" });
    
    // Allow public access to:
    // 1. Admin projects that are public and approved
    // 2. Student projects that are approved (for sharing)
    const isPublicAdminProject = project.isAdminProject && project.isPublic && project.status === 'approved';
    const isApprovedStudentProject = !project.isAdminProject && project.status === 'approved';
    
    if (!isPublicAdminProject && !isApprovedStudentProject) {
      return res.status(403).json({ error: "This project is not publicly available" });
    }

    // Increment views
    if (MongoProject.isReady()) {
      project = await MongoProject.recordView(req.params.id);
    } else {
      const projects = readLocalProjects();
      const idx = projects.findIndex(p => p.id === req.params.id);
      if (idx !== -1) {
        projects[idx].views = (projects[idx].views || 0) + 1;
        writeLocalProjects(projects);
        project = projects[idx];
      }
    }

    project = transformProjectRecord(project);
    res.status(200).json(project);
  } catch (err) {
    console.error("Error fetching public project:", err);
    res.status(500).json({ error: "Failed to fetch project" });
  }
});

// Get all projects (with optional filters) - requires authentication
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { 
      category, branch, semester, status, difficulty, 
      studentId, isPublic, projectType, isAdminProject,
      page = 1, limit = 20 
    } = req.query;
    const pageNum = Number.parseInt(page, 10) || 1;
    const limitNum = Number.parseInt(limit, 10) || 20;

    const { projects: fetchedProjects } = await listProjects({
      status,
      branch,
      semester,
      category,
      studentId,
      isPublic,
      projectType,
      isAdminProject,
      page: pageNum,
      limit: limitNum,
    });

    let projects = Array.isArray(fetchedProjects) ? [...fetchedProjects] : [];

    // Filter by isPublic and user type
    if (req.user.userType !== 'admin') {
      // Students can only see:
      // 1. Admin projects (approved and public)
      // 2. Their own projects (regardless of status)
      projects = projects.filter(p => 
        (p.isAdminProject && p.isPublic && p.status === 'approved') || 
        (p.studentId === req.user.id)
      );
    }
    // Admins see all projects (no filtering needed)

    const totalFiltered = projects.length;
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedProjects = projects.slice(startIndex, endIndex);
    
    res.status(200).json({
      projects: paginatedProjects,
      pagination: {
        current: pageNum,
        total: Math.ceil(totalFiltered / limitNum),
        count: paginatedProjects.length,
        totalProjects: totalFiltered
      }
    });
  } catch (err) {
    console.error("Error fetching projects:", err);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

// Get a specific project by ID
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    let project;
    if (MongoProject.isReady()) {
      project = await MongoProject.recordView(req.params.id);
    } else {
      const projects = readLocalProjects();
      project = projects.find(p => p.id === req.params.id);
      if (!project) return res.status(404).json({ error: "Project not found" });
      project.views = (project.views || 0) + 1;
      const idx = projects.findIndex(p => p.id === req.params.id);
      projects[idx] = project;
      writeLocalProjects(projects);
    }

    if (!project) return res.status(404).json({ error: "Project not found" });
    project = transformProjectRecord(project);

    // Check if student can download
    if (req.user.userType === 'student' && !project.isAdminProject) {
      const canDownload = await canStudentDownload(req.user.id);
      project.canDownload = canDownload;
    } else {
      project.canDownload = true;
    }

    res.status(200).json(project);
  } catch (err) {
    console.error("Error fetching project:", err);
    res.status(500).json({ error: "Failed to fetch project" });
  }
});

// Check download permission
router.get("/:id/can-download", authenticateToken, async (req, res) => {
  try {
    if (req.user.userType === 'admin') {
      return res.json({ canDownload: true });
    }
    const canDownload = await canStudentDownload(req.user.id);
    res.json({ canDownload });
  } catch (err) {
    res.status(500).json({ error: "Failed to check download permission" });
  }
});

// Update a project (admin or project owner)
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    let existing = await getProjectById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Project not found" });

    if (req.user.userType !== 'admin' && existing.studentId !== req.user.id) {
      return res.status(403).json({ error: "Not authorized to update this project" });
    }

    const updates = { ...req.body, updatedAt: new Date().toISOString() };
    let project;

    if (MongoProject.isReady()) {
      project = await MongoProject.updateById(req.params.id, updates);
    } else {
      const projects = readLocalProjects();
      const idx = projects.findIndex(p => p.id === req.params.id);
      projects[idx] = { ...projects[idx], ...updates };
      writeLocalProjects(projects);
      project = projects[idx];
    }

    res.status(200).json({ message: "Project updated successfully", project });
  } catch (err) {
    console.error("Error updating project:", err);
    res.status(500).json({ error: "Failed to update project" });
  }
});

// Approve/Reject project (admin only)
router.post("/:id/approve", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status, feedback } = req.body; // status: 'approved' | 'rejected'
    let project;
    if (MongoProject.isReady()) {
      project = await MongoProject.updateById(req.params.id, { 
        status, 
        adminFeedback: feedback || '',
        updatedAt: new Date().toISOString()
      });
    } else {
      const projects = readLocalProjects();
      const idx = projects.findIndex(p => p.id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: "Project not found" });
      projects[idx].status = status;
      projects[idx].adminFeedback = feedback;
      projects[idx].updatedAt = new Date().toISOString();
      writeLocalProjects(projects);
    }
    if (!project && MongoProject.isReady()) return res.status(404).json({ error: "Project not found" });
    res.json({ message: `Project ${status} successfully` });
  } catch (err) {
    res.status(500).json({ error: "Failed to update project status" });
  }
});

// Convert student project to admin project (admin only)
router.post("/:id/convert-to-admin", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const projectId = req.params.id;
    const project = await getProjectById(projectId);
    
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    if (project.isAdminProject) {
      return res.status(400).json({ error: "Project is already an admin project" });
    }

    // Convert to admin project
    const updates = {
      isAdminProject: true,
      status: 'approved',
      updatedAt: new Date().toISOString()
    };

    await updateProjectRecord(projectId, updates);
    res.status(200).json({ message: "Project converted to admin project successfully", project: transformProjectRecord({ ...project, ...updates }) });
  } catch (err) {
    console.error("Error converting project:", err);
    res.status(500).json({ error: "Failed to convert project" });
  }
});

// Delete a project (admin only)
router.delete("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    await deleteProjectRecord(req.params.id);
    res.status(200).json({ message: "Project deleted successfully" });
  } catch (err) {
    console.error("Error deleting project:", err);
    res.status(500).json({ error: "Failed to delete project" });
  }
});

// Like a project
router.post("/:id/like", authenticateToken, async (req, res) => {
  try {
    const updated = await incrementProjectLikes(req.params.id);
    if (!updated) return res.status(404).json({ error: "Project not found" });
    res.json({ likes: updated.likes });
  } catch (err) {
    res.status(500).json({ error: "Failed to like project" });
  }
});

// PROJECT REQUESTS

// Submit project request
router.post("/requests", validate(projectRequestSchema), async (req, res) => {
  try {
    const { name, email, phone, branch, semester, projectIdea, description, requiredTools, deadline, notes } = req.body;
    const now = new Date().toISOString();
    const record = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: 'project',
      name,
      email,
      phone: phone || '',
      branch: branch || '',
      semester: semester || '',
      projectIdea,
      description,
      requiredTools: requiredTools || '',
      deadline: deadline || '',
      notes: notes || '',
      status: 'new',
      workflowStatus: 'pending',
      createdAt: now,
      viewedAt: null,
      replyHistory: [],
      adminAlertEmailSentAt: null
    };

    // Use local JSON storage (MongoDB can be added later if needed)
    saveLocalRequestRecord(record);

    let adminEmailSent = false;
    try {
      await mailService.sendMail({
        to: ADMIN_ALERT_EMAIL,
        subject: 'New Project Request - DigiDiploma',
        html: buildProjectAlertHtml(record)
      });
      adminEmailSent = true;
    } catch (error) {
      adminEmailSent = false;
      console.error('Project request alert email failed:', error?.message || error);
    }

    if (adminEmailSent) {
      const timestamp = new Date().toISOString();
      const items = readLocalRequests();
      const idx = items.findIndex((item) => item.id === record.id);
      if (idx !== -1) {
        items[idx].adminAlertEmailSentAt = timestamp;
        writeLocalRequests(items);
      }
    }

    try {
      await notificationService.broadcastToAdmins({
        type: 'project_request_new',
        request: {
          id: record.id,
          name: record.name,
          email: record.email,
          title: record.projectIdea,
          preview: record.description.slice(0, 160),
          createdAt: record.createdAt
        }
      });
    } catch (notifyError) {
      console.error('Failed to broadcast project request notification:', notifyError?.message || notifyError);
    }

    res.status(201).json({ message: "Project request submitted successfully", request: record });
  } catch (err) {
    console.error('Project request submit error:', err);
    res.status(500).json({ error: "Failed to submit project request" });
  }
});

// Get all project requests (admin only)
router.get("/requests/all", authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Use local JSON storage (MongoDB can be added later if needed)
    const requests = readLocalRequests()
      .map(entry => normalizeRequestRecord(entry))
      .filter(Boolean)
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    
    res.json(requests);
  } catch (err) {
    console.error('Error fetching project requests:', err);
    res.status(500).json({ error: "Failed to fetch project requests", details: err.message });
  }
});

// Mark project request as viewed
router.patch("/requests/:id/view", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const recordInfo = await getRequestRecord(id);
    if (!recordInfo) return res.status(404).json({ error: "Request not found" });

    const viewedAt = new Date().toISOString();
    if (recordInfo.storage === 'local') {
      recordInfo.items[recordInfo.index].viewedAt = viewedAt;
      writeLocalRequests(recordInfo.items);
    }

    res.json({ ok: true, viewedAt });
  } catch (err) {
    res.status(500).json({ error: "Failed to update request" });
  }
});

// Reply to project request
router.post("/requests/:id/reply", authenticateToken, requireAdmin, validate(adminReplySchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { replySubject, headerText, messageText, footerText } = req.body;

    const recordInfo = await getRequestRecord(id);
    if (!recordInfo) return res.status(404).json({ error: "Request not found" });

    const record = { ...recordInfo.data };
    const html = buildRequestReplyHtml({
      headerText,
      messageText,
      footerText,
      subject: record.projectIdea || record.title,
      name: record.name
    });

    let emailSent = false;
    try {
      await mailService.sendMail({
        to: record.email,
        subject: replySubject,
        html
      });
      emailSent = true;
    } catch (error) {
      emailSent = false;
      console.error('Project reply email failed:', error?.message || error);
    }

    const replyEntry = {
      subject: replySubject,
      headerText,
      messageText,
      footerText,
      sentAt: new Date().toISOString(),
      adminId: req.user?.id || null,
      adminName: req.user?.name || 'Admin'
    };

    if (recordInfo.storage === 'local') {
      const items = recordInfo.items;
      const idx = recordInfo.index;
      items[idx].status = 'replied';
      items[idx].viewedAt = items[idx].viewedAt || new Date().toISOString();
      items[idx].replyHistory = adaptRequestReplyHistory(items[idx].replyHistory || []);
      items[idx].replyHistory.push(replyEntry);
      writeLocalRequests(items);
    }

    res.json({ ok: true, emailSent, status: 'replied' });
  } catch (err) {
    console.error('Project request reply error:', err);
    res.status(500).json({ error: "Failed to send reply" });
  }
});

// Update project request status (admin only)
router.put("/requests/:id/status", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body; // 'accepted' | 'under_review' | 'rejected'
    if (!status) return res.status(400).json({ error: "Status is required" });

    const recordInfo = await getRequestRecord(req.params.id);
    if (!recordInfo) return res.status(404).json({ error: "Request not found" });

    const update = { workflowStatus: status, updatedAt: new Date().toISOString() };

    if (recordInfo.storage === 'local') {
      recordInfo.items[recordInfo.index].workflowStatus = status;
      recordInfo.items[recordInfo.index].updatedAt = update.updatedAt;
      writeLocalRequests(recordInfo.items);
    }
    res.json({ message: "Request status updated" });
  } catch (err) {
    res.status(500).json({ error: "Failed to update request status" });
  }
});

// Delete a project request (admin)
router.delete("/requests/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({ error: "Request ID is required" });
    }

    let deleted = false;

    // Try to get the record
    try {
      const recordInfo = await getRequestRecord(id);
      if (recordInfo) {
        if (recordInfo.storage === 'local') {
          recordInfo.items.splice(recordInfo.index, 1);
          writeLocalRequests(recordInfo.items);
          deleted = true;
        }
      }
    } catch (getError) {
      console.error('Error getting request record:', getError);
    }

    // If getRequestRecord didn't work, try direct local storage deletion
    if (!deleted) {
      try {
        const items = readLocalRequests();
        const index = items.findIndex((item) => item && item.id === id);
        if (index !== -1) {
          items.splice(index, 1);
          writeLocalRequests(items);
          deleted = true;
        }
      } catch (localError) {
        console.error('Local storage delete error:', localError);
        return res.status(500).json({ error: "Failed to delete request from local storage" });
      }
    }

    if (!deleted) {
      return res.status(404).json({ error: "Request not found" });
    }

    // Notify via WebSocket (non-blocking)
    try {
      await notificationService.broadcastToAdmins({
        type: 'project_request_deleted',
        message: { id }
      });
    } catch (notifyError) {
      console.error('Failed to broadcast project request deletion (non-critical):', notifyError?.message || notifyError);
      // Don't fail the request if notification fails
    }

    res.json({ ok: true, message: "Request deleted successfully" });
  } catch (err) {
    console.error('Error deleting project request:', err);
    res.status(500).json({ error: err.message || "Failed to delete request" });
  }
});

export default router;
