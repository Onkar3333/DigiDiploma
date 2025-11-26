import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  Bell, 
  Pin, 
  Eye, 
  Edit, 
  Trash2, 
  Calendar,
  Users,
  AlertTriangle,
  Info,
  CheckCircle,
  Clock,
  Filter,
  Search
} from 'lucide-react';
import { toast } from 'sonner';
import { authService } from '@/lib/auth';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuth } from '@/contexts/AuthContext';

interface Notice {
  _id: string;
  id?: string;
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
  readBy: Array<{ user: string; readAt: string }>;
  createdAt: string;
  createdBy: { name: string; email: string };
}

const AdminNoticeManager = () => {
  // Authenticated fetch with token refresh fallback
  const authenticatedFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const addAuth = () => ({
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}), ...authService.getAuthHeaders() }
    });
    let res = await fetch(input, addAuth());
    if (res.status === 401) {
      try {
        await authService.refreshToken();
        res = await fetch(input, addAuth());
      } catch {}
    }
    return res;
  };

  const { user } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [stats, setStats] = useState({
    totalNotices: 0,
    activeNotices: 0,
    pinnedNotices: 0,
    urgentNotices: 0
  });

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'general' as 'general' | 'important' | 'urgent' | 'announcement' | 'maintenance',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    targetAudience: 'all' as 'all' | 'students' | 'admins' | 'specific_branch',
    targetBranch: '',
    isPinned: false,
    expiresAt: ''
  });

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

  const fetchNotices = async () => {
    try {
      // Fetch all notices without pagination limit
      const response = await authenticatedFetch('/api/notices?page=1&limit=1000');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      console.log('📋 AdminNoticeManager: Raw API response:', data);
      console.log('📋 AdminNoticeManager: Notices array:', data.notices);
      console.log('📋 AdminNoticeManager: Total notices:', data.total);
      
      // Handle both paginated response and direct array response
      const noticesArray = Array.isArray(data) ? data : (data.notices || []);
      
      // Ensure all notices have required fields with defaults and normalized IDs
      const normalizedNotices = noticesArray.map((notice: any) => {
        const nid = notice._id || notice.id;
        if (!nid) {
          console.warn('⚠️ Notice missing ID:', notice);
        }
        return {
          ...notice,
          _id: nid,
          id: nid,
          readBy: notice.readBy || [],
          views: notice.views || 0,
          isActive: notice.isActive !== undefined ? notice.isActive : true,
          isPinned: notice.isPinned || false,
          createdAt: notice.createdAt || new Date().toISOString()
        };
      });
      
      console.log('📋 AdminNoticeManager: Normalized notices count:', normalizedNotices.length);
      console.log('📋 AdminNoticeManager: Normalized notices:', normalizedNotices);
      
      // Always update with new data if we got any, otherwise preserve existing if we have some
      setNotices(prev => {
        if (normalizedNotices.length > 0) {
          return normalizedNotices;
        } else if (prev.length === 0) {
          // Only clear if we have no existing notices
          return [];
        }
        return prev; // Keep existing notices
      });
    } catch (error) {
      console.error('❌ Error fetching notices:', error);
      toast.error('Failed to fetch notices');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await authenticatedFetch('/api/notices/stats/overview');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Initialize WebSocket for realtime notice updates
  useWebSocket({
    userId: user?.id || '',
    token: authService.getToken() || undefined,
    onMessage: (message) => {
      switch (message.type) {
        case 'notice_published':
        case 'new_notice':
          if (message.notice) {
            const n = message.notice;
            const nid = n._id || n.id;
            const normalized = {
              ...n,
              _id: nid,
              id: nid,
              readBy: n.readBy || [],
              views: n.views || 0,
              isActive: n.isActive !== undefined ? n.isActive : true,
              isPinned: n.isPinned || false,
              createdAt: n.createdAt || new Date().toISOString()
            };
            setNotices(prev => {
              // avoid duplicates by id
              const exists = prev.some(p => (p._id || p.id) === nid);
              return exists ? prev.map(p => ((p._id || p.id) === nid ? { ...p, ...normalized } : p)) : [normalized, ...prev];
            });
            fetchStats();
            toast.success(`New notice: ${message.notice.title}`);
            // Gentle refetch to sync with backend once available, without clearing list on error
            fetchNotices().catch(() => {});
          }
          break;
        case 'notice_updated':
          if (message.notice) {
            const n = message.notice;
            const nid = n._id || n.id;
            const normalized = { ...n, _id: nid, id: nid };
            setNotices(prev => prev.map(item => (item._id === nid ? { ...item, ...normalized } : item)));
            fetchStats();
            toast.info(`Notice updated: ${message.notice.title}`);
          }
          break;
        case 'notice_deleted':
          if (message.noticeId) {
            setNotices(prev => prev.filter(n => n._id !== message.noticeId));
            fetchStats();
            toast.info('Notice deleted');
          }
          break;
      }
    },
    onConnect: () => {
      console.log('AdminNoticeManager WebSocket connected');
    },
    onDisconnect: () => {
      console.log('AdminNoticeManager WebSocket disconnected');
    }
  });

  useEffect(() => {
    fetchNotices();
    fetchStats();
  }, []);

  // Listen for custom events from AdminDashboard
  useEffect(() => {
    const handleNoticeUpdate = () => {
      fetchNotices();
      fetchStats();
    };

    window.addEventListener('notice-updated', handleNoticeUpdate);
    return () => {
      window.removeEventListener('notice-updated', handleNoticeUpdate);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Client-side validation
    if (formData.title.trim().length < 5) {
      toast.error('Title must be at least 5 characters long');
      return;
    }
    
    if (formData.content.trim().length < 10) {
      toast.error('Content must be at least 10 characters long');
      return;
    }
    
    if (formData.targetAudience === 'specific_branch' && !formData.targetBranch?.trim()) {
      toast.error('Target branch is required when audience is "Specific Branch"');
      return;
    }
    
    try {
      const url = editingNotice ? `/api/notices/${editingNotice._id}` : '/api/notices';
      const method = editingNotice ? 'PUT' : 'POST';

      // Prepare the request body - don't send createdBy, the backend will use req.user.id
      const requestBody: any = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        type: formData.type,
        priority: formData.priority,
        targetAudience: formData.targetAudience,
        isPinned: formData.isPinned
      };

      // Only include expiresAt if it's provided and is a valid future date
      if (formData.expiresAt && formData.expiresAt.trim() !== '') {
        const expiresDate = new Date(formData.expiresAt);
        const now = new Date();
        if (expiresDate > now) {
          requestBody.expiresAt = formData.expiresAt;
        } else {
          toast.error('Expiration date must be in the future');
          return;
        }
      }

      // Only include targetBranch if targetAudience is 'specific_branch'
      if (formData.targetAudience === 'specific_branch' && formData.targetBranch?.trim()) {
        requestBody.targetBranch = formData.targetBranch.trim();
      }

      console.log('Sending notice data:', requestBody);

      const response = await authenticatedFetch(url, { method, body: JSON.stringify(requestBody) });

      const responseData = await response.json();

      if (response.ok) {
        toast.success(editingNotice ? 'Notice updated successfully' : 'Notice created successfully');
        setIsDialogOpen(false);
        setEditingNotice(null);
        resetForm();
        // Optimistically insert/update list instead of immediate full refetch.
        const n = responseData;
        const nid = n?._id || n?.id;
        if (nid) {
          const normalized = {
            ...n,
            _id: nid,
            id: nid,
            readBy: n.readBy || [],
            views: n.views || 0,
            isActive: n.isActive !== undefined ? n.isActive : true,
            isPinned: n.isPinned || false,
            createdAt: n.createdAt || new Date().toISOString()
          };
          setNotices(prev => {
            const exists = prev.some(p => (p._id || p.id) === nid);
            return exists ? prev.map(p => ((p._id || p.id) === nid ? { ...p, ...normalized } : p)) : [normalized, ...prev];
          });
        }
        fetchStats();
      } else {
        // Show detailed validation errors
        let errorMessage = responseData.error || responseData.message || 'Failed to save notice';
        if (responseData.details && Array.isArray(responseData.details)) {
          const details = responseData.details.map((d: any) => d.message || d).join(', ');
          errorMessage = `${errorMessage}: ${details}`;
        }
        console.error('Notice save error:', responseData);
        toast.error(errorMessage);
      }
    } catch (error: any) {
      console.error('Error saving notice:', error);
      toast.error(error.message || 'Failed to save notice');
    }
  };

  const handleEdit = (notice: Notice) => {
    setEditingNotice(notice);
    setFormData({
      title: notice.title,
      content: notice.content,
      type: notice.type,
      priority: notice.priority,
      targetAudience: notice.targetAudience,
      targetBranch: notice.targetBranch || '',
      isPinned: notice.isPinned,
      expiresAt: notice.expiresAt ? notice.expiresAt.split('T')[0] : ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this notice?')) return;

    try {
      const response = await authenticatedFetch(`/api/notices/${id}`, { method: 'DELETE' });
      if (response.ok) {
        toast.success('Notice deleted successfully');
        fetchNotices();
        fetchStats();
      } else {
        throw new Error('Failed to delete notice');
      }
    } catch (error) {
      console.error('Error deleting notice:', error);
      toast.error('Failed to delete notice');
    }
  };

  const toggleActive = async (notice: Notice) => {
    try {
      const response = await authenticatedFetch(`/api/notices/${notice._id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !notice.isActive })
      });

      if (response.ok) {
        toast.success(`Notice ${!notice.isActive ? 'activated' : 'deactivated'}`);
        fetchNotices();
        fetchStats();
      } else {
        throw new Error('Failed to update notice');
      }
    } catch (error) {
      console.error('Error updating notice:', error);
      toast.error('Failed to update notice');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      type: 'general' as 'general' | 'important' | 'urgent' | 'announcement' | 'maintenance',
      priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
      targetAudience: 'all' as 'all' | 'students' | 'admins' | 'specific_branch',
      targetBranch: '',
      isPinned: false,
      expiresAt: ''
    });
  };

  // Debug: Log notices state changes
  useEffect(() => {
    console.log('📋 AdminNoticeManager: Notices state updated:', notices.length, 'notices');
    console.log('📋 AdminNoticeManager: Notices:', notices);
  }, [notices]);

  const filteredNotices = notices.filter(notice => {
    const matchesSearch = notice.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notice.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || notice.type === filterType;
    const matchesPriority = filterPriority === 'all' || notice.priority === filterPriority;
    
    return matchesSearch && matchesType && matchesPriority;
  });

  // Debug: Log filtered results
  useEffect(() => {
    console.log('📋 AdminNoticeManager: Filtered notices:', filteredNotices.length, 'notices');
    console.log('📋 AdminNoticeManager: Search term:', searchTerm);
    console.log('📋 AdminNoticeManager: Filter type:', filterType);
    console.log('📋 AdminNoticeManager: Filter priority:', filterPriority);
  }, [filteredNotices, searchTerm, filterType, filterPriority]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Notice Management</h2>
          <p className="text-slate-600 mt-1">Create and manage notices for all users</p>
        </div>
        <Button
          onClick={() => {
            setEditingNotice(null);
            resetForm();
            setIsDialogOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Notice
        </Button>
      </div>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingNotice ? 'Edit Notice' : 'Create New Notice'}
              </DialogTitle>
              <DialogDescription>
                {editingNotice ? 'Update the notice details below.' : 'Fill in the details to create a new notice for users.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    maxLength={200}
                  />
                </div>
                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select value={formData.type} onValueChange={(value: any) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger className="bg-white text-slate-900 border-slate-300">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="general" className="text-slate-900 focus:bg-slate-100">General</SelectItem>
                      <SelectItem value="important" className="text-slate-900 focus:bg-slate-100">Important</SelectItem>
                      <SelectItem value="urgent" className="text-slate-900 focus:bg-slate-100">Urgent</SelectItem>
                      <SelectItem value="announcement" className="text-slate-900 focus:bg-slate-100">Announcement</SelectItem>
                      <SelectItem value="maintenance" className="text-slate-900 focus:bg-slate-100">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="content">Content *</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  required
                  maxLength={2000}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={formData.priority} onValueChange={(value: any) => setFormData({ ...formData, priority: value })}>
                    <SelectTrigger className="bg-white text-slate-900 border-slate-300">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="low" className="text-slate-900 focus:bg-slate-100">Low</SelectItem>
                      <SelectItem value="medium" className="text-slate-900 focus:bg-slate-100">Medium</SelectItem>
                      <SelectItem value="high" className="text-slate-900 focus:bg-slate-100">High</SelectItem>
                      <SelectItem value="critical" className="text-slate-900 focus:bg-slate-100">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="targetAudience">Target Audience</Label>
                  <Select value={formData.targetAudience} onValueChange={(value: any) => setFormData({ ...formData, targetAudience: value })}>
                    <SelectTrigger className="bg-white text-slate-900 border-slate-300">
                      <SelectValue placeholder="Select audience" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="all" className="text-slate-900 focus:bg-slate-100">All Users</SelectItem>
                      <SelectItem value="students" className="text-slate-900 focus:bg-slate-100">Students Only</SelectItem>
                      <SelectItem value="admins" className="text-slate-900 focus:bg-slate-100">Admins Only</SelectItem>
                      <SelectItem value="specific_branch" className="text-slate-900 focus:bg-slate-100">Specific Branch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.targetAudience === 'specific_branch' && (
                <div>
                  <Label htmlFor="targetBranch">Target Branch</Label>
                  <Select 
                    value={formData.targetBranch} 
                    onValueChange={(value: string) => setFormData({ ...formData, targetBranch: value })}
                  >
                    <SelectTrigger className="bg-white text-slate-900 border-slate-300 hover:bg-slate-50">
                      <SelectValue placeholder="Select target branch" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 z-[100]">
                      <SelectItem value="Computer Engineering" className="text-slate-900 focus:bg-slate-100 cursor-pointer">Computer Engineering</SelectItem>
                      <SelectItem value="Information Technology" className="text-slate-900 focus:bg-slate-100 cursor-pointer">Information Technology</SelectItem>
                      <SelectItem value="Electronics & Telecommunication" className="text-slate-900 focus:bg-slate-100 cursor-pointer">Electronics & Telecommunication</SelectItem>
                      <SelectItem value="Mechanical Engineering" className="text-slate-900 focus:bg-slate-100 cursor-pointer">Mechanical Engineering</SelectItem>
                      <SelectItem value="Electrical Engineering" className="text-slate-900 focus:bg-slate-100 cursor-pointer">Electrical Engineering</SelectItem>
                      <SelectItem value="Civil Engineering" className="text-slate-900 focus:bg-slate-100 cursor-pointer">Civil Engineering</SelectItem>
                      <SelectItem value="Automobile Engineering" className="text-slate-900 focus:bg-slate-100 cursor-pointer">Automobile Engineering</SelectItem>
                      <SelectItem value="Instrumentation Engineering" className="text-slate-900 focus:bg-slate-100 cursor-pointer">Instrumentation Engineering</SelectItem>
                      <SelectItem value="Artificial Intelligence & Machine Learning (AIML)" className="text-slate-900 focus:bg-slate-100 cursor-pointer">Artificial Intelligence & Machine Learning (AIML)</SelectItem>
                      <SelectItem value="Mechatronics Engineering" className="text-slate-900 focus:bg-slate-100 cursor-pointer">Mechatronics Engineering</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="expiresAt">Expires At (Optional)</Label>
                  <Input
                    id="expiresAt"
                    type="date"
                    value={formData.expiresAt}
                    onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  />
                </div>
                <div className="flex items-center space-x-2 pt-6">
                  <input
                    type="checkbox"
                    id="isPinned"
                    checked={formData.isPinned}
                    onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="isPinned">Pin this notice</Label>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingNotice ? 'Update Notice' : 'Create Notice'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card key="stats-total">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Bell className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-slate-600">Total Notices</p>
                <p className="text-2xl font-bold text-slate-900">{stats.totalNotices}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card key="stats-active">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-slate-600">Active Notices</p>
                <p className="text-2xl font-bold text-slate-900">{stats.activeNotices}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card key="stats-pinned">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Pin className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm text-slate-600">Pinned Notices</p>
                <p className="text-2xl font-bold text-slate-900">{stats.pinnedNotices}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card key="stats-urgent">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-sm text-slate-600">Urgent Notices</p>
                <p className="text-2xl font-bold text-slate-900">{stats.urgentNotices}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search notices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white text-slate-900 border-slate-300"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full md:w-48 bg-white text-slate-900 border-slate-300 hover:bg-slate-50">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                <SelectItem value="all" className="text-slate-900 focus:bg-slate-100">All Types</SelectItem>
                <SelectItem value="general" className="text-slate-900 focus:bg-slate-100">General</SelectItem>
                <SelectItem value="important" className="text-slate-900 focus:bg-slate-100">Important</SelectItem>
                <SelectItem value="urgent" className="text-slate-900 focus:bg-slate-100">Urgent</SelectItem>
                <SelectItem value="announcement" className="text-slate-900 focus:bg-slate-100">Announcement</SelectItem>
                <SelectItem value="maintenance" className="text-slate-900 focus:bg-slate-100">Maintenance</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-full md:w-48 bg-white text-slate-900 border-slate-300 hover:bg-slate-50">
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                <SelectItem value="all" className="text-slate-900 focus:bg-slate-100">All Priorities</SelectItem>
                <SelectItem value="low" className="text-slate-900 focus:bg-slate-100">Low</SelectItem>
                <SelectItem value="medium" className="text-slate-900 focus:bg-slate-100">Medium</SelectItem>
                <SelectItem value="high" className="text-slate-900 focus:bg-slate-100">High</SelectItem>
                <SelectItem value="critical" className="text-slate-900 focus:bg-slate-100">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notices List */}
      <div className="space-y-4">
        {filteredNotices.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Bell className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No notices found</h3>
              <p className="text-slate-600">Create your first notice to get started.</p>
            </CardContent>
          </Card>
        ) : (
          filteredNotices.map((notice, index) => {
            const TypeIcon = typeIcons[notice.type] || Info;
            // Use _id if available, otherwise fallback to index
            const noticeKey = notice._id || `notice-${index}`;
            return (
              <Card key={noticeKey} className={`${notice.isPinned ? 'ring-2 ring-purple-200' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        {notice.isPinned && <Pin className="w-4 h-4 text-purple-600" />}
                        <TypeIcon className="w-5 h-5 text-slate-600" />
                        <h3 className="text-lg font-semibold text-slate-900">{notice.title}</h3>
                        <Badge className={typeColors[notice.type] || 'bg-gray-100 text-gray-800'}>{notice.type}</Badge>
                        <Badge className={priorityColors[notice.priority] || 'bg-gray-100 text-gray-800'}>{notice.priority}</Badge>
                        {!notice.isActive && <Badge variant="secondary">Inactive</Badge>}
                      </div>
                      
                      <p className="text-slate-600 mb-3 line-clamp-2">{notice.content}</p>
                      
                      <div className="flex items-center space-x-4 text-sm text-slate-500">
                        <div className="flex items-center space-x-1">
                          <Users className="w-4 h-4" />
                          <span>{notice.targetAudience === 'all' ? 'All Users' : notice.targetAudience}</span>
                          {notice.targetBranch && <span>({notice.targetBranch})</span>}
                        </div>
                        <div className="flex items-center space-x-1">
                          <Eye className="w-4 h-4" />
                          <span>{notice.views || 0} views</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>{notice.createdAt ? new Date(notice.createdAt).toLocaleDateString() : 'N/A'}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span>{(notice.readBy && Array.isArray(notice.readBy) ? notice.readBy.length : 0)} read</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleActive(notice)}
                      >
                        {notice.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(notice)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(notice._id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AdminNoticeManager;
