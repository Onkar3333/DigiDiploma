import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { normalizeMaterialUrls, normalizeBackendUrl, downloadFile } from '@/lib/urlUtils';
import { 
  Code, Search, Filter, Upload, Download, Eye, Star, 
  Github, ExternalLink, FileText, Image as ImageIcon, Video,
  Plus, X, CheckCircle, Clock, Users, BookOpen, ArrowLeft,
  Mail, Phone, MessageCircle, Send, Trash2, Edit, Lock, User,
  Share2, Copy, Check
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Project {
  id: string;
  title: string;
  description: string;
  category: string;
  techStack: string[];
  branch: string;
  semester: number;
  githubLink?: string;
  demoLink?: string;
  pdfUrl?: string;
  imageUrls?: string[];
  videoUrl?: string;
  studentName: string;
  studentId?: string;
  status: string;
  isAdminProject: boolean;
  views: number;
  likes: number;
  createdAt: string;
  coverPhoto?: string | null;
  simulationLink?: string;
  academicYear?: string;
  projectCategory?: string;
}

const FEATURE_CARDS = [
  {
    title: "Branch-wise Project Decks",
    description: "Curated gallery of Computer, Electrical, ENTC and Mechanical topics with real project images.",
    highlights: ["Actual screenshots & hardware shots", "Ready-to-use documentation", "Department specific insights"],
    badge: "Updated weekly"
  },
  {
    title: "Customize with DigiDiploma",
    description: "Need changes? Our mentor team upgrades and personalizes any project for your syllabus.",
    highlights: ["One-to-one mentor support", "Hybrid / onsite implementation", "WhatsApp progress updates"],
    badge: "Premium support"
  },
  {
    title: "Upload & Unlock Discounts",
    description: "Share your project documentation to unlock instant discounts on premium ready-made projects.",
    highlights: ["Earn extra credits", "Featured on student wall", "Access to exclusive guides"],
    badge: "Save more"
  },
  {
    title: "Logistics & Pricing",
    description: "Doorstep delivery or complete lab setup at zero extra cost. Transparent, student-friendly pricing.",
    highlights: ["Free home delivery", "Lab-ready wiring & code", "Low & sustainable pricing"],
    badge: "All-in-one"
  }
];

const DEPARTMENT_SPOTLIGHTS = [
  {
    branch: "Computer & IT",
    topics: ["AI Attendance with Face-ID", "Full-stack LMS", "Smart Campus IoT Dashboard"],
    image: "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=900&q=80"
  },
  {
    branch: "Electrical & ENTC",
    topics: ["Smart Grid Controller", "EV Fast Charging Dock", "RFID Energy Meter"],
    image: "https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=900&q=80"
  },
  {
    branch: "Mechanical & Civil",
    topics: ["3D Printed Drone Frame", "Bridge Health Monitoring", "Automated Material Sorter"],
    image: "https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?auto=format&fit=crop&w=900&q=80"
  }
];

const ACADEMIC_YEARS = ["2022-23", "2023-24", "2024-25", "2025-26"];

// Utility function to convert R2 URLs to proxy URLs
const getProxyUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  
  // FIRST: Normalize any localhost URLs to relative paths
  const normalizedUrl = normalizeBackendUrl(url);
  
  // Check if it's already a proxy URL
  if (normalizedUrl.includes('/api/projects/proxy/') || normalizedUrl.includes('/api/materials/proxy/')) {
    return normalizedUrl;
  }
  
  // Check if it's an R2 URL
  if (normalizedUrl.includes('r2.cloudflarestorage.com')) {
    // Extract the key from the R2 URL
    // Format: https://[account-id].r2.cloudflarestorage.com/[bucket]/[key]
    // or: https://[bucket].[account-id].r2.cloudflarestorage.com/[key]
    let key = '';
    
    try {
      const urlObj = new URL(normalizedUrl);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      
      // Remove bucket name if it's the first part
      if (pathParts.length > 1 && pathParts[0] === 'digidiploma') {
        key = pathParts.slice(1).join('/');
      } else {
        key = pathParts.join('/');
      }
      
      // If key starts with 'projects/', remove it (we'll add it in the proxy)
      if (key.startsWith('projects/')) {
        key = key.substring('projects/'.length);
      }
      
      // If key starts with 'materials/', it might be a material file, keep as is
      if (key.startsWith('materials/')) {
        // Use materials proxy instead
        return `/api/materials/proxy/r2/${encodeURIComponent(key)}`;
      }
      
      return `/api/projects/proxy/r2/${encodeURIComponent(key)}`;
    } catch (e) {
      console.error('Error parsing R2 URL:', e);
      return normalizedUrl;
    }
  }
  
  return normalizedUrl;
};

