import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Slider } from './ui/slider';
import { 
  Bookmark, 
  BookmarkCheck, 
  Download, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  RotateCw,
  SkipBack,
  SkipForward
} from 'lucide-react';
import { toast } from 'sonner';

interface VideoPlayerProps {
  url: string;
  title: string;
  materialId: string;
  onProgressUpdate?: (progress: number, timeSpent: number, lastPosition: number) => void;
  initialProgress?: number;
  initialTimeSpent?: number;
  initialLastPosition?: number;
  initialDuration?: number;
  onBookmarkToggle?: (bookmarked: boolean) => void;
  initialBookmarked?: boolean;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  url,
  title,
  materialId,
  onProgressUpdate,
  initialProgress = 0,
  initialTimeSpent = 0,
  initialLastPosition = 0,
  initialDuration = 0,
  onBookmarkToggle,
  initialBookmarked = false
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(initialLastPosition);
  const [duration, setDuration] = useState<number>(initialDuration);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [bookmarked, setBookmarked] = useState<boolean>(initialBookmarked);
  const [progress, setProgress] = useState<number>(initialProgress);
  const [timeSpent, setTimeSpent] = useState<number>(initialTimeSpent);
  const [showControls, setShowControls] = useState<boolean>(true);
  
  const startTimeRef = useRef<number>(Date.now());
  const progressUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      if (initialLastPosition > 0) {
        video.currentTime = initialLastPosition;
        setCurrentTime(initialLastPosition);
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      
      // Calculate progress
      const currentProgress = duration > 0 ? (video.currentTime / duration) * 100 : 0;
      setProgress(currentProgress);
      
      // Update parent component
      if (onProgressUpdate) {
        onProgressUpdate(currentProgress, timeSpent, video.currentTime);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(100);
      if (onProgressUpdate) {
        onProgressUpdate(100, timeSpent, duration);
      }
      toast.success('Video completed');
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [duration, timeSpent, initialLastPosition, onProgressUpdate]);

  useEffect(() => {
    // Start tracking time spent when video starts playing
    if (isPlaying) {
      startTimeRef.current = Date.now();
      
      progressUpdateIntervalRef.current = setInterval(() => {
        const currentTime = Date.now();
        const sessionTime = (currentTime - startTimeRef.current) / 1000 / 60; // minutes
        const totalTimeSpent = initialTimeSpent + sessionTime;
        setTimeSpent(totalTimeSpent);
      }, 30000); // Update every 30 seconds
    } else {
      if (progressUpdateIntervalRef.current) {
        clearInterval(progressUpdateIntervalRef.current);
      }
    }

    return () => {
      if (progressUpdateIntervalRef.current) {
        clearInterval(progressUpdateIntervalRef.current);
      }
    };
  }, [isPlaying, initialTimeSpent]);

  useEffect(() => {
    // Auto-hide controls after 3 seconds of inactivity
    if (showControls) {
      hideControlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }

    return () => {
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
    };
  }, [showControls]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  };

  const handleSeek = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;

    const newTime = value[0];
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = value[0];
    setVolume(newVolume);
    video.volume = newVolume;
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isMuted) {
      video.volume = volume;
      setIsMuted(false);
    } else {
      video.volume = 0;
      setIsMuted(true);
    }
  };

  const changePlaybackRate = (rate: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const skipBackward = () => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = Math.max(0, video.currentTime - 10);
  };

  const skipForward = () => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = Math.min(duration, video.currentTime + 10);
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;

    if (!document.fullscreenElement) {
      video.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const toggleBookmark = () => {
    const newBookmarked = !bookmarked;
    setBookmarked(newBookmarked);
    if (onBookmarkToggle) {
      onBookmarkToggle(newBookmarked);
    }
    toast.success(newBookmarked ? 'Bookmarked' : 'Removed from bookmarks');
  };

  const downloadVideo = () => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Download started');
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleMouseMove = () => {
    setShowControls(true);
  };

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
            <Button variant="outline" size="sm" onClick={downloadVideo}>
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
      </CardHeader>
      
      <CardContent>
        <div 
          className="relative bg-black rounded-lg overflow-hidden"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setShowControls(false)}
        >
          <video
            ref={videoRef}
            src={url}
            className="w-full h-auto"
            poster=""
            preload="metadata"
          />
          
          {/* Video Controls Overlay */}
          {showControls && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              {/* Progress Bar */}
              <div className="mb-4">
                <Slider
                  value={[currentTime]}
                  max={duration}
                  step={1}
                  onValueChange={handleSeek}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-white mt-1">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
              
              {/* Control Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={skipBackward}
                    className="text-white hover:bg-white/20"
                  >
                    <SkipBack className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={togglePlay}
                    className="text-white hover:bg-white/20"
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={skipForward}
                    className="text-white hover:bg-white/20"
                  >
                    <SkipForward className="h-4 w-4" />
                  </Button>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleMute}
                      className="text-white hover:bg-white/20"
                    >
                      {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </Button>
                    
                    <div className="w-20">
                      <Slider
                        value={[isMuted ? 0 : volume]}
                        max={1}
                        step={0.1}
                        onValueChange={handleVolumeChange}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <select
                    value={playbackRate}
                    onChange={(e) => changePlaybackRate(parseFloat(e.target.value))}
                    className="bg-black/50 text-white text-sm rounded px-2 py-1"
                  >
                    <option value={0.5}>0.5x</option>
                    <option value={0.75}>0.75x</option>
                    <option value={1}>1x</option>
                    <option value={1.25}>1.25x</option>
                    <option value={1.5}>1.5x</option>
                    <option value={2}>2x</option>
                  </select>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleFullscreen}
                    className="text-white hover:bg-white/20"
                  >
                    <Maximize className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Completion Button */}
        {progress >= 90 && (
          <div className="flex justify-center mt-4">
            <Button 
              onClick={() => {
                setProgress(100);
                if (onProgressUpdate) {
                  onProgressUpdate(100, timeSpent, duration);
                }
                toast.success('Marked as completed');
              }} 
              className="bg-green-600 hover:bg-green-700"
            >
              Mark as Completed
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VideoPlayer;
