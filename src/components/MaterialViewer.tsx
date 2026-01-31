import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { FileText, Video, BookOpen, Download, Star, Clock, Eye, Lock, ExternalLink } from 'lucide-react';
import PDFViewer from './PDFViewer';
import VideoPlayer from './VideoPlayer';
import { toast } from 'sonner';
import { authService } from '@/lib/auth';
import { normalizeBackendUrl, downloadFile } from '@/lib/urlUtils';

interface Material {
  id: string;
  title: string;
  type: string;
  url: string;
  description: string;
  subjectName: string;
  subjectCode: string;
  branch: string;
  semester: number;
  tags: string[];
  downloads: number;
  rating: number;
  ratingCount: number;
  createdAt: string;
  accessType?: 'free' | 'drive_protected' | 'paid';
  price?: number;
  googleDriveUrl?: string;
}

interface MaterialViewerProps {
  material: Material;
  onProgressUpdate?: (progress: number, timeSpent: number, lastPosition: number) => void;
  onBookmarkToggle?: (bookmarked: boolean) => void;
  initialProgress?: number;
  initialTimeSpent?: number;
  initialLastPosition?: number;
  initialBookmarked?: boolean;
  onStatsUpdate?: (materialId: string, stats: { downloads?: number; rating?: number; ratingCount?: number }) => void;
}

