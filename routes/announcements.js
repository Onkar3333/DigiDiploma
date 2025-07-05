const express = require('express');
const { authenticateToken, requireAdmin } = require('./auth');
const Announcement = require('../models/Announcement');
const { logAnnouncementCreate, logAnnouncementUpdate, logAnnouncementDelete } = require('../utils/logger');
const router = express.Router();

// Get all announcements (filtered by user role)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const audience = req.user.role === 'admin' ? 'admin' : 'students';
        const announcements = await Announcement.getActiveAnnouncements(audience);
        res.json(announcements);
    } catch (error) {
        console.error('Announcements fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch announcements' });
    }
});

// Get all announcements for admin management (including inactive)
router.get('/admin', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const announcements = await Announcement.find()
            .sort({ createdAt: -1 })
            .populate('createdBy', 'name email');
        res.json(announcements);
    } catch (error) {
        console.error('Admin announcements fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch announcements' });
    }
});

// Create new announcement (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { title, content, type, priority, targetAudience, expiresAt } = req.body;

        if (!title || !content) {
            return res.status(400).json({ error: 'Title and content are required' });
        }

        const announcement = new Announcement({
            title,
            content,
            type: type || 'general',
            priority: priority || 'medium',
            targetAudience: targetAudience || 'all',
            expiresAt: expiresAt ? new Date(expiresAt) : null,
            createdBy: req.user.userId
        });

        await announcement.save();

        // Log the announcement creation
        await logAnnouncementCreate(req, announcement);

        // Emit real-time update
        const io = req.app.get('io');
        if (io) {
            io.emit('new-announcement', {
                id: announcement._id,
                title: announcement.title,
                type: announcement.type,
                priority: announcement.priority
            });
        }

        res.status(201).json({
            message: 'Announcement created successfully',
            announcement
        });
    } catch (error) {
        console.error('Announcement creation error:', error);
        res.status(500).json({ error: 'Failed to create announcement' });
    }
});

// Update announcement
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { title, content, type, priority, targetAudience, isActive, expiresAt } = req.body;
        
        const announcement = await Announcement.findById(req.params.id).populate('createdBy', 'name email');
        
        if (!announcement) {
            return res.status(404).json({ error: 'Announcement not found' });
        }

        if (title) announcement.title = title;
        if (content) announcement.content = content;
        if (type) announcement.type = type;
        if (priority) announcement.priority = priority;
        if (targetAudience) announcement.targetAudience = targetAudience;
        if (typeof isActive === 'boolean') announcement.isActive = isActive;
        if (expiresAt !== undefined) {
            announcement.expiresAt = expiresAt ? new Date(expiresAt) : null;
        }

        announcement.updatedAt = new Date();
        await announcement.save();

        // Log the announcement update
        await logAnnouncementUpdate(req, announcement);

        // Emit real-time update
        const io = req.app.get('io');
        if (io) {
            io.emit('announcement-updated', {
                id: announcement._id,
                title: announcement.title,
                type: announcement.type,
                priority: announcement.priority
            });
        }

        res.json({
            message: 'Announcement updated successfully',
            announcement
        });
    } catch (error) {
        console.error('Announcement update error:', error);
        res.status(500).json({ error: 'Failed to update announcement' });
    }
});

// Delete announcement
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const announcement = await Announcement.findById(req.params.id);
        
        if (!announcement) {
            return res.status(404).json({ error: 'Announcement not found' });
        }

        // Log the announcement deletion before deleting
        await logAnnouncementDelete(req, announcement);

        await Announcement.findByIdAndDelete(req.params.id);

        // Emit real-time update
        const io = req.app.get('io');
        if (io) {
            io.emit('announcement-deleted', {
                id: req.params.id
            });
        }

        res.json({ message: 'Announcement deleted successfully' });
    } catch (error) {
        console.error('Announcement delete error:', error);
        res.status(500).json({ error: 'Failed to delete announcement' });
    }
});

// Toggle announcement status
router.patch('/:id/toggle', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const announcement = await Announcement.findById(req.params.id);
        
        if (!announcement) {
            return res.status(404).json({ error: 'Announcement not found' });
        }

        announcement.isActive = !announcement.isActive;
        announcement.updatedAt = new Date();
        await announcement.save();

        res.json({
            message: `Announcement ${announcement.isActive ? 'activated' : 'deactivated'} successfully`,
            announcement
        });
    } catch (error) {
        console.error('Announcement toggle error:', error);
        res.status(500).json({ error: 'Failed to toggle announcement status' });
    }
});

module.exports = router; 