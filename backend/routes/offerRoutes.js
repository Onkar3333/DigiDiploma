import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import FirebaseOffer from '../models/FirebaseOffer.js';

const router = express.Router();

// Get active offers
router.get('/active', async (req, res) => {
  try {
    const { branch, semester, subscriptionType } = req.query;
    
    let query = {};
    if (branch) query.branch = branch;
    if (semester) query.semester = semester;
    if (subscriptionType) query.subscriptionType = subscriptionType;
    
    const offers = await FirebaseOffer.findActive(query);
    res.json(offers);
  } catch (error) {
    console.error('Error fetching active offers:', error);
    res.status(500).json({ error: 'Failed to fetch offers' });
  }
});

// Get offers applicable to user
router.get('/applicable', authenticateToken, async (req, res) => {
  try {
    const { branch, semester, subscriptionType } = req.query;
    
    if (!branch || !semester || !subscriptionType) {
      return res.status(400).json({ error: 'Branch, semester, and subscription type are required' });
    }
    
    const offers = await FirebaseOffer.findApplicable(branch, semester, subscriptionType);
    res.json(offers);
  } catch (error) {
    console.error('Error fetching applicable offers:', error);
    res.status(500).json({ error: 'Failed to fetch applicable offers' });
  }
});

// Get offer by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const offer = await FirebaseOffer.findById(id);
    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }
    
    res.json(offer);
  } catch (error) {
    console.error('Error fetching offer:', error);
    res.status(500).json({ error: 'Failed to fetch offer' });
  }
});

// Admin routes
router.post('/admin/create', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const offerData = {
      ...req.body,
      createdBy: req.user.userId
    };
    
    const offer = await FirebaseOffer.create(offerData);
    res.status(201).json(offer);
  } catch (error) {
    console.error('Error creating offer:', error);
    res.status(500).json({ error: 'Failed to create offer' });
  }
});

router.get('/admin/all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { isActive, branch, semester, subscriptionType } = req.query;
    
    let query = {};
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (branch) query.branch = branch;
    if (semester) query.semester = semester;
    if (subscriptionType) query.subscriptionType = subscriptionType;
    
    const offers = await FirebaseOffer.find(query);
    res.json(offers);
  } catch (error) {
    console.error('Error fetching all offers:', error);
    res.status(500).json({ error: 'Failed to fetch offers' });
  }
});

router.put('/admin/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const offer = await FirebaseOffer.findByIdAndUpdate(id, req.body);
    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }
    
    res.json(offer);
  } catch (error) {
    console.error('Error updating offer:', error);
    res.status(500).json({ error: 'Failed to update offer' });
  }
});

router.delete('/admin/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const offer = await FirebaseOffer.findByIdAndDelete(id);
    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }
    
    res.json({ message: 'Offer deleted successfully' });
  } catch (error) {
    console.error('Error deleting offer:', error);
    res.status(500).json({ error: 'Failed to delete offer' });
  }
});

router.get('/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stats = await FirebaseOffer.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching offer stats:', error);
    res.status(500).json({ error: 'Failed to fetch offer stats' });
  }
});

router.post('/admin/:id/toggle', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const offer = await FirebaseOffer.findById(id);
    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }
    
    const updatedOffer = await FirebaseOffer.findByIdAndUpdate(id, { 
      isActive: !offer.isActive 
    });
    
    res.json(updatedOffer);
  } catch (error) {
    console.error('Error toggling offer:', error);
    res.status(500).json({ error: 'Failed to toggle offer' });
  }
});

export default router;
