import express from "express";
const router = express.Router();
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from 'url';
import { authenticateToken, requireAdmin } from "../middleware/auth.js";
import { validate, materialCreateSchema } from "../middleware/validation.js";
import Material from "../models/Material.js";
import notificationService from "../websocket.js";
import { uploadFile, deleteFile, isR2Ready } from "../lib/r2Client.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '..', 'uploads');

const normalizeMaterial = (material) => {
  if (!material) return null;
  return {
    ...material,
    _id: material.id || material._id,
    id: material.id || material._id
  };
};

// Normalize file URLs that may contain localhost or development hosts
// Converts URLs like "http://localhost:8080/api/materials/proxy/r2/..." to relative paths
// so they can be safely combined with the current host in production.
const normalizeFileUrl = (url) => {
  if (!url || typeof url !== 'string') return url;

  try {
    // Handle localhost URLs from development data
    if (url.includes('localhost:8080') || url.includes('localhost:5000')) {
      const match = url.match(/localhost:\d+(\/.*)/);
      if (match && match[1]) {
        return match[1]; // e.g. "/api/materials/proxy/r2/materials/..."
      }
    }

    return url;
  } catch (e) {
    console.warn('normalizeFileUrl error:', e?.message || e, url);
    return url;
  }
};

async function ensureUploadsDir() {
  try {
    await fs.access(uploadsDir);
  } catch {
    await fs.mkdir(uploadsDir, { recursive: true });
  }
}

// Get all materials (admin view)
router.get("/", authenticateToken, async (req, res) => {
  try {
    const all = await Material.find({}, { sort: { createdAt: -1 } });
    
    // Normalize IDs for all materials and PRESERVE accessType
    const normalizedMaterials = all.map(m => {
      const materialObj = m.toJSON ? m.toJSON() : m;
      // CRITICAL: Explicitly preserve accessType from the material object
      const accessType = m.accessType || materialObj.accessType || 'free';
      return {
        ...materialObj,
        _id: materialObj.id || materialObj._id,
        id: materialObj.id || materialObj._id,
        // Explicitly set accessType to ensure it's preserved
        accessType: accessType,
        price: materialObj.price || m.price || 0,
        googleDriveUrl: materialObj.googleDriveUrl || m.googleDriveUrl || null
      };
    });
    
    // Log accessType distribution
    const accessTypeCounts = normalizedMaterials.reduce((acc, m) => {
      const at = m.accessType || 'free';
      acc[at] = (acc[at] || 0) + 1;
      return acc;
    }, {});
    console.log('📊 Backend: Materials by accessType:', accessTypeCounts);
    
    res.status(200).json(normalizedMaterials);
  } catch (err) {
    console.error("Error fetching materials:", err);
    res.status(200).json([]);
  }
});

// Get all materials for a subject (by subjectId or subjectCode)
router.get("/subject/:subjectId", authenticateToken, async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { type } = req.query;
    
    // Try to find by subjectCode first (since frontend sends codes like "CS302")
    let all = [];
    
      // First try finding by subjectCode
      try {
      const found = await Material.find({ subjectCode: subjectId }, { sort: { createdAt: -1 } });
      all = found.map(m => {
        const materialObj = m.toJSON ? m.toJSON() : m;
        return {
          ...materialObj,
          _id: materialObj.id || materialObj._id,
          id: materialObj.id || materialObj._id
        };
        });
      } catch (err) {
        console.log(`Error querying by subjectCode: ${err.message}`);
        // If that fails, try finding by subjectId
        try {
        const found = await Material.find({ subjectId }, { sort: { createdAt: -1 } });
        all = found.map(m => {
          const materialObj = m.toJSON ? m.toJSON() : m;
          return {
            ...materialObj,
            _id: materialObj.id || materialObj._id,
            id: materialObj.id || materialObj._id
          };
        });
        } catch (err2) {
          console.log(`Error querying by subjectId: ${err2.message}`);
        console.log(`No materials found for subject: ${subjectId}`);
        all = [];
      }
    }
    
    const materials = type ? all.filter(m => m.type === type) : all;
    res.status(200).json(materials);
  } catch (err) {
    console.error("Error fetching materials:", err);
    res.status(200).json([]);
  }
});