const MaterialViewer: React.FC<MaterialViewerProps> = ({
  material,
  onProgressUpdate,
  onBookmarkToggle,
  initialProgress = 0,
  initialTimeSpent = 0,
  initialLastPosition = 0,
  initialBookmarked = false,
  onStatsUpdate
}) => {
  const [activeTab, setActiveTab] = useState<string>('viewer');
  const [hasPurchased, setHasPurchased] = useState<boolean | null>(null);
  const [progress, setProgress] = useState<number>(initialProgress);
  const [timeSpent, setTimeSpent] = useState<number>(initialTimeSpent);
  const [lastPosition, setLastPosition] = useState<number>(initialLastPosition);
  const [bookmarked, setBookmarked] = useState<boolean>(initialBookmarked);
  const [currentDownloads, setCurrentDownloads] = useState<number>(material.downloads);
  const [currentRating, setCurrentRating] = useState<number>(material.rating);
  const [currentRatingCount, setCurrentRatingCount] = useState<number>(material.ratingCount);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [isRatingSubmitting, setIsRatingSubmitting] = useState<boolean>(false);
  const [isDownloadRecording, setIsDownloadRecording] = useState<boolean>(false);

  useEffect(() => {
    setCurrentDownloads(material.downloads);
    setCurrentRating(material.rating);
    setCurrentRatingCount(material.ratingCount);
  }, [material.downloads, material.rating, material.ratingCount]);

  useEffect(() => {
    if (material.accessType === 'paid') {
      const checkPurchase = async () => {
        try {
          const token = authService.getToken();
          const guestId = !token ? (await import('@/lib/guestId')).getOrCreateGuestId() : undefined;
          const url = guestId
            ? `/api/payments/check-purchase/${material.id}?guestId=${encodeURIComponent(guestId)}`
            : `/api/payments/check-purchase/${material.id}`;
          const checkResponse = await fetch(url, {
            headers: authService.getAuthHeaders()
          });
          
          if (checkResponse.ok) {
            const checkData = await checkResponse.json();
            setHasPurchased(checkData.hasPurchased);
          } else {
            setHasPurchased(false);
          }
        } catch (error) {
          console.error('Error checking purchase status:', error);
          setHasPurchased(false);
        }
      };
      
      checkPurchase();
    } else {
      setHasPurchased(true); // Non-paid materials are always "purchased"
    }
  }, [material.id, material.accessType]);

  const handleProgressUpdate = (newProgress: number, newTimeSpent: number, newLastPosition: number) => {
    setProgress(newProgress);
    setTimeSpent(newTimeSpent);
    setLastPosition(newLastPosition);
    
    if (onProgressUpdate) {
      onProgressUpdate(newProgress, newTimeSpent, newLastPosition);
    }
  };

  const handleBookmarkToggle = (newBookmarked: boolean) => {
    setBookmarked(newBookmarked);
    if (onBookmarkToggle) {
      onBookmarkToggle(newBookmarked);
    }
  };

  // Ensure URL is absolute (adds protocol and host if relative)
  const getAbsoluteUrl = (url: string) => {
    if (!url) {
      console.error('Material URL is empty');
      return '';
    }
    
    // FIRST: Normalize any localhost URLs to relative paths
    const normalizedUrl = normalizeBackendUrl(url);
    
    // If already absolute (starts with http:// or https://), return as is
    if (normalizedUrl.startsWith('http://') || normalizedUrl.startsWith('https://')) {
      // Check if it's an R2 URL that might have authorization issues
      // R2 URLs can be in format: https://{account_id}.r2.cloudflarestorage.com/{bucket}/{key}
      // or: https://{bucket}.{account_id}.r2.cloudflarestorage.com/{key}
      if (normalizedUrl.includes('r2.cloudflarestorage.com') && !normalizedUrl.includes('/api/materials/proxy/')) {
        // Extract the key from R2 URL and use proxy endpoint
        try {
          const urlObj = new URL(normalizedUrl);
          const pathParts = urlObj.pathname.split('/').filter(Boolean);
          
          // Handle different R2 URL formats
          let key = '';
          if (pathParts.length > 1) {
            // Format: /bucket-name/key/path
            // Skip the first part (bucket name) and join the rest as the key
            key = pathParts.slice(1).join('/');
          } else if (pathParts.length === 1) {
            // Format: /key (bucket might be in subdomain)
            key = pathParts[0];
          }
          
          if (key) {
            // Use relative URL so Vercel can proxy it correctly
            const proxyUrl = `/api/materials/proxy/r2/${encodeURIComponent(key)}`;
            console.log('Converting R2 URL to proxy:', normalizedUrl, '->', proxyUrl);
            return proxyUrl;
          }
        } catch (e) {
          console.warn('Failed to parse R2 URL, using normalized:', e);
        }
      }
      return normalizedUrl;
    }
    
    // If relative URL starting with /api/materials/proxy/, keep it relative for proper proxying
    if (normalizedUrl.startsWith('/api/materials/proxy/')) {
      return normalizedUrl;
    }
    
    // If relative, make it absolute using current origin
    if (normalizedUrl.startsWith('/')) {
      const absoluteUrl = `${window.location.origin}${normalizedUrl}`;
      console.log('Converted relative URL to absolute:', normalizedUrl, '->', absoluteUrl);
      return absoluteUrl;
    }
    
    // If no leading slash, add it
    const absoluteUrl = `${window.location.origin}/${normalizedUrl}`;
    console.log('Added leading slash to URL:', normalizedUrl, '->', absoluteUrl);
    return absoluteUrl;
  };

  const downloadMaterial = async () => {
    // Check access type and enforce restrictions
    if (material.accessType === 'paid') {
      // Check if user has purchased this material
      try {
        const checkResponse = await fetch(`/api/payments/check-purchase/${material.id}`, {
          headers: authService.getAuthHeaders()
        });
        
        if (checkResponse.ok) {
          const checkData = await checkResponse.json();
          if (!checkData.hasPurchased) {
            toast.error('Payment Required', {
              description: `Please purchase this material (₹${material.price || 0}) to download it.`
            });
            return;
          }
        } else {
          toast.error('Payment Required', {
            description: `Please purchase this material (₹${material.price || 0}) to download it.`
          });
          return;
        }
      } catch (error) {
        console.error('Error checking purchase status:', error);
        toast.error('Payment Required', {
          description: `Please purchase this material (₹${material.price || 0}) to download it.`
        });
        return;
      }

      // Generate secure download link for paid materials
      try {
        const linkResponse = await fetch('/api/payments/generate-download-link', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authService.getAuthHeaders()
          },
          body: JSON.stringify({ materialId: material.id })
        });

        if (linkResponse.ok) {
          const linkData = await linkResponse.json();
          // Force download instead of opening in new tab
          const filename = material.title ? `${material.title}.pdf` : 'material.pdf';
          await downloadFile(linkData.downloadUrl, filename);
          toast.success('Download Started', {
            description: 'Your file is downloading.'
          });
          return;
        } else {
          const errorData = await linkResponse.json().catch(() => ({}));
          toast.error('Download Failed', {
            description: errorData.error || 'Failed to generate download link. Please try again.'
          });
          return;
        }
      } catch (error) {
        console.error('Error generating secure download link:', error);
        toast.error('Download Failed', {
          description: 'Failed to generate download link. Please try again.'
        });
        return;
      }
    } else if (material.accessType === 'drive_protected') {
      // Drive protected materials require Google Drive URL
      if (!material.googleDriveUrl) {
        toast.error('Access Restricted', {
          description: 'This material requires Google Drive access.'
        });
        return;
      }
      // For drive protected, use the googleDriveUrl
      if (material.googleDriveUrl) {
        window.open(material.googleDriveUrl, '_blank');
        toast.success('Opening Google Drive', {
          description: 'Material is opening in Google Drive.'
        });
        return;
      }
    }

    // Free materials can proceed with normal download
    const absoluteUrl = getAbsoluteUrl(material.url);
    try {
      setIsDownloadRecording(true);
      const response = await fetch(`/api/materials/${material.id}/download`, {
        method: 'POST',
        headers: authService.getAuthHeaders()
      });
      
      if (response.status === 403) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.requiresPayment) {
          toast.error('Payment Required', {
            description: 'Please purchase this material to download it.'
          });
          return;
        }
      }
      
      if (response.ok) {
        const data = await response.json().catch(() => null);
        if (data?.material) {
          const stats = {
            downloads: data.material.downloads ?? currentDownloads + 1,
            rating: data.material.rating ?? currentRating,
            ratingCount: data.material.ratingCount ?? currentRatingCount
          };
          setCurrentDownloads(stats.downloads ?? currentDownloads);
          setCurrentRating(stats.rating ?? currentRating);
          setCurrentRatingCount(stats.ratingCount ?? currentRatingCount);
          onStatsUpdate?.(material.id, stats);
        }
        
        // Check if response contains driveUrl for drive protected materials
        if (data?.driveUrl) {
          window.open(data.driveUrl, '_blank');
          toast.success('Opening Google Drive', {
            description: 'Material is opening in Google Drive.'
          });
          return;
        }
      }
    } catch (error) {
      console.error('Failed to record download:', error);
    } finally {
      setIsDownloadRecording(false);
    }
    
    // For free materials, proceed with direct download
    const filename = `${material.title}.${material.type === 'pdf' ? 'pdf' : material.type === 'video' ? 'mp4' : ''}`;
    await downloadFile(absoluteUrl, filename);
    toast.success('Download started');
  };

  const getMaterialIcon = () => {
    switch (material.type.toLowerCase()) {
      case 'pdf':
        return <FileText className="h-5 w-5" />;
      case 'video':
        return <Video className="h-5 w-5" />;
      default:
        return <BookOpen className="h-5 w-5" />;
    }
  };

  const handleRateMaterial = async (value: number) => {
    if (isRatingSubmitting) return;
    setIsRatingSubmitting(true);
    try {
      const response = await fetch(`/api/materials/${material.id}/rate`, {
        method: 'POST',
        headers: {
          ...authService.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rating: value })
      });
      if (!response.ok) {
        throw new Error('Failed to submit rating');
      }
      const data = await response.json().catch(() => null);
      const stats = data?.material ? {
        downloads: data.material.downloads ?? currentDownloads,
        rating: data.material.rating ?? value,
        ratingCount: data.material.ratingCount ?? (currentRatingCount + 1)
      } : {
        rating: value,
        ratingCount: currentRatingCount + 1
      };
      setCurrentDownloads(stats.downloads ?? currentDownloads);
      setCurrentRating(stats.rating ?? value);
      setCurrentRatingCount(stats.ratingCount ?? (currentRatingCount + 1));
      setUserRating(value);
      toast.success('Thanks for rating!');
      onStatsUpdate?.(material.id, stats);
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast.error('Unable to submit rating. Please try again.');
    } finally {
      setIsRatingSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const renderViewer = () => {
    // Check access type and enforce restrictions
    if (material.accessType === 'paid') {
      if (hasPurchased === null) {
        return (
          <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
            <p className="text-gray-500">Checking access...</p>
          </div>
        );
      }
      
      if (!hasPurchased) {
        return (
          <div className="flex flex-col items-center justify-center h-64 bg-gray-100 rounded-lg p-6">
            <Lock className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-semibold text-gray-700 mb-2">Payment Required</p>
            <p className="text-gray-500 text-center mb-4">
              Please purchase this material (₹{material.price || 0}) to view it.
            </p>
            <Button onClick={downloadMaterial} variant="default">
              Purchase Material
            </Button>
          </div>
        );
      }
    } else if (material.accessType === 'drive_protected') {
      // For drive protected materials, redirect to Google Drive
      if (material.googleDriveUrl) {
        return (
          <div className="flex flex-col items-center justify-center h-64 bg-gray-100 rounded-lg p-6">
            <ExternalLink className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-semibold text-gray-700 mb-2">Google Drive Material</p>
            <p className="text-gray-500 text-center mb-4">
              This material is available on Google Drive.
            </p>
            <Button 
              onClick={() => window.open(material.googleDriveUrl, '_blank')} 
              variant="default"
            >
              Open in Google Drive
            </Button>
          </div>
        );
      } else {
        return (
          <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
            <p className="text-gray-500">Google Drive URL not available</p>
          </div>
        );
      }
    }
    
    // Free materials can be viewed normally. Paid: view-only with copy protection.
    const absoluteUrl = getAbsoluteUrl(material.url);
    const isPaidViewOnly = material.accessType === 'paid';
    const viewerWrapperProps = isPaidViewOnly ? {
      className: 'select-none',
      onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
      style: { userSelect: 'none' as const }
    } : {};
    
    if (material.type.toLowerCase() === 'pdf') {
      return (
        <div {...viewerWrapperProps}>
        <PDFViewer
          url={absoluteUrl}
          title={material.title}
          materialId={material.id}
          onProgressUpdate={handleProgressUpdate}
          initialProgress={progress}
          initialTimeSpent={timeSpent}
          initialLastPosition={lastPosition}
          onBookmarkToggle={handleBookmarkToggle}
          initialBookmarked={bookmarked}
        />
        </div>
      );
    } else if (material.type.toLowerCase() === 'video') {
      return (
        <div {...viewerWrapperProps}>
        <VideoPlayer
          url={absoluteUrl}
          title={material.title}
          materialId={material.id}
          onProgressUpdate={handleProgressUpdate}
          initialProgress={progress}
          initialTimeSpent={timeSpent}
          initialLastPosition={lastPosition}
          initialDuration={0} // You might want to fetch this from the material data
          onBookmarkToggle={handleBookmarkToggle}
          initialBookmarked={bookmarked}
        />
        </div>
      );
    } else {
      return (
        <Card className="w-full">
          <CardContent className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="text-6xl mb-4">📄</div>
              <p className="text-lg font-semibold mb-2">Unsupported File Type</p>
              <p className="text-gray-600 mb-4">This file type cannot be previewed.</p>
              {material.accessType !== 'paid' && (
                <Button onClick={downloadMaterial} disabled={isDownloadRecording}>
                  <Download className="h-4 w-4 mr-2" />
                  Download File
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      );
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Material Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                {getMaterialIcon()}
              </div>
              <div>
                <CardTitle className="text-xl">{material.title}</CardTitle>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                  <span>{material.subjectName} ({material.subjectCode})</span>
                  <span>•</span>
                  <span>{material.branch} - Sem {material.semester}</span>
                  <span>•</span>
                  <span>{formatDate(material.createdAt)}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Paid materials: view-only, no download button */}
              {material.accessType !== 'paid' && (
                <Button variant="outline" size="sm" onClick={downloadMaterial} disabled={isDownloadRecording}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              )}
              {material.accessType === 'paid' && (
                <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                  View only — no downloads
                </span>
              )}
            </div>
          </div>
          
          {/* Tags */}
          {material.tags && material.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {material.tags.map((tag, index) => (
                <Badge key={index} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          
          {/* Stats */}
          <div className="flex items-center gap-6 mt-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              <span>{currentDownloads} downloads</span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4" />
              <span>{currentRating.toFixed(1)} ({currentRatingCount} ratings)</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{Math.round(timeSpent)} min spent</span>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <p className="text-sm text-gray-600">Rate this material</p>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((value) => {
                  const isActive = value <= (userRating ?? Math.round(currentRating));
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleRateMaterial(value)}
                      disabled={isRatingSubmitting}
                      className={`p-1 rounded transition-colors ${isActive ? 'text-yellow-500' : 'text-gray-300'} ${isRatingSubmitting ? 'cursor-not-allowed opacity-60' : 'hover:text-yellow-500'}`}
                      aria-label={`Rate ${value} star${value > 1 ? 's' : ''}`}
                    >
                      <Star className={`h-5 w-5 ${isActive ? 'fill-yellow-500' : 'fill-transparent'}`} />
                    </button>
                  );
                })}
              </div>
              {userRating ? (
                <span className="text-sm text-gray-600">You rated {userRating}/5</span>
              ) : (
                <span className="text-sm text-gray-400">Tap a star to rate</span>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Material Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="viewer">Viewer</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>
        
        <TabsContent value="viewer" className="mt-4">
          {renderViewer()}
        </TabsContent>
        
        <TabsContent value="details" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Material Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm text-gray-600 uppercase tracking-wide">Description</h4>
                <p className="mt-1 text-gray-900">{material.description || 'No description available.'}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-sm text-gray-600 uppercase tracking-wide">Subject</h4>
                  <p className="mt-1 text-gray-900">{material.subjectName}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-600 uppercase tracking-wide">Subject Code</h4>
                  <p className="mt-1 text-gray-900">{material.subjectCode}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-600 uppercase tracking-wide">Branch</h4>
                  <p className="mt-1 text-gray-900">{material.branch}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-600 uppercase tracking-wide">Semester</h4>
                  <p className="mt-1 text-gray-900">{material.semester}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-600 uppercase tracking-wide">Type</h4>
                  <p className="mt-1 text-gray-900 capitalize">{material.type}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-600 uppercase tracking-wide">Uploaded</h4>
                  <p className="mt-1 text-gray-900">{formatDate(material.createdAt)}</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-sm text-gray-600 uppercase tracking-wide">Progress</h4>
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Completion</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Time spent: {Math.round(timeSpent)} minutes</span>
                    <span>Last position: {Math.round(lastPosition)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MaterialViewer;
