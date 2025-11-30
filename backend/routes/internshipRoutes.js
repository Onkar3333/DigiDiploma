import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import FirebaseInternshipApplication from '../models/FirebaseInternshipApplication.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { internshipApplicationSchema } from '../middleware/validation.js';
import { admin, isFirebaseReady } from '../lib/firebase.js';
import { firebaseConfig } from '../firebase-config.js';
import { uploadFile } from '../lib/r2Client.js';

const router = express.Router();

const getUploadsDir = async () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const uploadsDir = path.join(__dirname, '..', 'uploads', 'internships');
  await fs.mkdir(uploadsDir, { recursive: true });
  return uploadsDir;
};

const sanitizeFileName = (name = '') => name.replace(/[^a-zA-Z0-9_.-]/g, '_');

const getStorageBucket = () => {
  if (!isFirebaseReady || typeof admin?.storage !== 'function') return null;
  const bucketName =
    process.env.FIREBASE_STORAGE_BUCKET ||
    firebaseConfig.storageBucket ||
    (process.env.FIREBASE_PROJECT_ID ? `${process.env.FIREBASE_PROJECT_ID}.appspot.com` : null);
  if (!bucketName) return null;
  try {
    return admin.storage().bucket(bucketName);
  } catch (error) {
    console.error('Failed to access Firebase Storage bucket:', error.message);
    return null;
  }
};

const uploadResume = async ({ base64, filename, contentType }) => {
  if (!base64 || !filename) return null;
  const safeName = sanitizeFileName(filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`);

  try {
    // Use R2 client with fallback to local storage
    const result = await uploadFile(base64, safeName, contentType || 'application/pdf', 'internships', 'internships');
    console.log(`📄 Resume uploaded to ${result.storage}: ${result.url}`);
    return result.url;
  } catch (error) {
    console.error('Error uploading resume:', error.message);
    return null;
  }
};

const ensurePreferredLocation = (mode, preferredLocation) => {
  if (['Hybrid', 'Onsite'].includes(mode)) {
    return preferredLocation?.trim() ? preferredLocation.trim() : null;
  }
  return preferredLocation?.trim() || '';
};

router.post('/apply', async (req, res) => {
  try {
    const payload = req.body || {};
    const { error } = internshipApplicationSchema.validate(payload, { abortEarly: false });
    if (error) {
      return res.status(400).json({ error: error.details.map((d) => d.message).join(', ') });
    }

    payload.duration = String(payload.duration || '').trim();
    const preferredLocation = ensurePreferredLocation(payload.mode, payload.preferredLocation);
    if (preferredLocation === null) {
      return res.status(400).json({ error: 'Preferred location is required for Hybrid or Onsite mode.' });
    }

    if (payload.resumeBase64) {
      const approxSize = (payload.resumeBase64.length * 3) / 4;
      if (approxSize > 7 * 1024 * 1024) {
        return res.status(400).json({ error: 'Resume file is too large. Maximum allowed size is 7MB.' });
      }
    }

    const duplicate = await FirebaseInternshipApplication.findByEmailAndSemester(
      payload.email.toLowerCase(),
      payload.semester
    );
    if (duplicate) {
      return res.status(409).json({ error: 'You have already submitted an application for this semester.' });
    }

    let resumeUrl = payload.resumeUrl?.trim() || '';
    if (payload.resumeBase64 && payload.resumeFileName) {
      resumeUrl = await uploadResume({
        base64: payload.resumeBase64,
        filename: payload.resumeFileName,
        contentType: payload.resumeContentType || 'application/pdf',
      });
    }

    if (!resumeUrl) {
      return res.status(400).json({ error: 'Resume upload failed. Please try again.' });
    }

    const source = payload.source || 'public';
    const application = await FirebaseInternshipApplication.create({
      name: payload.name.trim(),
      email: payload.email.toLowerCase(),
      phone: payload.phone.trim(),
      collegeName: payload.collegeName.trim(),
      branch: payload.branch,
      semester: payload.semester,
      type: payload.type,
      mode: payload.mode,
      duration: payload.duration,
      preferredLocation,
      resumeUrl,
      internshipType: payload.internshipType,
      additionalNotes: payload.additionalNotes?.trim() || '',
      source,
      userId: payload.userId || null,
    });

    res.status(201).json({ message: 'Application submitted successfully', application });
  } catch (error) {
    console.error('Error submitting internship application:', error);
    res.status(500).json({ error: 'Failed to submit application' });
  }
});

router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const applications = await FirebaseInternshipApplication.find({});
    res.json({ applications });
  } catch (error) {
    console.error('Error loading internship applications:', error);
    res.status(500).json({ error: 'Failed to load applications' });
  }
});

// Mark application as viewed
router.patch('/:id/view', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Application ID is required' });
    
    const application = await FirebaseInternshipApplication.findById(id);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    const viewedAt = new Date().toISOString();
    await FirebaseInternshipApplication.update(id, { viewedAt });
    
    return res.json({ ok: true, viewedAt });
  } catch (error) {
    console.error('Error marking application as viewed:', error);
    res.status(500).json({ error: 'Failed to mark application as viewed' });
  }
});

router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Application ID is required' });
    await FirebaseInternshipApplication.delete(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting internship application:', error);
    res.status(500).json({ error: 'Failed to delete application' });
  }
});

export default router;