// Get materials by branch
router.get("/branch/:branch", authenticateToken, async (req, res) => {
  try {
    const { branch } = req.params;
    const { type } = req.query;
    
    // Find materials where:
    // 1. branch field matches, OR
    // 2. branches array contains the branch
    const all = await Material.find({
      $or: [
        { branch: branch },
        { branches: branch }
      ]
    });
    
    const materials = type ? all.filter(m => m.type === type) : all;
    
    // Normalize IDs
    const normalizedMaterials = materials.map(m => {
      const materialObj = m.toJSON ? m.toJSON() : m;
      return {
        ...materialObj,
        _id: materialObj.id || materialObj._id,
        id: materialObj.id || materialObj._id
      };
    });
    
    res.status(200).json(normalizedMaterials);
  } catch (err) {
    console.error("Error fetching materials by branch:", err);
    res.status(200).json([]);
  }
});

// Add new material (metadata)
router.post("/", authenticateToken, requireAdmin, validate(materialCreateSchema), async (req, res) => {
  try {
    const { 
      title, 
      type, 
      url, 
      description, 
      uploadedBy,
      subjectId, 
      subjectName,
      branch,
      branches, // New: array of branches
      semester,
      subjectCode,
      resourceType,
      accessType, // New: 'free', 'drive_protected', 'paid'
      price, // New: price for paid materials
      googleDriveUrl, // New: Google Drive URL for drive protected
      tags,
      coverPhoto,
      storageType // New: 'r2' or 'local' (from upload result)
    } = req.body;
    
    // Auto-detect storage type from URL if not provided
    const detectedStorageType = storageType || 
      (url?.includes('r2.cloudflarestorage.com') || url?.includes('/api/materials/proxy/r2/') ? 'r2' : 'local');
    
    console.log('📥 Creating material with resourceType:', resourceType, 'for subject code:', subjectCode);
    console.log('📥 Selected branch:', branch);
    console.log('📥 Access Type received:', accessType, '| Price received:', price);
    console.log('📥 Full request body:', JSON.stringify({ accessType, price, googleDriveUrl, resourceType }, null, 2));
    
    // Validate accessType - be strict, don't default to 'free' if invalid value provided
    const validAccessTypes = ['free', 'drive_protected', 'paid'];
    let finalAccessType = 'free'; // Default fallback
    
    // Normalize accessType - handle string, trim whitespace, check validity
    const normalizedAccessType = accessType 
      ? (typeof accessType === 'string' ? accessType.trim() : String(accessType).trim())
      : null;
    
    if (normalizedAccessType && validAccessTypes.includes(normalizedAccessType)) {
      finalAccessType = normalizedAccessType;
      console.log(`✅ Valid accessType received: "${finalAccessType}"`);
    } else {
      // Invalid or missing accessType - log warning
      console.warn(`⚠️ Invalid or missing accessType received: "${accessType}" (normalized: "${normalizedAccessType}"), defaulting to 'free'`);
      console.warn(`⚠️ Valid types are: ${validAccessTypes.join(', ')}`);
    }
    
    console.log('🔍 Backend accessType processing:', {
      received: accessType,
      receivedType: typeof accessType,
      normalized: normalizedAccessType,
      isValid: normalizedAccessType && validAccessTypes.includes(normalizedAccessType),
      finalAccessType: finalAccessType,
      validTypes: validAccessTypes
    });
    
    // Validate drive_protected materials require googleDriveUrl
    if (finalAccessType === 'drive_protected' && !googleDriveUrl) {
      return res.status(400).json({ 
        error: 'Google Drive URL is required for drive protected materials' 
      });
    }
    
    // Validate paid materials require price > 0
    if (finalAccessType === 'paid') {
      const finalPrice = Number(price) || 0;
      if (finalPrice <= 0) {
        return res.status(400).json({ 
          error: 'Price must be greater than 0 for paid materials' 
        });
      }
    }
    
    console.log('📥 Final accessType:', finalAccessType, '| Final price:', finalAccessType === 'paid' ? Number(price) : 0);
    
    // Use only the selected branch (no multi-branch support)
    if (!branch) {
      return res.status(400).json({ 
        error: 'Branch must be selected' 
      });
    }
    
    // Normalize subject code to uppercase for consistent matching
    const normalizedSubjectCode = subjectCode ? subjectCode.trim().toUpperCase() : '';
    
    if (!normalizedSubjectCode) {
      return res.status(400).json({ 
        error: 'Subject code is required' 
      });
    }
    
    // Import Subject model to find the specific subject
    const Subject = (await import('../models/Subject.js')).default;
    
    // Find the subject in the selected branch with the matching code
    const normalizedBranch = branch.trim();
    const escaped = normalizedBranch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const branchRegex = new RegExp(`^${escaped}$`, 'i');
    
    const branchSubjects = await Subject.find({ branch: { $regex: branchRegex } });
    console.log(`🔍 Branch "${normalizedBranch}": Found ${branchSubjects.length} subjects`);
    
    // Find the specific subject with matching code
    const matchingSubject = branchSubjects.find(subject => {
      const subjectCode = subject.code ? subject.code.trim().toUpperCase() : '';
      return subjectCode === normalizedSubjectCode;
    });
    
    if (!matchingSubject) {
      console.log(`⚠️ Subject code "${normalizedSubjectCode}" not found in branch "${normalizedBranch}"`);
      return res.status(400).json({ 
        error: `Subject with code "${subjectCode}" not found in branch "${branch}"` 
      });
    }
    
    console.log(`✅ Found matching subject: ${matchingSubject.branch} - ${matchingSubject.code} (${matchingSubject.name})`);
    
    // Create material entry for the selected subject
    const createdMaterials = [];
    const errors = [];
    
    try {
      const material = await Material.create({
        title,
        type,
        url,
        description: description || '',
        uploadedBy,
        subjectId: matchingSubject.id || matchingSubject._id,
        subjectName: matchingSubject.name || subjectName,
        branch: matchingSubject.branch,
        branches: [matchingSubject.branch], // Single branch array
        semester: String(matchingSubject.semester || semester),
        subjectCode: matchingSubject.code || subjectCode,
        resourceType: resourceType || 'notes',
        accessType: finalAccessType, // Use validated accessType
        price: finalAccessType === 'paid' ? Number(price) : 0,
        googleDriveUrl: finalAccessType === 'drive_protected' ? googleDriveUrl : null,
        storageType: detectedStorageType,
        tags: tags || [],
        coverPhoto: coverPhoto || null
      });
      
      console.log(`✅ Material created with accessType: "${finalAccessType}" for ${matchingSubject.branch} - ${matchingSubject.code} (${matchingSubject.name})`);
      console.log(`📋 Created material details:`, {
        title: title,
        accessType: finalAccessType,
        materialAccessType: material.accessType,
        price: finalAccessType === 'paid' ? Number(price) : 0,
        googleDriveUrl: finalAccessType === 'drive_protected' ? googleDriveUrl : null,
        resourceType: resourceType
      });
      
      // CRITICAL: Verify the material has the correct accessType before adding
      if (material.accessType !== finalAccessType) {
        console.error(`❌ CRITICAL ERROR: Material accessType mismatch! Expected: "${finalAccessType}", Got: "${material.accessType}"`);
        console.error(`❌ Material object:`, JSON.stringify(material.toJSON(), null, 2));
      }
      
      createdMaterials.push(material);
      console.log(`✅ Material created for ${matchingSubject.branch} - ${matchingSubject.code} (${matchingSubject.name})`);
      
      // Send notification
      try { 
        await notificationService.notifyMaterialUploaded(material); 
      } catch (notifErr) {
        console.error('Notification error (non-fatal):', notifErr);
      }
    } catch (err) {
      console.error(`❌ Error creating material for ${matchingSubject.branch} - ${matchingSubject.code}:`, err);
      errors.push({
        branch: matchingSubject.branch,
        code: matchingSubject.code,
        error: err.message
      });
    }
    
    if (createdMaterials.length === 0) {
      return res.status(500).json({ 
        error: "Failed to create material",
        details: errors
      });
    }
    
    console.log(`✅ Successfully created material`);
    
    // CRITICAL: Ensure accessType is preserved in response
    const responseMaterials = createdMaterials.map(m => {
      const materialJson = m.toJSON ? m.toJSON() : m;
      console.log(`📤 Sending material in response with accessType: "${materialJson.accessType}"`);
      return {
        ...materialJson,
        accessType: materialJson.accessType || m.accessType || 'free', // Explicitly preserve
        price: materialJson.price || m.price || 0,
        googleDriveUrl: materialJson.googleDriveUrl || m.googleDriveUrl || null
      };
    });
    
    res.status(201).json({ 
      message: "Material added successfully",
      materials: responseMaterials,
      count: 1
    });
  } catch (err) {
    console.error("Error adding material:", err);
    res.status(500).json({ error: "Failed to add material", details: err.message });
  }
});

