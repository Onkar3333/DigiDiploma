const express = require('express');
const { authenticateToken, requireAdmin } = require('./auth');
const router = express.Router();

// Mock announcements data (in real app, you'd have an Announcement model)
let announcements = [
    {
        id: '1',
        title: 'Welcome to Digital Gurukul',
        content: 'Welcome to our new student portal!',
        type: 'popup',
        isActive: true,
        createdAt: new Date(),
        createdBy: 'admin'
    }
];

// Get all announcements
router.get('/', authenticateToken, async (req, res) => {
    try {
        res.json(announcements.filter(a => a.isActive));
    } catch (error) {
        console.error('Announcements fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch announcements' });
    }
});

// Create new announcement (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { title, content, type, isActive = true } = req.body;

        const announcement = {
            id: Date.now().toString(),
            title,
            content,
            type: type || 'popup',
            isActive,
            createdAt: new Date(),
            createdBy: req.user.name
        };

        announcements.push(announcement);

        // Emit real-time update
        const io = req.app.get('io');
        if (io) {
            io.emit('new-announcement', {
                id: announcement.id,
                title: announcement.title,
                type: announcement.type
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
        const announcement = announcements.find(a => a.id === req.params.id);
        
        if (!announcement) {
            return res.status(404).json({ error: 'Announcement not found' });
        }

        const { title, content, type, isActive } = req.body;
        
        if (title) announcement.title = title;
        if (content) announcement.content = content;
        if (type) announcement.type = type;
        if (typeof isActive === 'boolean') announcement.isActive = isActive;

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
        const index = announcements.findIndex(a => a.id === req.params.id);
        
        if (index === -1) {
            return res.status(404).json({ error: 'Announcement not found' });
        }

        announcements.splice(index, 1);

        res.json({ message: 'Announcement deleted successfully' });
    } catch (error) {
        console.error('Announcement delete error:', error);
        res.status(500).json({ error: 'Failed to delete announcement' });
    }
});

module.exports = router; 