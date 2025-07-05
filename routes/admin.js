const express = require('express');
const { authenticateToken, requireAdmin } = require('./auth');
const User = require('../models/User');
const Material = require('../models/Material');
const Subscription = require('../models/Subscription');
const Log = require('../models/Log');
const { logUserStatusChange, logUserDelete } = require('../utils/logger');
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

// Create new user
router.post('/users', async (req, res) => {
    try {
        const { name, email, password, role, college, branch, phone, address, isActive } = req.body;

        // Validation
        if (!name || !email || !password || !role) {
            return res.status(400).json({ error: 'Name, email, password, and role are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }

        // Create new user
        const user = new User({
            name,
            email,
            password, // Will be hashed by the User model
            role,
            college: college || '',
            branch: branch || '',
            phone: phone || '',
            address: address || '',
            isActive: isActive !== undefined ? isActive : true
        });

        await user.save();

        res.status(201).json({
            message: 'User created successfully',
            user: user.getPublicProfile()
        });
    } catch (error) {
        console.error('Create user error:', error);
        if (error.code === 11000) {
            res.status(400).json({ error: 'User with this email already exists' });
        } else {
            res.status(500).json({ error: 'Failed to create user' });
        }
    }
});

// Toggle user status
router.put('/users/:id/toggle-status', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const previousStatus = user.isActive;
        user.isActive = !user.isActive;
        await user.save();

        // Log the status change
        await logUserStatusChange(req, user, user.isActive);

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

        // Log the user deletion before deleting
        await logUserDelete(req, user);

        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('User delete error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// Get recent activity logs
router.get('/logs', async (req, res) => {
    try {
        console.log('Fetching recent logs...'); // Debug log
        const logs = await Log.getRecentLogs(20);
        console.log('Raw logs from database:', logs); // Debug log
        
        // Format logs for frontend display
        const formattedLogs = logs.map(log => {
            const actionMap = {
                'user_registered': 'User registered',
                'user_login': 'User login',
                'user_logout': 'User logout',
                'material_uploaded': 'New material uploaded',
                'material_updated': 'Material updated',
                'material_deleted': 'Material deleted',
                'subscription_created': 'Subscription created',
                'subscription_renewed': 'Subscription renewed',
                'subscription_cancelled': 'Subscription cancelled',
                'announcement_created': 'Announcement created',
                'announcement_updated': 'Announcement updated',
                'announcement_deleted': 'Announcement deleted',
                'user_status_changed': 'User status changed',
                'user_deleted': 'User deleted',
                'admin_login': 'Admin login',
                'profile_updated': 'Profile updated',
                'password_changed': 'Password changed',
                'college_notices_refreshed': 'College notices refreshed'
            };

            return {
                action: actionMap[log.action] || log.action,
                user: log.userName || log.userEmail || 'System',
                timestamp: log.timestamp,
                details: log.details
            };
        });

        console.log('Formatted logs:', formattedLogs); // Debug log
        res.json(formattedLogs);
    } catch (error) {
        console.error('Logs fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
});

// Test endpoint to create sample logs (for debugging)
router.post('/test-logs', async (req, res) => {
    try {
        const { createActivityLog } = require('../utils/logger');
        
        // Create some sample logs
        await createActivityLog('user_registered', req, { email: 'test@example.com', role: 'student' });
        await createActivityLog('material_uploaded', req, { title: 'Test Material', category: 'Syllabus' });
        await createActivityLog('announcement_created', req, { title: 'Test Announcement', type: 'general' });
        
        res.json({ message: 'Sample logs created successfully' });
    } catch (error) {
        console.error('Test logs error:', error);
        res.status(500).json({ error: 'Failed to create test logs' });
    }
});

// Get analytics data
router.get('/analytics', async (req, res) => {
    try {
        // Get total counts
        const totalUsers = await User.countDocuments();
        const totalStudents = await User.countDocuments({ role: 'student' });
        const totalAdmins = await User.countDocuments({ role: 'admin' });
        const activeUsers = await User.countDocuments({ isActive: true });
        const totalMaterials = await Material.countDocuments();
        const totalAnnouncements = await require('../models/Announcement').countDocuments();

        // Get user growth data for last 7 days
        const userGrowthData = [];
        const branchData = [];
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
            
            const usersCreated = await User.countDocuments({
                createdAt: { $gte: startOfDay, $lte: endOfDay }
            });
            
            userGrowthData.push({
                date: date.toISOString().split('T')[0],
                count: usersCreated
            });
        }

        // Get branch distribution
        const branchAggregation = await User.aggregate([
            { $match: { role: 'student', branch: { $exists: true, $ne: '' } } },
            { $group: { _id: '$branch', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        branchAggregation.forEach(branch => {
            branchData.push({
                branch: branch._id,
                count: branch.count
            });
        });

        // Get recent activity (last 10 activities)
        const recentLogs = await Log.find()
            .sort({ timestamp: -1 })
            .limit(10)
            .select('action userName userEmail timestamp details');

        const recentActivity = recentLogs.map(log => ({
            action: log.action,
            user: log.userName || log.userEmail || 'System',
            timestamp: log.timestamp,
            details: log.details
        }));

        res.json({
            summary: {
                totalUsers,
                totalStudents,
                totalAdmins,
                activeUsers,
                totalMaterials,
                totalAnnouncements
            },
            userGrowth: userGrowthData,
            branchDistribution: branchData,
            recentActivity
        });
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch analytics data' });
    }
});

module.exports = router; 