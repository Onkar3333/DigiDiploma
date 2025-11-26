import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { 
  BookOpen, 
  FileText, 
  Download, 
  Search, 
  ArrowLeft,
  ArrowRight,
  GraduationCap,
  FileCode,
  Image,
  Video,
  Music,
  File,
  Table,
  Presentation,
  Archive,
  Eye,
  ChevronRight,
  FolderOpen,
  Calendar,
  User,
  Star
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/lib/auth';
import SubjectMaterials from '@/components/SubjectMaterials';
import MaterialViewer from '@/components/MaterialViewer';
import { useToast } from '@/hooks/use-toast';
import { useWebSocket } from '@/hooks/useWebSocket';
import { ALL_BRANCHES } from '@/constants/branches';

const AVAILABLE_BRANCHES = [...ALL_BRANCHES];

interface Subject {
  _id: string;
  name: string;
  code: string;
  credits?: number;
  semester: number;
  branch: string;
  description?: string;
  isActive?: boolean;
}

interface Material {
  _id: string;
  title: string;
  type: string;
  url: string;
  description?: string;
  subjectCode?: string;
  subjectName?: string;
  branch?: string;
  semester?: number;
  // Academic resource category from admin (syllabus, model_answer_papers, etc.)
  resourceType?: string;
  downloads?: number;
  rating?: number;
  ratingCount?: number;
  createdAt?: string;
  size?: string;
}

const Materials = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewingMaterial, setViewingMaterial] = useState<Material | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

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

  // WebSocket for real-time material updates
  useWebSocket({
    userId: user?.id || '',
    token: authService.getToken() || undefined,
    onMessage: (message) => {
      if (message.type === 'material_created' || message.type === 'material_updated' || message.type === 'material_uploaded') {
        const newMaterial = message.material;
        // Only update if the material matches the current subject
        if (selectedSubject && newMaterial.subjectCode === selectedSubject.code) {
          console.log('🔄 Real-time material update received:', newMaterial);
          // Refresh materials for the current subject
          if (selectedSubject) {
            fetchMaterials();
          }
        }
      } else if (message.type === 'material_stats_updated' && message.material) {
        if (selectedSubject && message.material.subjectCode === selectedSubject.code) {
          setMaterials(prev => prev.map(m => m._id === message.material._id ? { ...m, ...message.material } : m));
          setViewingMaterial(prev => (prev && prev._id === message.material._id) ? { ...prev, ...message.material } : prev);
        }
      } else if (message.type === 'material_deleted') {
        // Remove deleted material from the list
        setMaterials(prev => prev.filter(m => m._id !== message.materialId));
      }
    }
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/?login=1');
      return;
    }
    // Auto-select user's branch if available and no branch is selected
    if (user?.branch && !selectedBranch) {
      setSelectedBranch(user.branch);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    // Fetch subjects when branch is selected
    if (selectedBranch) {
      fetchSubjects();
      // Reset semester and subject when branch changes
      setSelectedSemester(null);
      setSelectedSubject(null);
      setMaterials([]);
    }
  }, [selectedBranch]);

  useEffect(() => {
    if (selectedSubject) {
      setSelectedCategory('all'); // Reset to 'all' when subject changes
      fetchMaterials();
    }
  }, [selectedSubject]);

  const fetchSubjects = async () => {
    if (!selectedBranch) return;
    setLoading(true);
    try {
      const token = authService.getToken();
      if (!token) {
        console.error('❌ No authentication token found');
        toast({ 
          title: "Authentication required", 
          description: "Please log in to view subjects.",
          variant: "destructive" 
        });
        navigate('/?login=1');
        return;
      }

      const response = await fetch(`/api/subjects/branch/${encodeURIComponent(selectedBranch)}`, {
        headers: {
          ...authService.getAuthHeaders(),
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 401) {
        // Token expired or invalid - try to refresh
        console.log('🔄 Token expired, attempting refresh...');
        const refreshed = await authService.refreshToken();
        if (refreshed) {
          // Retry the request with new token
          const retryResponse = await fetch(`/api/subjects/branch/${encodeURIComponent(selectedBranch)}`, {
            headers: {
              ...authService.getAuthHeaders(),
              'Content-Type': 'application/json'
            }
          });
          if (retryResponse.ok) {
            const retryData = await retryResponse.json();
            processSubjectsData(retryData);
            return;
          }
        }
        // Refresh failed - redirect to login
        console.error('❌ Authentication failed, redirecting to login');
        toast({ 
          title: "Session expired", 
          description: "Please log in again.",
          variant: "destructive" 
        });
        authService.logout();
        navigate('/?login=1');
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        processSubjectsData(data);
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to fetch subjects:', response.status, errorText);
        throw new Error('Failed to fetch subjects');
      }
    } catch (error) {
      console.error('❌ Error fetching subjects:', error);
      toast({ 
        title: "Failed to load subjects", 
        description: "Please try again or contact support if the issue persists.",
        variant: "destructive" 
      });
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  };

  const processSubjectsData = (data: any) => {
    console.log('📚 Raw API response for branch:', selectedBranch, data);
    console.log('📚 Response type:', typeof data, 'Keys:', Object.keys(data));
    
    const allSubjects: Subject[] = [];
    // Data comes grouped by semester: { "1": [...], "2": [...] }
    // Handle both object format and array format
    if (Array.isArray(data)) {
      // If API returns array directly, process it
      console.log('📚 API returned array format, processing', data.length, 'subjects');
      data.forEach((subject: any) => {
        allSubjects.push({
          _id: subject._id || subject.id || '',
          name: subject.name || '',
          code: subject.code || '',
          credits: subject.credits || 4,
          semester: subject.semester || 1,
          branch: subject.branch || selectedBranch,
          description: subject.description || '',
          isActive: subject.isActive !== undefined ? subject.isActive : true
        });
      });
    } else if (typeof data === 'object' && data !== null) {
      // Process grouped by semester format
      Object.entries(data).forEach(([semester, semesterSubjects]: [string, any]) => {
        console.log(`📖 Processing semester ${semester}:`, Array.isArray(semesterSubjects) ? semesterSubjects.length : 'not an array');
        if (Array.isArray(semesterSubjects)) {
          // Ensure each subject has all required fields
          semesterSubjects.forEach((subject: any) => {
            if (subject && subject.name && subject.code) {
              allSubjects.push({
                _id: subject._id || subject.id || `subj-${subject.code}-${semester}`,
                name: subject.name || '',
                code: subject.code || '',
                credits: subject.credits || 4,
                semester: subject.semester || parseInt(semester),
                branch: subject.branch || selectedBranch,
                description: subject.description || '',
                isActive: subject.isActive !== undefined ? subject.isActive : true
              });
            } else {
              console.warn('⚠️ Invalid subject data:', subject);
            }
          });
        } else {
          console.warn(`⚠️ Semester ${semester} data is not an array:`, typeof semesterSubjects, semesterSubjects);
        }
      });
    } else {
      console.error('❌ Unexpected data format:', typeof data, data);
    }
    
    // Sort by semester and name
    allSubjects.sort((a, b) => {
      if (a.semester !== b.semester) return a.semester - b.semester;
      return a.name.localeCompare(b.name);
    });
    
    const semestersFound = [...new Set(allSubjects.map(s => s.semester))].sort();
    console.log(`✅ Loaded ${allSubjects.length} subjects for ${selectedBranch} across ${semestersFound.length} semesters:`, semestersFound);
    console.log('📊 Subjects per semester:', semestersFound.map(sem => ({
      semester: sem,
      count: allSubjects.filter(s => s.semester === sem).length
    })));
    
    setSubjects(allSubjects);
  };

  const fetchMaterials = async () => {
    if (!selectedSubject) return;
    setLoading(true);
    try {
      const token = authService.getToken();
      if (!token) {
        console.error('❌ No authentication token found');
        navigate('/?login=1');
        return;
      }

      // Fetch materials by subject code (as uploaded by admin)
      const response = await fetch(`/api/materials/subject/${encodeURIComponent(selectedSubject.code)}`, {
        headers: {
          ...authService.getAuthHeaders(),
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 401) {
        // Token expired - try to refresh
        const refreshed = await authService.refreshToken();
        if (refreshed) {
          // Retry with new token
          const retryResponse = await fetch(`/api/materials/subject/${encodeURIComponent(selectedSubject.code)}`, {
            headers: {
              ...authService.getAuthHeaders(),
              'Content-Type': 'application/json'
            }
          });
          if (retryResponse.ok) {
            const retryData = await retryResponse.json();
            const materialsList = Array.isArray(retryData) ? retryData : [];
            const normalizedList = materialsList.map((m: Material) => {
              // Preserve actual resourceType if it exists, only default to 'notes' if it's missing
              const resourceType = m.resourceType && m.resourceType.trim() !== '' ? m.resourceType : 'notes';
              return {
                ...m,
                downloads: m.downloads ?? 0,
                rating: m.rating ?? 0,
                ratingCount: m.ratingCount ?? 0,
                resourceType: resourceType
              };
            });
            const filteredMaterials = normalizedList.filter((m: Material) => {
              const matchesSubject = m.subjectCode === selectedSubject.code;
              const matchesBranch = !m.branch || m.branch === selectedBranch;
              // Handle semester comparison (can be string or number)
              const materialSemester = typeof m.semester === 'string' ? parseInt(m.semester) : m.semester;
              const matchesSemester = !selectedSemester || !materialSemester || materialSemester === selectedSemester;
              return matchesSubject && matchesBranch && matchesSemester;
            });
            setMaterials(filteredMaterials);
            return;
          }
        }
        // Refresh failed - redirect to login
        authService.logout();
        navigate('/?login=1');
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        const materialsList = Array.isArray(data) ? data : [];
        console.log(`📦 Fetched ${materialsList.length} materials for subject ${selectedSubject.code}`);
        console.log('📦 Sample materials:', materialsList.slice(0, 3).map(m => ({
          title: m.title,
          subjectCode: m.subjectCode,
          branch: m.branch,
          semester: m.semester
        })));
        
        // Filter to only show materials for this specific subject and branch
        const normalizedMaterials = materialsList.map((m: Material) => {
          // Preserve actual resourceType if it exists, only default to 'notes' if it's missing
          const resourceType = m.resourceType && m.resourceType.trim() !== '' ? m.resourceType : 'notes';
          console.log(`📋 Material "${m.title}" - resourceType: "${m.resourceType}" → normalized to: "${resourceType}"`);
          return {
            ...m,
            downloads: m.downloads ?? 0,
            rating: m.rating ?? 0,
            ratingCount: m.ratingCount ?? 0,
            resourceType: resourceType
          };
        });
        const filteredMaterials = normalizedMaterials.filter((m: Material) => {
          // Match by subject code and optionally by branch/semester
          const matchesSubject = m.subjectCode === selectedSubject.code;
          const matchesBranch = !m.branch || m.branch === selectedBranch;
          // Handle semester comparison (can be string or number)
          const materialSemester = typeof m.semester === 'string' ? parseInt(m.semester) : m.semester;
          const matchesSemester = !selectedSemester || !materialSemester || materialSemester === selectedSemester;
          const matches = matchesSubject && matchesBranch && matchesSemester;
          if (!matches && matchesSubject) {
            console.log(`⚠️ Material "${m.title}" filtered out:`, {
              subjectMatch: matchesSubject,
              branchMatch: matchesBranch,
              semesterMatch: matchesSemester,
              materialBranch: m.branch,
              selectedBranch,
              materialSemester,
              selectedSemester
            });
          }
          return matches;
        });
        console.log(`✅ Displaying ${filteredMaterials.length} filtered materials`);
        setMaterials(filteredMaterials);
    } else {
        throw new Error('Failed to fetch materials');
      }
    } catch (error) {
      console.error('Error fetching materials:', error);
      toast({ 
        title: "Failed to load materials", 
        description: "Please try again or contact support if the issue persists.",
        variant: "destructive" 
      });
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  };

  const getSemesters = () => {
    const semesters = new Set<number>();
    subjects.forEach(subject => {
      if (subject.semester && (subject.isActive === undefined || subject.isActive === true)) {
        semesters.add(subject.semester);
      }
    });
    const result = Array.from(semesters).sort((a, b) => a - b);
    console.log('📅 Available semesters:', result, 'from', subjects.length, 'subjects');
    return result;
  };

  const getSubjectsForSemester = (semester: number) => {
    const filtered = subjects.filter(s => 
      s.semester === semester && 
      (s.isActive === undefined || s.isActive === true) &&
      s.branch === selectedBranch
    ).sort((a, b) => a.name.localeCompare(b.name));
    console.log(`📚 Semester ${semester} subjects:`, filtered.length, filtered.map(s => s.name));
    return filtered;
  };

  const updateMaterialStats = (materialId: string, stats: Partial<Material>) => {
    setMaterials(prev => prev.map(m => m._id === materialId ? { ...m, ...stats } : m));
    setViewingMaterial(prev => (prev && prev._id === materialId) ? { ...prev, ...stats } : prev);
  };

  const handleDownload = async (material: Material) => {
    try {
      const response = await fetch(`/api/materials/${material._id}/download`, {
        method: 'POST',
        headers: authService.getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json().catch(() => null);
        if (data?.material) {
          updateMaterialStats(material._id, {
            downloads: data.material.downloads,
            rating: data.material.rating,
            ratingCount: data.material.ratingCount
          });
        }
      }
      // Ensure URL is absolute to avoid React Router interception
      const absoluteUrl = material.url.startsWith('http') 
        ? material.url 
        : `${window.location.origin}${material.url.startsWith('/') ? material.url : '/' + material.url}`;
      window.open(absoluteUrl, '_blank');
      toast({ title: "Download started", description: "Material is being downloaded." });
    } catch (error) {
      // Ensure URL is absolute to avoid React Router interception
      const absoluteUrl = material.url.startsWith('http') 
        ? material.url 
        : `${window.location.origin}${material.url.startsWith('/') ? material.url : '/' + material.url}`;
      window.open(absoluteUrl, '_blank');
    }
  };

  const getFileIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'pdf': return FileText;
      case 'video': case 'mp4': return Video;
      case 'image': case 'jpg': case 'png': return Image;
      case 'audio': case 'mp3': return Music;
      case 'zip': case 'rar': return Archive;
      case 'xlsx': case 'xls': return Table;
      case 'pptx': case 'ppt': return Presentation;
      default: return FileText;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'pdf': return 'bg-red-100 text-red-800';
      case 'video': case 'mp4': return 'bg-blue-100 text-blue-800';
      case 'image': case 'jpg': case 'png': return 'bg-green-100 text-green-800';
      case 'audio': case 'mp3': return 'bg-purple-100 text-purple-800';
      case 'zip': case 'rar': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Helper function to count materials by category
  const getMaterialCountByCategory = (category: string) => {
    if (category === 'all') {
      return materials.length;
    }
    return materials.filter(m => (m.resourceType || 'notes') === category).length;
  };

  const filteredMaterials = materials.filter(m => {
    const matchesSearch =
    m.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Strict category matching - only show materials that exactly match the selected category
    let matchesCategory = false;
    if (selectedCategory === 'all') {
      matchesCategory = true;
    } else {
      // Get the actual resourceType from the material (don't default to 'notes' for filtering)
      const materialResourceType = m.resourceType || 'notes';
      // Only match if it exactly equals the selected category
      matchesCategory = materialResourceType === selectedCategory;
      
      // Debug logging for category filtering
      if (materialResourceType !== selectedCategory) {
        console.log(`🚫 Material "${m.title}" filtered out - resourceType: "${materialResourceType}" !== selectedCategory: "${selectedCategory}"`);
      }
    }
    
    const matches = matchesSearch && matchesCategory;
    if (matches && selectedCategory !== 'all') {
      console.log(`✅ Material "${m.title}" matches - resourceType: "${m.resourceType}", category: "${selectedCategory}"`);
    }
    
    return matches;
  });

  if (!isAuthenticated) {
    return null;
  }

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
                onClick={() => navigate('/student-dashboard')}
                className="text-blue-600 hover:text-blue-700 bg-blue-500/10 backdrop-blur-sm border-2 border-cyan-400/50 ring-2 ring-cyan-400/30 hover:ring-cyan-400/50 transition-all"
            >
              <ArrowLeft className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Back to Dashboard</span>
            </Button>
              <div className="flex items-center gap-3">
                <img
                  src="/icons/android-chrome-512x512.png"
                  alt="DigiDiploma logo"
                  className="w-10 h-10 rounded-xl object-contain"
                />
                <div>
                  <h1 className="text-xl font-bold text-slate-800">Study Materials</h1>
                  <p className="text-sm text-slate-600">Browse materials by branch, semester, and subject</p>
                </div>
          </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Navigation Breadcrumb */}
        {selectedBranch && (
          <div className="mb-6 flex items-center gap-2 text-sm text-slate-600 flex-wrap">
            <button
              onClick={() => {
                setSelectedBranch('');
                setSelectedSemester(null);
                setSelectedSubject(null);
                setSubjects([]);
                setMaterials([]);
              }}
              className="hover:text-blue-600 font-medium"
            >
              Branches
            </button>
            {selectedBranch && (
              <>
                <ChevronRight className="w-4 h-4" />
                <button
                  onClick={() => {
                    setSelectedSemester(null);
                    setSelectedSubject(null);
                    setMaterials([]);
                  }}
                  className="hover:text-blue-600 font-medium"
                >
                  {selectedBranch}
                </button>
              </>
            )}
            {selectedSemester && (
              <>
                <ChevronRight className="w-4 h-4" />
                <button
                  onClick={() => {
                    setSelectedSubject(null);
                    setMaterials([]);
                  }}
                  className="hover:text-blue-600 font-medium"
                >
                  Semester {selectedSemester}
                </button>
              </>
            )}
            {selectedSubject && (
              <>
                <ChevronRight className="w-4 h-4" />
                <span className="font-medium">{selectedSubject.name}</span>
              </>
            )}
          </div>
        )}

        {/* Step 1: Select Branch */}
        {!selectedBranch && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Select Your Branch</h2>
              <p className="text-slate-600">
                {user?.branch ? `Your branch: ${user.branch} (or select a different branch)` : 'Choose your branch to view study materials'}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {AVAILABLE_BRANCHES.map((branch) => (
                <Card
                  key={branch}
                  className={`group hover:shadow-xl transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm cursor-pointer ${
                    user?.branch === branch ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => setSelectedBranch(branch)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                        <GraduationCap className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-slate-800">{branch}</h3>
                        <p className="text-sm text-slate-600">
                          {user?.branch === branch ? 'Your branch' : 'View materials'}
                        </p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Select Semester */}
        {selectedBranch && !selectedSemester && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Select Semester for {selectedBranch}</h2>
                <p className="text-slate-600 mt-1">
                  {subjects.length > 0 
                    ? `Found ${subjects.length} subjects across ${getSemesters().length} semesters`
                    : 'Loading subjects...'}
                </p>
            </div>
                  <Button
                variant="outline"
                onClick={() => {
                  setSelectedBranch('');
                  setSelectedSemester(null);
                  setSelectedSubject(null);
                  setSubjects([]);
                  setMaterials([]);
                }}
                    className="flex items-center gap-2"
                  >
                <ArrowLeft className="w-4 h-4" />
                Change Branch
                  </Button>
            </div>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-slate-600">Loading semesters...</p>
              </div>
            ) : getSemesters().length === 0 ? (
              <Card className="border-0 bg-white/80 backdrop-blur-sm">
                <CardContent className="p-12 text-center">
                  <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">No subjects available</h3>
                  <p className="text-gray-500">
                    No subjects found for {selectedBranch}. Please contact your administrator.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {getSemesters().map((semester) => {
                  const subjectCount = getSubjectsForSemester(semester).length;
                  return (
                    <Card
                      key={semester}
                      className="group hover:shadow-xl transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm cursor-pointer text-center"
                      onClick={() => setSelectedSemester(semester)}
                    >
                      <CardContent className="p-6">
                        <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                          <span className="text-2xl font-bold text-white">{semester}</span>
                        </div>
                        <h3 className="font-bold text-lg mb-1">Semester {semester}</h3>
                        <p className="text-sm text-slate-600">
                          {subjectCount} {subjectCount === 1 ? 'subject' : 'subjects'}
                        </p>
                      </CardContent>
                    </Card>
                );
              })}
            </div>
            )}
          </div>
        )}

        {/* Step 3: Select Subject */}
        {selectedBranch && selectedSemester && !selectedSubject && (
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-6">
              Select Subject - Semester {selectedSemester}
            </h2>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-slate-600">Loading subjects...</p>
        </div>
            ) : getSubjectsForSemester(selectedSemester).length === 0 ? (
              <Card className="border-0 bg-white/80 backdrop-blur-sm">
                <CardContent className="p-12 text-center">
                  <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">No subjects available</h3>
                  <p className="text-gray-500 mb-4">
                    No subjects found for {selectedBranch} - Semester {selectedSemester}.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedSemester(null);
                      setSubjects([]);
                    }}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Semesters
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {getSubjectsForSemester(selectedSemester).map((subject) => (
                  <Card
                    key={subject._id}
                    className="group hover:shadow-xl transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm cursor-pointer"
                    onClick={() => setSelectedSubject(subject)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                          <BookOpen className="w-6 h-6 text-white" />
                    </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-lg text-slate-800 truncate">{subject.name}</h3>
                          <p className="text-sm text-slate-600 font-mono">{subject.code}</p>
                          {subject.credits && (
                            <p className="text-xs text-slate-500 mt-1">{subject.credits} credits</p>
                          )}
                </div>
                        <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-green-600 transition-colors flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))}
              </div>
            )}
          </div>
        )}

        {/* Step 4: View Materials */}
        {selectedSubject && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{selectedSubject.name}</h2>
                <p className="text-slate-600">{selectedSubject.code}</p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedSubject(null);
                  setMaterials([]);
                }}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Subjects
              </Button>
            </div>

            {/* Academic Resource Types */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-3">Academic Resources</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all ${
                    selectedCategory === 'all'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-md'
                      : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex-1">
                    <div className="font-semibold">All Resources</div>
                    <div className="text-xs opacity-80">View every material for this subject</div>
                    <div className={`text-xs mt-1 font-medium ${selectedCategory === 'all' ? 'text-purple-100' : 'text-slate-500'}`}>
                      {getMaterialCountByCategory('all')} materials
                    </div>
                  </div>
                  <span className="text-2xl ml-2">📚</span>
                </button>
                {RESOURCE_TYPES.map((item) => {
                  const count = getMaterialCountByCategory(item.value);
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setSelectedCategory(item.value)}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all ${
                        selectedCategory === item.value
                          ? 'bg-purple-600 text-white border-purple-600 shadow-md'
                          : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="font-semibold">{item.label}</div>
                        <div className="text-xs opacity-80">Materials tagged as {item.label}</div>
                        <div className={`text-xs mt-1 font-medium ${selectedCategory === item.value ? 'text-purple-100' : 'text-slate-500'}`}>
                          {count} {count === 1 ? 'material' : 'materials'}
                        </div>
                      </div>
                      <span className="text-2xl ml-2">{item.emoji}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Category Header */}
            {selectedCategory !== 'all' && (
              <div className="mb-4 flex items-center gap-2">
                <span className="text-lg">
                  {RESOURCE_TYPES.find(r => r.value === selectedCategory)?.emoji}
                </span>
                <h3 className="text-lg font-semibold text-slate-900">
                  {RESOURCE_TYPES.find(r => r.value === selectedCategory)?.label || selectedCategory}
                </h3>
                <span className="text-sm text-slate-500">
                  ({filteredMaterials.length} {filteredMaterials.length === 1 ? 'material' : 'materials'})
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCategory('all')}
                  className="ml-auto"
                >
                  Show All
                </Button>
              </div>
            )}

            {/* Search */}
            <div className="mb-6">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search materials..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
        </div>

            {/* Materials List */}
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-slate-600">Loading materials...</p>
              </div>
            ) : filteredMaterials.length === 0 ? (
              <Card className="border-0 bg-white/80 backdrop-blur-sm">
                <CardContent className="p-12 text-center">
                  <FolderOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">No materials available</h3>
                  <p className="text-gray-500 mb-4">
                    {selectedCategory === 'all' ? (
                      <>Materials for <strong>{selectedSubject.name}</strong> ({selectedSubject.code}) will appear here once uploaded by admin.</>
                    ) : (
                      <>No materials found for <strong>{RESOURCE_TYPES.find(r => r.value === selectedCategory)?.label || selectedCategory}</strong> in <strong>{selectedSubject.name}</strong> ({selectedSubject.code}).</>
                    )}
                  </p>
                  <div className="text-sm text-slate-400">
                    <p>Branch: {selectedBranch}</p>
                    <p>Semester: {selectedSemester}</p>
                    {selectedCategory !== 'all' && (
                      <p>Category: {RESOURCE_TYPES.find(r => r.value === selectedCategory)?.label || selectedCategory}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMaterials.map((material) => {
            const FileIcon = getFileIcon(material.type);
            return (
              <Card 
                      key={material._id}
                      className="group hover:shadow-xl transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm"
              >
                      <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                            <div className={`p-3 rounded-xl ${getTypeColor(material.type)}`}>
                              <FileIcon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                              <CardTitle className="text-lg line-clamp-2">{material.title}</CardTitle>
                              <Badge className={`mt-2 text-xs ${getTypeColor(material.type)}`}>
                                {material.type?.toUpperCase()}
                            </Badge>
                        </div>
                      </div>
                    </div>
                      </CardHeader>
                      <CardContent>
                        {material.description && (
                          <p className="text-sm text-slate-600 mb-4 line-clamp-2">{material.description}</p>
                        )}
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
                          <div className="flex items-center gap-3">
                          {material.size && (
                            <span className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              {material.size}
                            </span>
                          )}
                          {material.downloads !== undefined && (
                            <span className="flex items-center gap-1">
                              <Download className="w-3 h-3" />
                              {material.downloads} downloads
                            </span>
                          )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-500" />
                            {(material.rating ?? 0).toFixed(1)} ({material.ratingCount || 0})
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {(material.type?.toLowerCase() === 'pdf' || material.type?.toLowerCase() === 'video') && (
                    <Button
                              variant="outline"
                      size="sm"
                              onClick={() => setViewingMaterial(material)}
                    >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                    </Button>
                          )}
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => handleDownload(material)}
                          >
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
            )}
          </div>
        )}

        {/* Material Viewer Modal */}
        {viewingMaterial && (
          <Dialog open={!!viewingMaterial} onOpenChange={(open) => !open && setViewingMaterial(null)}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <MaterialViewer
                material={{
                  id: viewingMaterial._id,
                  title: viewingMaterial.title,
                  type: viewingMaterial.type || 'pdf',
                  url: viewingMaterial.url,
                  description: viewingMaterial.description || '',
                  subjectName: viewingMaterial.subjectName || selectedSubject?.name || '',
                  subjectCode: viewingMaterial.subjectCode || selectedSubject?.code || '',
                  branch: viewingMaterial.branch || selectedBranch || '',
                  semester: viewingMaterial.semester || selectedSemester || 1,
                  tags: [],
                  downloads: viewingMaterial.downloads || 0,
                  rating: 0,
                  ratingCount: 0,
                  createdAt: viewingMaterial.createdAt || new Date().toISOString()
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
};

export default Materials;
