import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// R2 Configuration
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_BASE_URL = process.env.R2_PUBLIC_BASE_URL || '';
const STORAGE_DRIVER = process.env.STORAGE_DRIVER || 'local';

// Check if R2 is configured
export const isR2Ready = () => {
  return STORAGE_DRIVER === 'r2' && 
         R2_ACCESS_KEY_ID && 
         R2_SECRET_ACCESS_KEY && 
         R2_ACCOUNT_ID && 
         R2_BUCKET_NAME;
};

// Initialize R2 client (S3-compatible)
let r2Client = null;
if (isR2Ready()) {
  try {
    r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });
    console.log('✅ R2 client initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize R2 client:', error.message);
    r2Client = null;
  }
}

/**
 * Upload a file to R2
 * @param {Buffer} buffer - File buffer
 * @param {string} key - Object key (path in bucket)
 * @param {string} contentType - MIME type
 * @returns {Promise<string>} Public URL of uploaded file
 */
export const uploadToR2 = async (buffer, key, contentType) => {
  if (!isR2Ready() || !r2Client) {
    throw new Error('R2 is not configured or client not initialized');
  }

  try {
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      // ACL: 'public-read'
    });

    await r2Client.send(command);

    const safeKey = encodeURI(key).replace(/#/g, '%23');
    
    // Use proxy endpoint if R2_PUBLIC_BASE_URL is not set (to avoid authorization issues)
    if (R2_PUBLIC_BASE_URL) {
      const baseUrl = R2_PUBLIC_BASE_URL.replace(/\/$/, '');
      return `${baseUrl}/${safeKey}`;
    } else {
      // Use backend proxy endpoint to serve files (bypasses R2 authorization)
      const backendUrl = (process.env.BACKEND_URL || process.env.FRONTEND_URL || 'http://localhost:5000').replace(/\/$/, '');
      return `${backendUrl}/api/materials/proxy/r2/${safeKey}`;
    }
  } catch (error) {
    console.error('R2 upload error:', error);
    throw new Error(`Failed to upload to R2: ${error.message}`);
  }
};

/**
 * Delete a file from R2
 * @param {string} key - Object key to delete
 */
export const deleteFromR2 = async (key) => {
  if (!isR2Ready() || !r2Client) {
    throw new Error('R2 is not configured or client not initialized');
  }

  try {
    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    await r2Client.send(command);
    return true;
  } catch (error) {
    console.error('R2 delete error:', error);
    throw new Error(`Failed to delete from R2: ${error.message}`);
  }
};

/**
 * Generate a unique key for file storage
 * @param {string} filename - Original filename
 * @param {string} prefix - Optional prefix (e.g., 'materials', 'internships', 'projects')
 * @returns {string} Unique key
 */
export const generateR2Key = (filename, prefix = 'uploads') => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const ext = path.extname(filename);
  const baseName = path.basename(filename, ext);
  const sanitized = baseName.replace(/[^a-zA-Z0-9]/g, '_');
  return `${prefix}/${timestamp}_${sanitized}_${random}${ext}`;
};

/**
 * Fallback: Save file locally
 * @param {Buffer} buffer - File buffer
 * @param {string} filename - Original filename
 * @param {string} subfolder - Subfolder in uploads directory (e.g., 'materials', 'internships')
 * @returns {Promise<string>} Local file path (relative)
 */
export const saveFileLocally = async (buffer, filename, subfolder = 'materials') => {
  const uploadsDir = path.join(__dirname, '..', 'uploads', subfolder);
  
  // Ensure directory exists
  try {
    await fs.access(uploadsDir);
  } catch {
    await fs.mkdir(uploadsDir, { recursive: true });
  }

  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const ext = path.extname(filename);
  const baseName = path.basename(filename, ext);
  const sanitized = baseName.replace(/[^a-zA-Z0-9]/g, '_');
  const uniqueFilename = `${timestamp}_${sanitized}_${random}${ext}`;
  const filePath = path.join(uploadsDir, uniqueFilename);

  await fs.writeFile(filePath, buffer);

  // Return relative path for URL construction
  return `/uploads/${subfolder}/${uniqueFilename}`;
};