// Update material
router.put("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    delete updates._id;
    
    // Validate accessType if provided
    const validAccessTypes = ['free', 'drive_protected', 'paid'];
    if (updates.accessType && !validAccessTypes.includes(updates.accessType)) {
      return res.status(400).json({ 
        error: `Invalid accessType. Must be one of: ${validAccessTypes.join(', ')}` 
      });
    }
    
    // Validate drive_protected materials require googleDriveUrl
    if (updates.accessType === 'drive_protected' && !updates.googleDriveUrl) {
      return res.status(400).json({ 
        error: 'Google Drive URL is required for drive protected materials' 
      });
    }
    
    // Validate paid materials require price > 0
    if (updates.accessType === 'paid') {
      const finalPrice = Number(updates.price) || 0;
      if (finalPrice <= 0) {
        return res.status(400).json({ 
          error: 'Price must be greater than 0 for paid materials' 
        });
      }
      // Ensure price is set
      updates.price = finalPrice;
    } else {
      // If not paid, ensure price is 0
      updates.price = 0;
    }
    
    // If not drive_protected, ensure googleDriveUrl is null
    if (updates.accessType !== 'drive_protected') {
      updates.googleDriveUrl = null;
    }
    
    console.log('📝 Updating material:', {
      id,
      accessType: updates.accessType,
      price: updates.price,
      googleDriveUrl: updates.googleDriveUrl ? 'provided' : 'null'
    });
    
    const material = await Material.findByIdAndUpdate(id, { ...updates });
    if (!material) {
      return res.status(404).json({ error: "Material not found" });
    }
    
    console.log('✅ Material updated successfully with accessType:', material.accessType);
    
    try { await notificationService.notifyMaterialUpdated(material); } catch {}
    res.status(200).json({ message: "Material updated successfully", material });
  } catch (err) {
    console.error("Error updating material:", err);
    res.status(500).json({ error: "Failed to update material" });
  }
});

