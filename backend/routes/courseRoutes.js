import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import Course from '../models/Course.js'; // Unified model (MongoDB or Firebase)
import notificationService from '../websocket.js';

const router = express.Router();

const isValidDate = (date) => date instanceof Date && !Number.isNaN(date.getTime());

const fromSecondsNanoseconds = (value) => {
  const { seconds, nanoseconds } = value || {};
  if (typeof seconds === 'number') {
    const millis = seconds * 1000 + Math.floor((nanoseconds || 0) / 1e6);
    const date = new Date(millis);
    return isValidDate(date) ? date.toISOString() : null;
  }
  return null;
};

const toIsoString = (value, fallback) => {
  if (!value) return fallback;
  if (value instanceof Date) {
    return isValidDate(value) ? value.toISOString() : fallback;
  }
  if (typeof value.toDate === 'function') {
    try {
      const converted = value.toDate();
      return isValidDate(converted) ? converted.toISOString() : fallback;
    } catch {
      return fallback;
    }
  }
  if (value && typeof value === 'object' && typeof value.seconds === 'number') {
    const iso = fromSecondsNanoseconds(value);
    if (iso) return iso;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
};

const normalizeCourse = (course) => {
  const safeDefaults = () => {
    const nowIso = new Date().toISOString();
    return {
      id: `course_${Math.random().toString(36).slice(2, 8)}`,
      title: 'Untitled',
      description: '',
      branch: 'Unknown',
      semester: '-',
      subject: '-',
      poster: null,
      coverPhoto: null,
      resourceUrl: '',
      lectures: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  };

  if (!course || typeof course !== 'object') {
    return safeDefaults();
  }

  try {
    const id = course.id || course._id || safeDefaults().id;
    const nowIso = new Date().toISOString();
    const createdAt = toIsoString(course.createdAt, nowIso);
    const updatedAt = toIsoString(course.updatedAt, createdAt);
    return {
      id,
      _id: id,
      title: course.title ?? 'Untitled',
      description: course.description ?? '',
      branch: course.branch ?? 'Unknown',
      semester: course.semester ?? '-',
      subject: course.subject ?? '-',
      poster: course.poster || null,
      coverPhoto: course.coverPhoto || course.poster || null,
      resourceUrl: course.resourceUrl || '',
      lectures: Array.isArray(course.lectures) ? course.lectures : [],
      createdAt,
      updatedAt,
    };
  } catch (error) {
    console.error('Error normalizing course record:', course?.id || course?._id, error);
    return safeDefaults();
  }
};

const fetchCoursesByQuery = async (query = {}) => {
  try {
    const courses = await Course.find(query);
    return courses.map(normalizeCourse);
  } catch (err) {
    console.error('Error fetching courses:', err);
    return [];
  }
};

// Public listing for students
router.get('/public', async (req, res) => {
  try {
    const { branch, semester, subject } = req.query;
    const query = {};
    if (branch) query.branch = branch;
    if (semester) query.semester = isNaN(Number(semester)) ? semester : Number(semester);
    if (subject) query.subject = subject;
    const courses = await fetchCoursesByQuery(query);
    res.json({ courses });
  } catch (error) {
    console.error('Error listing public courses:', error);
    res.status(500).json({ error: 'Failed to list courses', details: error.message });
  }
});

// GET /api/courses - list courses (both admin and user can view)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { branch, semester, subject } = req.query;
    const query = {};
    if (branch) query.branch = branch;
    if (semester) query.semester = isNaN(Number(semester)) ? semester : Number(semester);
    if (subject) query.subject = subject;
    const courses = await fetchCoursesByQuery(query);
    res.json({ courses });
  } catch (error) {
    console.error('Error listing courses:', error);
    res.status(500).json({ error: 'Failed to list courses', details: error.message });
  }
});

// POST /api/courses - launch new course (admin)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { title, description, branch, semester, subject, poster, lectures, coverPhoto, resourceUrl } = req.body;
    console.log('[POST /api/courses] Incoming body:', { title, description, branch, semester, subject, hasPoster: !!poster, hasCover: !!coverPhoto, hasLink: !!resourceUrl, lecturesCount: Array.isArray(lectures) ? lectures.length : 0 });
    if (!title || !description || !branch || (!semester && semester !== 0) || !subject) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const parsedSemester = typeof semester === 'string' && /^\d+$/.test(semester) ? Number(semester) : semester;
    const course = await Course.create({
      title,
      description,
      branch,
      semester: parsedSemester,
      subject,
      poster: poster || null,
      coverPhoto: coverPhoto || null,
      resourceUrl: resourceUrl || null,
      lectures: lectures || [],
      createdBy: req.user?.id
    });
    console.log('[POST /api/courses] Created course:', { id: course.id, title: course.title, branch: course.branch, semester: course.semester, subject: course.subject });
    const normalized = normalizeCourse(course);
    try {
      await notificationService.broadcast({
        type: 'course_launched',
        course: normalized
      });
    } catch {}
    res.status(201).json(normalized);
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({ error: 'Failed to create course', details: error.message });
  }
});

// PUT /api/courses/:id - update course
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Course ID is required' });
    const updates = { ...req.body };
    if (updates.semester && typeof updates.semester === 'string' && /^\d+$/.test(updates.semester)) {
      updates.semester = Number(updates.semester);
    }
    const updated = await Course.findByIdAndUpdate(id, updates);
    const normalized = normalizeCourse(updated);
    try {
      await notificationService.broadcast({
        type: 'course_updated',
        course: normalized
      });
    } catch {}
    res.json(normalized);
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({ error: 'Failed to update course', details: error.message });
  }
});

// DELETE /api/courses/:id - remove course
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Course ID is required' });
    await Course.findByIdAndDelete(id);
    try {
      await notificationService.broadcast({
        type: 'course_deleted',
        courseId: id
      });
    } catch {}
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({ error: 'Failed to delete course', details: error.message });
  }
});

export default router;
