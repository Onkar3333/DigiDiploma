import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Bell, 
  Pin, 
  Eye, 
  Calendar,
  Users,
  AlertTriangle,
  Info,
  CheckCircle,
  Clock,
  X,
  Filter,
  Search,
  Wifi,
  WifiOff
} from 'lucide-react';
import { toast } from 'sonner';
import { authService } from '@/lib/auth';
import { useWebSocket } from '@/hooks/useWebSocket';

export interface Notice {
  _id: string;
  title: string;
  content: string;
  type: 'general' | 'important' | 'urgent' | 'announcement' | 'maintenance';
  priority: 'low' | 'medium' | 'high' | 'critical';
  targetAudience: 'all' | 'students' | 'admins' | 'specific_branch';
  targetBranch?: string;
  isActive: boolean;
  isPinned: boolean;
  expiresAt?: string;
  views: number;
  isRead: boolean;
  createdAt: string;
  createdBy: { name: string; email: string };
}

interface UserNotificationsProps {
  userId: string;
  userBranch?: string;
  userType?: string;
  onSummaryUpdate?: (summary: NoticeSummary) => void;
  onRealtimeEvent?: (message: RealtimeMessage) => void;
}

export interface NoticeSummary {
  total: number;
  unread: number;
  pinned: number;
  latest: Notice | null;
}

interface RealtimeMessage {
  type: string;
  [key: string]: any;
}

