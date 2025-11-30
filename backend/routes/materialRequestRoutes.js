import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import FirebaseMaterialRequest from '../models/FirebaseMaterialRequest.js';
import FirebaseUser from '../models/FirebaseUser.js';

const router = express.Router();

// Get user's material requests
router.get('/my-requests', authenticateToken, async (req, res) => {
  try {
    const requests = await FirebaseMaterialRequest.findByUser(req.user.userId);
    res.json(requests);
  } catch (error) {
    console.error('Error fetching user requests:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// Get popular requests (most upvoted)
router.get('/popular', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const requests = await FirebaseMaterialRequest.findPopular(parseInt(limit));
    res.json(requests);
  } catch (error) {
    console.error('Error fetching popular requests:', error);
    res.status(500).json({ error: 'Failed to fetch popular requests' });
  }
});

// Get requests by subject
router.get('/subject/:subjectId', async (req, res) => {
  try {
    const { subjectId } = req.params;
    const requests = await FirebaseMaterialRequest.findBySubject(subjectId);
    res.json(requests);
  } catch (error) {
    console.error('Error fetching subject requests:', error);
    res.status(500).json({ error: 'Failed to fetch subject requests' });
  }
});

// Get request by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const request = await FirebaseMaterialRequest.findById(id);
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }
    res.json(request);
  } catch (error) {
    console.error('Error fetching request:', error);
    res.status(500).json({ error: 'Failed to fetch request' });
  }
});

// Create new material request
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const {
      subjectId,
      subjectName,
      subjectCode,
      title,
      description,
      materialType,
      priority,
      tags
    } = req.body;
    
    const user = await FirebaseUser.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if user has already requested similar material
    const hasSimilar = await FirebaseMaterialRequest.hasSimilarRequest(
      req.user.userId, 
      title, 
      subjectId
    );
    
    if (hasSimilar) {
      return res.status(400).json({ 
        error: 'You have already requested similar material for this subject' 
      });
    }
    
    const requestData = {
      userId: req.user.userId,
      userName: user.name,
      userEmail: user.email,
      subjectId,
      subjectName,
      subjectCode,
      branch: user.branch,
      semester: user.semester,
      title,
      description,
      materialType,
      priority,
      tags
    };
    
    const request = await FirebaseMaterialRequest.create(requestData);
    res.status(201).json(request);
  } catch (error) {
    console.error('Error creating material request:', error);
    res.status(500).json({ error: 'Failed to create request' });
  }
});

// Upvote a request
router.post('/:id/upvote', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const request = await FirebaseMaterialRequest.findById(id);
    
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }
    
    const updatedRequest = await request.upvote(req.user.userId);
    res.json(updatedRequest);
  } catch (error) {
    console.error('Error upvoting request:', error);
    res.status(500).json({ error: 'Failed to upvote request' });
  }
});

// Update request (only by owner)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const request = await FirebaseMaterialRequest.findById(id);
    
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }
    
    if (request.userId !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Cannot update non-pending request' });
    }
    
    const updatedRequest = await FirebaseMaterialRequest.findByIdAndUpdate(id, req.body);
    res.json(updatedRequest);
  } catch (error) {
    console.error('Error updating request:', error);
    res.status(500).json({ error: 'Failed to update request' });
  }
});

// Delete request (only by owner)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const request = await FirebaseMaterialRequest.findById(id);
    
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }
    
    if (request.userId !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    await FirebaseMaterialRequest.findByIdAndDelete(id);
    res.json({ message: 'Request deleted successfully' });
  } catch (error) {
    console.error('Error deleting request:', error);
    res.status(500).json({ error: 'Failed to delete request' });
  }
});

// Admin routes
router.get('/admin/all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status, priority, subjectId, branch, semester } = req.query;
    
    let query = {};
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (subjectId) query.subjectId = subjectId;
    if (branch) query.branch = branch;
    if (semester) query.semester = semester;
    
    const requests = await FirebaseMaterialRequest.find(query);
    res.json(requests);
  } catch (error) {
    console.error('Error fetching all requests:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

router.get('/admin/pending', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const requests = await FirebaseMaterialRequest.findPending();
    res.json(requests);
  } catch (error) {
    console.error('Error fetching pending requests:', error);
    res.status(500).json({ error: 'Failed to fetch pending requests' });
  }
});

router.put('/admin/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;
    
    const request = await FirebaseMaterialRequest.findById(id);
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }
    
    const updatedRequest = await request.updateStatus(status, adminNotes, req.user.userId);
    res.json(updatedRequest);
  } catch (error) {
    console.error('Error updating request status:', error);
    res.status(500).json({ error: 'Failed to update request status' });
  }
});

router.get('/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stats = await FirebaseMaterialRequest.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching request stats:', error);
    res.status(500).json({ error: 'Failed to fetch request stats' });
  }
});

router.delete('/admin/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const request = await FirebaseMaterialRequest.findByIdAndDelete(id);
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }
    
    res.json({ message: 'Request deleted successfully' });
  } catch (error) {
    console.error('Error deleting request:', error);
    res.status(500).json({ error: 'Failed to delete request' });
  }
});

export default router;
