import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { FileText, Video, BookOpen, Download, Star, Clock, Eye } from 'lucide-react';
import PDFViewer from './PDFViewer';
import VideoPlayer from './VideoPlayer';
import { toast } from 'sonner';
import { authService } from '@/lib/auth';

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
    if (!url) return '';
    // If already absolute (starts with http:// or https://), return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    // If relative, make it absolute using current origin
    if (url.startsWith('/')) {
      return `${window.location.origin}${url}`;
    }
    // If no leading slash, add it
    return `${window.location.origin}/${url}`;
  };

  const downloadMaterial = async () => {
    const absoluteUrl = getAbsoluteUrl(material.url);
    try {
      setIsDownloadRecording(true);
      const response = await fetch(`/api/materials/${material.id}/download`, {
        method: 'POST',
        headers: authService.getAuthHeaders()
      });
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
      }
    } catch (error) {
      console.error('Failed to record download:', error);
    } finally {
      setIsDownloadRecording(false);
    const link = document.createElement('a');
    link.href = absoluteUrl;
    link.download = `${material.title}.${material.type === 'pdf' ? 'pdf' : 'mp4'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Download started');
    }
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
    const absoluteUrl = getAbsoluteUrl(material.url);
    
    if (material.type.toLowerCase() === 'pdf') {
      return (
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
      );
    } else if (material.type.toLowerCase() === 'video') {
      return (
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
      );
    } else {
      return (
        <Card className="w-full">
          <CardContent className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="text-6xl mb-4">📄</div>
              <p className="text-lg font-semibold mb-2">Unsupported File Type</p>
              <p className="text-gray-600 mb-4">This file type cannot be previewed.</p>
              <Button onClick={downloadMaterial} disabled={isDownloadRecording}>
                <Download className="h-4 w-4 mr-2" />
                Download File
              </Button>
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
              <Button variant="outline" size="sm" onClick={downloadMaterial} disabled={isDownloadRecording}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
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