const UserNotifications: React.FC<UserNotificationsProps> = ({ 
  userId, 
  userBranch = 'Computer Engineering', 
  userType = 'student',
  onSummaryUpdate,
  onRealtimeEvent
}) => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const typeColors = {
    general: 'bg-blue-100 text-blue-800',
    important: 'bg-yellow-100 text-yellow-800',
    urgent: 'bg-red-100 text-red-800',
    announcement: 'bg-green-100 text-green-800',
    maintenance: 'bg-purple-100 text-purple-800'
  };

  const priorityColors = {
    low: 'bg-gray-100 text-gray-800',
    medium: 'bg-blue-100 text-blue-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800'
  };

  const typeIcons = {
    general: Info,
    important: AlertTriangle,
    urgent: AlertTriangle,
    announcement: CheckCircle,
    maintenance: Clock
  };

  // WebSocket connection for real-time notifications
  const { isConnected, connectionError } = useWebSocket({
    userId,
    token: authService.getToken() || undefined,
    onMessage: (message) => {
      onRealtimeEvent?.(message);
      switch (message.type) {
        case 'maintenance':
          if (message.maintenance) {
            window.location.reload();
          }
          break;
        case 'new_notice':
          setNotices(prev => {
            const next = [message.notice, ...prev];
            return next;
          });
          toast.success(`New ${message.notice.type} notice: ${message.notice.title}`);
          break;
        case 'notice_updated':
          setNotices(prev => 
            prev.map(notice => 
              notice._id === message.notice._id ? { ...notice, ...message.notice } : notice
            )
          );
          toast.info(`Notice updated: ${message.notice.title}`);
          break;
        case 'notice_deleted':
          setNotices(prev => prev.filter(notice => notice._id !== message.noticeId));
          toast.info('A notice has been deleted');
          break;
        case 'authenticated':
          console.log('WebSocket authenticated for user:', message.userId);
          break;
        case 'error':
          console.error('WebSocket error:', message.message);
          break;
      }
    },
    onConnect: () => {
      console.log('WebSocket connected for real-time notifications');
    },
    onDisconnect: () => {
      console.log('WebSocket disconnected');
    },
    onError: (error) => {
      console.error('WebSocket connection error:', error);
    }
  });

  const summarizeNotices = useCallback((list: Notice[]) => {
    if (!onSummaryUpdate) return;
    const unread = list.filter(n => !n.isRead).length;
    const pinned = list.filter(n => n.isPinned).length;
    const latest = list.reduce<Notice | null>((acc, notice) => {
      if (!notice) return acc;
      if (!acc) return notice;
      const currentTime = new Date(notice.createdAt).getTime();
      const accTime = new Date(acc.createdAt).getTime();
      return currentTime > accTime ? notice : acc;
    }, null);
    onSummaryUpdate({
      total: list.length,
      unread,
      pinned,
      latest
    });
  }, [onSummaryUpdate]);

  useEffect(() => {
    fetchNotices();
  }, [userId]);

  useEffect(() => {
    summarizeNotices(notices);
  }, [notices, summarizeNotices]);

  const fetchNotices = async () => {
    try {
      const response = await fetch(`/api/notices/user/${userId}`, {
        headers: authService.getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        // Ensure data is an array
        setNotices(Array.isArray(data) ? data : []);
      } else if (response.status === 404) {
        // Route not found - return empty array (no notices available)
        console.warn('Notices endpoint not found, returning empty array');
        setNotices([]);
      } else {
        console.error('Failed to fetch notices:', response.status, response.statusText);
        setNotices([]); // Set empty array instead of throwing error
      }
    } catch (error) {
      console.error('Error fetching notices:', error);
      // Don't show error toast, just set empty array
      setNotices([]);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (noticeId: string) => {
    try {
      const response = await fetch(`/api/notices/${noticeId}/read`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...authService.getAuthHeaders()
        },
        body: JSON.stringify({ userId })
      });

      if (response.ok) {
        setNotices(prev => 
          prev.map(notice => 
            notice._id === noticeId ? { ...notice, isRead: true } : notice
          )
        );
      }
    } catch (error) {
      console.error('Error marking notice as read:', error);
    }
  };

  const openNotice = (notice: Notice) => {
    setSelectedNotice(notice);
    setIsDialogOpen(true);
    if (!notice.isRead) {
      markAsRead(notice._id);
    }
  };

  const filteredNotices = notices.filter(notice => {
    const matchesSearch = notice.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notice.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || notice.type === filterType;
    
    return matchesSearch && matchesType;
  });

  const unreadCount = notices.filter(notice => !notice.isRead).length;
  const pinnedNotices = filteredNotices.filter(notice => notice.isPinned);
  const regularNotices = filteredNotices.filter(notice => !notice.isPinned);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Bell className="w-6 h-6 text-blue-600" />
          <h3 className="text-xl font-semibold text-slate-900">Notifications</h3>
          {unreadCount > 0 && (
            <Badge className="bg-red-100 text-red-800">
              {unreadCount} new
            </Badge>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {isConnected ? (
            <div className="flex items-center space-x-1 text-green-600">
              <Wifi className="w-4 h-4" />
              <span className="text-xs">Live</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1 text-red-600">
              <WifiOff className="w-4 h-4" />
              <span className="text-xs">Offline</span>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search notifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="general">General</option>
              <option value="important">Important</option>
              <option value="urgent">Urgent</option>
              <option value="announcement">Announcement</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Notices */}
      {filteredNotices.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Bell className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No notifications</h3>
            <p className="text-slate-600">You're all caught up! Check back later for new updates.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* Pinned Notices */}
          {pinnedNotices.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-700 flex items-center">
                <Pin className="w-4 h-4 mr-2 text-purple-600" />
                Pinned Notices
              </h4>
              {pinnedNotices.map((notice) => {
                const TypeIcon = typeIcons[notice.type] || Info;
                return (
                  <NoticeCard
                    key={notice._id}
                    notice={notice}
                    typeIcon={TypeIcon}
                    typeColors={typeColors}
                    priorityColors={priorityColors}
                    onOpen={openNotice}
                  />
                );
              })}
            </div>
          )}

          {/* Regular Notices */}
          {regularNotices.length > 0 && (
            <div className="space-y-3">
              {pinnedNotices.length > 0 && (
                <h4 className="text-sm font-semibold text-slate-700">Recent Notices</h4>
              )}
              {regularNotices.map((notice) => {
                const TypeIcon = typeIcons[notice.type] || Info;
                return (
                  <NoticeCard
                    key={notice._id}
                    notice={notice}
                    typeIcon={TypeIcon}
                    typeColors={typeColors}
                    priorityColors={priorityColors}
                    onOpen={openNotice}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Notice Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold">
                {selectedNotice?.title}
              </DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDialogOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DialogHeader>
          
          {selectedNotice && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                {selectedNotice.isPinned && <Pin className="w-4 h-4 text-purple-600" />}
                <Badge className={typeColors[selectedNotice.type]}>
                  {selectedNotice.type}
                </Badge>
                <Badge className={priorityColors[selectedNotice.priority]}>
                  {selectedNotice.priority}
                </Badge>
                {!selectedNotice.isRead && (
                  <Badge className="bg-blue-100 text-blue-800">New</Badge>
                )}
              </div>
              
              <div className="prose max-w-none">
                <p className="text-slate-700 whitespace-pre-wrap">
                  {selectedNotice.content}
                </p>
              </div>
              
              <div className="flex items-center justify-between text-sm text-slate-500 pt-4 border-t">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <Users className="w-4 h-4" />
                    <span>
                      {selectedNotice.targetAudience === 'all' ? 'All Users' : selectedNotice.targetAudience}
                      {selectedNotice.targetBranch && ` (${selectedNotice.targetBranch})`}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(selectedNotice.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <Eye className="w-4 h-4" />
                  <span>{selectedNotice.views} views</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Notice Card Component
const NoticeCard: React.FC<{
  notice: Notice;
  typeIcon?: any;
  typeColors: any;
  priorityColors: any;
  onOpen: (notice: Notice) => void;
}> = ({ notice, typeIcon, typeColors, priorityColors, onOpen }) => {
  const IconToRender = typeIcon || Info;
  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
        !notice.isRead ? 'ring-2 ring-blue-200 bg-blue-50/30' : ''
      }`}
      onClick={() => onOpen(notice)}
    >
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <IconToRender className="w-5 h-5 text-slate-600 mt-0.5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              {notice.isPinned && <Pin className="w-3 h-3 text-purple-600" />}
              <h4 className="text-sm font-semibold text-slate-900 truncate">
                {notice.title}
              </h4>
              <Badge className={`text-xs ${typeColors[notice.type]}`}>
                {notice.type}
              </Badge>
              <Badge className={`text-xs ${priorityColors[notice.priority]}`}>
                {notice.priority}
              </Badge>
            </div>
            <p className="text-sm text-slate-600 line-clamp-2 mb-2">
              {notice.content}
            </p>
            <div className="flex items-center space-x-3 text-xs text-slate-500">
              <span>{new Date(notice.createdAt).toLocaleDateString()}</span>
              <span>•</span>
              <span>
                {notice.targetAudience === 'all' ? 'All Users' : notice.targetAudience}
                {notice.targetBranch && ` (${notice.targetBranch})`}
              </span>
            </div>
          </div>
          {!notice.isRead && (
            <div className="flex-shrink-0">
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default UserNotifications;
