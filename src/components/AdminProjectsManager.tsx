import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { authService } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { normalizeMaterialUrls } from '@/lib/urlUtils';
import {
  Code, Search, Upload, Download, Eye, Star, Github, CheckCircle, X, Clock,
  FileText, Image as ImageIcon, Video, Plus, Trash2, Edit, ExternalLink
} from 'lucide-react';

const ADMIN_ACADEMIC_YEARS = ["2022-23", "2023-24", "2024-25", "2025-26"];
const ADMIN_PROJECT_TYPES = [
  { label: "Mini Project", value: "mini" },
  { label: "Final Year Project", value: "final" }
];
const ADMIN_SUBJECT_OPTIONS = [
  "Computer Engineering",
  "Information Technology",
  "Electronics & Telecommunication",
  "Electrical Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Artificial Intelligence & Machine Learning",
  "Automation & Robotics",
  "IoT / Embedded Systems",
  "Cybersecurity / Networking",
  "Other"
];

// Utility function to convert R2 URLs to proxy URLs
const getProxyUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  
  // Check if it's already a proxy URL
  if (url.includes('/api/materials/proxy/')) {
    return url;
  }
  
  // Check if it's an R2 URL
  if (url.includes('r2.cloudflarestorage.com')) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      
      // Extract the key from pathname (e.g., /digidiploma/materials/file.jpg -> materials/file.jpg)
      const pathParts = pathname.split('/').filter(Boolean);
      
      let key = '';
      if (pathParts.length > 0) {
        // Find 'materials' in the path and get everything after it
        const materialsIndex = pathParts.findIndex(p => p === 'materials');
        if (materialsIndex !== -1) {
          // Get everything from 'materials' onwards
          key = pathParts.slice(materialsIndex).join('/');
        } else {
          // If no 'materials' found, check if first part is bucket name
          if (pathParts[0] === 'digidiploma' && pathParts.length > 1) {
            // Skip bucket name, use rest
            key = pathParts.slice(1).join('/');
            // If it doesn't start with 'materials/', add it
            if (!key.startsWith('materials/')) {
              key = 'materials/' + key;
            }
          } else {
            // Use all parts, but ensure it starts with 'materials/'
            key = pathParts.join('/');
            if (!key.startsWith('materials/')) {
              key = 'materials/' + key;
            }
          }
        }
      }
      
      if (key) {
        return `/api/materials/proxy/r2/${encodeURIComponent(key)}`;
      }
    } catch (e) {
      console.error('Error parsing R2 URL:', e, url);
    }
  }
  
  return url;
};

interface Project {
  id: string;
  title: string;
  description: string;
  category: string;
  techStack: string[];
  branch: string;
  semester: number;
  studentName: string;
  status: string;
  isAdminProject: boolean;
  pdfUrl?: string;
  imageUrls?: string[];
  videoUrl?: string;
  githubLink?: string;
  createdAt: string;
  coverPhoto?: string | null;
  simulationLink?: string;
  academicYear?: string;
  projectCategory?: string;
}

interface ProjectRequest {
  id: string;
  name: string;
  email: string;
  phone?: string;
  branch: string;
  semester: string;
  projectIdea: string;
  description?: string;
  requiredTools?: string;
  deadline?: string;
  notes?: string;
  status: string;
  workflowStatus?: string;
  createdAt: string;
}

