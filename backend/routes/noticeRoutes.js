import express from 'express';
import mongoose from 'mongoose';
import notificationService from '../websocket.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { validate, noticeCreateSchema } from '../middleware/validation.js';
import Notice from '../models/Notice.js';

const router = express.Router();

const normalizeTimestamp = (value, allowNull = false) => {
  if (!value) return allowNull ? null : new Date().toISOString();
  try {
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value.toDate === 'function') {
      return value.toDate().toISOString();
    }
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  } catch (err) {
    console.warn('[notices] Failed to normalize timestamp:', err?.message);
  }
  return allowNull ? null : new Date().toISOString();
};

const normalizeNoticeRecord = (notice) => {
  try {
    const source = typeof notice === 'object' && notice !== null ? notice : {};
    const id = source._id || source.id;
    if (!id) return null;
    return {
      _id: id.toString(),
      id: id.toString(),
      title: source.title || '',
      content: source.content || '',
      type: source.type || 'general',
      priority: source.priority || 'medium',
      targetAudience: source.targetAudience || 'all',
      targetBranch: source.targetBranch || null,
      isActive: source.isActive !== false,
      isPinned: !!source.isPinned,
      expiresAt: source.expiresAt ? normalizeTimestamp(source.expiresAt, true) : null,
      attachments: Array.isArray(source.attachments) ? source.attachments : [],
      tags: Array.isArray(source.tags) ? source.tags : [],
      createdBy: source.createdBy || null,
      createdAt: normalizeTimestamp(source.createdAt),
      updatedAt: normalizeTimestamp(source.updatedAt),
      views: Number(source.views) || 0,
      readBy: Array.isArray(source.readBy) ? source.readBy : []
    };
  } catch (error) {
    console.error('❌ Failed to normalize notice record:', error);
    return null;
  }
};

// Public route for landing page notices (no authentication required)
router.get('/public', async (req, res) => {
  try {
    // Return sample public notices for landing page
    const publicNotices = [
      {
        _id: "public1",
        title: "Welcome to Digital Gurukul",
        content: "Welcome to our comprehensive learning management system. Explore courses, projects, and connect with fellow students.",
        type: "general",
        priority: "medium",
        targetAudience: "all",
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        _id: "public2", 
        title: "New Course Materials Available",
        content: "Check out the latest course materials and resources uploaded by our faculty members.",
        type: "academic",
        priority: "medium",
        targetAudience: "students",
        isActive: true,
        createdAt: new Date().toISOString()
      }
    ];
    
    res.json(publicNotices);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching public notices', error: error.message });
  }
});

