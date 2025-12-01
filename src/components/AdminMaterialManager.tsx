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
import { normalizeMaterialUrls } from '@/lib/urlUtils';
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
  Filter,
  Lock,
  DollarSign,
  Cloud
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { authService } from '@/lib/auth';
import { useAuth } from '@/contexts/AuthContext';
import { ALL_BRANCHES } from '@/constants/branches';
import { useWebSocket } from '@/hooks/useWebSocket';

interface Material {
  _id: string;
  id?: string; // Optional: for compatibility with different data sources
  title: string;
  description: string;
  type: 'pdf' | 'video' | 'notes' | 'link';
  url: string;
  branch: string;
  branches?: string[]; // New: array of branches
  semester: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  // Academic resource category (syllabus, model_answer_papers, etc.)
  resourceType: string;
  // Access type: 'free', 'drive_protected', 'paid'
  accessType?: 'free' | 'drive_protected' | 'paid';
  // Price for paid materials (in INR)
  price?: number;
  // Google Drive URL for drive protected materials
  googleDriveUrl?: string;
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
  branches: string[]; // New: array of selected branches
  semester: string;
  subjectId: string;
  subjectCode: string;
  resourceType: string;
  accessType: 'free' | 'drive_protected' | 'paid'; // New: access type
  price: number; // New: price for paid materials
  googleDriveUrl: string; // New: Google Drive URL
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
  const [activeTab, setActiveTab] = useState<'free' | 'drive_protected' | 'paid'>('free'); // New: active tab
  
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
    branches: [], // New: array of branches
    semester: '',
    subjectId: '',
    subjectCode: '',
    resourceType: 'syllabus',
    accessType: 'free', // New: default to free
    price: 0, // New: default price
    googleDriveUrl: '', // New: Google Drive URL
    tags: '',
    file: null,
    coverPhoto: null,
    coverPhotoUrl: ''
  });

  // Resource types based on access type
  const FREE_RESOURCE_TYPES = [
    { value: 'syllabus', label: 'Syllabus', emoji: '📜' },
    { value: 'model_answer_papers', label: 'Model Answer Papers', emoji: '✅' },
    { value: 'pyqs', label: "PYQ's", emoji: '📘' },
  ];

  const DRIVE_PROTECTED_RESOURCE_TYPES = [
    { value: 'manual_answer', label: 'Manual Answer', emoji: '✍️' },
    { value: 'micro_project_topics', label: 'Micro Project Topics', emoji: '🧪' },
  ];

  const PAID_RESOURCE_TYPES = [
    { value: 'notes', label: 'Notes', emoji: '📝' },
    { value: 'msbte_imp', label: 'DigiDiploma VVIMP', emoji: '✨' },
    { value: 'guess_papers', label: 'Guessing Papers', emoji: '🤔' },
  ];

  // Get resource types based on active tab
  const getResourceTypes = () => {
    switch (activeTab) {
      case 'free':
        return FREE_RESOURCE_TYPES;
      case 'drive_protected':
        return DRIVE_PROTECTED_RESOURCE_TYPES;
      case 'paid':
        return PAID_RESOURCE_TYPES;
      default:
        return FREE_RESOURCE_TYPES;
    }
  };

  // Sync formData.accessType with activeTab when tab changes (for new materials only)
  // IMPORTANT: Don't override accessType when editing - it's already set in handleEdit
  useEffect(() => {
    if (!editingMaterial && isDialogOpen) {
      setFormData(prev => ({
        ...prev,
        accessType: activeTab,
        // Reset price if switching away from paid
        price: activeTab === 'paid' ? prev.price : 0,
        // Reset googleDriveUrl if switching away from drive_protected
        googleDriveUrl: activeTab === 'drive_protected' ? prev.googleDriveUrl : ''
      }));
    }
  }, [activeTab, isDialogOpen, editingMaterial]);
  
  // Separate effect to sync activeTab when editing starts (runs once when dialog opens for editing)
  useEffect(() => {
    if (editingMaterial && isDialogOpen && formData.accessType) {
      // When editing starts, ensure activeTab matches formData.accessType
      if (formData.accessType !== activeTab) {
        console.log('🔄 Syncing activeTab to match editing material accessType:', formData.accessType);
        setActiveTab(formData.accessType);
      }
    }
  }, [editingMaterial?._id, isDialogOpen]); // Only run when editing starts (material ID changes)

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
        // Normalize IDs - ensure all materials have both _id and id, and preserve accessType
        const normalizedMaterials = (Array.isArray(data) ? data : []).map((m: any) => {
          // Explicitly preserve accessType - check if it's a valid value
          const validAccessTypes = ['free', 'drive_protected', 'paid'];
          const materialAccessType = m.accessType && validAccessTypes.includes(m.accessType) 
            ? m.accessType 
            : 'free';
          
          const normalized = {
            ...m,
            _id: m._id || m.id,
            id: m.id || m._id,
            // Explicitly preserve accessType - use valid value or default to 'free'
            accessType: materialAccessType,
            price: m.price || 0,
            googleDriveUrl: m.googleDriveUrl || null
          };
          
          // Normalize URLs (convert localhost URLs to relative paths)
          return normalizeMaterialUrls(normalized);
        });
        setMaterials(normalizedMaterials);
        console.log(`✅ Loaded ${normalizedMaterials.length} materials`);
        // Log accessType distribution
        const accessTypeCounts = normalizedMaterials.reduce((acc: any, m: any) => {
          acc[m.accessType || 'free'] = (acc[m.accessType || 'free'] || 0) + 1;
          return acc;
        }, {});
        console.log('📊 Materials by accessType:', accessTypeCounts);
      } else {
        console.error('Failed to fetch materials:', res.statusText);
        setMaterials([]);
      }
    } catch (error) {
      console.error('Error fetching materials:', error);
      toast.error('Failed to fetch materials');
      setMaterials([]);
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
    
    if (!selectedBranch || !formData.semester || !formData.subjectCode) {
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

    // Ensure accessType matches activeTab when creating new material (not editing)
    // For new materials, always use activeTab. For editing, use formData.accessType
    // CRITICAL: Use activeTab for new materials to ensure correct access type
    let finalAccessType: 'free' | 'drive_protected' | 'paid' = 'free';
    
    if (editingMaterial) {
      // When editing, use formData.accessType (which should match the material's original accessType)
      // But also check activeTab as fallback to ensure we have a valid value
      finalAccessType = (formData.accessType as 'free' | 'drive_protected' | 'paid') || 
                        (activeTab as 'free' | 'drive_protected' | 'paid') || 
                        'free';
      console.log('🔧 Editing material - using accessType:', {
        formDataAccessType: formData.accessType,
        activeTab: activeTab,
        finalAccessType: finalAccessType
      });
    } else {
      // When creating new, ALWAYS use activeTab - this is the source of truth
      finalAccessType = (activeTab as 'free' | 'drive_protected' | 'paid') || 'free';
    }
    
    console.log('🔍 AccessType determination (CRITICAL):', {
      editingMaterial: !!editingMaterial,
      activeTab: activeTab,
      activeTabType: typeof activeTab,
      formDataAccessType: formData.accessType,
      formDataAccessTypeType: typeof formData.accessType,
      finalAccessType: finalAccessType,
      finalAccessTypeType: typeof finalAccessType,
      isValid: ['free', 'drive_protected', 'paid'].includes(finalAccessType)
    });
    
    // Double-check: if finalAccessType is not valid, use activeTab as fallback
    if (!['free', 'drive_protected', 'paid'].includes(finalAccessType)) {
      console.warn('⚠️ Invalid finalAccessType, using activeTab as fallback:', finalAccessType, '->', activeTab);
      finalAccessType = (activeTab as 'free' | 'drive_protected' | 'paid') || 'free';
    }
    
    // Validate drive_protected materials require googleDriveUrl
    if (finalAccessType === 'drive_protected' && !formData.googleDriveUrl?.trim()) {
      toast.error('Google Drive URL is required for drive protected materials');
      return;
    }
    
    // Validate price for paid materials
    if (finalAccessType === 'paid' && (!formData.price || formData.price <= 0)) {
      toast.error('Please enter a valid price (greater than 0) for paid materials');
      return;
    }
    
    // For drive_protected materials, skip file/url validation (only Google Drive URL is needed)
    if (finalAccessType !== 'drive_protected') {
      if (formData.type !== 'link' && !formData.file && !formData.url) {
        toast.error('Please upload a file or provide a URL');
        return;
      }

      if (formData.type === 'link' && !formData.url.trim()) {
        toast.error('Please provide a valid URL');
        return;
      }
    }

    try {
      let materialUrl = formData.url;
      
      // For drive protected materials, skip file upload - use googleDriveUrl directly
      if (finalAccessType === 'drive_protected') {
        materialUrl = formData.googleDriveUrl || '';
      } else {
        // Upload file if provided (for free and paid materials)
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
        // Store storage type for deletion
        const storageType = uploadData.storage || (uploadData.url?.includes('r2.cloudflarestorage.com') ? 'r2' : 'local');
        console.log(`📦 File storage type: ${storageType}`);
        }
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
      
      // Use only the selected branch
      if (!selectedBranch) {
        toast.error('Please select a branch');
        return;
      }
      
      const selectedBranchName = selectedBranch.trim();
      
      // For drive protected, use googleDriveUrl if provided, otherwise use materialUrl
      const finalUrl = finalAccessType === 'drive_protected' && formData.googleDriveUrl 
        ? formData.googleDriveUrl 
        : materialUrl;
      
      // Detect storage type from URL
      const storageType = finalUrl.includes('r2.cloudflarestorage.com') || 
                         finalUrl.includes('/api/materials/proxy/r2/') 
                         ? 'r2' : 'local';
      
      console.log('📤 Material upload data:', {
        title: formData.title.trim(),
        subjectCode: formData.subjectCode,
        branch: selectedBranchName,
        semester: formData.semester,
        resourceType: formData.resourceType,
        activeTab: activeTab,
        formDataAccessType: formData.accessType,
        finalAccessType: finalAccessType,
        price: formData.price,
        editingMaterial: !!editingMaterial
      });
      
      // CRITICAL: Ensure finalAccessType is valid before creating materialData
      const validatedAccessType = (finalAccessType && ['free', 'drive_protected', 'paid'].includes(finalAccessType))
        ? finalAccessType
        : (activeTab && ['free', 'drive_protected', 'paid'].includes(activeTab))
          ? activeTab
          : 'free';
      
      console.log('🔒 CRITICAL: Validating accessType before sending:', {
        finalAccessType,
        activeTab,
        validatedAccessType,
        formDataAccessType: formData.accessType
      });
      
      const materialData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        type: formData.type,
        url: finalUrl,
        branch: selectedBranchName,
        branches: [selectedBranchName], // Single branch array
        semester: formData.semester,
        subjectId: selectedSubjectObj?._id || formData.subjectCode,
        subjectName: selectedSubjectObj?.name || '',
        subjectCode: formData.subjectCode, // Send the subject code as-is (backend will normalize)
        resourceType: formData.resourceType,
        // CRITICAL: Always include accessType - use validated value
        accessType: validatedAccessType,
        price: validatedAccessType === 'paid' ? (formData.price || 0) : 0, // New: price for paid materials
        googleDriveUrl: validatedAccessType === 'drive_protected' ? (formData.googleDriveUrl?.trim() || null) : null, // New: Google Drive URL - only for drive_protected
        storageType: storageType, // New: storage type for deletion
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        coverPhoto: coverPhotoUrl || null,
        uploadedBy: user?.id || 'admin'
      };
      
      // CRITICAL: Verify accessType is in materialData before sending
      if (!materialData.accessType || !['free', 'drive_protected', 'paid'].includes(materialData.accessType)) {
        console.error('❌ CRITICAL ERROR: accessType is missing or invalid in materialData!', {
          materialDataAccessType: materialData.accessType,
          finalAccessType,
          activeTab,
          formDataAccessType: formData.accessType,
          materialDataKeys: Object.keys(materialData)
        });
        toast.error('Error: Access type is invalid. Please try again.');
        return;
      }
      
      console.log('📤 FINAL Material data being sent to backend:', {
        title: materialData.title,
        resourceType: materialData.resourceType,
        accessType: materialData.accessType,
        accessTypeType: typeof materialData.accessType,
        accessTypeValue: JSON.stringify(materialData.accessType),
        price: materialData.price,
        googleDriveUrl: materialData.googleDriveUrl,
        activeTab: activeTab,
        activeTabType: typeof activeTab,
        editingMaterial: !!editingMaterial,
        formDataAccessType: formData.accessType,
        finalAccessType: finalAccessType,
        subjectCode: materialData.subjectCode,
        branch: materialData.branch,
        semester: materialData.semester,
        fullMaterialData: JSON.stringify(materialData, null, 2)
      });

      // CRITICAL: Final verification and force-set accessType if missing
      if (!materialData.accessType || !['free', 'drive_protected', 'paid'].includes(materialData.accessType)) {
        console.error('❌ CRITICAL: accessType missing in materialData, forcing to activeTab:', activeTab);
        materialData.accessType = (activeTab && ['free', 'drive_protected', 'paid'].includes(activeTab)) 
          ? activeTab 
          : 'free';
      }
      
      console.log('📤 About to send materialData with accessType:', materialData.accessType);
      console.log('📤 Full materialData object keys:', Object.keys(materialData));
      console.log('📤 Full materialData JSON (first 500 chars):', JSON.stringify(materialData).substring(0, 500));
      
      const url = editingMaterial ? `/api/materials/${editingMaterial._id}` : '/api/materials';
      const method = editingMaterial ? 'PUT' : 'POST';

      const requestBody = JSON.stringify(materialData);
      console.log('📤 Request body stringified length:', requestBody.length);
      console.log('📤 Request body contains "accessType":', requestBody.includes('"accessType"'));
      console.log('📤 Request body contains accessType value:', requestBody.includes(`"accessType":"${materialData.accessType}"`));
      
      // Parse and verify the request body one more time - ensure accessType is present
      let finalRequestBody = requestBody;
      try {
        const parsedBody = JSON.parse(requestBody);
        if (!parsedBody.accessType || !['free', 'drive_protected', 'paid'].includes(parsedBody.accessType)) {
          console.error('❌ CRITICAL: accessType missing or invalid after JSON.stringify/parse! Forcing...');
          parsedBody.accessType = materialData.accessType || activeTab || 'free';
          finalRequestBody = JSON.stringify(parsedBody);
          console.log('✅ Fixed request body with accessType:', parsedBody.accessType);
        }
      } catch (parseError) {
        console.error('❌ Error parsing request body:', parseError);
        toast.error('Error preparing material data. Please try again.');
        return;
      }
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...authService.getAuthHeaders()
        },
        body: finalRequestBody
      });

      if (res.ok) {
        const response = await res.json();
        if (response.count && response.count > 1) {
          toast.success(`Material uploaded successfully for ${response.count} subjects across ${new Set(response.materials.map((m: any) => m.branch)).size} branches`);
        } else {
          toast.success(editingMaterial ? 'Material updated successfully' : 'Material uploaded successfully');
        }
        setIsDialogOpen(false);
        resetForm();
        fetchMaterials();
      } else {
        const error = await res.json();
        console.error('❌ Material upload error:', error);
        const errorMessage = error.error || error.details || 'Failed to save material';
        toast.error(errorMessage);
        
        // Show detailed error if available
        if (error.details && Array.isArray(error.details)) {
          const details = error.details.map((d: any) => `${d.branch || 'Unknown'}: ${d.error || d}`).join(', ');
          console.error('Error details:', details);
        }
      }
    } catch (error: any) {
      console.error('Error saving material:', error);
      toast.error(error.message || 'Failed to save material');
    }
  };

  const handleEdit = (material: Material) => {
    setEditingMaterial(material);
    const materialBranches = material.branches || (material.branch ? [material.branch] : []);
    setFormData({
      title: material.title,
      description: material.description || '',
      type: material.type,
      url: material.url,
      branch: material.branch || (materialBranches.length > 0 ? materialBranches[0] : ''),
      branches: materialBranches, // New: array of branches
      semester: material.semester,
      subjectId: material.subjectId,
      subjectCode: material.subjectCode,
      resourceType: material.resourceType || 'syllabus',
      accessType: material.accessType || 'free', // New: access type
      price: material.price || 0, // New: price
      googleDriveUrl: material.googleDriveUrl || '', // New: Google Drive URL
      tags: material.tags?.join(', ') || '',
      file: null,
      coverPhoto: null,
      coverPhotoUrl: material.coverPhoto || ''
    });
    setActiveTab(material.accessType || 'free'); // Set active tab based on access type
    setSelectedBranch(material.branch || (materialBranches.length > 0 ? materialBranches[0] : ''));
    setSelectedSemester(material.semester);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!id || id === 'undefined' || id === '') {
      console.error('❌ Cannot delete material: ID is invalid', { id });
      toast.error('Cannot delete material: Missing or invalid ID');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this material? This action cannot be undone.')) {
      return;
    }

    try {
      console.log(`🗑️ Deleting material with ID: ${id}`);
      const res = await fetch(`/api/materials/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          ...authService.getAuthHeaders() 
        }
      });

      const responseData = await res.json().catch(() => null);

      if (res.ok) {
        toast.success('Material deleted successfully');
        // Remove from local state immediately for better UX
        setMaterials(prev => prev.filter(m => (m._id !== id && (m.id ?? '') !== id)));
        // Refresh the list to ensure consistency
        setTimeout(() => fetchMaterials(), 500);
      } else {
        const errorMessage = responseData?.error || responseData?.details || `HTTP ${res.status}: ${res.statusText}`;
        console.error('❌ Delete failed:', { 
          status: res.status, 
          statusText: res.statusText,
          error: errorMessage,
          response: responseData
        });
        toast.error(`Failed to delete material: ${errorMessage}`);
      }
    } catch (error: any) {
      console.error('❌ Error deleting material:', error);
      toast.error(`Failed to delete material: ${error.message || 'Network error'}`);
    }
  };

  const resetForm = () => {
    const defaultResourceType = getResourceTypes()[0]?.value || 'syllabus';
    setFormData({
      title: '',
      description: '',
      type: 'pdf',
      url: '',
      branch: branches.length > 0 ? branches[0] : '',
      branches: [], // New: reset branches array
      semester: semesters.length > 0 ? String(semesters[0]) : '',
      subjectId: '',
      subjectCode: '',
      resourceType: defaultResourceType,
      accessType: activeTab, // New: set based on active tab
      price: 0, // New: reset price
      googleDriveUrl: '', // New: reset Google Drive URL
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
    
    // Check branch filter - material should match if:
    // 1. Filter is 'all', OR
    // 2. Material's branch matches, OR
    // 3. Material's branches array includes the filter branch
    const matchesBranch = filterBranch === 'all' || 
                         material.branch === filterBranch || 
                         (material.branches && material.branches.includes(filterBranch));
    
    // Filter by access type based on active tab
    const matchesAccessType = (material.accessType || 'free') === activeTab;
    
    return matchesSearch && matchesType && matchesBranch && matchesAccessType;
  });

  // Helper function to get proxy URL for R2 images (similar to AdminProjectsManager)
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
        
        console.log('🖼️ Parsing cover photo URL:', { original: url, pathname });
        
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
          const proxyUrl = `/api/materials/proxy/r2/${encodeURIComponent(key)}`;
          console.log('✅ Generated proxy URL:', { original: url, key, proxyUrl });
          return proxyUrl;
        } else {
          console.warn('⚠️ Could not extract key from R2 URL:', url);
        }
      } catch (e) {
        console.error('❌ Error parsing R2 URL:', e, url);
      }
    }
    
    // For non-R2 URLs, return as is if it's already a full URL
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // For relative paths, make them absolute
    if (url.startsWith('/')) {
      return `${window.location.origin}${url}`;
    }
    
    // Default: assume relative path
    return `${window.location.origin}/${url}`;
  };

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
          // Set access type based on active tab when creating new material
          const defaultResourceType = getResourceTypes()[0]?.value || 'syllabus';
          console.log('🔵 Opening dialog - activeTab:', activeTab, 'type:', typeof activeTab);
          // First reset form, then set accessType to match activeTab
          resetForm();
          // After reset, explicitly set accessType to activeTab
          setFormData(prev => ({
            ...prev,
            accessType: activeTab, // Ensure it matches activeTab
            resourceType: defaultResourceType,
            branches: []
          }));
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

      {/* Tabs for Material Types */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'free' | 'drive_protected' | 'paid')}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="free" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Free Materials
          </TabsTrigger>
          <TabsTrigger value="drive_protected" className="flex items-center gap-2">
            <Cloud className="w-4 h-4" />
            Drive Protected
          </TabsTrigger>
          <TabsTrigger value="paid" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Paid Materials
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
            const coverPhotoUrl = material.coverPhoto ? getProxyUrl(material.coverPhoto) : '';
            
            return (
              <Card key={material._id || `material-${index}`} className="hover:shadow-lg transition-shadow overflow-hidden flex flex-col h-full border border-slate-200">
                {material.coverPhoto && (
                  <div className="w-full h-36 overflow-hidden bg-slate-100 relative flex-shrink-0">
                    <img 
                      src={coverPhotoUrl || material.coverPhoto}
                      alt={material.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        console.error('❌ Failed to load cover photo:', {
                          proxyUrl: coverPhotoUrl,
                          original: material.coverPhoto,
                          materialId: material._id,
                          currentSrc: img.src,
                          materialTitle: material.title
                        });
                        
                        // If proxy URL failed, try original URL as fallback
                        const originalUrl = material.coverPhoto;
                        if (originalUrl && originalUrl !== img.src && !img.src.includes(originalUrl)) {
                          // Only try fallback if we haven't already tried it
                          if (img.dataset.fallbackTried !== 'true') {
                            img.dataset.fallbackTried = 'true';
                            console.log('🔄 Trying original URL as fallback:', originalUrl);
                            img.src = originalUrl;
                            return;
                          }
                        }
                        
                        // If all attempts failed, show placeholder
                        console.log('⚠️ All attempts failed, showing placeholder');
                        img.style.display = 'none';
                        const placeholder = document.createElement('div');
                        placeholder.className = 'w-full h-full flex items-center justify-center bg-slate-200';
                        placeholder.innerHTML = '<svg class="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>';
                        img.parentElement?.appendChild(placeholder);
                      }}
                      onLoad={(e) => {
                        const img = e.target as HTMLImageElement;
                        console.log('✅ Cover photo loaded successfully:', {
                          src: img.src,
                          materialId: material._id,
                          materialTitle: material.title
                        });
                        // Remove any placeholder if image loads successfully
                        const placeholder = img.parentElement?.querySelector('div[class*="bg-slate-200"]');
                        if (placeholder) {
                          placeholder.remove();
                        }
                      }}
                    />
                  </div>
                )}
                <CardHeader className="flex-shrink-0 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <TypeIcon className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                      <CardTitle className="text-base font-semibold line-clamp-2 leading-tight">{material.title}</CardTitle>
                        <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                          <Badge className={`${typeColors[material.type]} text-xs`}>{material.type}</Badge>
                          {/* Access Type Badge */}
                          {material.accessType && (
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                material.accessType === 'free' ? 'bg-green-50 text-green-700 border-green-200' :
                                material.accessType === 'drive_protected' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                'bg-yellow-50 text-yellow-700 border-yellow-200'
                              }`}
                            >
                              {material.accessType === 'free' ? '🆓 Free' :
                               material.accessType === 'drive_protected' ? '☁️ Drive' :
                               `💰 ₹${material.price || 0}`}
                            </Badge>
                          )}
                          {/* Multi-branch indicator */}
                          {material.branches && material.branches.length > 1 && (
                            <Badge variant="outline" className="text-xs">
                              {material.branches.length} branches
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <span>
                        {(FREE_RESOURCE_TYPES.concat(DRIVE_PROTECTED_RESOURCE_TYPES, PAID_RESOURCE_TYPES).find(r => r.value === material.resourceType)?.emoji || '📚')}
                      </span>
                      {(FREE_RESOURCE_TYPES.concat(DRIVE_PROTECTED_RESOURCE_TYPES, PAID_RESOURCE_TYPES).find(r => r.value === material.resourceType)?.label || 'Material')}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col pt-0">
                  <p className="text-sm text-slate-600 mb-3 line-clamp-2 min-h-[2.5rem]">{material.description || 'No description'}</p>
                  
                  <div className="space-y-1.5 mb-3 flex-1">
                    <div className="text-xs text-slate-500 truncate">
                      <strong>Branch{material.branches && material.branches.length > 1 ? 'es' : ''}:</strong>{' '}
                      <span className="truncate block">
                        {material.branches && material.branches.length > 0 
                          ? material.branches.join(', ') 
                          : material.branch}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      <strong>Semester:</strong> {material.semester}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      <strong>Subject:</strong> <span className="truncate">{material.subjectName || material.subjectCode}</span>
                    </div>
                    {material.tags && material.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {material.tags.slice(0, 3).map((tag, idx) => (
                          <Badge key={`${material._id || 'material'}-tag-${idx}-${tag}`} variant="outline" className="text-xs">{tag}</Badge>
                        ))}
                        {material.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">+{material.tags.length - 3}</Badge>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-200 mt-auto flex-shrink-0">
                    <div className="flex items-center gap-2 text-xs text-slate-500 flex-shrink-0">
                      <span className="flex items-center gap-1 whitespace-nowrap">
                        <Download className="w-3 h-3" />
                        {material.downloads || 0}
                      </span>
                      <span className="flex items-center gap-1 whitespace-nowrap">
                        <Star className="w-3 h-3 text-yellow-500" />
                        {(material.rating ?? 0).toFixed(1)}
                      </span>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setPreviewMaterial(material)}
                        title="Preview material"
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(material)}
                        title="Edit material"
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const materialId = material._id || material.id;
                          if (materialId) {
                            if (window.confirm(`Are you sure you want to delete "${material.title}"?\n\nThis action cannot be undone and will also delete the associated file from storage.`)) {
                              handleDelete(materialId);
                            }
                          } else {
                            console.error('Material ID not found:', material);
                            toast.error('Cannot delete: Material ID is missing');
                          }
                        }}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        disabled={!material._id && !material.id}
                        title="Delete material"
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
        </TabsContent>
      </Tabs>

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
            {/* Access Type - Set based on active tab when creating new, editable when editing */}
            {editingMaterial ? (
              <div>
                <Label htmlFor="accessType">Access Type *</Label>
                <Select
                  value={formData.accessType}
                  onValueChange={(value) => {
                    const newAccessType = value as 'free' | 'drive_protected' | 'paid';
                    // Update activeTab to match the new accessType so material appears in correct section
                    setActiveTab(newAccessType);
                    // Update formData - preserve price if switching to paid, preserve googleDriveUrl if switching to drive_protected
                    setFormData(prev => ({
                      ...prev,
                      accessType: newAccessType,
                      // Only reset price if switching away from paid
                      price: newAccessType === 'paid' ? (prev.price || 0) : 0,
                      // Only reset googleDriveUrl if switching away from drive_protected
                      googleDriveUrl: newAccessType === 'drive_protected' ? (prev.googleDriveUrl || '') : ''
                    }));
                    // Reset resource type to first available for new access type
                    const newResourceTypes = newAccessType === 'free' ? FREE_RESOURCE_TYPES : newAccessType === 'drive_protected' ? DRIVE_PROTECTED_RESOURCE_TYPES : PAID_RESOURCE_TYPES;
                    if (newResourceTypes.length > 0) {
                      setFormData(prev => ({ ...prev, resourceType: newResourceTypes[0].value }));
                    }
                  }}
                >
                  <SelectTrigger className="bg-white text-slate-900 border-slate-300 hover:bg-slate-50">
                    <SelectValue placeholder="Select access type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 z-[100]">
                    <SelectItem value="free" className="text-slate-900">Free</SelectItem>
                    <SelectItem value="drive_protected" className="text-slate-900">Drive Protected</SelectItem>
                    <SelectItem value="paid" className="text-slate-900">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Access Type:</strong> {activeTab === 'free' ? 'Free' : activeTab === 'drive_protected' ? 'Drive Protected' : 'Paid'}
                </p>
              </div>
            )}


            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="branch">Branch *</Label>
                <Select 
                  value={selectedBranch} 
                  onValueChange={(value) => {
                    setSelectedBranch(value);
                    setFormData({ ...formData, branch: value, branches: [value], semester: '', subjectCode: '', subjectId: '' });
                    setSelectedSemester('');
                    setSelectedSubject('');
                  }}
                  disabled={branches.length === 0}
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
                <p className="text-xs text-slate-500 mt-1">Select the branch for this material</p>
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
                    {getResourceTypes().map((type) => (
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

            {/* Price field for paid materials */}
            {(editingMaterial ? formData.accessType === 'paid' : activeTab === 'paid') && (
              <div>
                <Label htmlFor="price">Price (INR) *</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  required={true}
                  placeholder="Enter price in INR"
                />
                <p className="text-xs text-slate-500 mt-1">Set the price for this paid material</p>
              </div>
            )}

            {/* Google Drive URL for drive protected materials */}
            {(editingMaterial ? formData.accessType === 'drive_protected' : activeTab === 'drive_protected') && (
              <div>
                <Label htmlFor="googleDriveUrl">Google Drive URL *</Label>
                <Input
                  id="googleDriveUrl"
                  type="url"
                  value={formData.googleDriveUrl}
                  onChange={(e) => setFormData({ ...formData, googleDriveUrl: e.target.value })}
                  required={true}
                  placeholder="https://drive.google.com/file/d/..."
                />
                <p className="text-xs text-slate-500 mt-1">Enter the Google Drive shareable link for this material</p>
              </div>
            )}

            {/* Material Type and File Upload - Only show for free and paid materials, NOT for drive_protected */}
            {!(editingMaterial ? formData.accessType === 'drive_protected' : activeTab === 'drive_protected') && (
              <>
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
                        src={getProxyUrl(formData.coverPhotoUrl)} 
                        alt="Cover preview" 
                        className="w-32 h-20 object-cover rounded border"
                        onError={(e) => {
                          // Fallback to original URL if proxy fails
                          const originalUrl = formData.coverPhotoUrl;
                          if (originalUrl) {
                            const fallbackUrl = originalUrl.startsWith('http') 
                              ? originalUrl 
                              : `${window.location.origin}${originalUrl.startsWith('/') ? originalUrl : '/' + originalUrl}`;
                            (e.target as HTMLImageElement).src = fallbackUrl;
                          }
                        }}
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