// Delete material
router.delete("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    let { id } = req.params;
    
    // Decode URL-encoded ID
    id = decodeURIComponent(id);
    
    if (!id || id === 'undefined' || id === 'null' || id.trim() === '') {
      return res.status(400).json({ 
        success: false,
        error: "Material ID is required",
        received: id 
      });
    }
    
    console.log(`🗑️ Deleting material with ID: ${id}`);
    
    // Find the material first to get the file path
    const material = await Material.findById(id);
    if (!material) {
      return res.status(404).json({ error: "Material not found" });
    }
    
    // Delete the associated file if it exists (R2 or local)
    if (material.url) {
      try {
        // Use storageType from material if available, otherwise detect from URL
        const storageType = material.storageType || 
                           (material.url.includes('r2.cloudflarestorage.com') || 
                            material.url.includes('/api/materials/proxy/r2/') ? 'r2' : 'local');
        
        console.log(`🗑️ Deleting file from ${storageType}: ${material.url}`);
        
        // Use the deleteFile utility which handles both R2 and local
        const deleted = await deleteFile(material.url, storageType);
        if (deleted) {
          console.log(`✅ Successfully deleted file from ${storageType}`);
        } else {
          console.warn(`⚠️ Failed to delete file from ${storageType}`);
        }
      } catch (fileError) {
        // File doesn't exist or can't be deleted - log but don't fail
        console.log(`⚠️ Could not delete file for material ${id}:`, fileError.message);
      }
    }
    
    // Delete the material record
    const deleted = await Material.findByIdAndDelete(id);
    if (!deleted) {
      console.warn(`⚠️ Material not found for deletion: ${id}`);
      return res.status(404).json({ 
        success: false,
        error: "Material not found",
        id: id 
      });
    }
    
    console.log(`✅ Material deleted successfully: ${id}`);
    
    try { 
      await notificationService.notifyMaterialDeleted(id); 
    } catch (notifyErr) {
      console.warn('Failed to notify material deletion:', notifyErr);
    }
    
    res.status(200).json({ 
      success: true,
      message: "Material deleted successfully",
      id: id 
    });
  } catch (err) {
    console.error("❌ Error deleting material:", err);
    res.status(500).json({ 
      success: false,
      error: "Failed to delete material", 
      details: err.message || 'Unknown error',
      id: id 
    });
  }
});