// Get all notices (admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, type, priority, targetAudience, isActive } = req.query;
    const query = {};
    if (type) query.type = type;
    if (priority) query.priority = priority;
    if (targetAudience) query.targetAudience = targetAudience;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const numericPage = Number(page) > 0 ? Number(page) : 1;
    const numericLimit = Number(limit) > 0 ? Number(limit) : 10;
    const start = (numericPage - 1) * numericLimit;
    const end = start + numericLimit;

    const loadNotices = async () => {
      try {
        const notices = await Notice.find(query);
        if (Array.isArray(notices)) {
          return notices;
        }
        return [];
      } catch (err) {
        console.error('❌ Error fetching notices from MongoDB:', err);
        return [];
      }
    };

    const rawNotices = await loadNotices();
    const normalized = rawNotices
      .map(normalizeNoticeRecord)
      .filter(Boolean);

    const notices = normalized.slice(start, end);
    const total = normalized.length;

    res.json({
      notices,
      totalPages: Math.max(1, Math.ceil(total / numericLimit)),
      currentPage: numericPage,
      total
    });
  } catch (error) {
    console.error('❌ Error in /api/notices route:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error details:', {
      message: error.message,
      name: error.name,
      code: error.code
    });
    res.status(500).json({ 
      message: 'Error fetching notices', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get notices for specific user (real data)
// CRITICAL: This route MUST be defined before /:id route to avoid Express matching conflicts
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    console.log('[/api/notices/user/:userId] Route hit for userId:', req.params.userId);
    const { userId } = req.params;
    const requestingUser = req.user; // User from auth token

    if (!requestingUser) {
      console.error('[/api/notices/user/:userId] No user in request');
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Verify that the requesting user is accessing their own notices or is an admin
    if (requestingUser.id !== userId && requestingUser.userType !== 'admin') {
      console.warn('[/api/notices/user/:userId] Access denied - user mismatch');
      return res.status(403).json({ message: 'Access denied' });
    }

    // Load user details for targeting
    const User = (await import('../models/User.js')).default;
    let user;
    try {
      user = await User.findById(userId);
      if (!user) {
        user = await User.findOne({ id: userId });
      }
    } catch (err) {
      console.error('Error loading user:', err);
      // Fallback: use requesting user data if userId lookup fails
      user = requestingUser;
    }

    if (!user) {
      // If user not found, return empty array instead of error
      console.warn('[/api/notices/user/:userId] User not found, returning empty array');
      return res.json([]);
    }

    // Build audience filter
    const audienceFilter = [{ targetAudience: 'all' }];
    if (user.userType === 'student') audienceFilter.push({ targetAudience: 'students' });
    if (user.userType === 'admin') audienceFilter.push({ targetAudience: 'admins' });
    if (user.branch) audienceFilter.push({ targetAudience: 'specific_branch', targetBranch: user.branch });

    // Get all notices (filter client-side for broader compatibility)
    let allNotices;
      try {
        allNotices = await Notice.find({});
      } catch (err) {
        console.error('Error fetching notices:', err);
        return res.json([]);
      }

    // Filter client-side to simulate $or
    const notices = allNotices.filter(n => {
      const isActive = n.isActive !== false;
      if (!isActive) return false;
      // Check if notice has expired
      if (n.expiresAt && new Date(n.expiresAt) < new Date()) {
        return false;
      }
      
      return audienceFilter.some(f => {
        if (f.targetAudience === 'specific_branch') {
          return n.targetAudience === 'specific_branch' && n.targetBranch === f.targetBranch;
        }
        return n.targetAudience === f.targetAudience;
      });
    });

    // Compute isRead per user and normalize IDs
    const mapped = notices.map(n => {
      const noticeObj = n.toObject ? n.toObject() : { ...n };
      // Notice uses 'id', but frontend expects '_id'
      const noticeId = noticeObj.id || noticeObj._id;
      return {
        ...noticeObj,
        _id: noticeId?.toString?.() || noticeId,
        id: noticeId?.toString?.() || noticeId,
        isRead: Array.isArray(noticeObj.readBy)
          ? noticeObj.readBy.some((entry) => {
              const entryUserId = entry.user?.toString?.() || entry.user || entry;
              return entryUserId === userId || entryUserId?.toString?.() === userId;
            })
          : false,
        views: noticeObj.views || 0,
        isActive: noticeObj.isActive !== false,
        isPinned: noticeObj.isPinned || false,
        createdAt: normalizeTimestamp(noticeObj.createdAt),
        updatedAt: normalizeTimestamp(noticeObj.updatedAt),
        expiresAt: noticeObj.expiresAt ? normalizeTimestamp(noticeObj.expiresAt, true) : null,
        createdBy: noticeObj.createdBy || { name: 'Admin', email: '' }
      };
    });

    console.log('[/api/notices/user/:userId] Returning', mapped.length, 'notices');
    res.json(mapped);
  } catch (error) {
    console.error('Error in /user/:userId route:', error);
    res.status(500).json({ message: 'Error fetching user notices', error: error.message });
  }
});

// Get notice statistics (admin only) - MUST come before /:id
router.get('/stats/overview', authenticateToken, requireAdmin, async (req, res) => {
  try {
    let all = [];
    try {
      all = await Notice.find({});
    } catch (findError) {
      console.error('Error fetching notices for stats:', findError);
      // Return empty stats if MongoDB query fails
      all = [];
    }
    
    const totalNotices = all.length;
    const activeNotices = all.filter(n => n.isActive !== false).length;
    const pinnedNotices = all.filter(n => n.isPinned === true).length;
    const urgentNotices = all.filter(n => n.priority === 'urgent' && n.isActive !== false).length;
    const noticesByType = Object.entries(all.reduce((acc, n) => { 
      const noticeType = n.type || 'general';
      acc[noticeType] = (acc[noticeType] || 0) + 1; 
      return acc; 
    }, {})).map(([type, count]) => ({ type, count }));
    const noticesByPriority = Object.entries(all.reduce((acc, n) => { 
      const noticePriority = n.priority || 'medium';
      acc[noticePriority] = (acc[noticePriority] || 0) + 1; 
      return acc; 
    }, {})).map(([priority, count]) => ({ priority, count }));

    res.json({ totalNotices, activeNotices, pinnedNotices, urgentNotices, noticesByType, noticesByPriority });
  } catch (error) {
    console.error('Error in /api/notices/stats/overview route:', error);
    res.status(500).json({ message: 'Error fetching notice statistics', error: error.message });
  }
});

// Mark notice as read - MUST come before /:id
router.post('/:id/read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId || req.body.userId;
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const notice = await Notice.findById(req.params.id);
    if (!notice) {
      return res.status(404).json({ message: 'Notice not found' });
    }

    await notice.markAsRead(userId);
    res.json({ message: 'Notice marked as read' });
  } catch (error) {
    console.error('Error marking notice as read:', error);
    res.status(500).json({ message: 'Error marking notice as read', error: error.message });
  }
});

