import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import FirebaseSubscription from '../models/FirebaseSubscription.js';
import FirebaseUser from '../models/FirebaseUser.js';
import FirebaseOffer from '../models/FirebaseOffer.js';

const router = express.Router();

// Get user's subscriptions
router.get('/my-subscriptions', authenticateToken, async (req, res) => {
  try {
    const subscriptions = await FirebaseSubscription.findByUser(req.user.userId);
    res.json(subscriptions);
  } catch (error) {
    console.error('Error fetching user subscriptions:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

// Get active subscription for current semester
router.get('/active', authenticateToken, async (req, res) => {
  try {
    const user = await FirebaseUser.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const activeSubscription = await FirebaseSubscription.findActiveByUser(
      req.user.userId, 
      user.semester
    );
    
    res.json(activeSubscription);
  } catch (error) {
    console.error('Error fetching active subscription:', error);
    res.status(500).json({ error: 'Failed to fetch active subscription' });
  }
});

// Check access to specific feature
router.get('/check-access/:feature', authenticateToken, async (req, res) => {
  try {
    const { feature } = req.params;
    const user = await FirebaseUser.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const hasAccess = await FirebaseSubscription.hasAccess(
      req.user.userId, 
      feature, 
      user.semester
    );
    
    res.json({ hasAccess });
  } catch (error) {
    console.error('Error checking access:', error);
    res.status(500).json({ error: 'Failed to check access' });
  }
});

// Create new subscription (with payment)
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const {
      semester,
      branch,
      subscriptionType,
      offerId,
      paymentMethod = 'razorpay'
    } = req.body;

    const user = await FirebaseUser.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user already has active subscription for this semester
    const existingSubscription = await FirebaseSubscription.findActiveByUser(
      req.user.userId, 
      semester
    );
    
    if (existingSubscription) {
      return res.status(400).json({ 
        error: 'You already have an active subscription for this semester' 
      });
    }

    // Calculate pricing
    let basePrice = 0;
    const pricing = {
      semester: 999,
      annual: 2999,
      lifetime: 4999
    };
    basePrice = pricing[subscriptionType] || pricing.semester;

    let finalPrice = basePrice;
    let appliedOffer = null;

    // Apply offer if provided
    if (offerId) {
      const offer = await FirebaseOffer.findById(offerId);
      if (offer && offer.isValid()) {
        finalPrice = offer.calculateDiscountedPrice(basePrice);
        appliedOffer = offer;
      }
    }

    // Generate mock payment ID (in real implementation, integrate with Razorpay/Stripe)
    const mockPaymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

    // Create subscription
    const subscriptionData = {
      userId: req.user.userId,
      semester: parseInt(semester),
      branch: branch || user.branch,
      subscriptionType,
      status: 'active',
      startDate: new Date(),
      endDate: new Date(Date.now() + (subscriptionType === 'semester' ? 90 : subscriptionType === 'annual' ? 365 : 3650) * 24 * 60 * 60 * 1000),
      price: finalPrice,
      originalPrice: basePrice,
      paymentId: mockPaymentId,
      paymentMethod,
      features: ['materials', 'quizzes', 'notices', 'progress_tracking']
    };

    const subscription = await FirebaseSubscription.create(subscriptionData);

    // Use the offer if applied
    if (appliedOffer) {
      await appliedOffer.use();
    }

    res.status(201).json({
      subscription,
      paymentId: mockPaymentId,
      message: 'Subscription created successfully'
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

// Mock payment verification (replace with real payment gateway integration)
router.post('/verify-payment', authenticateToken, async (req, res) => {
  try {
    const { paymentId, subscriptionId } = req.body;

    // In real implementation, verify with payment gateway
    // For now, just simulate successful verification
    const subscription = await FirebaseSubscription.findById(subscriptionId);
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    if (subscription.paymentId !== paymentId) {
      return res.status(400).json({ error: 'Invalid payment ID' });
    }

    // Update subscription status to active
    await FirebaseSubscription.updateStatus(subscriptionId, 'active');

    res.json({ 
      success: true, 
      message: 'Payment verified successfully',
      subscription 
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

// Cancel subscription
router.post('/cancel/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const subscription = await FirebaseSubscription.findById(id);
    
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    if (subscription.userId !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await FirebaseSubscription.updateStatus(id, 'cancelled');
    
    res.json({ message: 'Subscription cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// Get available offers
router.get('/offers', async (req, res) => {
  try {
    const { branch, semester, subscriptionType } = req.query;
    
    let offers = await FirebaseOffer.findActive();
    
    // Filter offers based on query parameters
    if (branch || semester || subscriptionType) {
      offers = offers.filter(offer => 
        (offer.branch === 'all' || offer.branch === branch) &&
        (offer.semester === 'all' || offer.semester === semester) &&
        (offer.subscriptionType === subscriptionType)
      );
    }
    
    res.json(offers);
  } catch (error) {
    console.error('Error fetching offers:', error);
    res.status(500).json({ error: 'Failed to fetch offers' });
  }
});

// Admin routes
router.get('/admin/all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    
    let query = {};
    if (status) query.status = status;
    
    const subscriptions = await FirebaseSubscription.find(query);
    
    // Simple pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedSubscriptions = subscriptions.slice(startIndex, endIndex);
    
    res.json({
      subscriptions: paginatedSubscriptions,
      total: subscriptions.length,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(subscriptions.length / limit)
    });
  } catch (error) {
    console.error('Error fetching all subscriptions:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

router.get('/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stats = await FirebaseSubscription.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching subscription stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

router.put('/admin/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const subscription = await FirebaseSubscription.updateStatus(id, status);
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }
    
    res.json(subscription);
  } catch (error) {
    console.error('Error updating subscription status:', error);
    res.status(500).json({ error: 'Failed to update subscription status' });
  }
});

router.delete('/admin/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const subscription = await FirebaseSubscription.findByIdAndDelete(id);
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }
    
    res.json({ message: 'Subscription deleted successfully' });
  } catch (error) {
    console.error('Error deleting subscription:', error);
    res.status(500).json({ error: 'Failed to delete subscription' });
  }
});

export default router;
