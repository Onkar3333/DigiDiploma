const express = require('express');
const { authenticateToken } = require('./auth');
const Material = require('../models/Material');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get student dashboard data
router.get('/dashboard', async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get active subscriptions
        const subscriptions = await Subscription.find({
            user: req.user.userId,
            status: 'active'
        });

        // Get available materials for user's branch
        const materials = await Material.find({
            branch: user.branch,
            isActive: true
        })
        .populate('uploadedBy', 'name')
        .sort({ createdAt: -1 })
        .limit(10);

        res.json({
            user: user.getPublicProfile(),
            subscriptions,
            recentMaterials: materials
        });
    } catch (error) {
        console.error('Dashboard fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
});

// Get materials for student's branch and semester
router.get('/materials', async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const { semester, subject, category } = req.query;
        const filter = {
            branch: user.branch,
            isActive: true
        };

        if (semester) filter.semester = semester;
        if (subject) filter.subject = subject;
        if (category) filter.category = category;

        const materials = await Material.find(filter)
            .populate('uploadedBy', 'name')
            .sort({ createdAt: -1 });

        res.json(materials);
    } catch (error) {
        console.error('Student materials fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch materials' });
    }
});

// Get student's subscriptions
router.get('/subscriptions', async (req, res) => {
    try {
        const subscriptions = await Subscription.find({
            user: req.user.userId
        })
        .sort({ createdAt: -1 });

        res.json(subscriptions);
    } catch (error) {
        console.error('Subscriptions fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch subscriptions' });
    }
});

// Create new subscription
router.post('/subscriptions', async (req, res) => {
    try {
        const { semester, plan, amount } = req.body;
        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Generate mock payment ID
        const paymentId = 'PAY_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

        // Calculate end date (30 days from now for basic plan)
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30);

        const subscription = new Subscription({
            user: req.user.userId,
            semester,
            branch: user.branch,
            plan,
            amount,
            paymentId,
            status: 'active',
            endDate,
            features: ['pdf_access', 'video_access']
        });

        await subscription.save();

        res.status(201).json({
            message: 'Subscription created successfully',
            subscription
        });
    } catch (error) {
        console.error('Subscription creation error:', error);
        res.status(500).json({ error: 'Failed to create subscription' });
    }
});

// Get student profile
router.get('/profile', async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user: user.getPublicProfile() });
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// Update student profile
router.put('/profile', async (req, res) => {
    try {
        const { name, phone, address } = req.body;
        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (name) user.name = name;
        if (phone) user.phone = phone;
        if (address) user.address = address;

        await user.save();

        res.json({
            message: 'Profile updated successfully',
            user: user.getPublicProfile()
        });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

module.exports = router; 