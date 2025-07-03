const express = require('express');
const { authenticateToken, requireAdmin } = require('./auth');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const router = express.Router();

// Get all subscriptions (admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const subscriptions = await Subscription.find({})
            .populate('user', 'name email college branch')
            .sort({ createdAt: -1 });

        res.json(subscriptions);
    } catch (error) {
        console.error('Subscriptions fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch subscriptions' });
    }
});

// Get subscription by ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const subscription = await Subscription.findById(req.params.id)
            .populate('user', 'name email college branch');

        if (!subscription) {
            return res.status(404).json({ error: 'Subscription not found' });
        }

        // Check if user can access this subscription
        if (req.user.role !== 'admin' && subscription.user._id.toString() !== req.user.userId) {
            return res.status(403).json({ error: 'Not authorized to view this subscription' });
        }

        res.json(subscription);
    } catch (error) {
        console.error('Subscription fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch subscription' });
    }
});

// Create new subscription
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { semester, plan, amount } = req.body;
        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Generate mock payment ID
        const paymentId = 'PAY_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

        // Calculate end date based on plan
        const endDate = new Date();
        let daysToAdd = 30; // default for basic plan
        
        if (plan === 'premium') {
            daysToAdd = 90;
        } else if (plan === 'complete') {
            daysToAdd = 180;
        }
        
        endDate.setDate(endDate.getDate() + daysToAdd);

        // Determine features based on plan
        let features = ['pdf_access'];
        if (plan === 'premium' || plan === 'complete') {
            features.push('video_access', 'quiz_access');
        }
        if (plan === 'complete') {
            features.push('download_access', 'priority_support');
        }

        const subscription = new Subscription({
            user: req.user.userId,
            semester,
            branch: user.branch,
            plan,
            amount,
            paymentId,
            status: 'active',
            endDate,
            features
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

// Update subscription status (admin only)
router.put('/:id/status', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        const subscription = await Subscription.findById(req.params.id);

        if (!subscription) {
            return res.status(404).json({ error: 'Subscription not found' });
        }

        subscription.status = status;
        await subscription.save();

        res.json({
            message: 'Subscription status updated successfully',
            subscription
        });
    } catch (error) {
        console.error('Subscription status update error:', error);
        res.status(500).json({ error: 'Failed to update subscription status' });
    }
});

// Extend subscription
router.put('/:id/extend', authenticateToken, async (req, res) => {
    try {
        const { days } = req.body;
        const subscription = await Subscription.findById(req.params.id);

        if (!subscription) {
            return res.status(404).json({ error: 'Subscription not found' });
        }

        // Check if user can extend this subscription
        if (req.user.role !== 'admin' && subscription.user.toString() !== req.user.userId) {
            return res.status(403).json({ error: 'Not authorized to extend this subscription' });
        }

        await subscription.extend(days || 30);

        res.json({
            message: 'Subscription extended successfully',
            subscription
        });
    } catch (error) {
        console.error('Subscription extension error:', error);
        res.status(500).json({ error: 'Failed to extend subscription' });
    }
});

// Cancel subscription
router.put('/:id/cancel', authenticateToken, async (req, res) => {
    try {
        const subscription = await Subscription.findById(req.params.id);

        if (!subscription) {
            return res.status(404).json({ error: 'Subscription not found' });
        }

        // Check if user can cancel this subscription
        if (req.user.role !== 'admin' && subscription.user.toString() !== req.user.userId) {
            return res.status(403).json({ error: 'Not authorized to cancel this subscription' });
        }

        subscription.status = 'cancelled';
        await subscription.save();

        res.json({
            message: 'Subscription cancelled successfully',
            subscription
        });
    } catch (error) {
        console.error('Subscription cancellation error:', error);
        res.status(500).json({ error: 'Failed to cancel subscription' });
    }
});

// Get expiring subscriptions (admin only)
router.get('/expiring/soon', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

        const expiringSubscriptions = await Subscription.find({
            status: 'active',
            endDate: { $lte: sevenDaysFromNow }
        })
        .populate('user', 'name email');

        res.json(expiringSubscriptions);
    } catch (error) {
        console.error('Expiring subscriptions fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch expiring subscriptions' });
    }
});

// Get subscription statistics (admin only)
router.get('/stats/overview', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const totalSubscriptions = await Subscription.countDocuments();
        const activeSubscriptions = await Subscription.countDocuments({ status: 'active' });
        const expiredSubscriptions = await Subscription.countDocuments({ status: 'expired' });
        const cancelledSubscriptions = await Subscription.countDocuments({ status: 'cancelled' });

        // Revenue by plan
        const revenueByPlan = await Subscription.aggregate([
            { $group: { _id: '$plan', total: { $sum: '$amount' } } }
        ]);

        res.json({
            totalSubscriptions,
            activeSubscriptions,
            expiredSubscriptions,
            cancelledSubscriptions,
            revenueByPlan
        });
    } catch (error) {
        console.error('Subscription stats error:', error);
        res.status(500).json({ error: 'Failed to fetch subscription statistics' });
    }
});

module.exports = router; 