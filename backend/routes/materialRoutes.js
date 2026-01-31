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
import AdmZip from "adm-zip";

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
// NOTE: This endpoint is now public read-only so unauthenticated
// students can browse available materials. Paid/download actions
// remain protected elsewhere.
router.get("/subject/:subjectId", async (req, res) => {
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
  // Guard to prevent duplicate responses
  let responseSent = false;
  const sendResponse = (status, data) => {
    if (responseSent) {
      console.warn('⚠️ Attempted to send duplicate response, ignoring');
      return;
    }
    responseSent = true;
    return res.status(status).json(data);
  };
  
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
      return sendResponse(400, { 
        error: 'Google Drive URL is required for drive protected materials' 
      });
    }
    
    // Validate paid materials require price > 0
    if (finalAccessType === 'paid') {
      const finalPrice = Number(price) || 0;
      if (finalPrice <= 0) {
        return sendResponse(400, { 
          error: 'Price must be greater than 0 for paid materials' 
        });
      }
    }
    
    console.log('📥 Final accessType:', finalAccessType, '| Final price:', finalAccessType === 'paid' ? Number(price) : 0);
    
    // Import Subject model to find the specific subject
    const Subject = (await import('../models/Subject.js')).default;
    
    // Check if this is a common subject (by subjectId)
    let matchingSubject = null;
    let isCommonSubject = false;
    let allBranches = [];
    
    // IMPORTANT: Always require branch selection - even for common subjects, create material only for selected branch
    if (!branch) {
      return sendResponse(400, { 
        error: 'Branch must be selected' 
      });
    }
    
    const normalizedBranch = branch.trim();
    
    // Normalize subject code to uppercase for consistent matching
    const normalizedSubjectCode = subjectCode ? subjectCode.trim().toUpperCase() : '';
    
    if (!normalizedSubjectCode && !subjectId) {
      return sendResponse(400, { 
        error: 'Subject code or subjectId is required' 
      });
    }
    
    // Try to find subject by subjectId first (if provided)
    if (subjectId) {
      matchingSubject = await Subject.findById(subjectId);
      if (matchingSubject && matchingSubject.isCommon) {
        isCommonSubject = true;
        console.log(`✅ Found common subject: ${matchingSubject.name} (${matchingSubject.code})`);
        // Even for common subjects, only create for the selected branch
        allBranches = [normalizedBranch];
        console.log(`📚 Common subject - creating material only for selected branch: ${normalizedBranch}`);
      } else if (matchingSubject) {
        // Not a common subject, verify it matches the selected branch
        const subjectBranch = matchingSubject.branch ? matchingSubject.branch.trim() : '';
        if (subjectBranch.toLowerCase() !== normalizedBranch.toLowerCase()) {
          console.log(`⚠️ Subject branch "${subjectBranch}" does not match selected branch "${normalizedBranch}"`);
          // Try to find by branch and code instead
          matchingSubject = null;
        } else {
          allBranches = [normalizedBranch];
          console.log(`✅ Found matching subject: ${matchingSubject.branch} - ${matchingSubject.code} (${matchingSubject.name})`);
        }
      }
    }
    
    // If not found by subjectId, or branch doesn't match, find by branch and code
    if (!matchingSubject) {
      const escaped = normalizedBranch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const branchRegex = new RegExp(`^${escaped}$`, 'i');
      
      const branchSubjects = await Subject.find({ branch: { $regex: branchRegex } });
      console.log(`🔍 Branch "${normalizedBranch}": Found ${branchSubjects.length} subjects`);
      
      // Find the specific subject with matching code
      matchingSubject = branchSubjects.find(subject => {
        const subjCode = subject.code ? subject.code.trim().toUpperCase() : '';
        return subjCode === normalizedSubjectCode;
      });
      
      if (!matchingSubject) {
        console.log(`⚠️ Subject code "${normalizedSubjectCode}" not found in branch "${normalizedBranch}"`);
        return sendResponse(400, { 
          error: `Subject with code "${subjectCode}" not found in branch "${branch}"` 
        });
      }
      
      if (matchingSubject.isCommon) {
        isCommonSubject = true;
        console.log(`✅ Found common subject: ${matchingSubject.name} (${matchingSubject.code})`);
      }
      
      console.log(`✅ Found matching subject: ${matchingSubject.branch} - ${matchingSubject.code} (${matchingSubject.name})`);
      allBranches = [normalizedBranch];
    }
    
    if (!matchingSubject) {
      return sendResponse(400, { 
        error: 'Subject not found' 
      });
    }
    
    // Create material entry for the selected branch only (single material)
    const createdMaterials = [];
    const errors = [];
    
    // Always create only ONE material for the selected branch
    const targetBranch = allBranches[0]; // Only the selected branch
    
    try {
      const material = await Material.create({
        title,
        type,
        url,
        description: description || '',
        uploadedBy,
        subjectId: matchingSubject.id || matchingSubject._id,
        subjectName: matchingSubject.name || subjectName,
        branch: targetBranch,
        branches: [targetBranch], // Single branch array
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
    
      console.log(`✅ Material created with accessType: "${finalAccessType}" for ${targetBranch} - ${matchingSubject.code} (${matchingSubject.name})`);
      console.log(`📋 Created material details:`, {
        title: title,
        accessType: finalAccessType,
        materialAccessType: material.accessType,
        price: finalAccessType === 'paid' ? Number(price) : 0,
        googleDriveUrl: finalAccessType === 'drive_protected' ? googleDriveUrl : null,
        resourceType: resourceType,
        branch: targetBranch,
        isCommon: isCommonSubject
      });
      
      // CRITICAL: Verify the material has the correct accessType before adding
      if (material.accessType !== finalAccessType) {
        console.error(`❌ CRITICAL ERROR: Material accessType mismatch! Expected: "${finalAccessType}", Got: "${material.accessType}"`);
        console.error(`❌ Material object:`, JSON.stringify(material.toJSON(), null, 2));
      }
      
      createdMaterials.push(material);
      console.log(`✅ Material created for ${targetBranch} - ${matchingSubject.code} (${matchingSubject.name})`);
      
      // Send notification
      try {
        await notificationService.notifyMaterialUploaded(material); 
      } catch (notifErr) {
        console.error('Notification error (non-fatal):', notifErr);
      }
    } catch (err) {
      console.error(`❌ Error creating material for ${targetBranch} - ${matchingSubject.code}:`, err);
      errors.push({
        branch: targetBranch,
        code: matchingSubject.code,
        error: err.message
      });
    }
    
    if (createdMaterials.length === 0) {
      return sendResponse(500, { 
        error: "Failed to create material",
        details: errors
      });
    }
    
    console.log(`✅ Successfully created material`);
    
    // CRITICAL: Ensure accessType is preserved in response
    // Only send the single created material
    const createdMaterial = createdMaterials[0];
    if (!createdMaterial) {
      return sendResponse(500, { 
        error: "Failed to create material",
        details: errors
      });
    }
    
    // Convert to JSON once
    const materialJson = createdMaterial.toJSON ? createdMaterial.toJSON() : createdMaterial;
    
    // Build response material object
    const responseMaterial = {
      ...materialJson,
      accessType: materialJson.accessType || createdMaterial.accessType || 'free',
      price: materialJson.price || createdMaterial.price || 0,
      googleDriveUrl: materialJson.googleDriveUrl || createdMaterial.googleDriveUrl || null
    };
    
    // Log once before sending response
    console.log(`📤 Sending material in response with accessType: "${responseMaterial.accessType}"`);
    
    // Send response once
    return sendResponse(201, { 
      message: "Material added successfully",
      material: responseMaterial, // Single material object
      materials: [responseMaterial], // Array for backward compatibility
      count: 1
    });
  } catch (err) {
    console.error("Error adding material:", err);
    return sendResponse(500, { error: "Failed to add material", details: err.message });
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

// ZIP upload endpoint - extracts PDFs and creates multiple material entries
// NOTE: This route must be placed before parameterized routes like /:id/*
router.post('/upload-zip', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('📦 ZIP upload request received');
    console.log('📦 Request body keys:', Object.keys(req.body));
    
    const { 
      branch, 
      semester, 
      subjectCode, 
      subjectId,
      subjectName,
      materialType, // 'pyqs', 'model_answer_papers', or 'other'
      description,
      tags,
      accessType,
      price,
      googleDriveUrl,
      filename,
      contentType,
      dataBase64
    } = req.body;

    console.log('📦 Extracted fields:', {
      branch: !!branch,
      semester: !!semester,
      subjectCode: !!subjectCode,
      materialType: !!materialType,
      filename: !!filename,
      hasDataBase64: !!dataBase64
    });

    // Validate required fields
    if (!semester || !subjectCode || !materialType) {
      console.error('❌ Missing required fields:', { 
        branch: branch || 'MISSING', 
        semester: semester || 'MISSING', 
        subjectCode: subjectCode || 'MISSING', 
        subjectId: subjectId || 'MISSING',
        materialType: materialType || 'MISSING' 
      });
      return res.status(400).json({ 
        error: 'Semester, Subject Code, and Material Type are required',
        details: {
          hasSemester: !!semester,
          hasSubjectCode: !!subjectCode,
          hasMaterialType: !!materialType,
          hasBranch: !!branch
        }
      });
    }
    
    // Branch is required
    if (!branch || branch.trim() === '') {
      console.error('❌ Branch is required');
      return res.status(400).json({ 
        error: 'Branch is required' 
      });
    }

    // Validate materialType - all three options are supported
    const validMaterialTypes = ['pyqs', 'model_answer_papers', 'other'];
    console.log('📦 Validating materialType:', materialType, 'Valid types:', validMaterialTypes);
    
    if (!materialType) {
      return res.status(400).json({ 
        error: 'Material Type is required. Must be one of: "pyqs", "model_answer_papers", or "other"' 
      });
    }
    
    if (!validMaterialTypes.includes(materialType)) {
      console.error('❌ Invalid materialType:', materialType, 'Expected one of:', validMaterialTypes);
      return res.status(400).json({ 
        error: `Material Type must be one of: "pyqs", "model_answer_papers", or "other". Received: "${materialType}"` 
      });
    }
    
    console.log('✅ Material type validated:', materialType);

    // Get ZIP file from request (base64 encoded)
    if (!filename || !dataBase64) {
      return res.status(400).json({ error: 'ZIP file is required' });
    }

    if (contentType !== 'application/zip') {
      return res.status(400).json({ error: 'File must be a ZIP archive' });
    }

    console.log('📦 Processing ZIP file:', filename, 'Size:', dataBase64.length, 'chars');

    // Convert base64 to buffer
    let zipBuffer;
    try {
      zipBuffer = Buffer.from(dataBase64, 'base64');
      console.log('📦 ZIP buffer created, size:', zipBuffer.length, 'bytes');
    } catch (bufferError) {
      console.error('❌ Error creating buffer from base64:', bufferError);
      return res.status(400).json({ error: 'Invalid base64 data' });
    }
    
    // Extract ZIP
    let zip;
    let zipEntries;
    try {
      zip = new AdmZip(zipBuffer);
      zipEntries = zip.getEntries();
      console.log('📦 ZIP extracted, total entries:', zipEntries.length);
    } catch (zipError) {
      console.error('❌ Error extracting ZIP:', zipError);
      return res.status(400).json({ error: 'Failed to extract ZIP file: ' + zipError.message });
    }

    // Filter for PDF files only
    const pdfEntries = zipEntries.filter(entry => {
      const entryName = entry.entryName.toLowerCase();
      return entryName.endsWith('.pdf') && !entry.isDirectory;
    });

    if (pdfEntries.length === 0) {
      return res.status(400).json({ 
        error: 'No PDF files found in the ZIP archive' 
      });
    }

    console.log(`📦 Extracted ${pdfEntries.length} PDF files from ZIP`);

    // Find matching subject (similar to regular POST route)
    const Subject = (await import('../models/Subject.js')).default;
    let matchingSubject = null;
    let isCommonSubject = false;
    let allBranches = [];
    
    // Check if this is a common subject (by subjectId)
    if (subjectId) {
      matchingSubject = await Subject.findById(subjectId);
      if (matchingSubject && matchingSubject.isCommon) {
        isCommonSubject = true;
        console.log(`✅ Found common subject: ${matchingSubject.name} (${matchingSubject.code})`);
        // Get all branches for common subject
        allBranches = await Subject.distinct('branch');
        allBranches = allBranches.filter(b => b && b.trim());
        console.log(`📚 Common subject valid for ${allBranches.length} branches: ${allBranches.join(', ')}`);
      }
    }
    
    // If not a common subject, find by branch and code
    if (!isCommonSubject) {
      if (!branch) {
        return res.status(400).json({ 
          error: 'Branch is required' 
        });
      }
      
      const normalizedSubjectCode = subjectCode ? subjectCode.trim().toUpperCase() : '';
      
      if (!normalizedSubjectCode) {
        return res.status(400).json({ 
          error: 'Subject code is required' 
        });
      }
      
      // Use case-insensitive branch matching
      const normalizedBranch = branch.trim();
      const escaped = normalizedBranch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const branchRegex = new RegExp(`^${escaped}$`, 'i');
      
      const branchSubjects = await Subject.find({ branch: { $regex: branchRegex } });
      console.log(`🔍 Branch "${normalizedBranch}": Found ${branchSubjects.length} subjects`);
      
      // Find the specific subject with matching code
      matchingSubject = branchSubjects.find(subject => {
        const subjCode = subject.code ? subject.code.trim().toUpperCase() : '';
        return subjCode === normalizedSubjectCode && String(subject.semester) === String(semester);
      });

      if (!matchingSubject) {
        console.log(`⚠️ Subject code "${normalizedSubjectCode}" not found in branch "${normalizedBranch}" for semester ${semester}`);
        return res.status(400).json({ 
          error: `No subject found matching code "${subjectCode}" for branch "${branch}" and semester "${semester}". Please add the subject first.` 
        });
      }

      console.log(`✅ Found matching subject: ${matchingSubject.branch} - ${matchingSubject.code} (${matchingSubject.name})`);
      allBranches = [matchingSubject.branch];
    }
    
    if (!matchingSubject) {
      return res.status(400).json({ 
        error: 'Subject not found' 
      });
    }

    // Set resourceType based on materialType
    const resourceType = materialType === 'pyqs' 
      ? 'pyqs' 
      : materialType === 'model_answer_papers' 
        ? 'model_answer_papers' 
        : 'notes';

    // Set accessType (default to 'free' if not provided)
    const finalAccessType = accessType && ['free', 'drive_protected', 'paid'].includes(accessType) 
      ? accessType 
      : 'free';

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

    // Process each PDF
    const createdMaterials = [];
    const errors = [];

    // For common subjects, create materials for all branches
    // For regular subjects, create for single branch
    for (let i = 0; i < pdfEntries.length; i++) {
      const pdfEntry = pdfEntries[i];
      
      // For each PDF, create material for each branch (if common) or single branch
      for (const targetBranch of allBranches) {
        try {
          console.log(`📄 Processing PDF ${i + 1}/${pdfEntries.length}: ${pdfEntry.entryName} for branch ${targetBranch}`);
          
          // Extract PDF buffer
          const pdfBuffer = pdfEntry.getData();
          const pdfFilename = path.basename(pdfEntry.entryName);

          console.log(`📤 Uploading PDF: ${pdfFilename}, size: ${pdfBuffer.length} bytes`);

          // Upload PDF to storage
          const uploadResult = await uploadFile(
            pdfBuffer,
            pdfFilename,
            'application/pdf',
            'materials',
            'materials'
          );

          console.log(`✅ PDF uploaded to ${uploadResult.storage}: ${uploadResult.url}`);

          // Create material entry (using matching subject data like regular POST route)
          const materialData = {
            title: pdfFilename.replace('.pdf', ''),
            description: description || `Material from ${filename}`,
            type: 'pdf',
            url: uploadResult.url,
            uploadedBy: req.user?.id || 'admin',
            subjectId: matchingSubject.id || matchingSubject._id,
            subjectName: matchingSubject.name || subjectName,
            branch: targetBranch,
            branches: isCommonSubject ? allBranches : [targetBranch], // All branches for common, single for regular
            semester: String(matchingSubject.semester || semester),
            subjectCode: matchingSubject.code || subjectCode,
            resourceType: resourceType,
            accessType: finalAccessType,
            price: finalAccessType === 'paid' ? (Number(price) || 0) : 0,
            googleDriveUrl: finalAccessType === 'drive_protected' ? (googleDriveUrl || null) : null,
            storageType: uploadResult.storage,
            tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
            coverPhoto: null
          };

          console.log(`📝 Creating material entry for: ${materialData.title}`);
          console.log(`📝 Material data:`, JSON.stringify(materialData, null, 2));

          let material;
          try {
            material = await Material.create(materialData);
            console.log(`✅ Material created successfully:`, material._id || material.id);
          } catch (createError) {
            console.error(`❌ Error creating material for ${materialData.title}:`, createError);
            console.error(`❌ Create error stack:`, createError.stack);
            throw createError; // Re-throw to be caught by outer catch
          }
          
          createdMaterials.push(material);

          // Notify via WebSocket
          try {
            await notificationService.notifyMaterialUploaded({
              title: material.title,
              url: material.url,
              type: 'pdf',
              downloads: 0,
              createdAt: new Date().toISOString()
            });
          } catch (notifyError) {
            console.error('Failed to notify material upload:', notifyError);
          }

          console.log(`✅ Created material: ${material.title} for branch ${targetBranch}`);
        } catch (error) {
          console.error(`❌ Error processing PDF ${pdfEntry.entryName} for branch ${targetBranch}:`, error);
          errors.push({
            filename: pdfEntry.entryName,
            branch: targetBranch,
            error: error.message
          });
        }
      }
    }

    // Return results
    if (createdMaterials.length === 0) {
      return res.status(500).json({ 
        error: 'Failed to create any materials',
        errors: errors
      });
    }

    res.status(201).json({
      success: true,
      message: `Successfully created ${createdMaterials.length} material(s)`,
      count: createdMaterials.length,
      materials: createdMaterials.map(m => ({
        _id: m._id || m.id,
        id: m.id || m._id,
        title: m.title,
        url: m.url
      })),
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (err) {
    console.error('❌ Error processing ZIP upload:', err);
    console.error('❌ Error stack:', err.stack);
    res.status(500).json({ 
      error: 'Failed to process ZIP upload: ' + (err.message || 'Unknown error'),
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// Get materials with filters for import feature
router.get("/filter", authenticateToken, async (req, res) => {
  try {
    const { branch, semester, subjectCode, subjectId, type, resourceType } = req.query;
    
    let query = {};
    
    // Build query based on filters
    if (branch && branch !== 'all') {
      query.$or = [
        { branch: branch },
        { branches: branch }
      ];
    }
    
    if (semester) {
      query.semester = String(semester);
    }
    
    if (subjectCode) {
      query.subjectCode = subjectCode;
    }
    
    if (subjectId) {
      query.subjectId = subjectId;
    }
    
    if (type) {
      query.type = type;
    }
    
    if (resourceType) {
      query.resourceType = resourceType;
    }
    
    console.log('🔍 Fetching materials with filters:', query);
    
    const materials = await Material.find(query, { sort: { createdAt: -1 } });
    
    // Normalize IDs
    const normalizedMaterials = materials.map(m => {
      const materialObj = m.toJSON ? m.toJSON() : m;
      return {
        ...materialObj,
        _id: materialObj.id || materialObj._id,
        id: materialObj.id || materialObj._id,
        title: materialObj.title || '',
        type: materialObj.type || 'pdf',
        resourceType: materialObj.resourceType || 'notes',
        tags: materialObj.tags || [],
        description: materialObj.description || ''
      };
    });
    
    console.log(`✅ Found ${normalizedMaterials.length} materials matching filters`);
    
    res.status(200).json(normalizedMaterials);
  } catch (err) {
    console.error("❌ Error fetching filtered materials:", err);
    res.status(500).json({ error: 'Failed to fetch materials: ' + (err.message || 'Unknown error') });
  }
});

// Import/copy materials to a new subject
router.post("/import", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { 
      materialIds, // Array of material IDs to import
      targetBranch,
      targetSemester,
      targetSubjectId,
      targetSubjectCode,
      targetSubjectName,
      importAll = false, // If true, import all materials from source
      sourceBranch,
      sourceSemester,
      sourceSubjectCode,
      sourceSubjectId
    } = req.body;
    
    console.log('📥 Import materials request:', {
      materialIds,
      importAll,
      targetBranch,
      targetSemester,
      targetSubjectCode,
      sourceBranch,
      sourceSemester,
      sourceSubjectCode
    });
    
    // Validate target subject
    if (!targetSemester || !targetSubjectId || !targetSubjectCode) {
      return res.status(400).json({ 
        error: 'Target semester, subjectId, and subjectCode are required' 
      });
    }
    
    // Import Subject model to validate target subject
    const Subject = (await import('../models/Subject.js')).default;
    let targetSubject = null;
    
    // Find target subject
    if (targetSubjectId) {
      targetSubject = await Subject.findById(targetSubjectId);
    }
    
    if (!targetSubject && targetSubjectCode) {
      // Try to find by code and branch
      if (targetBranch) {
        const normalizedBranch = targetBranch.trim();
        const escaped = normalizedBranch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const branchRegex = new RegExp(`^${escaped}$`, 'i');
        const branchSubjects = await Subject.find({ branch: { $regex: branchRegex } });
        targetSubject = branchSubjects.find(s => 
          s.code && s.code.trim().toUpperCase() === targetSubjectCode.trim().toUpperCase()
        );
      }
    }
    
    if (!targetSubject) {
      return res.status(400).json({ 
        error: `Target subject not found: ${targetSubjectCode}` 
      });
    }
    
    console.log(`✅ Target subject found: ${targetSubject.name} (${targetSubject.code})`);
    
    // Find source materials
    let sourceMaterials = [];
    
    if (importAll) {
      // Import all materials from source subject
      let sourceQuery = {};
      
      if (sourceSubjectId) {
        sourceQuery.subjectId = sourceSubjectId;
      } else if (sourceSubjectCode) {
        sourceQuery.subjectCode = sourceSubjectCode;
      }
      
      if (sourceSemester) {
        sourceQuery.semester = String(sourceSemester);
      }
      
      if (sourceBranch && sourceBranch !== 'all') {
        sourceQuery.$or = [
          { branch: sourceBranch },
          { branches: sourceBranch }
        ];
      }
      
      console.log('🔍 Fetching all source materials with query:', sourceQuery);
      sourceMaterials = await Material.find(sourceQuery);
    } else if (materialIds && Array.isArray(materialIds) && materialIds.length > 0) {
      // Import specific materials
      sourceMaterials = await Material.find({ 
        _id: { $in: materialIds } 
      });
    } else {
      return res.status(400).json({ 
        error: 'Either materialIds array or importAll=true is required' 
      });
    }
    
    if (sourceMaterials.length === 0) {
      return res.status(404).json({ 
        error: 'No source materials found to import' 
      });
    }
    
    console.log(`📦 Importing ${sourceMaterials.length} materials`);
    
    // Import materials
    const importedMaterials = [];
    const errors = [];
    
    for (const sourceMaterial of sourceMaterials) {
      try {
        const materialData = {
          title: sourceMaterial.title,
          type: sourceMaterial.type,
          url: sourceMaterial.url, // Reuse the same URL (file is not duplicated)
          description: sourceMaterial.description || '',
          uploadedBy: req.user?.id || 'admin',
          subjectId: targetSubject.id || targetSubject._id,
          subjectName: targetSubject.name || targetSubjectName,
          branch: targetBranch || targetSubject.branch,
          branches: targetBranch ? [targetBranch] : [targetSubject.branch],
          semester: String(targetSubject.semester || targetSemester),
          subjectCode: targetSubject.code || targetSubjectCode,
          resourceType: sourceMaterial.resourceType || 'notes',
          accessType: sourceMaterial.accessType || 'free',
          price: sourceMaterial.price || 0,
          googleDriveUrl: sourceMaterial.googleDriveUrl || null,
          storageType: sourceMaterial.storageType || 'local',
          tags: sourceMaterial.tags || [],
          coverPhoto: sourceMaterial.coverPhoto || null
        };
        
        const importedMaterial = await Material.create(materialData);
        importedMaterials.push(importedMaterial);
        
        console.log(`✅ Imported material: ${importedMaterial.title}`);
      } catch (error) {
        console.error(`❌ Error importing material ${sourceMaterial.title}:`, error);
        errors.push({
          title: sourceMaterial.title,
          error: error.message
        });
      }
    }
    
    // Send notifications
    for (const material of importedMaterials) {
      try {
        await notificationService.notifyMaterialUploaded(material);
      } catch (notifErr) {
        console.error('Notification error (non-fatal):', notifErr);
      }
    }
    
    res.status(201).json({
      success: true,
      message: `Successfully imported ${importedMaterials.length} material(s)`,
      count: importedMaterials.length,
      materials: importedMaterials.map(m => ({
        _id: m._id || m.id,
        id: m.id || m._id,
        title: m.title,
        url: m.url
      })),
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (err) {
    console.error('❌ Error importing materials:', err);
    res.status(500).json({ 
      error: 'Failed to import materials: ' + (err.message || 'Unknown error'),
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
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
