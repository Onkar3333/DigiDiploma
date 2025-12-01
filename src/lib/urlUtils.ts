/**
 * URL Utilities for handling backend URLs across environments
 */

/**
 * Normalize a URL from the backend to work in the current environment
 * Handles:
 * - localhost URLs from development data
 * - Absolute backend URLs
 * - R2 storage URLs
 * - Relative URLs
 */
export function normalizeBackendUrl(url: string | undefined | null): string {
  if (!url) return '';
  
  try {
    // If it's a localhost URL from development, convert to relative API path
    if (url.includes('localhost:8080') || url.includes('localhost:5000')) {
      // Extract the path after localhost:port
      const match = url.match(/localhost:\d+(\/.*)/);
      if (match && match[1]) {
        return match[1]; // Return relative path like /api/materials/proxy/...
      }
    }
    
    // If it's already a relative URL, return as is
    if (url.startsWith('/')) {
      return url;
    }
    
    // If it's an absolute URL with current backend domain, make it relative
    if (url.includes('api.digidiploma.in')) {
      try {
        const urlObj = new URL(url);
        return urlObj.pathname + urlObj.search; // Return path + query params
      } catch {
        return url;
      }
    }
    
    // If it's an R2 URL, return as is (will be handled by proxy functions)
    if (url.includes('r2.cloudflarestorage.com')) {
      return url;
    }
    
    // For any other absolute URL, return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // Default: return as is
    return url;
  } catch (error) {
    console.warn('Error normalizing URL:', error, url);
    return url;
  }
}

/**
 * Normalize URLs in a material object
 */
export function normalizeMaterialUrls<T extends Record<string, any>>(material: T): T {
  if (!material) return material;
  
  const normalized = { ...material };
  
  // Common URL fields
  const urlFields = ['url', 'coverPhotoUrl', 'resourceUrl', 'videoUrl', 'imageUrls', 'coverPhoto'];
  
  for (const field of urlFields) {
    if (field in normalized && typeof normalized[field] === 'string') {
      normalized[field] = normalizeBackendUrl(normalized[field]);
    }
  }
  
  // Handle array of URLs (like imageUrls in some cases)
  if (Array.isArray(normalized.imageUrls)) {
    normalized.imageUrls = normalized.imageUrls.map((url: string) => normalizeBackendUrl(url));
  }
  
  // Handle comma-separated URLs in imageUrls string
  if (typeof normalized.imageUrls === 'string' && normalized.imageUrls.includes(',')) {
    normalized.imageUrls = normalized.imageUrls
      .split(',')
      .map((url: string) => normalizeBackendUrl(url.trim()))
      .join(',');
  }
  
  return normalized;
}

/**
 * Normalize URLs in an array of materials/projects
 */
export function normalizeMaterialArray<T extends Record<string, any>>(materials: T[]): T[] {
  if (!Array.isArray(materials)) return materials;
  return materials.map(material => normalizeMaterialUrls(material));
}