const AdminProjectsManager = () => {
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [requests, setRequests] = useState<ProjectRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    category: ADMIN_SUBJECT_OPTIONS[0],
    techStack: '',
    githubLink: '',
    demoLink: '',
    pdfUrl: '',
    imageUrls: '',
    videoUrl: '',
    projectType: ADMIN_PROJECT_TYPES[0].value,
    coverPhotoUrl: '',
    simulationLink: '',
    projectCategory: ADMIN_PROJECT_TYPES[0].value
  });
  const [uploadAssets, setUploadAssets] = useState<{
    documentFile: File | null;
    coverPhoto: File | null;
  }>({
    documentFile: null,
    coverPhoto: null
  });

  useEffect(() => {
    fetchProjects();
    fetchRequests();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects', {
        headers: { ...authService.getAuthHeaders() }
      });
      const data = await res.json();
      // Normalize URLs in projects (convert localhost URLs to relative paths)
      const normalizedProjects = (data.projects || []).map((p: any) => normalizeMaterialUrls(p));
      setProjects(normalizedProjects);
    } catch (err) {
      toast({ title: "Failed to load projects", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/projects/requests/all', {
        headers: { ...authService.getAuthHeaders() }
      });
      if (!res.ok) {
        console.error('Failed to fetch project requests:', res.status, res.statusText);
        setRequests([]);
        return;
      }
      const data = await res.json();
      // Ensure data is an array
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      toast({ title: "Failed to load requests", variant: "destructive" });
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleUploadOfficial = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Upload cover photo if provided
      let coverPhotoUrl = uploadForm.coverPhotoUrl || '';
      if (uploadAssets.coverPhoto) {
        const coverPhotoBase64 = await convertFileToBase64(uploadAssets.coverPhoto);
        const coverPhotoRes = await fetch('/api/materials/upload-base64', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authService.getAuthHeaders()
          },
          body: JSON.stringify({
            filename: uploadAssets.coverPhoto.name,
            contentType: uploadAssets.coverPhoto.type,
            dataBase64: coverPhotoBase64
          })
        });

        if (coverPhotoRes.ok) {
          const coverPhotoData = await coverPhotoRes.json();
          coverPhotoUrl = coverPhotoData.url;
        }
      }

      let documentUrl = uploadForm.pdfUrl;
      if (uploadAssets.documentFile) {
        const docBase64 = await convertFileToBase64(uploadAssets.documentFile);
        const docRes = await fetch('/api/materials/upload-base64', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authService.getAuthHeaders()
          },
          body: JSON.stringify({
            filename: uploadAssets.documentFile.name,
            contentType: uploadAssets.documentFile.type || 'application/octet-stream',
            dataBase64: docBase64
          })
        });
        if (docRes.ok) {
          const docData = await docRes.json();
          documentUrl = docData.url;
        }
      }

      if (!documentUrl) {
        toast({ title: "Documentation required", description: "Upload the official project file.", variant: "destructive" });
        return;
      }

      const res = await fetch('/api/projects/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authService.getAuthHeaders() },
          body: JSON.stringify({
          ...uploadForm,
          pdfUrl: documentUrl,
          isAdminProject: true,
          techStack: uploadForm.techStack.split(',').map(t => t.trim()).filter(Boolean),
          imageUrls: uploadForm.imageUrls.split(',').map(u => u.trim()).filter(Boolean),
          coverPhoto: coverPhotoUrl || null,
          simulationLink: uploadForm.simulationLink,
          projectCategory: uploadForm.projectCategory,
          branch: '',
          semester: null,
          academicYear: null
        })
      });
      if (res.ok) {
        toast({ title: "Official project uploaded successfully!" });
        setShowUploadDialog(false);
        setUploadForm({
          title: '', description: '', category: ADMIN_SUBJECT_OPTIONS[0],
          techStack: '', githubLink: '', demoLink: '', pdfUrl: '', imageUrls: '', videoUrl: '', projectType: ADMIN_PROJECT_TYPES[0].value,
          coverPhotoUrl: '', simulationLink: '', projectCategory: ADMIN_PROJECT_TYPES[0].value
        });
        setUploadAssets({ documentFile: null, coverPhoto: null });
        fetchProjects();
      }
    } catch (err) {
      toast({ title: "Failed to upload project", variant: "destructive" });
    }
  };

  const handleApprove = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authService.getAuthHeaders() },
        body: JSON.stringify({ status: 'approved' })
      });
      if (res.ok) {
        toast({ title: "Project approved" });
        fetchProjects();
      }
    } catch (err) {
      toast({ title: "Failed to approve project", variant: "destructive" });
    }
  };

  const handleReject = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authService.getAuthHeaders() },
        body: JSON.stringify({ status: 'rejected' })
      });
      if (res.ok) {
        toast({ title: "Project rejected" });
        fetchProjects();
      }
    } catch (err) {
      toast({ title: "Failed to reject project", variant: "destructive" });
    }
  };

  const handleDelete = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: { ...authService.getAuthHeaders() }
      });
      if (res.ok) {
        toast({ title: "Project deleted" });
        fetchProjects();
      }
    } catch (err) {
      toast({ title: "Failed to delete project", variant: "destructive" });
    }
  };

  const updateRequestStatus = async (requestId: string, status: string) => {
    try {
      const res = await fetch(`/api/projects/requests/${requestId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authService.getAuthHeaders() },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        toast({ title: `Request ${status}` });
        fetchRequests();
      }
    } catch (err) {
      toast({ title: "Failed to update request", variant: "destructive" });
    }
  };

  const pendingProjects = projects.filter(p => p.status === 'pending' && !p.isAdminProject);
  const approvedProjects = projects.filter(p => p.status === 'approved');
  const adminProjects = projects.filter(p => p.isAdminProject);
  const stats = [
    { label: 'Pending', value: pendingProjects.length, accent: 'text-amber-600 bg-amber-50' },
    { label: 'Approved', value: approvedProjects.length, accent: 'text-emerald-600 bg-emerald-50' },
    { label: 'Official', value: adminProjects.length, accent: 'text-indigo-600 bg-indigo-50' },
    { label: 'Requests', value: Array.isArray(requests) ? requests.length : 0, accent: 'text-blue-600 bg-blue-50' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Projects Management</h2>
        <Button onClick={() => setShowUploadDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Upload Official Project
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-slate-500">{stat.label}</p>
              <p className={`text-3xl font-semibold mt-2 ${stat.accent.split(' ')[0]}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({pendingProjects.length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({approvedProjects.length})
          </TabsTrigger>
          <TabsTrigger value="official">
            Official ({adminProjects.length})
          </TabsTrigger>
          <TabsTrigger value="requests">
            Requests ({Array.isArray(requests) ? requests.filter(r => (r.workflowStatus || r.status) === 'pending').length : 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingProjects.map(project => {
            const previewImage = getProxyUrl(project.coverPhoto || project.imageUrls?.[0]);
            return (
              <Card key={project.id} className="overflow-hidden">
                {previewImage && (
                  <img 
                    src={previewImage} 
                    alt={project.title} 
                    className="h-40 w-full object-cover"
                    onError={(e) => {
                      // Fallback: try original URL if proxy fails
                      const originalUrl = project.coverPhoto || project.imageUrls?.[0];
                      if (originalUrl && originalUrl !== previewImage) {
                        e.currentTarget.src = originalUrl;
                      }
                    }}
                  />
                )}
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{project.title}</CardTitle>
                      <p className="text-sm text-slate-600 mt-1">By {project.studentName} • {project.branch}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleApprove(project.id)}>
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleReject(project.id)}>
                        <X className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm mb-2">{project.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {project.techStack?.map((tech, i) => (
                      <Badge key={i}>{tech}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {pendingProjects.length === 0 && <p className="text-slate-500">No pending projects</p>}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {approvedProjects.map(project => {
              const previewImage = getProxyUrl(project.coverPhoto || project.imageUrls?.[0]);
              return (
                <Card key={project.id} className="overflow-hidden">
                  {previewImage && (
                    <img 
                      src={previewImage} 
                      alt={project.title} 
                      className="h-40 w-full object-cover"
                      onError={(e) => {
                        // Fallback: try original URL if proxy fails
                        const originalUrl = project.coverPhoto || project.imageUrls?.[0];
                        if (originalUrl && originalUrl !== previewImage) {
                          e.currentTarget.src = originalUrl;
                        }
                      }}
                    />
                  )}
                  <CardHeader>
                    <CardTitle className="text-lg">{project.title}</CardTitle>
                    <p className="text-sm text-slate-600">By {project.studentName}</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm line-clamp-3">{project.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {project.simulationLink && (
                        <a href={project.simulationLink} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm">
                            <ExternalLink className="w-4 h-4 mr-1" />
                            Simulation
                          </Button>
                        </a>
                      )}
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(project.id)}>
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="official" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {adminProjects.map(project => {
              const previewImage = getProxyUrl(project.coverPhoto || project.imageUrls?.[0]);
              return (
                <Card key={project.id} className="overflow-hidden">
                  {previewImage && (
                    <img 
                      src={previewImage} 
                      alt={project.title} 
                      className="h-40 w-full object-cover"
                      onError={(e) => {
                        // Fallback: try original URL if proxy fails
                        const originalUrl = project.coverPhoto || project.imageUrls?.[0];
                        if (originalUrl && originalUrl !== previewImage) {
                          e.currentTarget.src = originalUrl;
                        }
                      }}
                    />
                  )}
                  <CardHeader className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{project.title}</CardTitle>
                      {project.academicYear && <p className="text-xs text-slate-500 mt-1">{project.academicYear}</p>}
                    </div>
                    <Badge>Official</Badge>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm line-clamp-3">{project.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {project.pdfUrl && (
                        <a href={project.pdfUrl} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm">
                            <Download className="w-4 h-4 mr-1" />
                            Docs
                          </Button>
                        </a>
                      )}
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(project.id)}>
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          {Array.isArray(requests) && requests.length > 0 ? (
            requests.map(request => (
              <Card key={request.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{request.projectIdea}</CardTitle>
                      <p className="text-sm text-slate-600 mt-1">
                        {request.name} ({request.email}) • {request.branch} • Sem {request.semester}
                      </p>
                    </div>
                    <Badge variant={(request.workflowStatus || request.status) === 'accepted' ? 'default' : (request.workflowStatus || request.status) === 'rejected' ? 'destructive' : 'secondary'}>
                      {request.workflowStatus || request.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm mb-2">{request.description}</p>
                  {request.requiredTools && <p className="text-sm text-slate-600">Tools: {request.requiredTools}</p>}
                  {request.deadline && <p className="text-sm text-slate-600">Deadline: {request.deadline}</p>}
                  <div className="flex gap-2 mt-4">
                    <Button size="sm" onClick={() => updateRequestStatus(request.id, 'accepted')}>
                      Accept
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => updateRequestStatus(request.id, 'under_review')}>
                      Under Review
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => updateRequestStatus(request.id, 'rejected')}>
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-slate-500">No project requests</p>
          )}
        </TabsContent>
      </Tabs>

      {/* Upload Official Project Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload Official Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUploadOfficial} className="space-y-4">
            <div className="space-y-3">
              <Input
                placeholder="Project Title *"
                value={uploadForm.title}
                onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                required
              />
              <Textarea
                placeholder="Project Description *"
                value={uploadForm.description}
                onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                rows={4}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select
                value={uploadForm.category}
                onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                className="px-3 py-2 border rounded"
                required
              >
                {ADMIN_SUBJECT_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <select
                value={uploadForm.projectCategory}
                onChange={(e) => setUploadForm({ ...uploadForm, projectCategory: e.target.value })}
                className="px-3 py-2 border rounded"
                required
              >
                {ADMIN_PROJECT_TYPES.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>


            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                placeholder="Technologies (comma-separated)"
                value={uploadForm.techStack}
                onChange={(e) => setUploadForm({ ...uploadForm, techStack: e.target.value })}
              />
              <Input
                placeholder="Image URLs (comma-separated)"
                value={uploadForm.imageUrls}
                onChange={(e) => setUploadForm({ ...uploadForm, imageUrls: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                placeholder="GitHub Link"
                value={uploadForm.githubLink}
                onChange={(e) => setUploadForm({ ...uploadForm, githubLink: e.target.value })}
              />
              <Input
                placeholder="Simulation / Demo Link"
                value={uploadForm.simulationLink}
                onChange={(e) => setUploadForm({ ...uploadForm, simulationLink: e.target.value })}
              />
            </div>

            <Input
              placeholder="Video URL"
              value={uploadForm.videoUrl}
              onChange={(e) => setUploadForm({ ...uploadForm, videoUrl: e.target.value })}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Upload Project Documentation *</Label>
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx,.zip"
                  onChange={(e) => setUploadAssets(prev => ({ ...prev, documentFile: e.target.files?.[0] || null }))}
                  required={!uploadForm.pdfUrl}
                />
                <p className="text-xs text-slate-500 mt-1">Accepts PDF/DOC/ZIP</p>
              </div>
              <div>
                <Label>Cover Photo</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setUploadAssets(prev => ({ ...prev, coverPhoto: e.target.files?.[0] || null }))}
                />
                {uploadAssets.coverPhoto && (
                  <img
                    src={URL.createObjectURL(uploadAssets.coverPhoto)}
                    alt="Cover preview"
                    className="w-32 h-20 object-cover rounded border mt-2"
                  />
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit">Upload Project</Button>
              <Button type="button" variant="outline" onClick={() => setShowUploadDialog(false)}>Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminProjectsManager;