// Get single notice by ID - MUST be after all specific routes
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id);
    

    if (!notice) {
      return res.status(404).json({ message: 'Notice not found' });
    }

    // Increment view count
    notice.views = (notice.views || 0) + 1;
    await notice.save();

    res.json(notice);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notice', error: error.message });
  }
});

// Create new notice (admin only)
router.post('/', authenticateToken, requireAdmin, validate(noticeCreateSchema), async (req, res) => {
  try {
    const {
      title,
      content,
      type,
      priority,
      targetAudience,
      targetBranch,
      isPinned,
      expiresAt,
      attachments,
      tags
    } = req.body;

    // Validation is handled by middleware

    // Use the authenticated user's ID
    const createdBy = req.user.id;

    const notice = await Notice.create({
      title,
      content,
      type: type || 'general',
      priority: priority || 'medium',
      targetAudience: targetAudience || 'all',
      targetBranch: targetAudience === 'specific_branch' ? targetBranch : null,
      isPinned: isPinned || false,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      attachments: attachments || [],
      tags: tags || [],
      createdBy
    });

    // Send real-time notification to all relevant users and admins activity
    await notificationService.broadcastNotice(notice);
    try { await notificationService.notifyNoticePublished(notice); } catch {}

    res.status(201).json(notice);
  } catch (error) {
    res.status(500).json({ message: 'Error creating notice', error: error.message });
  }
});

// Update notice (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      title,
      content,
      type,
      priority,
      targetAudience,
      targetBranch,
      isActive,
      isPinned,
      expiresAt,
      attachments,
      tags
    } = req.body;

    const notice = await Notice.findById(req.params.id);
    if (!notice) {
      return res.status(404).json({ message: 'Notice not found' });
    }

    // Update fields
    if (title) notice.title = title;
    if (content) notice.content = content;
    if (type) notice.type = type;
    if (priority) notice.priority = priority;
    if (targetAudience) notice.targetAudience = targetAudience;
    if (targetBranch) notice.targetBranch = targetBranch;
    if (isActive !== undefined) notice.isActive = isActive;
    if (isPinned !== undefined) notice.isPinned = isPinned;
    if (expiresAt) notice.expiresAt = new Date(expiresAt);
    if (attachments) notice.attachments = attachments;
    if (tags) notice.tags = tags;

    await notice.save();

    // Send real-time notification about the update
    await notificationService.updateNotice(notice);
    try { await notificationService.notifyNoticePublished(notice); } catch {}

    res.json(notice);
  } catch (error) {
    res.status(500).json({ message: 'Error updating notice', error: error.message });
  }
});

// Delete notice (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || id === 'undefined' || id.trim() === '') {
      return res.status(400).json({ message: 'Invalid notice ID' });
    }
    
    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid notice ID format' });
    }
    
    // Find the notice first to get its title for notifications
    const notice = await Notice.findById(id);
    if (!notice) {
      return res.status(404).json({ message: 'Notice not found' });
    }

    const noticeTitle = notice.title || 'Notice';
    
    // Delete the notice
    const deleted = await Notice.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Notice not found or already deleted' });
    }
    
    // Send real-time notification about the deletion
    try {
      await notificationService.deleteNotice(id);
    } catch (notifyError) {
      console.warn('Failed to send delete notification:', notifyError);
      // Don't fail the request if notification fails
    }
    
    res.json({ message: 'Notice deleted successfully' });
  } catch (error) {
    console.error('Error deleting notice:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Error deleting notice', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

export default router;
