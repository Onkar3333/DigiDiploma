const express = require('express');
const { authenticateToken, requireAdmin } = require('./auth');
const User = require('../models/User');
const Material = require('../models/Material');
const Subscription = require('../models/Subscription');
const router = express.Router();

// Apply admin middleware to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// Get dashboard statistics
router.get('/stats', async (req, res) => {
    try {
        const totalStudents = await User.countDocuments({ role: 'student' });
        const activeSubscriptions = await Subscription.countDocuments({ status: 'active' });
        const totalMaterials = await Material.countDocuments({ isActive: true });
        
        // Mock quiz participation for now
        const quizParticipation = Math.floor(Math.random() * 100) + 50;

        res.json({
            totalStudents,
            activeSubscriptions,
            totalMaterials,
            quizParticipation
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// Get all users
router.get('/users', async (req, res) => {
    try {
        const users = await User.find({}).select('-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        console.error('Users fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Toggle user status
router.put('/users/:id/toggle-status', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.isActive = !user.isActive;
        await user.save();

        res.json({ 
            message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
            user: user.getPublicProfile()
        });
    } catch (error) {
        console.error('User status toggle error:', error);
        res.status(500).json({ error: 'Failed to toggle user status' });
    }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.role === 'admin') {
            return res.status(403).json({ error: 'Cannot delete admin users' });
        }

        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('User delete error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// Get recent activity logs (mock data for now)
router.get('/logs', async (req, res) => {
    try {
        // Mock logs - in a real app, you'd have a separate Log model
        const logs = [
            {
                action: 'New material uploaded',
                user: 'Admin User',
                timestamp: new Date(Date.now() - 1000 * 60 * 5) // 5 minutes ago
            },
            {
                action: 'User registered',
                user: 'john.doe@example.com',
                timestamp: new Date(Date.now() - 1000 * 60 * 15) // 15 minutes ago
            },
            {
                action: 'Subscription renewed',
                user: 'jane.smith@example.com',
                timestamp: new Date(Date.now() - 1000 * 60 * 30) // 30 minutes ago
            }
        ];

        res.json(logs);
    } catch (error) {
        console.error('Logs fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
});

module.exports = router; 