// Secure download endpoint using token (no authentication required, token is the auth)
router.get("/secure-download/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');

    // Import DownloadToken model
    const DownloadToken = (await import('../models/DownloadToken.js')).default;

    // Find and validate token
    const downloadToken = await DownloadToken.findByToken(token);

    if (!downloadToken) {
      return res.status(403).json({ 
        error: "Invalid or expired download link",
        code: "INVALID_TOKEN"
      });
    }

    // Mark token as used
    await DownloadToken.markAsUsed(token, ipAddress, userAgent);

    // Fetch the material
    const material = await Material.findById(downloadToken.materialId);
    if (!material) {
      return res.status(404).json({ error: "Material not found" });
    }

    // Verify payment is still valid
    if (material.accessType === 'paid') {
      const Payment = (await import('../models/Payment.js')).default;
      const payment = await Payment.findOne({
        userId: downloadToken.userId,
        materialId: downloadToken.materialId,
        status: 'completed'
      });

      if (!payment) {
        return res.status(403).json({ 
          error: "Payment verification failed",
          code: "PAYMENT_INVALID"
        });
      }
    }

    // Increment download count
    await Material.incrementDownloads(downloadToken.materialId);

    // Determine file URL (normalize any localhost/dev URLs first)
    let fileUrl = normalizeFileUrl(material.url);
    
    // If it's an R2 URL, use proxy
    if (fileUrl && fileUrl.includes('r2.cloudflarestorage.com')) {
      try {
        const urlObj = new URL(fileUrl);
        const pathParts = urlObj.pathname.split('/').filter(Boolean);
        let key = '';
        
        if (pathParts.length > 0) {
          const materialsIndex = pathParts.findIndex(p => p === 'materials');
          if (materialsIndex >= 0) {
            key = pathParts.slice(materialsIndex).join('/');
          } else {
            key = pathParts.join('/');
            if (!key.startsWith('materials/')) {
              key = 'materials/' + key;
            }
          }
        }
        
        if (key) {
          fileUrl = `/api/materials/proxy/r2/${encodeURIComponent(key)}`;
        }
      } catch (e) {
        console.error('Error parsing R2 URL:', e);
      }
    }

    // Redirect to file or return download URL
    if (fileUrl) {
      // If it's a relative URL, make it absolute
      if (fileUrl.startsWith('/')) {
        const baseUrl = process.env.FRONTEND_URL || req.protocol + '://' + req.get('host');
        fileUrl = baseUrl + fileUrl;
      }
      
      // Redirect to the file
      res.redirect(302, fileUrl);
    } else {
      res.status(404).json({ error: "File URL not found" });
    }
  } catch (err) {
    console.error("Error processing secure download:", err);
    res.status(500).json({ error: "Failed to process download" });
  }
});

