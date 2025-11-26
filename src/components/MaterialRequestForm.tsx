import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { 
  Send, 
  FileText, 
  Video, 
  BookOpen, 
  AlertCircle,
  CheckCircle,
  Clock,
  Users,
  Star
} from 'lucide-react';
import { toast } from 'sonner';

interface Subject {
  id: string;
  name: string;
  code: string;
  branch: string;
  semester: number;
}

interface MaterialRequest {
  id: string;
  title: string;
  description: string;
  materialType: string;
  priority: string;
  status: string;
  upvotes: number;
  createdAt: string;
  subjectName: string;
  subjectCode: string;
}

interface MaterialRequestFormProps {
  subjects: Subject[];
  onRequestSubmitted?: (request: MaterialRequest) => void;
}

const MaterialRequestForm: React.FC<MaterialRequestFormProps> = ({
  subjects,
  onRequestSubmitted
}) => {
  const [formData, setFormData] = useState({
    subjectId: '',
    title: '',
    description: '',
    materialType: 'pdf',
    priority: 'medium',
    tags: ''
  });
  const [loading, setLoading] = useState(false);
  const [recentRequests, setRecentRequests] = useState<MaterialRequest[]>([]);
  const [popularRequests, setPopularRequests] = useState<MaterialRequest[]>([]);

  useEffect(() => {
    fetchRecentRequests();
    fetchPopularRequests();
  }, []);

  const fetchRecentRequests = async () => {
    try {
      const response = await fetch('/api/material-requests/my-requests', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const requests = await response.json();
        setRecentRequests(requests.slice(0, 5));
      }
    } catch (error) {
      console.error('Error fetching recent requests:', error);
    }
  };

  const fetchPopularRequests = async () => {
    try {
      const response = await fetch('/api/material-requests/popular?limit=5');
      if (response.ok) {
        const requests = await response.json();
        setPopularRequests(requests);
      }
    } catch (error) {
      console.error('Error fetching popular requests:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subjectId || !formData.title) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const selectedSubject = subjects.find(s => s.id === formData.subjectId);
      if (!selectedSubject) {
        toast.error('Selected subject not found');
        return;
      }

      const response = await fetch('/api/material-requests/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          subjectId: formData.subjectId,
          subjectName: selectedSubject.name,
          subjectCode: selectedSubject.code,
          title: formData.title,
          description: formData.description,
          materialType: formData.materialType,
          priority: formData.priority,
          tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
        })
      });

      if (response.ok) {
        const newRequest = await response.json();
        toast.success('Material request submitted successfully!');
        
        // Reset form
        setFormData({
          subjectId: '',
          title: '',
          description: '',
          materialType: 'pdf',
          priority: 'medium',
          tags: ''
        });
        
        // Refresh recent requests
        fetchRecentRequests();
        
        if (onRequestSubmitted) {
          onRequestSubmitted(newRequest);
        }
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to submit request');
      }
    } catch (error) {
      console.error('Error submitting request:', error);
      toast.error('Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  const getMaterialIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'pdf':
        return <FileText className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
      default:
        return <BookOpen className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'fulfilled':
        return 'bg-green-100 text-green-800';
      case 'approved':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'fulfilled':
        return <CheckCircle className="h-3 w-3" />;
      case 'approved':
        return <CheckCircle className="h-3 w-3" />;
      case 'pending':
        return <Clock className="h-3 w-3" />;
      case 'rejected':
        return <AlertCircle className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Request Form */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Request New Material
            </CardTitle>
            <p className="text-sm text-gray-600">
              Can't find the material you need? Request it and our team will work on making it available.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject *</Label>
                  <Select value={formData.subjectId} onValueChange={(value) => handleInputChange('subjectId', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name} ({subject.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="materialType">Material Type</Label>
                  <Select value={formData.materialType} onValueChange={(value) => handleInputChange('materialType', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF Document</SelectItem>
                      <SelectItem value="video">Video Lecture</SelectItem>
                      <SelectItem value="notes">Study Notes</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Material Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="e.g., Data Structures and Algorithms - Chapter 5"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Provide more details about the material you need..."
                  rows={3}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={formData.priority} onValueChange={(value) => handleInputChange('priority', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    value={formData.tags}
                    onChange={(e) => handleInputChange('tags', e.target.value)}
                    placeholder="e.g., algorithms, sorting, complexity"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Request
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Recent Requests */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Recent Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {recentRequests.length > 0 ? (
              <div className="space-y-3">
                {recentRequests.map((request) => (
                  <div key={request.id} className="p-3 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getMaterialIcon(request.materialType)}
                        <span className="font-medium text-sm">{request.title}</span>
                      </div>
                      <Badge className={getStatusColor(request.status)}>
                        {getStatusIcon(request.status)}
                        <span className="ml-1">{request.status}</span>
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span>{request.subjectName}</span>
                      <span>{new Date(request.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600 text-center py-4">
                No recent requests
              </p>
            )}
          </CardContent>
        </Card>

        {/* Popular Requests */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="h-4 w-4" />
              Popular Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            {popularRequests.length > 0 ? (
              <div className="space-y-3">
                {popularRequests.map((request) => (
                  <div key={request.id} className="p-3 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getMaterialIcon(request.materialType)}
                        <span className="font-medium text-sm">{request.title}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <Users className="h-3 w-3" />
                        <span>{request.upvotes}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span>{request.subjectName}</span>
                      <Badge className={getPriorityColor(request.priority)}>
                        {request.priority}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600 text-center py-4">
                No popular requests
              </p>
            )}
          </CardContent>
        </Card>

        {/* Tips */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tips for Better Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                Be specific about the material you need
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                Include relevant tags for better categorization
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                Set appropriate priority level
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                Check existing requests before creating new ones
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MaterialRequestForm;
