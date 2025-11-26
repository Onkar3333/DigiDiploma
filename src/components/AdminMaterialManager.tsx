import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  Upload, 
  FileText, 
  Video, 
  Link as LinkIcon, 
  Edit, 
  Trash2, 
  Eye,
  Download,
  Star,
  X,
  File,
  ExternalLink,
  Search,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { authService } from '@/lib/auth';
import { useAuth } from '@/contexts/AuthContext';
import { ALL_BRANCHES } from '@/constants/branches';
import { useWebSocket } from '@/hooks/useWebSocket';

interface Material {
  _id: string;
  title: string;
  description: string;
  type: 'pdf' | 'video' | 'notes' | 'link';
  url: string;
  branch: string;
  semester: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
   // Academic resource category (syllabus, model_answer_papers, etc.)
  resourceType: string;
  tags: string[];
  coverPhoto?: string;
  downloads: number;
  rating: number;
  ratingCount?: number;
  createdAt: string;
  uploadedBy: string;
}

interface MaterialFormData {
  title: string;
  description: string;
  type: 'pdf' | 'video' | 'notes' | 'link';
  url: string;
  branch: string;
  semester: string;
  subjectId: string;
  subjectCode: string;
  resourceType: string;
  tags: string;
  file?: File | null;
  coverPhoto?: File | null;
  coverPhotoUrl?: string;
}

