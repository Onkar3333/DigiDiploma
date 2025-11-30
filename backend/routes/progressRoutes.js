import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import FirebaseProgress from '../models/FirebaseProgress.js';
import FirebaseSubscription from '../models/FirebaseSubscription.js';
import FirebaseUser from '../models/FirebaseUser.js';

const router = express.Router();

// Get user's progress
router.get('/my-progress', authenticateToken, async (req, res) => {
  try {
    const { contentType, subjectId, semester, branch } = req.query;
    
    let filters = {};
    if (contentType) filters.contentType = contentType;
    if (subjectId) filters.subjectId = subjectId;
    if (semester) filters.semester = semester;
    if (branch) filters.branch = branch;
    
    const progress = await FirebaseProgress.findByUser(req.user.userId, filters);
    res.json(progress);
  } catch (error) {
    console.error('Error fetching user progress:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

// Get progress for specific content
router.get('/content/:contentId', authenticateToken, async (req, res) => {
  try {
    const { contentId } = req.params;
    const { contentType } = req.query;
    
    const progress = await FirebaseProgress.findByUserAndContent(
      req.user.userId, 
      contentId, 
      contentType
    );
    
    res.json(progress);
  } catch (error) {
    console.error('Error fetching content progress:', error);
    res.status(500).json({ error: 'Failed to fetch content progress' });
  }
});

// Get user's semester progress overview
router.get('/semester-overview', authenticateToken, async (req, res) => {
  try {
    const user = await FirebaseUser.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const semesterProgress = await FirebaseProgress.getUserSemesterProgress(
      req.user.userId, 
      user.semester, 
      user.branch
    );
    
    res.json(semesterProgress);
  } catch (error) {
    console.error('Error fetching semester progress:', error);
    res.status(500).json({ error: 'Failed to fetch semester progress' });
  }
});

// Update progress
router.post('/update', authenticateToken, async (req, res) => {
  try {
    const {
      contentId,
      contentType,
      subjectId,
      subjectName,
      branch,
      semester,
      progress,
      timeSpent,
      lastPosition,
      totalDuration,
      completed,
      bookmarked,
      notes,
      rating
    } = req.body;
    
    // Check if user has access to progress tracking
    const user = await FirebaseUser.findById(req.user.userId);
    const hasAccess = await FirebaseSubscription.hasAccess(req.user.userId, 'progress_tracking', user.semester);
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Subscription required to track progress' });
    }
    
    const updateData = {
      userId: req.user.userId,
      contentId,
      contentType,
      subjectId,
      subjectName,
      branch: branch || user.branch,
      semester: semester || user.semester,
      progress,
      timeSpent,
      lastPosition,
      totalDuration,
      completed,
      bookmarked,
      notes,
      rating
    };
    
    const progressRecord = await FirebaseProgress.updateProgress(
      req.user.userId,
      contentId,
      contentType,
      updateData
    );
    
    res.json(progressRecord);
  } catch (error) {
    console.error('Error updating progress:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// Mark content as completed
router.post('/complete/:contentId', authenticateToken, async (req, res) => {
  try {
    const { contentId } = req.params;
    const { contentType } = req.body;
    
    // Check if user has access to progress tracking
    const user = await FirebaseUser.findById(req.user.userId);
    const hasAccess = await FirebaseSubscription.hasAccess(req.user.userId, 'progress_tracking', user.semester);
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Subscription required to track progress' });
    }
    
    let progress = await FirebaseProgress.findByUserAndContent(
      req.user.userId, 
      contentId, 
      contentType
    );
    
    if (!progress) {
      // Create new progress record
      progress = await FirebaseProgress.create({
        userId: req.user.userId,
        contentId,
        contentType,
        progress: 100,
        completed: true,
        completedAt: new Date()
      });
    } else {
      // Update existing progress
      await progress.markCompleted();
    }
    
    res.json(progress);
  } catch (error) {
    console.error('Error marking content as completed:', error);
    res.status(500).json({ error: 'Failed to mark content as completed' });
  }
});

// Toggle bookmark
router.post('/bookmark/:contentId', authenticateToken, async (req, res) => {
  try {
    const { contentId } = req.params;
    const { contentType } = req.body;
    
    // Check if user has access to progress tracking
    const user = await FirebaseUser.findById(req.user.userId);
    const hasAccess = await FirebaseSubscription.hasAccess(req.user.userId, 'progress_tracking', user.semester);
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Subscription required to track progress' });
    }
    
    let progress = await FirebaseProgress.findByUserAndContent(
      req.user.userId, 
      contentId, 
      contentType
    );
    
    if (!progress) {
      // Create new progress record
      progress = await FirebaseProgress.create({
        userId: req.user.userId,
        contentId,
        contentType,
        bookmarked: true
      });
    } else {
      // Toggle bookmark
      await progress.toggleBookmark();
    }
    
    res.json(progress);
  } catch (error) {
    console.error('Error toggling bookmark:', error);
    res.status(500).json({ error: 'Failed to toggle bookmark' });
  }
});

// Get user's bookmarked content
router.get('/bookmarks', authenticateToken, async (req, res) => {
  try {
    const progress = await FirebaseProgress.findByUser(req.user.userId, { bookmarked: true });
    res.json(progress);
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    res.status(500).json({ error: 'Failed to fetch bookmarks' });
  }
});

// Get user's completed content
router.get('/completed', authenticateToken, async (req, res) => {
  try {
    const progress = await FirebaseProgress.findByUser(req.user.userId, { completed: true });
    res.json(progress);
  } catch (error) {
    console.error('Error fetching completed content:', error);
    res.status(500).json({ error: 'Failed to fetch completed content' });
  }
});

// Get user's progress statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await FirebaseProgress.getStats(req.user.userId);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching progress stats:', error);
    res.status(500).json({ error: 'Failed to fetch progress stats' });
  }
});

// Admin routes
router.get('/admin/all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId, subjectId, contentType, completed, bookmarked } = req.query;
    
    let filters = {};
    if (userId) filters.userId = userId;
    if (subjectId) filters.subjectId = subjectId;
    if (contentType) filters.contentType = contentType;
    if (completed !== undefined) filters.completed = completed === 'true';
    if (bookmarked !== undefined) filters.bookmarked = bookmarked === 'true';
    
    const progress = await FirebaseProgress.find(filters);
    res.json(progress);
  } catch (error) {
    console.error('Error fetching all progress:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

router.get('/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stats = await FirebaseProgress.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching progress stats:', error);
    res.status(500).json({ error: 'Failed to fetch progress stats' });
  }
});

router.get('/admin/user/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const progress = await FirebaseProgress.findByUser(userId);
    res.json(progress);
  } catch (error) {
    console.error('Error fetching user progress:', error);
    res.status(500).json({ error: 'Failed to fetch user progress' });
  }
});

router.get('/admin/subject/:subjectId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { subjectId } = req.params;
    
    const progress = await FirebaseProgress.findBySubject(subjectId);
    res.json(progress);
  } catch (error) {
    console.error('Error fetching subject progress:', error);
    res.status(500).json({ error: 'Failed to fetch subject progress' });
  }
});

router.delete('/admin/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const progress = await FirebaseProgress.findByIdAndDelete(id);
    if (!progress) {
      return res.status(404).json({ error: 'Progress record not found' });
    }
    
    res.json({ message: 'Progress record deleted successfully' });
  } catch (error) {
    console.error('Error deleting progress:', error);
    res.status(500).json({ error: 'Failed to delete progress' });
  }
});

export default router;
