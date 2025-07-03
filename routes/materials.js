const express = require('express');
const { authenticateToken } = require('./auth');
const Material = require('../models/Material');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Multer setup for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});
const upload = multer({ storage });

// Get all materials (with optional filters)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { branch, semester, category, subject } = req.query;
        const filter = { isActive: true };

        if (branch) filter.branch = branch;
        if (semester) filter.semester = semester;
        if (category) filter.category = category;
        if (subject) filter.subject = subject;

        const materials = await Material.find(filter)
            .populate('uploadedBy', 'name')
            .sort({ createdAt: -1 });

        res.json(materials);
    } catch (error) {
        console.error('Materials fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch materials' });
    }
});

// Get material by ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const material = await Material.findById(req.params.id)
            .populate('uploadedBy', 'name');

        if (!material) {
            return res.status(404).json({ error: 'Material not found' });
        }

        // Increment view count
        await material.incrementView();

        res.json(material);
    } catch (error) {
        console.error('Material fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch material' });
    }
});

// Create new material (admin only)
router.post('/', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        const {
            title,
            description,
            type,
            subject,
            semester,
            branch,
            category,
            tags,
            duration,
            pages,
            link
        } = req.body;

        let fileUrl = '';
        let fileSize = 0;
        let thumbnail = '';
        if (type === 'video' || type === 'link') {
            fileUrl = link;
        } else if (req.file) {
            fileUrl = '/uploads/' + req.file.filename;
            fileSize = req.file.size;
        } else {
            return res.status(400).json({ error: 'File is required for this type.' });
        }

        const material = new Material({
            title,
            description,
            type,
            fileUrl,
            fileSize,
            thumbnail,
            subject,
            semester,
            branch,
            category,
            uploadedBy: req.user.userId,
            tags: tags || [],
            duration: duration || 0,
            pages: pages || 0
        });

        await material.save();

        // Emit real-time update
        const io = req.app.get('io');
        if (io) {
            io.emit('new-material', {
                id: material._id,
                title: material.title,
                subject: material.subject
            });
        }

        res.status(201).json({
            message: 'Material uploaded successfully',
            material
        });
    } catch (error) {
        console.error('Material upload error:', error);
        res.status(500).json({ error: 'Failed to upload material' });
    }
});

// Update material
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const material = await Material.findById(req.params.id);
        
        if (!material) {
            return res.status(404).json({ error: 'Material not found' });
        }

        // Only allow admin or the uploader to edit
        if (req.user.role !== 'admin' && material.uploadedBy.toString() !== req.user.userId) {
            return res.status(403).json({ error: 'Not authorized to edit this material' });
        }

        const updates = req.body;
        Object.keys(updates).forEach(key => {
            if (key !== '_id' && key !== 'uploadedBy') {
                material[key] = updates[key];
            }
        });

        await material.save();

        res.json({
            message: 'Material updated successfully',
            material
        });
    } catch (error) {
        console.error('Material update error:', error);
        res.status(500).json({ error: 'Failed to update material' });
    }
});

// Delete material
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const material = await Material.findById(req.params.id);
        
        if (!material) {
            return res.status(404).json({ error: 'Material not found' });
        }

        // Only allow admin or the uploader to delete
        if (req.user.role !== 'admin' && material.uploadedBy.toString() !== req.user.userId) {
            return res.status(403).json({ error: 'Not authorized to delete this material' });
        }

        // Soft delete by setting isActive to false
        material.isActive = false;
        await material.save();

        res.json({ message: 'Material deleted successfully' });
    } catch (error) {
        console.error('Material delete error:', error);
        res.status(500).json({ error: 'Failed to delete material' });
    }
});

// Download material (increment download count)
router.post('/:id/download', authenticateToken, async (req, res) => {
    try {
        const material = await Material.findById(req.params.id);
        
        if (!material) {
            return res.status(404).json({ error: 'Material not found' });
        }

        await material.incrementDownload();

        res.json({
            message: 'Download count updated',
            downloadCount: material.downloadCount
        });
    } catch (error) {
        console.error('Download count update error:', error);
        res.status(500).json({ error: 'Failed to update download count' });
    }
});

// Get materials by category
router.get('/category/:category', authenticateToken, async (req, res) => {
    try {
        const materials = await Material.find({
            category: req.params.category,
            isActive: true
        })
        .populate('uploadedBy', 'name')
        .sort({ createdAt: -1 });

        res.json(materials);
    } catch (error) {
        console.error('Category materials fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch materials by category' });
    }
});

module.exports = router; 