// Increment download count
router.post("/:id/download", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Fetch the material
    const material = await Material.findById(id);
    if (!material) {
      return res.status(404).json({ error: "Material not found" });
    }

    console.log(`🔒 Material access check - ID: ${id}, accessType: ${material.accessType}, userId: ${userId}`);
    
    // Check access type and enforce restrictions
    if (material.accessType === 'paid') {
      // Import Payment model
      const Payment = (await import('../models/Payment.js')).default;
      
      // Check if user has purchased this material
      const payment = await Payment.findOne({
        userId,
        materialId: id,
        status: 'completed'
      });

      if (!payment) {
        console.log(`❌ Payment required for material ${id} - user ${userId} has not purchased`);
        return res.status(403).json({ 
          error: "Payment required to download this material",
          requiresPayment: true,
          materialId: id,
          price: material.price,
          accessType: material.accessType
        });
      }
      console.log(`✅ Payment verified for material ${id} - user ${userId}`);
    } else if (material.accessType === 'drive_protected') {
      // For drive protected materials, ensure googleDriveUrl is available
      if (!material.googleDriveUrl) {
        console.log(`❌ Drive protected material ${id} missing googleDriveUrl`);
        return res.status(403).json({ 
          error: "This material requires Google Drive access",
          requiresDriveAccess: true,
          materialId: id,
          accessType: material.accessType
        });
      }
      console.log(`✅ Drive protected material ${id} - googleDriveUrl available`);
    } else {
      // Free material - allow access
      console.log(`✅ Free material ${id} - access granted`);
    }

    // For paid materials, don't serve the file directly - require secure download token
    if (material.accessType === 'paid') {
      return res.status(403).json({ 
        error: "Please use the secure download link to access this paid material",
        requiresSecureDownload: true,
        materialId: id
      });
    }
    
    // For drive protected materials, return the Google Drive URL
    if (material.accessType === 'drive_protected') {
      if (material.googleDriveUrl) {
        // Increment download count
        const updatedMaterial = await Material.incrementDownloads(id);
        const normalized = normalizeMaterial(updatedMaterial);
        try { await notificationService.notifyMaterialStatsUpdated(normalized); } catch (notifyError) {
          console.error("Failed to broadcast download update:", notifyError);
        }
        return res.status(200).json({ 
          message: "Drive link provided", 
          material: normalized,
          driveUrl: material.googleDriveUrl
        });
      } else {
        return res.status(403).json({ 
          error: "Google Drive URL not available for this material",
          materialId: id
        });
      }
    }
    
    // For free materials, serve the file
    // Increment download count
    const updatedMaterial = await Material.incrementDownloads(id);
    if (!updatedMaterial) {
      return res.status(404).json({ error: "Material not found" });
    }
    const normalized = normalizeMaterial(updatedMaterial);
    try { await notificationService.notifyMaterialStatsUpdated(normalized); } catch (notifyError) {
      console.error("Failed to broadcast download update:", notifyError);
    }
    
    // Determine file URL and serve it (normalize any localhost/dev URLs first)
    let fileUrl = normalizeFileUrl(material.url);
    
    // If it's an R2 URL, use proxy
    if (fileUrl && fileUrl.includes('r2.cloudflarestorage.com')) {
      try {
        const urlObj = new URL(fileUrl);
        const pathParts = urlObj.pathname.split('/').filter(Boolean);
        let key = '';
        
        if (pathParts.length > 0) {
          const materialsIndex = pathParts.findIndex(p => p === 'materials');
          if (materialsIndex >= 0) {
            key = pathParts.slice(materialsIndex).join('/');
          } else {
            key = pathParts.join('/');
            if (!key.startsWith('materials/')) {
              key = 'materials/' + key;
            }
          }
        }
        
        if (key) {
          fileUrl = `/api/materials/proxy/r2/${encodeURIComponent(key)}`;
        }
      } catch (e) {
        console.error('Error parsing R2 URL:', e);
      }
    }
    
    // Redirect to file or return download URL
    if (fileUrl) {
      // If it's a relative URL, make it absolute
      if (fileUrl.startsWith('/')) {
        const baseUrl = process.env.FRONTEND_URL || req.protocol + '://' + req.get('host');
        fileUrl = baseUrl + fileUrl;
      }
      
      // Redirect to the file
      res.redirect(302, fileUrl);
    } else {
      res.status(200).json({ message: "Download count updated", material: normalized });
    }
  } catch (err) {
    console.error("Error updating download count:", err);
    res.status(500).json({ error: "Failed to update download count" });
  }
});

