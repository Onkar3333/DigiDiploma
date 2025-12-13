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

/**
 * Force download a file from a URL
 * Works on both mobile and desktop by creating a blob and triggering download
 */
export async function downloadFile(url: string, filename?: string): Promise<void> {
  if (!url) {
    console.error('Download URL is empty');
    return;
  }

  try {
    // Normalize the URL first
    const normalizedUrl = normalizeBackendUrl(url);
    
    // Make URL absolute if it's relative
    const absoluteUrl = normalizedUrl.startsWith('http') 
      ? normalizedUrl 
      : `${window.location.origin}${normalizedUrl}`;

    // Extract filename from URL if not provided
    let finalFilename = filename;
    if (!finalFilename) {
      try {
        const urlObj = new URL(absoluteUrl);
        const pathname = urlObj.pathname;
        const urlFilename = pathname.split('/').pop() || 'download';
        finalFilename = decodeURIComponent(urlFilename);
      } catch {
        finalFilename = 'download';
      }
    }

    // For same-origin URLs or proxy URLs, try direct download first
    if (normalizedUrl.startsWith('/') || absoluteUrl.includes(window.location.hostname)) {
      // Create a temporary anchor element and trigger download
      const link = document.createElement('a');
      link.href = absoluteUrl;
      link.download = finalFilename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Give it a moment, if it doesn't work, fall back to fetch
      setTimeout(() => {
        // If download didn't work, try fetch method
        fetchAndDownload(absoluteUrl, finalFilename);
      }, 100);
    } else {
      // For cross-origin URLs, fetch and create blob
      await fetchAndDownload(absoluteUrl, finalFilename);
    }
  } catch (error) {
    console.error('Error downloading file:', error);
    // Fallback: open in new tab
    window.open(url, '_blank');
  }
}

/**
 * Fetch file and download as blob
 */
async function fetchAndDownload(url: string, filename: string): Promise<void> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    
    // Create download link
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error('Error in fetchAndDownload:', error);
    // Final fallback: open in new tab
    window.open(url, '_blank');
  }
}

/**
 * Convert resume URLs (internship files) to proxy URLs
 * Handles localhost URLs, R2 direct URLs, and ensures proper proxy format
 */
export function getResumeProxyUrl(url: string | undefined | null): string {
  if (!url) return '';
  
  try {
    // First normalize localhost URLs to relative paths
    const normalizedUrl = normalizeBackendUrl(url);
    
    // If already using proxy, ensure it's relative
    if (normalizedUrl.includes('/api/materials/proxy/r2/')) {
      // If it starts with http:// or https://, make it relative
      if (normalizedUrl.startsWith('http://') || normalizedUrl.startsWith('https://')) {
        try {
          const urlObj = new URL(normalizedUrl);
          return urlObj.pathname + urlObj.search;
        } catch {
          return normalizedUrl;
        }
      }
      return normalizedUrl;
    }
    
    // Check if it's an R2 URL that needs proxy conversion
    if (normalizedUrl.includes('r2.cloudflarestorage.com')) {
      try {
        const urlObj = new URL(normalizedUrl);
        const pathParts = urlObj.pathname.split('/').filter(Boolean);
        
        // Extract the key (skip bucket name if it's the first part)
        let key = '';
        if (pathParts.length > 1) {
          // Format: /bucket-name/internships/filename.pdf
          // Skip bucket name, use rest as key
          key = pathParts.slice(1).join('/');
        } else if (pathParts.length === 1) {
          // Format: /key (bucket in subdomain)
          key = pathParts[0];
        }
        
        if (key) {
          // Ensure proper encoding
          const proxyUrl = `/api/materials/proxy/r2/${encodeURIComponent(key)}`;
          console.log('Converting resume R2 URL to proxy:', normalizedUrl, '->', proxyUrl);
          return proxyUrl;
        }
      } catch (e) {
        console.warn('Failed to parse resume R2 URL:', e, normalizedUrl);
      }
    }
    
    // For relative URLs, return as is
    if (normalizedUrl.startsWith('/')) {
      return normalizedUrl;
    }
    
    // For absolute URLs, return as is (shouldn't happen after normalization)
    return normalizedUrl;
  } catch (error) {
    console.warn('Error converting resume URL to proxy:', error, url);
    return url || '';
  }
}