// Utility function to convert YouTube URLs to embed format
const getYouTubeEmbedUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  
  // Check if already an embed URL
  if (url.includes('youtube.com/embed/') || url.includes('youtu.be/')) {
    return url;
  }
  
  // Extract video ID from various YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return `https://www.youtube.com/embed/${match[1]}`;
    }
  }
  
  // If no match, return original URL (might be a different video platform)
  return url;
};
const PROJECT_TYPES = [
  { label: "Mini Project", value: "mini" },
  { label: "Final Year Project", value: "final" }
];
const SUBJECT_OPTIONS = [
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

const Projects = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { id: projectIdFromUrl } = useParams();
  const { toast } = useToast();
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [studentProjects, setStudentProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [activeTab, setActiveTab] = useState(user?.userType === 'admin' ? 'admin' : 'admin');
  
  // Ensure students can't access student projects tab
  useEffect(() => {
    if (user?.userType !== 'admin' && activeTab === 'student') {
      setActiveTab('admin');
    }
  }, [user?.userType, activeTab]);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showProjectDialog, setShowProjectDialog] = useState(false);

  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    category: SUBJECT_OPTIONS[0],
    techStack: '',
    githubLink: '',
    demoLink: '',
    pdfUrl: '',
    imageUrls: '',
    videoUrl: '',
    teamMembers: '',
    projectType: PROJECT_TYPES[0].value,
    simulationLink: '',
    coverPhotoUrl: ''
  });
  const [uploadAssets, setUploadAssets] = useState<{
    documentFile: File | null;
    coverPhoto: File | null;
  }>({
    documentFile: null,
    coverPhoto: null
  });

  const [requestForm, setRequestForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    branch: user?.branch || '',
    semester: user?.semester || '',
    projectIdea: '',
    description: '',
    requiredTools: '',
    deadline: '',
    notes: ''
  });

  useEffect(() => {
    setRequestForm(prev => ({
      ...prev,
      name: user?.name || '',
      email: user?.email || '',
      branch: user?.branch || '',
      semester: user?.semester || ''
    }));
  }, [user?.name, user?.email, user?.branch, user?.semester]);

  useEffect(() => {
    fetchProjects();
  }, [isAuthenticated, user?.id]);

  // Handle direct project link from URL
  useEffect(() => {
    if (projectIdFromUrl && !showProjectDialog) {
      // Small delay to ensure projects are loaded first
      const timer = setTimeout(() => {
        fetchProjectDetails(projectIdFromUrl);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [projectIdFromUrl, showProjectDialog]);

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

  const uploadAsset = async (file: File) => {
    const base64 = await convertFileToBase64(file);
    const res = await fetch('/api/materials/upload-base64', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authService.getAuthHeaders()
      },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        dataBase64: base64
      })
    });
    if (!res.ok) throw new Error('Failed to upload file');
    const data = await res.json();
    return data.url as string;
  };


  const fetchProjects = async () => {
    setLoading(true);
    try {
      // Fetch public projects (admin projects that are approved and public)
      const res = await fetch('/api/projects/public');
      if (!res.ok) {
        // If public endpoint doesn't exist, try authenticated endpoint
        if (isAuthenticated) {
          const authRes = await fetch('/api/projects', {
            headers: { ...authService.getAuthHeaders() }
          });
          if (!authRes.ok) throw new Error('Failed to fetch');
          const data = await authRes.json();
          const allProjects = data.projects || [];
          const normalizedProjects = allProjects.map((p: any) => normalizeMaterialUrls(p));
          const adminProjects = normalizedProjects.filter((p: any) => p.isAdminProject && p.status === 'approved');
          setProjects(adminProjects);
          
          if (user?.userType === 'admin') {
            const studentProjs = normalizedProjects.filter((p: any) => !p.isAdminProject);
            setStudentProjects(studentProjs);
          } else if (isAuthenticated) {
            const studentProjs = normalizedProjects.filter((p: any) => !p.isAdminProject && p.studentId === user?.id);
            setStudentProjects(studentProjs);
          }
        } else {
          // If not authenticated and no public endpoint, show empty
          setProjects([]);
          setStudentProjects([]);
        }
      } else {
        const data = await res.json();
        const publicProjects = (data.projects || []).map((p: any) => normalizeMaterialUrls(p));
        setProjects(publicProjects);
        
        // If authenticated, also fetch user-specific projects
        if (isAuthenticated) {
          const authRes = await fetch('/api/projects', {
            headers: { ...authService.getAuthHeaders() }
          });
          if (authRes.ok) {
            const authData = await authRes.json();
            const allProjects = authData.projects || [];
            const normalizedProjects = allProjects.map((p: any) => normalizeMaterialUrls(p));
            
            if (user?.userType === 'admin') {
              const studentProjs = normalizedProjects.filter((p: any) => !p.isAdminProject);
              setStudentProjects(studentProjs);
            } else {
              const studentProjs = normalizedProjects.filter((p: any) => !p.isAdminProject && p.studentId === user?.id);
              setStudentProjects(studentProjs);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
      toast({ title: "Failed to load projects", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectDetails = async (projectId: string) => {
    try {
      // Try public endpoint first
      let res = await fetch(`/api/projects/${projectId}/public`);
      if (!res.ok && isAuthenticated) {
        // Fallback to authenticated endpoint if available
        res = await fetch(`/api/projects/${projectId}`, {
          headers: { ...authService.getAuthHeaders() }
        });
      }
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          toast({ title: "Please login to view this project", variant: "destructive" });
          return;
        }
        throw new Error('Failed to fetch');
      }
      const data = await res.json();
      setSelectedProject(data);
      setShowProjectDialog(true);
      
      // Update URL to include project ID for shareable link
      navigate(`/projects/${projectId}`, { replace: true });
    } catch (err) {
      toast({ title: "Failed to load project details", variant: "destructive" });
    }
  };

  const handleShareProject = async (projectId: string) => {
    const shareUrl = `${window.location.origin}/projects/${projectId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(projectId);
      toast({ title: "Link copied to clipboard!", description: "Share this link with others." });
      setTimeout(() => setCopiedLink(null), 2000);
    } catch (err) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedLink(projectId);
      toast({ title: "Link copied to clipboard!", description: "Share this link with others." });
      setTimeout(() => setCopiedLink(null), 2000);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast({ title: "Please login first", variant: "destructive" });
      window.location.href = '/?login=1';
      return;
    }
    try {
      let documentUrl = uploadForm.pdfUrl;
      if (uploadAssets.documentFile) {
        documentUrl = await uploadAsset(uploadAssets.documentFile);
      }
      if (!documentUrl) {
        toast({ title: "Project documentation is required", description: "Upload a PDF/DOC/ZIP file.", variant: "destructive" });
        return;
      }

      let coverPhotoUrl = uploadForm.coverPhotoUrl;
      if (uploadAssets.coverPhoto) {
        coverPhotoUrl = await uploadAsset(uploadAssets.coverPhoto);
      }

      const res = await fetch('/api/projects/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authService.getAuthHeaders() },
        body: JSON.stringify({
          ...uploadForm,
          pdfUrl: documentUrl,
          coverPhoto: coverPhotoUrl || null,
          techStack: uploadForm.techStack.split(',').map(t => t.trim()).filter(Boolean),
          imageUrls: uploadForm.imageUrls.split(',').map(u => u.trim()).filter(Boolean),
          teamMembers: uploadForm.teamMembers.split(',').map(m => m.trim()).filter(Boolean),
          simulationLink: uploadForm.simulationLink,
          projectCategory: uploadForm.projectType,
          branch: user?.branch || '',
          semester: user?.semester || null
        })
      });
      if (res.ok) {
        toast({ title: "Project submitted successfully!", description: "Your project is pending admin approval." });
        setShowUploadDialog(false);
        setUploadForm({
          title: '', description: '', category: SUBJECT_OPTIONS[0],
          techStack: '', githubLink: '', demoLink: '',
          pdfUrl: '', imageUrls: '', videoUrl: '', teamMembers: '', projectType: PROJECT_TYPES[0].value,
          simulationLink: '', coverPhotoUrl: ''
        });
        setUploadAssets({ documentFile: null, coverPhoto: null });
        fetchProjects();
      } else {
        toast({ title: "Failed to submit project", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Failed to submit project", variant: "destructive" });
    }
  };

  const handleDownload = async (project: Project) => {
    if (!isAuthenticated) {
      toast({ title: "Please login first", variant: "destructive" });
      window.location.href = '/?login=1';
      return;
    }
    if (project.pdfUrl) {
      // Normalize URL before downloading
      const normalizedUrl = getProxyUrl(project.pdfUrl);
      // Extract filename from project title
      const filename = project.title ? `${project.title}.pdf` : 'project.pdf';
      // Force download instead of opening in new tab
      await downloadFile(normalizedUrl, filename);
      toast({ 
        title: "Download Started", 
        description: "Your file is downloading." 
      });
    }
  };

  const handleConvertToAdmin = async (projectId: string) => {
    if (!confirm('Are you sure you want to convert this student project to an admin project?')) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/convert-to-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authService.getAuthHeaders() }
      });
      if (res.ok) {
        toast({ title: "Project converted to admin project successfully!" });
        fetchProjects();
      } else {
        const error = await res.json();
        toast({ title: "Failed to convert project", description: error.error || "Unknown error", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Failed to convert project", variant: "destructive" });
    }
  };

  const handleDeleteStudentProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this student project? This action cannot be undone.')) return;
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: { ...authService.getAuthHeaders() }
      });
      if (res.ok) {
        toast({ title: "Student project deleted successfully" });
        fetchProjects();
      } else {
        const error = await res.json();
        toast({ title: "Failed to delete project", description: error.error || "Unknown error", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Failed to delete project", variant: "destructive" });
    }
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/projects/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestForm)
      });
      if (res.ok) {
        toast({ title: "Request submitted!", description: "We'll get back to you soon." });
        setShowRequestDialog(false);
        setRequestForm({
          name: user?.name || '',
          email: user?.email || '',
          phone: '',
          branch: user?.branch || '',
          semester: user?.semester || '',
          projectIdea: '',
          description: '',
          requiredTools: '',
          deadline: '',
          notes: ''
        });
      } else {
        toast({ title: "Failed to submit request", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Failed to submit request", variant: "destructive" });
    }
  };

  const getFilteredProjects = (projectList: Project[]) => {
    return projectList.filter(p => {
      const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           p.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
      const matchesBranch = selectedBranch === 'all' || p.branch === selectedBranch;
      return matchesSearch && matchesCategory && matchesBranch;
    });
  };

  const filteredAdminProjects = getFilteredProjects(projects);
  const filteredStudentProjects = getFilteredProjects(studentProjects);
  const myProjects = studentProjects.filter((p: any) => p.studentId === user?.id);

  const categories = ['all', ...SUBJECT_OPTIONS];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-white/20 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(isAuthenticated ? '/student-dashboard' : '/')}
                className="text-blue-600 hover:text-blue-700 bg-blue-500/10 backdrop-blur-sm border-2 border-cyan-400/50 ring-2 ring-cyan-400/30 hover:ring-cyan-400/50 transition-all"
              >
                <ArrowLeft className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">{isAuthenticated ? 'Back to Dashboard' : 'Back to Home'}</span>
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-green-700 rounded-xl flex items-center justify-center">
                  <Code className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-800">Projects</h1>
                  <p className="text-sm text-slate-600">Browse and share academic projects</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <div className="space-y-6 mb-10">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {FEATURE_CARDS.map((card, index) => (
              <div key={index} className="rounded-3xl bg-white shadow-lg border border-slate-100 p-5 flex flex-col gap-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-blue-500">{card.badge}</span>
                <h3 className="text-lg font-semibold text-slate-900">{card.title}</h3>
                <p className="text-sm text-slate-600">{card.description}</p>
                <ul className="text-sm text-slate-700 space-y-1">
                  {card.highlights.map((highlight) => (
                    <li key={highlight} className="flex items-start gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500 mt-1" />
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="rounded-3xl bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 text-white p-6 shadow-2xl">
            <div className="flex flex-col gap-6">
              <div>
                <p className="text-sm uppercase tracking-[0.4em] text-white/70">Department Spotlight</p>
                <h2 className="text-2xl font-bold mt-2">Real builds. Real images. Real diploma impact.</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {DEPARTMENT_SPOTLIGHTS.map((spotlight) => (
                  <div key={spotlight.branch} className="relative overflow-hidden rounded-2xl border border-white/20">
                    <img src={spotlight.image} alt={spotlight.branch} className="h-48 w-full object-cover opacity-80" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent p-4 flex flex-col justify-end">
                      <p className="text-sm font-semibold text-white/80">{spotlight.branch}</p>
                      <ul className="text-xs text-white/90 space-y-1 mt-2">
                        {spotlight.topics.map(topic => (
                          <li key={topic} className="flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            {topic}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border rounded"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</option>
            ))}
          </select>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="px-4 py-2 border rounded"
          >
            <option value="all">All Branches</option>
            <option value="Computer Engineering">Computer Engineering</option>
            <option value="Information Technology">IT</option>
            <option value="Electronics & Telecommunication">ENTC</option>
            <option value="Mechanical Engineering">Mechanical</option>
            <option value="Electrical Engineering">Electrical</option>
            <option value="Civil Engineering">Civil</option>
            <option value="Automobile Engineering">Automobile</option>
            <option value="Instrumentation Engineering">Instrumentation</option>
            <option value="Artificial Intelligence & Machine Learning (AIML)">AIML</option>
            <option value="Mechatronics Engineering">Mechatronics</option>
          </select>
          {isAuthenticated && (
            <Button 
              onClick={() => setShowUploadDialog(true)}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Project
            </Button>
          )}
          {!isAuthenticated && (
            <Button 
              onClick={() => window.location.href = '/?login=1'}
              variant="outline"
            >
              <User className="w-4 h-4 mr-2" />
              Login to Upload
            </Button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">Loading projects...</div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className={`grid w-full ${isAuthenticated && user?.userType === 'admin' ? 'grid-cols-3' : isAuthenticated ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <TabsTrigger value="admin">All Projects ({projects.length})</TabsTrigger>
              {isAuthenticated && user?.userType === 'admin' && (
                <TabsTrigger value="student">Student Projects ({studentProjects.length})</TabsTrigger>
              )}
              {isAuthenticated && (
                <TabsTrigger value="my">My Projects ({myProjects.length})</TabsTrigger>
              )}
            </TabsList>

            {/* Admin Projects Tab */}
            <TabsContent value="admin" className="space-y-6">
              {filteredAdminProjects.length === 0 ? (
                <div className="text-center py-12">
                  <Code className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No admin projects available</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredAdminProjects.map(project => {
                    const previewImage = getProxyUrl(project.coverPhoto || project.imageUrls?.[0]);
                    return (
                      <Card key={project.id} className="overflow-hidden hover:shadow-xl transition-all duration-200">
                        {previewImage && (
                          <div className="h-40 w-full overflow-hidden">
                            <img 
                              src={previewImage} 
                              alt={project.title} 
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                // Fallback: try original URL if proxy fails
                                const originalUrl = project.coverPhoto || project.imageUrls?.[0];
                                if (originalUrl && originalUrl !== previewImage) {
                                  e.currentTarget.src = originalUrl;
                                }
                              }}
                            />
                          </div>
                        )}
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{project.title}</CardTitle>
                              <div className="flex flex-wrap items-center gap-2 mb-2 text-xs">
                        <Badge>{project.category}</Badge>
                                {project.projectCategory && <Badge variant="secondary">{project.projectCategory}</Badge>}
                                {project.academicYear && <Badge variant="outline">{project.academicYear}</Badge>}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="text-sm text-slate-600 line-clamp-3">{project.description}</p>
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>{project.views} views</span>
                    <span>{project.likes} likes</span>
                    <span>{project.branch}</span>
                  </div>
                          <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchProjectDetails(project.id)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShareProject(project.id)}
                      title="Share project"
                    >
                      {copiedLink === project.id ? (
                        <>
                          <Check className="w-4 h-4 mr-1" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Share2 className="w-4 h-4 mr-1" />
                          Share
                        </>
                      )}
                    </Button>
                            {project.simulationLink && (
                              <a href={project.simulationLink} target="_blank" rel="noopener noreferrer">
                                <Button variant="outline" size="sm">
                                  <ExternalLink className="w-4 h-4 mr-1" />
                                  Simulation
                                </Button>
                              </a>
                            )}
                    {project.pdfUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(project)}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        PDF
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Student Projects Tab - Admin Only */}
            {user?.userType === 'admin' && (
              <TabsContent value="student" className="space-y-6">
                {filteredStudentProjects.length === 0 ? (
                  <div className="text-center py-12">
                    <Code className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No student projects available</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredStudentProjects.map(project => {
                      const previewImage = getProxyUrl(project.coverPhoto || project.imageUrls?.[0]);
                      return (
                        <Card key={project.id} className="overflow-hidden hover:shadow-xl transition-all duration-200">
                          {previewImage && (
                            <div className="h-40 w-full overflow-hidden">
                              <img 
                                src={previewImage} 
                                alt={project.title} 
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  // Fallback: try original URL if proxy fails
                                  const originalUrl = project.coverPhoto || project.imageUrls?.[0];
                                  if (originalUrl && originalUrl !== previewImage) {
                                    e.currentTarget.src = originalUrl;
                                  }
                                }}
                              />
                            </div>
                          )}
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="text-lg mb-2">{project.title}</CardTitle>
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                  <Badge>{project.category}</Badge>
                                  {project.status === 'pending' && <Badge variant="outline">Pending</Badge>}
                                  {project.status === 'approved' && <Badge variant="default">Approved</Badge>}
                                  {project.projectCategory && <Badge variant="secondary">{project.projectCategory}</Badge>}
                                </div>
                                <p className="text-xs text-slate-500 mt-1">By: {project.studentName}</p>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <p className="text-sm text-slate-600 line-clamp-3">{project.description}</p>
                            <div className="flex items-center gap-4 text-xs text-slate-500">
                              <span>{project.views} views</span>
                              <span>{project.likes} likes</span>
                              <span>{project.branch}</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => fetchProjectDetails(project.id)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleShareProject(project.id)}
                                title="Share project"
                              >
                                {copiedLink === project.id ? (
                                  <>
                                    <Check className="w-4 h-4 mr-1" />
                                    Copied
                                  </>
                                ) : (
                                  <>
                                    <Share2 className="w-4 h-4 mr-1" />
                                    Share
                                  </>
                                )}
                              </Button>
                              {project.simulationLink && (
                                <a href={project.simulationLink} target="_blank" rel="noopener noreferrer">
                                  <Button variant="outline" size="sm">
                                    <ExternalLink className="w-4 h-4 mr-1" />
                                    Simulation
                                  </Button>
                                </a>
                              )}
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleConvertToAdmin(project.id)}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Make Admin Project
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteStudentProject(project.id)}
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Delete
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            )}

            {/* My Projects Tab */}
            <TabsContent value="my" className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Your Projects</h3>
                <Button onClick={() => setShowUploadDialog(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload New Project
                </Button>
              </div>
              {myProjects.length === 0 ? (
                <Card className="border-0 bg-white/80 backdrop-blur-sm">
                  <CardContent className="p-12 text-center">
                    <Code className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">No projects yet</h3>
                    <p className="text-gray-500 mb-4">Upload your first project to get started!</p>
                    <Button onClick={() => setShowUploadDialog(true)}>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Project
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {myProjects.map(project => {
                    const previewImage = project.coverPhoto || project.imageUrls?.[0];
                    return (
                      <Card key={project.id} className="overflow-hidden hover:shadow-xl transition-all duration-200">
                        {previewImage && (
                          <div className="h-40 w-full overflow-hidden">
                            <img src={previewImage} alt={project.title} className="h-full w-full object-cover" />
                          </div>
                        )}
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg mb-2">{project.title}</CardTitle>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge>{project.category}</Badge>
                              <Badge variant={project.status === 'approved' ? 'default' : 'outline'}>
                                {project.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="text-sm text-slate-600 line-clamp-3">{project.description}</p>
                          <div className="flex gap-2 flex-wrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fetchProjectDetails(project.id)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleShareProject(project.id)}
                            title="Share project"
                          >
                            {copiedLink === project.id ? (
                              <>
                                <Check className="w-4 h-4 mr-1" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Share2 className="w-4 h-4 mr-1" />
                                Share
                              </>
                            )}
                          </Button>
                            {project.simulationLink && (
                              <a href={project.simulationLink} target="_blank" rel="noopener noreferrer">
                                <Button variant="outline" size="sm">
                                  <ExternalLink className="w-4 h-4 mr-1" />
                                  Simulation
                                </Button>
                              </a>
                            )}
                        </div>
                      </CardContent>
                    </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Project Request & Contact Section */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Project Request Card */}
          <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5" />
                Request Custom Project
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 mb-4">
                Need a custom project developed? Fill out the form and we'll get back to you.
              </p>
              <Button onClick={() => setShowRequestDialog(true)} className="w-full">
                <Send className="w-4 h-4 mr-2" />
                Submit Request
              </Button>
            </CardContent>
          </Card>

          {/* Contact Card */}
          <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Contact Us
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Phone className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Phone</p>
                  <p className="text-sm text-slate-600">+91 8432971897</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Mail className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Email</p>
                  <p className="text-sm text-slate-600">digidiploma06@gmail.com</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold">WhatsApp</p>
                  <a 
                    href="https://chat.whatsapp.com/BXyJ9ykaMnKKyHokiz2lII?mode=hqrt2" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Join Community
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload Your Project</DialogTitle>
            <DialogDescription>Share your project with the community</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpload} className="space-y-4">
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
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wide text-slate-500">Project Category / Subject *</Label>
              <select
                value={uploadForm.category}
                onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                className="px-3 py-2 border rounded"
                required
              >
                  {SUBJECT_OPTIONS.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
              </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wide text-slate-500">Project Type *</Label>
              <select
                value={uploadForm.projectType}
                onChange={(e) => setUploadForm({ ...uploadForm, projectType: e.target.value })}
                className="px-3 py-2 border rounded"
                required
              >
                  {PROJECT_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
              </select>
            </div>
            </div>


            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              placeholder="Technologies (comma-separated)"
              value={uploadForm.techStack}
              onChange={(e) => setUploadForm({ ...uploadForm, techStack: e.target.value })}
            />
            <Input
                placeholder="Team Members (comma-separated)"
                value={uploadForm.teamMembers}
                onChange={(e) => setUploadForm({ ...uploadForm, teamMembers: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                placeholder="GitHub Link (optional)"
              value={uploadForm.githubLink}
              onChange={(e) => setUploadForm({ ...uploadForm, githubLink: e.target.value })}
            />
            <Input
                placeholder="Simulation / Demo Link (optional)"
                value={uploadForm.simulationLink}
                onChange={(e) => setUploadForm({ ...uploadForm, simulationLink: e.target.value })}
              />
            </div>

            <Input
              placeholder="Video Link (YouTube, Drive, etc.)"
              value={uploadForm.videoUrl}
              onChange={(e) => setUploadForm({ ...uploadForm, videoUrl: e.target.value })}
            />
            <Input
              placeholder="Image URLs (comma-separated)"
              value={uploadForm.imageUrls}
              onChange={(e) => setUploadForm({ ...uploadForm, imageUrls: e.target.value })}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Upload Project Documentation (PDF/DOC/ZIP) *</Label>
            <Input
                  type="file"
                  accept=".pdf,.doc,.docx,.zip"
                  onChange={(e) => setUploadAssets((prev) => ({ ...prev, documentFile: e.target.files?.[0] || null }))}
                  required={!uploadForm.pdfUrl}
            />
                <p className="text-xs text-slate-500">Required to unlock DigiDiploma downloads.</p>
              </div>
              <div className="space-y-1">
                <Label>Cover Image (optional)</Label>
            <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setUploadAssets((prev) => ({ ...prev, coverPhoto: e.target.files?.[0] || null }))}
                />
                <p className="text-xs text-slate-500">Appears on the project card.</p>
              </div>
            </div>

            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-4 text-sm text-slate-700">
              Uploading your documentation unlocks instant discounts on premium DigiDiploma projects and helps the community learn from you.
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1">Submit Project</Button>
              <Button type="button" variant="outline" onClick={() => setShowUploadDialog(false)}>Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Project Request Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request Custom Project</DialogTitle>
            <DialogDescription>
              Fill out the form below to request a custom project development
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRequestSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                placeholder="Name *"
                value={requestForm.name}
                onChange={(e) => setRequestForm({ ...requestForm, name: e.target.value })}
                required
              />
              <Input
                placeholder="Email *"
                type="email"
                value={requestForm.email}
                onChange={(e) => setRequestForm({ ...requestForm, email: e.target.value })}
                required
              />
            </div>
            <Input
              placeholder="Phone *"
              value={requestForm.phone}
              onChange={(e) => setRequestForm({ ...requestForm, phone: e.target.value })}
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <select
                value={requestForm.branch}
                onChange={(e) => setRequestForm({ ...requestForm, branch: e.target.value })}
                className="px-3 py-2 border rounded"
                required
              >
                <option value="">Select Branch</option>
                <option value="Computer Engineering">Computer Engineering</option>
                <option value="Information Technology">IT</option>
                <option value="Electronics & Telecommunication">ENTC</option>
                <option value="Mechanical Engineering">Mechanical</option>
                <option value="Electrical Engineering">Electrical</option>
                <option value="Civil Engineering">Civil</option>
                <option value="Automobile Engineering">Automobile</option>
                <option value="Instrumentation Engineering">Instrumentation</option>
                <option value="Artificial Intelligence & Machine Learning (AIML)">AIML</option>
                <option value="Mechatronics Engineering">Mechatronics</option>
              </select>
              <Input
                placeholder="Semester *"
                type="number"
                value={requestForm.semester}
                onChange={(e) => setRequestForm({ ...requestForm, semester: e.target.value })}
                required
              />
            </div>
            <Input
              placeholder="Project Title *"
              value={requestForm.projectIdea}
              onChange={(e) => setRequestForm({ ...requestForm, projectIdea: e.target.value })}
              required
            />
            <Textarea
              placeholder="Description / Requirements *"
              value={requestForm.description}
              onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })}
              rows={4}
              required
            />
            <Input
              placeholder="Required Tools/Technologies"
              value={requestForm.requiredTools}
              onChange={(e) => setRequestForm({ ...requestForm, requiredTools: e.target.value })}
            />
            <Input
              placeholder="Deadline (optional)"
              type="date"
              value={requestForm.deadline}
              onChange={(e) => setRequestForm({ ...requestForm, deadline: e.target.value })}
            />
            <Textarea
              placeholder="Additional Notes"
              value={requestForm.notes}
              onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })}
              rows={3}
            />
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                <Send className="w-4 h-4 mr-2" />
                Submit Request
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowRequestDialog(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Project Detail Dialog */}
      <Dialog open={showProjectDialog} onOpenChange={setShowProjectDialog}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto p-0">
          {selectedProject && (
            <div className="flex flex-col">
              {/* Cover Photo Section */}
              {(selectedProject.coverPhoto || selectedProject.imageUrls?.[0]) && (
                <div className="relative w-full h-64 md:h-80 overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100">
                  <img 
                    src={getProxyUrl(selectedProject.coverPhoto || selectedProject.imageUrls?.[0] || '')} 
                    alt={selectedProject.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const originalUrl = selectedProject.coverPhoto || selectedProject.imageUrls?.[0];
                      if (originalUrl && originalUrl !== getProxyUrl(originalUrl)) {
                        e.currentTarget.src = originalUrl;
                      }
                    }}
                  />
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                  {/* Title Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                    <DialogTitle className="text-3xl md:text-4xl font-bold mb-2 drop-shadow-lg">
                      {selectedProject.title}
                    </DialogTitle>
                    <div className="flex flex-wrap items-center gap-3 text-sm md:text-base">
                      <Badge className="bg-blue-600/90 text-white border-0">
                        {selectedProject.category}
                      </Badge>
                      {selectedProject.projectCategory && (
                        <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                          {selectedProject.projectCategory}
                        </Badge>
                      )}
                      {selectedProject.academicYear && (
                        <Badge variant="outline" className="bg-white/10 text-white border-white/30">
                          {selectedProject.academicYear}
                        </Badge>
                      )}
                      <span className="text-white/90">•</span>
                      <span className="text-white/90">{selectedProject.branch}</span>
                      {selectedProject.semester && (
                        <>
                          <span className="text-white/90">•</span>
                          <span className="text-white/90">Sem {selectedProject.semester}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Content Section */}
              <div className="p-6 space-y-6">
                {/* Header (if no cover photo) */}
                {!(selectedProject.coverPhoto || selectedProject.imageUrls?.[0]) && (
                  <DialogHeader className="pb-4 border-b">
                    <DialogTitle className="text-2xl md:text-3xl font-bold">
                      {selectedProject.title}
                    </DialogTitle>
                    <DialogDescription className="text-base">
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        <Badge>{selectedProject.category}</Badge>
                        {selectedProject.projectCategory && (
                          <Badge variant="secondary">{selectedProject.projectCategory}</Badge>
                        )}
                        {selectedProject.academicYear && (
                          <Badge variant="outline">{selectedProject.academicYear}</Badge>
                        )}
                        <span>•</span>
                        <span>{selectedProject.branch}</span>
                        {selectedProject.semester && (
                          <>
                            <span>•</span>
                            <span>Sem {selectedProject.semester}</span>
                          </>
                        )}
                      </div>
                    </DialogDescription>
                  </DialogHeader>
                )}

                {/* Description */}
                <div className="prose prose-slate max-w-none">
                  <p className="text-slate-700 leading-relaxed text-base md:text-lg">
                    {selectedProject.description}
                  </p>
                </div>

                {/* Technologies */}
                {selectedProject.techStack && selectedProject.techStack.length > 0 && (
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                      <Code className="w-5 h-5 text-primary" />
                      Technologies Used
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedProject.techStack.map((tech, i) => (
                        <Badge key={i} variant="secondary" className="bg-white text-slate-700 border-slate-300">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => handleShareProject(selectedProject.id)}
                    title="Share this project"
                  >
                    {copiedLink === selectedProject.id ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Link Copied!
                      </>
                    ) : (
                      <>
                        <Share2 className="w-4 h-4 mr-2" />
                        Share Project
                      </>
                    )}
                  </Button>
                  {selectedProject.pdfUrl && (
                    <Button
                      onClick={() => handleDownload(selectedProject)}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download PDF
                    </Button>
                  )}
                  {selectedProject.githubLink && (
                    <a href={selectedProject.githubLink} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" className="border-slate-300 hover:bg-slate-50 transition-all duration-300">
                        <Github className="w-4 h-4 mr-2" />
                        View on GitHub
                      </Button>
                    </a>
                  )}
                  {selectedProject.demoLink && (
                    <a href={selectedProject.demoLink} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" className="border-slate-300 hover:bg-slate-50 transition-all duration-300">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View Demo
                      </Button>
                    </a>
                  )}
                  {selectedProject.simulationLink && (
                    <a href={selectedProject.simulationLink} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" className="border-slate-300 hover:bg-slate-50 transition-all duration-300">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Simulation
                      </Button>
                    </a>
                  )}
                </div>
                {/* Screenshots Gallery */}
                {selectedProject.imageUrls && selectedProject.imageUrls.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-primary" />
                      Screenshots
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedProject.imageUrls.map((url, i) => {
                        const proxyUrl = getProxyUrl(url);
                        return (
                          <div key={i} className="relative group overflow-hidden rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-300">
                            <img 
                              src={proxyUrl} 
                              alt={`Screenshot ${i + 1}`} 
                              className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                // Fallback: try original URL if proxy fails
                                if (url !== proxyUrl) {
                                  e.currentTarget.src = url;
                                }
                              }}
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300"></div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {/* Video Section */}
                {selectedProject.videoUrl && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                      <Video className="w-5 h-5 text-primary" />
                      Project Video
                    </h4>
                    <div className="w-full rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                      {(() => {
                        const embedUrl = getYouTubeEmbedUrl(selectedProject.videoUrl);
                        if (embedUrl) {
                          return (
                            <iframe
                              src={embedUrl}
                              className="w-full h-64 md:h-96"
                              allowFullScreen
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              title="Project video"
                            />
                          );
                        }
                        // If not YouTube, try as direct video URL
                        return (
                          <video 
                            src={(() => {
                              const normalized = normalizeBackendUrl(selectedProject.videoUrl || '');
                              return normalized.startsWith('http') ? normalized : `${window.location.origin}${normalized}`;
                            })()}
                            controls 
                            className="w-full h-64 md:h-96"
                          >
                            Your browser does not support the video tag.
                          </video>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Project Info Footer */}
                {selectedProject.studentName && (
                  <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>By: <span className="font-semibold text-slate-800">{selectedProject.studentName}</span></span>
                    </div>
                    {selectedProject.createdAt && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{new Date(selectedProject.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Projects;