// Rate material
router.post("/:id/rate", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { rating } = req.body;
    
    if (!rating || rating < 0 || rating > 5) {
      return res.status(400).json({ 
        error: "Rating must be between 0 and 5" 
      });
    }
    const updatedMaterial = await Material.updateRating(id, rating);
    if (!updatedMaterial) {
      return res.status(404).json({ error: "Material not found" });
    }
    const normalized = normalizeMaterial(updatedMaterial);
    try { await notificationService.notifyMaterialStatsUpdated(normalized); } catch (notifyError) {
      console.error("Failed to broadcast rating update:", notifyError);
    }
    res.status(200).json({ message: "Rating updated successfully", material: normalized });
  } catch (err) {
    console.error("Error updating rating:", err);
    res.status(500).json({ error: "Failed to update rating" });
  }
});

// Proxy endpoint to serve R2 files (bypasses authorization issues)
// Use regex to match the full path including the key
router.get(/^\/proxy\/([^/]+)\/(.+)$/, async (req, res) => {
  try {
    // Extract storage and key from regex groups
    // req.params[0] = storage (e.g., 'r2')
    // req.params[1] = key (e.g., 'materials/file.pdf')
    const storage = req.params[0];
    const key = req.params[1];
    
    if (!storage || !key) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid proxy URL format. Expected: /api/materials/proxy/:storage/:key' 
      });
    }
    
    console.log(`📥 Proxy request - Storage: ${storage}, Key: ${key}, Full URL: ${req.originalUrl}`);
    
    if (storage === 'r2') {
      // For R2 files, we need to fetch and serve through backend
      const { GetObjectCommand, S3Client } = await import('@aws-sdk/client-s3');
      
      const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
      const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
      const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
      const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
      
      if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ACCOUNT_ID || !R2_BUCKET_NAME) {
        return res.status(503).json({ 
          success: false,
          error: 'R2 storage not configured' 
        });
      }
      
      const r2Client = new S3Client({
        region: 'auto',
        endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: R2_ACCESS_KEY_ID,
          secretAccessKey: R2_SECRET_ACCESS_KEY,
        },
      });
      
      // Decode the key (handle URL encoding)
      let decodedKey;
      try {
        decodedKey = decodeURIComponent(key);
      } catch (e) {
        // If decoding fails, use the key as-is
        decodedKey = key;
      }
      
      console.log(`🔍 Fetching from R2 - Key: ${decodedKey}, Bucket: ${R2_BUCKET_NAME}`);
      
      const command = new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: decodedKey,
      });
      
      let response;
      try {
        response = await r2Client.send(command);
        console.log(`✅ Successfully fetched from R2: ${decodedKey}, ContentType: ${response.ContentType || 'unknown'}`);
      } catch (r2Error) {
        console.error(`❌ R2 fetch error for key "${decodedKey}":`, r2Error);
        if (r2Error.name === 'NoSuchKey' || r2Error.$metadata?.httpStatusCode === 404) {
          return res.status(404).json({ 
            success: false,
            error: `File not found in R2: ${decodedKey}` 
          });
        }
        // Re-throw to be caught by outer catch
        throw r2Error;
      }
      
      // Determine content type from response or file extension
      let contentType = response.ContentType;
      if (!contentType) {
        const ext = decodedKey.split('.').pop()?.toLowerCase();
        const mimeTypes = {
          'pdf': 'application/pdf',
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'gif': 'image/gif',
          'mp4': 'video/mp4',
          'webm': 'video/webm',
          'txt': 'text/plain',
          'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        };
        contentType = mimeTypes[ext] || 'application/octet-stream';
      }
      
      // Set appropriate headers
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      
      // Convert stream to buffer and send (more reliable than piping)
      try {
        const chunks = [];
        for await (const chunk of response.Body) {
          chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);
        console.log(`📤 Sending file buffer, size: ${buffer.length} bytes`);
        
        // Send the file
        res.send(buffer);
        return;
      } catch (streamError) {
        console.error('❌ Error reading R2 stream:', streamError);
        return res.status(500).json({ 
          success: false,
          error: 'Failed to read file from R2: ' + streamError.message 
        });
      }
    }
    
    // Storage type not supported
    return res.status(400).json({ 
      success: false,
      error: `Unsupported storage type: ${storage}. Supported: 'r2'` 
    });
  } catch (error) {
    console.error('❌ Error proxying file:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to serve file: ' + (error.message || 'Unknown error') 
    });
  }
});