/**
 * Main upload function with fallback logic
 * @param {Buffer|string} data - File data (buffer or base64 string)
 * @param {string} filename - Original filename
 * @param {string} contentType - MIME type
 * @param {string} prefix - R2 prefix (e.g., 'materials', 'internships', 'projects')
 * @param {string} localSubfolder - Local subfolder for fallback
 * @returns {Promise<{url: string, storage: 'r2'|'local'}>}
 */
export const uploadFile = async (data, filename, contentType, prefix = 'uploads', localSubfolder = 'materials') => {
  // Convert base64 to buffer if needed
  let buffer;
  if (typeof data === 'string') {
    buffer = Buffer.from(data, 'base64');
  } else {
    buffer = data;
  }

  // Try R2 first if configured (force R2 when configured)
  if (isR2Ready() && r2Client) {
    try {
      const key = generateR2Key(filename, prefix);
      const url = await uploadToR2(buffer, key, contentType);
      console.log(`✅ File uploaded to R2: ${key}`);
      return { url, storage: 'r2', key };
    } catch (error) {
      console.error('❌ R2 upload failed:', error.message);
      // Only fallback to local if R2 is not required
      // For production, you might want to throw instead of falling back
      if (process.env.FORCE_R2_STORAGE === 'true') {
        throw new Error(`R2 upload required but failed: ${error.message}`);
      }
      console.warn('⚠️ Falling back to local storage');
      // Fall through to local storage
    }
  }

  // Fallback to local storage (only if R2 is not configured or failed)
  try {
    const localPath = await saveFileLocally(buffer, filename, localSubfolder);
    const baseUrl = (process.env.FRONTEND_URL || process.env.BACKEND_URL || 'http://localhost:5000').replace(/\/$/, '');
    const url = `${baseUrl}${localPath}`;
    console.log(`✅ File saved locally: ${localPath}`);
    return { url, storage: 'local', key: localPath };
  } catch (error) {
    console.error('❌ Local storage fallback failed:', error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }
};

/**
 * Delete a file (from R2 or local)
 * @param {string} urlOrKey - File URL or R2 key
 * @param {string} storage - Storage type ('r2' or 'local')
 */
export const deleteFile = async (urlOrKey, storage = 'local') => {
  // Auto-detect storage type if not specified
  if (storage === 'local' && (urlOrKey.includes('r2.cloudflarestorage.com') || urlOrKey.includes('/api/materials/proxy/r2/'))) {
    storage = 'r2';
  }
  
  if (storage === 'r2' && isR2Ready() && r2Client) {
    try {
      let key = urlOrKey.trim();
      
      // Handle proxy URLs
      if (key.includes('/api/materials/proxy/r2/')) {
        const match = key.match(/\/proxy\/r2\/(.+)$/);
        key = match ? match[1] : key;
      }
      // Handle direct R2 URLs
      else if (key.includes('r2.cloudflarestorage.com')) {
        try {
          const urlObj = new URL(key);
          const pathParts = urlObj.pathname.split('/').filter(Boolean);
          // Skip bucket name (first part), rest is the key
          key = pathParts.length > 1 ? pathParts.slice(1).join('/') : pathParts[0] || key;
        } catch (e) {
          // If URL parsing fails, try to extract from path
          const candidates = [
            R2_PUBLIC_BASE_URL?.replace(/\/$/, ''),
            `https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
            `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}`,
          ].filter(Boolean);

          for (const base of candidates) {
            if (key.startsWith(base)) {
              key = key.slice(base.length);
              break;
            }
          }
          key = key.replace(/^\/+/, '');
        }
      }
      // If it's already a key (no URL), use as is
      else {
        key = key.replace(/^\/+/, '');
      }

      console.log(`🗑️ Deleting from R2, key: ${key}`);
      await deleteFromR2(key);
      console.log(`✅ Successfully deleted from R2: ${key}`);
      return true;
    } catch (error) {
      console.error('❌ R2 delete failed:', error);
      return false;
    }
  } else {
    // Local file deletion
    try {
      const filePath = path.join(__dirname, '..', urlOrKey.startsWith('/') ? urlOrKey.slice(1) : urlOrKey);
      await fs.unlink(filePath);
      console.log(`✅ Successfully deleted local file: ${filePath}`);
      return true;
    } catch (error) {
      console.error('❌ Local file delete failed:', error);
      return false;
    }
  }
};

export default {
  isR2Ready,
  uploadToR2,
  deleteFromR2,
  generateR2Key,
  saveFileLocally,
  uploadFile,
  deleteFile,
};

