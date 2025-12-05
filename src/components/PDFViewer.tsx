import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Bookmark, BookmarkCheck, Download, ZoomIn, ZoomOut, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { normalizeBackendUrl } from '@/lib/urlUtils';

interface PDFViewerProps {
  url: string;
  title: string;
  materialId: string;
  onProgressUpdate?: (progress: number, timeSpent: number, lastPosition: number) => void;
  initialProgress?: number;
  initialTimeSpent?: number;
  initialLastPosition?: number;
  onBookmarkToggle?: (bookmarked: boolean) => void;
  initialBookmarked?: boolean;
}

const PDFViewer: React.FC<PDFViewerProps> = ({
  url,
  title,
  materialId,
  onProgressUpdate,
  initialProgress = 0,
  initialTimeSpent = 0,
  initialLastPosition = 0,
  onBookmarkToggle,
  initialBookmarked = false
}) => {
  const [scale, setScale] = useState<number>(1.0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [bookmarked, setBookmarked] = useState<boolean>(initialBookmarked);
  const [progress, setProgress] = useState<number>(initialProgress);
  const [timeSpent, setTimeSpent] = useState<number>(initialTimeSpent);
  const [lastPosition, setLastPosition] = useState<number>(initialLastPosition);
  
  const startTimeRef = useRef<number>(Date.now());
  const progressUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Convert R2 URLs to proxy URLs
  const getProxyUrl = (originalUrl: string): string => {
    if (!originalUrl || originalUrl.trim() === '' || originalUrl === 'data:;base64,=' || originalUrl.startsWith('data:;base64,=')) {
      return '';
    }
    
    // FIRST: Normalize any localhost URLs to relative paths
    const normalizedUrl = normalizeBackendUrl(originalUrl);
    
    // If already using proxy, return as is
    if (normalizedUrl.includes('/api/materials/proxy/')) {
      return normalizedUrl;
    }
    
    // Check if it's an R2 URL
    if (normalizedUrl.includes('r2.cloudflarestorage.com')) {
      try {
        const urlObj = new URL(normalizedUrl);
        const pathParts = urlObj.pathname.split('/').filter(Boolean);
        
        // R2 URLs format: https://{account_id}.r2.cloudflarestorage.com/{bucket}/{key}
        // Example: https://xxx.r2.cloudflarestorage.com/digidiploma/materials/file.pdf
        // We need to extract just the key part (materials/file.pdf)
        // The bucket name is typically the first part of the path
        
        let key = '';
        if (pathParts.length > 1) {
          // Skip the first part (bucket name) and use the rest as key
          // Format: /bucket-name/materials/filename.pdf -> key: materials/filename.pdf
          key = pathParts.slice(1).join('/');
        } else if (pathParts.length === 1) {
          // If only one part, it might be the key directly (bucket in subdomain)
          key = pathParts[0];
        }
        
        if (key) {
          // Use relative URL so Vercel can proxy it correctly
          const proxyUrl = `/api/materials/proxy/r2/${encodeURIComponent(key)}`;
          console.log('PDFViewer: Converting R2 URL to proxy:', normalizedUrl, '->', proxyUrl);
          return proxyUrl;
        }
      } catch (e) {
        console.warn('PDFViewer: Failed to parse R2 URL:', e, normalizedUrl);
      }
    }
    
    // If relative URL starting with /api/materials/proxy/, keep it relative for proper proxying
    if (normalizedUrl.startsWith('/api/materials/proxy/')) {
      return normalizedUrl;
    }
    
    // If relative URL, make it absolute
    if (normalizedUrl.startsWith('/')) {
      return `${window.location.origin}${normalizedUrl}`;
    }
    
    // If not starting with http, add origin
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      return `${window.location.origin}/${normalizedUrl}`;
    }
    
    return normalizedUrl;
  };

  const proxyUrl = getProxyUrl(url);

  useEffect(() => {
    // Validate URL before loading
    if (!url || url.trim() === '' || url === 'data:;base64,=' || url.startsWith('data:;base64,=')) {
      setError('Invalid PDF URL');
      setLoading(false);
      return;
    }
    
    // Validate proxyUrl is valid
    if (!proxyUrl || proxyUrl.trim() === '' || proxyUrl === 'data:;base64,=' || proxyUrl.startsWith('data:;base64,=')) {
      setError('Invalid PDF URL');
      setLoading(false);
      return;
    }
    
    // Start tracking time spent
    startTimeRef.current = Date.now();
    setLoading(true);

    // Set up progress tracking interval
    progressUpdateIntervalRef.current = setInterval(() => {
      const currentTime = Date.now();
      const sessionTime = (currentTime - startTimeRef.current) / 1000 / 60; // minutes
      const totalTimeSpent = initialTimeSpent + sessionTime;
      
      setTimeSpent(totalTimeSpent);
      
      // Estimate progress (we can't get actual page count without react-pdf)
      // For now, we'll use a simple time-based estimate or let user mark as complete
      const currentProgress = Math.min(progress + 5, 95); // Increment slowly
      setProgress(currentProgress);
      
      // Update parent component
      if (onProgressUpdate) {
        onProgressUpdate(currentProgress, totalTimeSpent, lastPosition);
      }
    }, 30000); // Update every 30 seconds

    return () => {
      if (progressUpdateIntervalRef.current) {
        clearInterval(progressUpdateIntervalRef.current);
      }
    };
  }, [initialTimeSpent, initialLastPosition, onProgressUpdate, progress, lastPosition]);

  const handleIframeLoad = () => {
    setLoading(false);
    setError(null);
  };

  const handleIframeError = (e: any) => {
    console.error('PDF iframe error:', e);
    console.error('PDF URL:', url);
    setError(`Failed to load PDF. Please check the URL: ${url}`);
    setLoading(false);
    toast.error('Failed to load PDF. Try downloading instead.');
  };

  const zoomIn = () => {
    setScale(prev => Math.min(2.0, prev + 0.2));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(0.5, prev - 0.2));
  };

  const toggleBookmark = () => {
    const newBookmarked = !bookmarked;
    setBookmarked(newBookmarked);
    if (onBookmarkToggle) {
      onBookmarkToggle(newBookmarked);
    }
    toast.success(newBookmarked ? 'Bookmarked' : 'Removed from bookmarks');
  };

  const downloadPDF = () => {
    const link = document.createElement('a');
    link.href = proxyUrl;
    link.download = `${title}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Download started');
  };

  const markAsCompleted = () => {
    setProgress(100);
    if (onProgressUpdate) {
      onProgressUpdate(100, timeSpent, lastPosition);
    }
    toast.success('Marked as completed');
  };

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center text-red-500">
            <p className="text-lg font-semibold mb-2">Error Loading PDF</p>
            <p className="text-sm mb-4">{error}</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => { setError(null); setLoading(true); }} variant="outline">
                Retry
              </Button>
              <Button onClick={downloadPDF} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Download Instead
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleBookmark}
              className={bookmarked ? 'bg-yellow-100 text-yellow-800' : ''}
            >
              {bookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={downloadPDF}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Progress: {Math.round(progress)}%</span>
            <span>Time spent: {Math.round(timeSpent)} min</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <a 
              href={proxyUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
            >
              <ExternalLink className="w-4 h-4" />
              Open in New Tab
            </a>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={zoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">{Math.round(scale * 100)}%</span>
            <Button variant="outline" size="sm" onClick={zoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {loading && (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Loading PDF...</p>
            </div>
          </div>
        )}
        <div 
          className="w-full overflow-auto border rounded-lg bg-gray-50"
          style={{ 
            height: '600px',
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            width: `${100 / scale}%`
          }}
        >
          {proxyUrl && proxyUrl !== 'data:;base64,=' && !proxyUrl.startsWith('data:;base64,=') && (proxyUrl.startsWith('http') || proxyUrl.startsWith('/api/materials/proxy/')) ? (
            <iframe
              ref={iframeRef}
              src={proxyUrl}
              className="w-full h-full border-0"
              title={title}
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              style={{ minHeight: '600px' }}
              allow="fullscreen"
            />
          ) : (
            <div className="flex items-center justify-center h-96">
              <div className="text-center text-gray-500">
                <p className="text-lg font-semibold mb-2">Invalid PDF URL</p>
                <p className="text-sm mb-4">The PDF URL is not valid or accessible.</p>
                <Button onClick={downloadPDF} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Try Download Instead
                </Button>
              </div>
            </div>
          )}
        </div>
        
        {/* Completion Button */}
        {progress >= 90 && (
          <div className="flex justify-center mt-4">
            <Button onClick={markAsCompleted} className="bg-green-600 hover:bg-green-700">
              Mark as Completed
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PDFViewer;