// Base64 upload endpoint (saves to R2 or local storage and returns public URL)
router.post('/upload-base64', authenticateToken, async (req, res) => {
  try {
    const { filename, contentType, dataBase64 } = req.body;
    if (!filename || !dataBase64) {
      return res.status(400).json({ error: 'filename and dataBase64 are required' });
    }

    // File validation
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'video/mp4',
      'video/webm',
      'audio/mpeg',
      'audio/wav',
      'application/zip',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    const maxSize = 50 * 1024 * 1024; // 50MB
    
    if (contentType && !allowedTypes.includes(contentType)) {
      return res.status(400).json({ error: 'Invalid file type. Allowed types: PDF, images, videos, audio, ZIP, DOCX' });
    }
    
    // Check file size (approximate from base64)
    const fileSizeInBytes = (dataBase64.length * 3) / 4;
    if (fileSizeInBytes > maxSize) {
      return res.status(400).json({ error: `File too large. Maximum size is ${maxSize / (1024 * 1024)}MB` });
    }

    // Use R2 client with fallback to local storage
    const safeName = filename.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const prefix = req.user?.userType === 'admin' ? 'materials' : 'projects';
    const localSubfolder = req.user?.userType === 'admin' ? 'materials' : 'projects';
    const result = await uploadFile(
      dataBase64,
      safeName,
      contentType || 'application/octet-stream',
      prefix,
      localSubfolder
    );
    
    console.log(`📁 File uploaded to ${result.storage}: ${result.url}`);
    console.log(`📊 File size: ${((dataBase64.length * 3) / 4 / 1024).toFixed(2)} KB`);
    
    const uploaded = { 
      title: safeName, 
      url: result.url, 
      type: contentType || 'application/octet-stream', 
      downloads: 0, 
      createdAt: new Date().toISOString() 
    };
    
    try { 
      await notificationService.notifyMaterialUploaded(uploaded); 
    } catch (notifyError) {
      console.error('Failed to notify material upload:', notifyError);
    }
    
    res.status(201).json({ 
      url: result.url, 
      contentType: contentType || 'application/octet-stream',
      storage: result.storage 
    });
  } catch (err) {
    console.error('Error saving uploaded file:', err);
    res.status(500).json({ error: 'Failed to save uploaded file: ' + err.message });
  }
});

export default router;