const AdminMaterialManager = () => {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [previewMaterial, setPreviewMaterial] = useState<Material | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterBranch, setFilterBranch] = useState('all');
  
  // Fallback branches and semesters
  const DEFAULT_BRANCHES = [...ALL_BRANCHES];
  const DEFAULT_SEMESTERS = [1, 2, 3, 4, 5, 6];

  const [branches, setBranches] = useState<string[]>(DEFAULT_BRANCHES);
  const [semesters, setSemesters] = useState<number[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');

  const [formData, setFormData] = useState<MaterialFormData>({
    title: '',
    description: '',
    type: 'pdf',
    url: '',
    branch: '',
    semester: '',
    subjectId: '',
    subjectCode: '',
    resourceType: 'notes',
    tags: '',
    file: null,
    coverPhoto: null,
    coverPhotoUrl: ''
  });

  const RESOURCE_TYPES = [
    { value: 'syllabus', label: 'Syllabus', emoji: '📜' },
    { value: 'manual_answer', label: 'Manual Answer', emoji: '✍️' },
    { value: 'guess_papers', label: 'Guessing Papers', emoji: '🤔' },
    { value: 'model_answer_papers', label: 'Model Answer Papers', emoji: '✅' },
    { value: 'msbte_imp', label: 'DigiDiploma VVIMP', emoji: '✨' },
    { value: 'pyqs', label: "PYQ's", emoji: '📘' },
    { value: 'micro_project_topics', label: 'Micro Project Topics', emoji: '🧪' },
    { value: 'notes', label: 'Notes', emoji: '📝' },
  ];

  // Initialize WebSocket for realtime updates
  useWebSocket({
    userId: user?.id || '',
    token: authService.getToken() || undefined,
    onMessage: (message) => {
      switch (message.type) {
        case 'material_uploaded':
          if (message.material) {
            fetchMaterials();
            toast.success('New material uploaded');
          }
          break;
        case 'material_updated':
          if (message.material) {
            setMaterials(prev => prev.map(m => m._id === message.material._id ? { ...m, ...message.material } : m));
            toast.info('Material updated');
          }
          break;
        case 'material_deleted':
          if (message.materialId) {
            setMaterials(prev => prev.filter(m => m._id !== message.materialId));
            toast.info('Material deleted');
          }
          break;
        case 'material_stats_updated':
          if (message.material?._id) {
            setMaterials(prev => prev.map(m => m._id === message.material._id ? { ...m, ...message.material } : m));
          }
          break;
      }
    },
    onConnect: () => {
      console.log('AdminMaterialManager WebSocket connected');
    }
  });

  useEffect(() => {
    fetchBranches();
    fetchMaterials();
  }, []);

  useEffect(() => {
    if (selectedBranch) {
      fetchSemesters(selectedBranch);
    } else {
      setSemesters([]);
      setSubjects([]);
    }
  }, [selectedBranch]);

  useEffect(() => {
    if (selectedBranch && selectedSemester) {
      fetchSubjects(selectedBranch, selectedSemester);
    } else {
      setSubjects([]);
    }
  }, [selectedBranch, selectedSemester]);

  // Initialize form when dialog opens
  useEffect(() => {
    if (isDialogOpen && !editingMaterial) {
      // Reset form and initialize with first branch
      if (branches.length > 0) {
        if (!selectedBranch) {
          setSelectedBranch(branches[0]);
          setFormData(prev => ({ ...prev, branch: branches[0] }));
        }
        // Fetch semesters for the selected branch
        if (selectedBranch) {
          fetchSemesters(selectedBranch);
        }
      }
    }
  }, [isDialogOpen, editingMaterial, branches]);

  const fetchBranches = async () => {
    try {
      const res = await fetch('/api/subjects/branches', {
        headers: { ...authService.getAuthHeaders() }
      });
      if (res.ok) {
        const data = await res.json();
        // Use API data if available, otherwise use fallback
        const branchesList = (Array.isArray(data) && data.length > 0) ? data : DEFAULT_BRANCHES;
        setBranches(branchesList);
        // Initialize selected branch if not set
        if (branchesList.length > 0 && !selectedBranch) {
          setSelectedBranch(branchesList[0]);
          setFormData(prev => ({ ...prev, branch: branchesList[0] }));
        }
      } else {
        // Use fallback on error
        setBranches(DEFAULT_BRANCHES);
        if (DEFAULT_BRANCHES.length > 0 && !selectedBranch) {
          setSelectedBranch(DEFAULT_BRANCHES[0]);
          setFormData(prev => ({ ...prev, branch: DEFAULT_BRANCHES[0] }));
        }
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
      // Use fallback on error
      setBranches(DEFAULT_BRANCHES);
      if (DEFAULT_BRANCHES.length > 0 && !selectedBranch) {
        setSelectedBranch(DEFAULT_BRANCHES[0]);
        setFormData(prev => ({ ...prev, branch: DEFAULT_BRANCHES[0] }));
      }
    }
  };

  const fetchSemesters = async (branch: string) => {
    try {
      const res = await fetch(`/api/subjects/branches/${encodeURIComponent(branch)}/semesters`, {
        headers: { ...authService.getAuthHeaders() }
      });
      if (res.ok) {
        const data = await res.json();
        // Use API data if available, otherwise use fallback
        const semestersList = (Array.isArray(data) && data.length > 0) ? data : DEFAULT_SEMESTERS;
        setSemesters(semestersList);
        // Initialize selected semester if not set
        if (semestersList.length > 0 && !selectedSemester) {
          setSelectedSemester(String(semestersList[0]));
          setFormData(prev => ({ ...prev, semester: String(semestersList[0]) }));
        }
      } else {
        // Use fallback on error
        setSemesters(DEFAULT_SEMESTERS);
        if (DEFAULT_SEMESTERS.length > 0 && !selectedSemester) {
          setSelectedSemester(String(DEFAULT_SEMESTERS[0]));
          setFormData(prev => ({ ...prev, semester: String(DEFAULT_SEMESTERS[0]) }));
        }
      }
    } catch (error) {
      console.error('Error fetching semesters:', error);
      // Use fallback on error
      setSemesters(DEFAULT_SEMESTERS);
      if (DEFAULT_SEMESTERS.length > 0 && !selectedSemester) {
        setSelectedSemester(String(DEFAULT_SEMESTERS[0]));
        setFormData(prev => ({ ...prev, semester: String(DEFAULT_SEMESTERS[0]) }));
      }
    }
  };

  const fetchSubjects = async (branch: string, semester: string) => {
    try {
      const res = await fetch(`/api/subjects?branch=${encodeURIComponent(branch)}&semester=${encodeURIComponent(semester)}`, {
        headers: { ...authService.getAuthHeaders() }
      });
      if (res.ok) {
        const data = await res.json();
        setSubjects(data);
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/materials', {
        headers: { ...authService.getAuthHeaders() }
      });
      if (res.ok) {
        const data = await res.json();
        setMaterials(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching materials:', error);
      toast.error('Failed to fetch materials');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type based on material type
      if (formData.type === 'pdf' && !file.type.includes('pdf')) {
        toast.error('Please select a PDF file for PDF materials.');
        return;
      }
      if (formData.type === 'video' && !file.type.startsWith('video/')) {
        toast.error('Please select a video file for video materials.');
        return;
      }
      if (formData.type === 'notes' && !['text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/pdf'].includes(file.type)) {
        toast.error('Please select a text, Word document, or PDF file for notes.');
        return;
      }
      
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size exceeds 10MB limit.');
        return;
      }
      
      setFormData({ ...formData, file });
    }
  };

  const handleCoverPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate image type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file for cover photo.');
        return;
      }
      
      // Validate file size (5MB max for images)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Cover photo size exceeds 5MB limit.');
        return;
      }
      
      setFormData({ ...formData, coverPhoto: file, coverPhotoUrl: '' });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.title.trim()) {
      toast.error('Material title is required');
      return;
    }
    
    if (!formData.branch || !formData.semester || !formData.subjectCode) {
      toast.error('Please select Branch, Semester, and Subject');
      return;
    }

    if (!formData.resourceType || formData.resourceType.trim() === '') {
      toast.error('Please select an Academic Resource type');
      return;
    }

    if (formData.type !== 'link' && !formData.file && !formData.url) {
      toast.error('Please upload a file or provide a URL');
      return;
    }

    if (formData.type === 'link' && !formData.url.trim()) {
      toast.error('Please provide a valid URL');
      return;
    }

    try {
      let materialUrl = formData.url;

      // Upload file if provided
      if (formData.file && formData.type !== 'link') {
        const base64 = await convertFileToBase64(formData.file);
        const uploadRes = await fetch('/api/materials/upload-base64', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authService.getAuthHeaders()
          },
          body: JSON.stringify({
            filename: formData.file.name,
            contentType: formData.file.type,
            dataBase64: base64
          })
        });

        if (!uploadRes.ok) {
          throw new Error('Failed to upload file');
        }

        const uploadData = await uploadRes.json();
        materialUrl = uploadData.url;
      }

      // Upload cover photo if provided
      let coverPhotoUrl = formData.coverPhotoUrl || '';
      if (formData.coverPhoto) {
        const coverPhotoBase64 = await convertFileToBase64(formData.coverPhoto);
        const coverPhotoRes = await fetch('/api/materials/upload-base64', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authService.getAuthHeaders()
          },
          body: JSON.stringify({
            filename: formData.coverPhoto.name,
            contentType: formData.coverPhoto.type,
            dataBase64: coverPhotoBase64
          })
        });

        if (coverPhotoRes.ok) {
          const coverPhotoData = await coverPhotoRes.json();
          coverPhotoUrl = coverPhotoData.url;
        }
      }

      // Get subject details
      const selectedSubjectObj = subjects.find(s => s.code === formData.subjectCode);
      
      const materialData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        type: formData.type,
        url: materialUrl,
        branch: formData.branch,
        semester: formData.semester,
        subjectId: selectedSubjectObj?._id || formData.subjectCode,
        subjectName: selectedSubjectObj?.name || '',
        subjectCode: formData.subjectCode,
        resourceType: formData.resourceType,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        coverPhoto: coverPhotoUrl || null,
        uploadedBy: user?.id || 'admin'
      };
      
      console.log('📤 Uploading material with data:', {
        title: materialData.title,
        resourceType: materialData.resourceType,
        subjectCode: materialData.subjectCode,
        branch: materialData.branch,
        semester: materialData.semester
      });

      const url = editingMaterial ? `/api/materials/${editingMaterial._id}` : '/api/materials';
      const method = editingMaterial ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...authService.getAuthHeaders()
        },
        body: JSON.stringify(materialData)
      });

      if (res.ok) {
        toast.success(editingMaterial ? 'Material updated successfully' : 'Material uploaded successfully');
        setIsDialogOpen(false);
        resetForm();
        fetchMaterials();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to save material');
      }
    } catch (error: any) {
      console.error('Error saving material:', error);
      toast.error(error.message || 'Failed to save material');
    }
  };

  const handleEdit = (material: Material) => {
    setEditingMaterial(material);
    setFormData({
      title: material.title,
      description: material.description || '',
      type: material.type,
      url: material.url,
      branch: material.branch,
      semester: material.semester,
      subjectId: material.subjectId,
      subjectCode: material.subjectCode,
      resourceType: material.resourceType || 'notes',
      tags: material.tags?.join(', ') || '',
      file: null,
      coverPhoto: null,
      coverPhotoUrl: material.coverPhoto || ''
    });
    setSelectedBranch(material.branch);
    setSelectedSemester(material.semester);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!id) {
      console.error('❌ Cannot delete material: ID is undefined');
      toast.error('Cannot delete material: Missing ID');
      return;
    }

    if (!confirm('Are you sure you want to delete this material?')) return;

    try {
      console.log(`🗑️ Deleting material with ID: ${id}`);
      const res = await fetch(`/api/materials/${id}`, {
        method: 'DELETE',
        headers: { ...authService.getAuthHeaders() }
      });

      if (res.ok) {
        toast.success('Material deleted successfully');
        fetchMaterials();
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ Delete failed:', errorData);
        toast.error(`Failed to delete material: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Error deleting material:', error);
      toast.error('Failed to delete material');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      type: 'pdf',
      url: '',
      branch: branches.length > 0 ? branches[0] : '',
      semester: semesters.length > 0 ? String(semesters[0]) : '',
      subjectId: '',
      subjectCode: '',
      resourceType: 'notes',
      tags: '',
      file: null,
      coverPhoto: null,
      coverPhotoUrl: ''
    });
    setEditingMaterial(null);
    // Initialize with first branch and semester if available
    if (branches.length > 0) {
      setSelectedBranch(branches[0]);
      setFormData(prev => ({ ...prev, branch: branches[0] }));
    } else {
      setSelectedBranch('');
    }
    setSelectedSemester('');
    setSelectedSubject('');
  };

  const filteredMaterials = materials.filter(material => {
    const matchesSearch = material.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         material.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         material.subjectName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || material.type === filterType;
    const matchesBranch = filterBranch === 'all' || material.branch === filterBranch;
    
    return matchesSearch && matchesType && matchesBranch;
  });

  const typeIcons = {
    pdf: FileText,
    video: Video,
    notes: File,
    link: LinkIcon
  };

  const typeColors = {
    pdf: 'bg-red-100 text-red-800',
    video: 'bg-purple-100 text-purple-800',
    notes: 'bg-blue-100 text-blue-800',
    link: 'bg-green-100 text-green-800'
  };

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
          <h2 className="text-3xl font-bold text-slate-900">Material Management</h2>
          <p className="text-slate-600 mt-1">Upload and manage study materials for students</p>
        </div>
        <Button onClick={() => { 
          resetForm();
          // Ensure branches are loaded and initialized
          if (branches.length > 0 && !selectedBranch) {
            setSelectedBranch(branches[0]);
            setFormData(prev => ({ ...prev, branch: branches[0] }));
          }
          setIsDialogOpen(true); 
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Material
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search materials..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white text-slate-900 border-slate-300"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full md:w-48 bg-white text-slate-900 border-slate-300">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                <SelectItem value="all" className="text-slate-900">All Types</SelectItem>
                <SelectItem value="pdf" className="text-slate-900">PDF</SelectItem>
                <SelectItem value="video" className="text-slate-900">Video</SelectItem>
                <SelectItem value="notes" className="text-slate-900">Notes</SelectItem>
                <SelectItem value="link" className="text-slate-900">External Link</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterBranch} onValueChange={setFilterBranch}>
              <SelectTrigger className="w-full md:w-48 bg-white text-slate-900 border-slate-300">
                <SelectValue placeholder="Filter by branch" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                <SelectItem value="all" className="text-slate-900">All Branches</SelectItem>
                {branches.map(branch => (
                  <SelectItem key={branch} value={branch} className="text-slate-900">{branch}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Materials List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMaterials.length === 0 ? (
          <Card key="no-materials" className="col-span-full">
            <CardContent className="p-8 text-center">
              <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No materials found</h3>
              <p className="text-slate-600">Upload your first material to get started.</p>
            </CardContent>
          </Card>
        ) : (
          filteredMaterials.map((material, index) => {
            const TypeIcon = typeIcons[material.type];
            return (
              <Card key={material._id || `material-${index}`} className="hover:shadow-lg transition-shadow overflow-hidden">
                {material.coverPhoto && (
                  <div className="w-full h-40 overflow-hidden bg-slate-100">
                    <img 
                      src={material.coverPhoto.startsWith('http') ? material.coverPhoto : `${window.location.origin}${material.coverPhoto}`}
                      alt={material.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      <TypeIcon className="w-5 h-5 text-slate-600" />
                      <div>
                      <CardTitle className="text-lg line-clamp-2">{material.title}</CardTitle>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <span>
                              {RESOURCE_TYPES.find(r => r.value === material.resourceType)?.emoji || '📚'}
                            </span>
                            {RESOURCE_TYPES.find(r => r.value === material.resourceType)?.label || 'Material'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Badge className={typeColors[material.type]}>{material.type}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 mb-3 line-clamp-2">{material.description || 'No description'}</p>
                  
                  <div className="space-y-2 mb-4">
                    <div className="text-xs text-slate-500">
                      <strong>Branch:</strong> {material.branch}
                    </div>
                    <div className="text-xs text-slate-500">
                      <strong>Semester:</strong> {material.semester}
                    </div>
                    <div className="text-xs text-slate-500">
                      <strong>Subject:</strong> {material.subjectName || material.subjectCode}
                    </div>
                    {material.tags && material.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {material.tags.map((tag, idx) => (
                          <Badge key={`${material._id || 'material'}-tag-${idx}-${tag}`} variant="outline" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Download className="w-3 h-3" />
                      {material.downloads || 0} downloads
                      </span>
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-500" />
                        {(material.rating ?? 0).toFixed(1)} ({material.ratingCount || 0})
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPreviewMaterial(material)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(material)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(material._id || (material as any).id || '')}
                        className="text-red-600 hover:text-red-700"
                        disabled={!material._id && !(material as any).id}
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

      {/* Add/Edit Material Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingMaterial ? 'Edit Material' : 'Add New Material'}
            </DialogTitle>
            <DialogDescription>
              {editingMaterial ? 'Update the material details below.' : 'Fill in the details to upload a new study material.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="branch">Branch *</Label>
                <Select 
                  value={selectedBranch} 
                  onValueChange={(value) => {
                    setSelectedBranch(value);
                    setFormData({ ...formData, branch: value, semester: '', subjectCode: '', subjectId: '' });
                    setSelectedSemester('');
                    setSelectedSubject('');
                  }}
                >
                  <SelectTrigger className="bg-white text-slate-900 border-slate-300 hover:bg-slate-50">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 z-[100]">
                    {branches.map(branch => (
                      <SelectItem key={branch} value={branch} className="text-slate-900 focus:bg-slate-100 cursor-pointer">{branch}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="semester">Semester *</Label>
                <Select 
                  value={selectedSemester} 
                  onValueChange={(value) => {
                    setSelectedSemester(value);
                    setFormData({ ...formData, semester: value, subjectCode: '', subjectId: '' });
                    setSelectedSubject('');
                  }}
                  disabled={!selectedBranch}
                >
                  <SelectTrigger className="bg-white text-slate-900 border-slate-300 hover:bg-slate-50">
                    <SelectValue placeholder="Select semester" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 z-[100]">
                    {semesters.map(sem => (
                      <SelectItem key={sem} value={String(sem)} className="text-slate-900 focus:bg-slate-100 cursor-pointer">Semester {sem}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="subject">Subject *</Label>
              <Select 
                value={selectedSubject} 
                onValueChange={(value) => {
                  setSelectedSubject(value);
                  const subject = subjects.find(s => s.code === value);
                  setFormData({ 
                    ...formData, 
                    subjectCode: value,
                    subjectId: subject?._id || value
                  });
                }}
                disabled={!selectedBranch || !selectedSemester || subjects.length === 0}
              >
                <SelectTrigger className="bg-white text-slate-900 border-slate-300 hover:bg-slate-50">
                  <SelectValue placeholder={subjects.length === 0 ? "No subjects available - Add subjects first" : "Select subject"} />
                </SelectTrigger>
                {subjects.length > 0 && (
                  <SelectContent className="bg-white border-slate-200 z-[100]">
                    {subjects.map(subject => (
                      <SelectItem key={subject.code || subject._id} value={subject.code} className="text-slate-900 focus:bg-slate-100 cursor-pointer">
                        {subject.name} ({subject.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                )}
              </Select>
              {subjects.length === 0 && selectedBranch && selectedSemester && (
                <p className="text-xs text-slate-500 mt-1">
                  No subjects found for {selectedBranch} - Semester {selectedSemester}. Please add subjects in the Subjects section first.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="resourceType">Academic Resource *</Label>
                <Select
                  value={formData.resourceType}
                  onValueChange={(value) => setFormData({ ...formData, resourceType: value })}
                >
                  <SelectTrigger className="bg-white text-slate-900 border-slate-300 hover:bg-slate-50">
                    <SelectValue placeholder="Select academic resource" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 z-[100]">
                    {RESOURCE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value} className="text-slate-900 focus:bg-slate-100 cursor-pointer">
                        <span className="mr-2">{type.emoji}</span>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            <div>
              <Label htmlFor="title">Material Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                placeholder="e.g., Unit 1 Lecture Notes"
              />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Material Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                rows={3}
                placeholder="Brief description of the material"
              />
            </div>

            <div>
              <Label htmlFor="type">Material Type *</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value: any) => {
                  setFormData({ ...formData, type: value, file: null, url: '' });
                }}
              >
                <SelectTrigger className="bg-white text-slate-900 border-slate-300 hover:bg-slate-50">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 z-[100]">
                  <SelectItem value="pdf" className="text-slate-900 focus:bg-slate-100 cursor-pointer">PDF</SelectItem>
                  <SelectItem value="video" className="text-slate-900 focus:bg-slate-100 cursor-pointer">Video</SelectItem>
                  <SelectItem value="notes" className="text-slate-900 focus:bg-slate-100 cursor-pointer">Notes (Text/Document)</SelectItem>
                  <SelectItem value="link" className="text-slate-900 focus:bg-slate-100 cursor-pointer">External Link</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.type === 'link' ? (
              <div>
                <Label htmlFor="url">External URL *</Label>
                <Input
                  id="url"
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  required
                  placeholder="https://example.com/resource"
                />
                <p className="text-xs text-slate-500 mt-1">Supports YouTube, Google Drive, GitHub, blog posts, etc.</p>
              </div>
            ) : (
              <>
                <div>
                  <Label htmlFor="file">Upload File {formData.type === 'video' && '(or provide URL)'}</Label>
                  <Input
                    id="file"
                    type="file"
                    onChange={handleFileChange}
                    accept={
                      formData.type === 'pdf' ? 'application/pdf' :
                      formData.type === 'video' ? 'video/*' :
                      '.doc,.docx,.txt'
                    }
                  />
                  {formData.file && (
                    <div className="mt-2 flex items-center gap-2">
                      <File className="w-4 h-4 text-slate-600" />
                      <span className="text-sm text-slate-600">{formData.file.name}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setFormData({ ...formData, file: null })}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
                {formData.type === 'video' && (
                  <div>
                    <Label htmlFor="videoUrl">Or Video URL (YouTube, Google Drive, etc.)</Label>
                    <Input
                      id="videoUrl"
                      type="url"
                      value={formData.url}
                      onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                      placeholder="https://youtube.com/watch?v=... or https://drive.google.com/..."
                    />
                  </div>
                )}
              </>
            )}

            <div>
              <Label htmlFor="coverPhoto">Cover Photo (Optional)</Label>
              <Input
                id="coverPhoto"
                type="file"
                accept="image/*"
                onChange={handleCoverPhotoChange}
              />
              {(formData.coverPhoto || formData.coverPhotoUrl) && (
                <div className="mt-2">
                  {formData.coverPhoto ? (
                    <div className="flex items-center gap-2">
                      <img 
                        src={URL.createObjectURL(formData.coverPhoto)} 
                        alt="Cover preview" 
                        className="w-32 h-20 object-cover rounded border"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setFormData({ ...formData, coverPhoto: null, coverPhotoUrl: '' })}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : formData.coverPhotoUrl ? (
                    <div className="flex items-center gap-2">
                      <img 
                        src={formData.coverPhotoUrl.startsWith('http') ? formData.coverPhotoUrl : `${window.location.origin}${formData.coverPhotoUrl}`} 
                        alt="Cover preview" 
                        className="w-32 h-20 object-cover rounded border"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setFormData({ ...formData, coverPhotoUrl: '' })}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : null}
                </div>
              )}
              <p className="text-xs text-slate-500 mt-1">Upload a cover image for this material (max 5MB, JPG/PNG)</p>
            </div>

            <div>
              <Label htmlFor="tags">Tags (Optional)</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="e.g., Unit 1, MCQ, Revision (comma-separated)"
              />
              <p className="text-xs text-slate-500 mt-1">Separate multiple tags with commas</p>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                Cancel
              </Button>
              <Button type="submit">
                {editingMaterial ? 'Update Material' : 'Upload Material'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewMaterial} onOpenChange={() => setPreviewMaterial(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewMaterial?.title}</DialogTitle>
            <DialogDescription>{previewMaterial?.description}</DialogDescription>
          </DialogHeader>
          {previewMaterial && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={typeColors[previewMaterial.type]}>{previewMaterial.type}</Badge>
                <span className="text-sm text-slate-600">{previewMaterial.branch} - Sem {previewMaterial.semester}</span>
                <span className="text-sm text-slate-600">{previewMaterial.subjectName}</span>
              </div>

              {previewMaterial.type === 'pdf' && (
                <iframe
                  src={previewMaterial.url.startsWith('http') ? previewMaterial.url : `${window.location.origin}${previewMaterial.url}`}
                  className="w-full h-96 border rounded"
                  title={previewMaterial.title}
                />
              )}

              {previewMaterial.type === 'video' && (
                <div className="w-full">
                  {previewMaterial.url.includes('youtube.com') || previewMaterial.url.includes('youtu.be') ? (
                    <iframe
                      src={previewMaterial.url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                      className="w-full h-96 border rounded"
                      allowFullScreen
                      title={previewMaterial.title}
                    />
                  ) : (
                    <video
                      src={previewMaterial.url}
                      controls
                      className="w-full h-96 border rounded"
                    />
                  )}
                </div>
              )}

              {previewMaterial.type === 'notes' && (
                <div className="border rounded p-4 bg-slate-50">
                  <p className="text-sm text-slate-600 mb-2">Notes content will be displayed here</p>
                  <a
                    href={previewMaterial.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open Notes
                  </a>
                </div>
              )}

              {previewMaterial.type === 'link' && (
                <div className="border rounded p-4 bg-slate-50">
                  <a
                    href={previewMaterial.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {previewMaterial.url}
                  </a>
                </div>
              )}

              {previewMaterial.tags && previewMaterial.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {previewMaterial.tags.map((tag, idx) => (
                    <Badge key={`preview-${previewMaterial._id || 'material'}-tag-${idx}-${tag}`} variant="outline">{tag}</Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminMaterialManager;

