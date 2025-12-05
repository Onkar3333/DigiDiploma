import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BookOpen, 
  FileText, 
  Download, 
  Search, 
  Filter,
  Eye,
  ChevronRight,
  FileCode,
  Image,
  Video,
  Music,
  File,
  Presentation,
  Archive,
  Lock,
  IndianRupee,
  QrCode,
  X,
  Calendar,
  GraduationCap,
  Users,
  Star,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { authService } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { normalizeBackendUrl } from '@/lib/urlUtils';
import MaterialViewer from './MaterialViewer';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface Subject {
  _id: string;
  name: string;
  code: string;
  semester: number;
  branch: string;
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
  resourceType?: string;
  accessType?: 'free' | 'drive_protected' | 'paid';
  price?: number;
  googleDriveUrl?: string;
  tags?: string[];
  downloads?: number;
  rating?: number;
  createdAt?: string;
}

interface MobileMaterialsViewProps {
  userBranch: string;
  userSemester: string;
  onMaterialClick?: (material: Material) => void;
}

const RESOURCE_TYPES = [
  { value: 'syllabus', label: 'Syllabus', icon: FileText, color: 'bg-blue-100 text-blue-700' },
  { value: 'manual_answer', label: 'Manual Answer', icon: FileText, color: 'bg-green-100 text-green-700' },
  { value: 'guess_papers', label: 'Guessing Papers', icon: FileText, color: 'bg-yellow-100 text-yellow-700' },
  { value: 'model_answer_papers', label: 'Model Answer', icon: CheckCircle, color: 'bg-purple-100 text-purple-700' },
  { value: 'msbte_imp', label: 'VVIMP', icon: Star, color: 'bg-orange-100 text-orange-700' },
  { value: 'pyqs', label: "PYQ's", icon: BookOpen, color: 'bg-indigo-100 text-indigo-700' },
  { value: 'micro_project_topics', label: 'Micro Project', icon: FileCode, color: 'bg-pink-100 text-pink-700' },
  { value: 'notes', label: 'Notes', icon: FileText, color: 'bg-gray-100 text-gray-700' },
];

const MobileMaterialsView: React.FC<MobileMaterialsViewProps> = ({
  userBranch,
  userSemester,
  onMaterialClick
}) => {
  const { toast } = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  // Selected semester is a string like "1", "2", etc.
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [viewingMaterial, setViewingMaterial] = useState<Material | null>(null);
  const [purchasedMaterials, setPurchasedMaterials] = useState<Set<string>>(new Set());

  // Initialize selected semester from localStorage or userSemester
  useEffect(() => {
    try {
      const saved = typeof window !== 'undefined'
        ? window.localStorage.getItem('materials_lastSemester')
        : null;
      if (saved && saved.trim() !== '') {
        setSelectedSemester(saved);
        return;
      }
    } catch (error) {
      console.warn('Unable to read saved semester from localStorage:', error);
    }

    if (userSemester) {
      setSelectedSemester(String(userSemester));
    }
  }, [userSemester]);

  // Fetch branch subjects
  useEffect(() => {
    if (userBranch) {
      fetchBranchSubjects();
    }
  }, [userBranch]);

  // Fetch materials when subject is selected
  useEffect(() => {
    if (selectedSubject) {
      fetchMaterials();
    } else {
      setMaterials([]);
    }
  }, [selectedSubject]);

  const fetchBranchSubjects = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/subjects/branch/${encodeURIComponent(userBranch)}`, {
        headers: authService.getAuthHeaders()
      });
      
      if (!response.ok) throw new Error('Failed to fetch subjects');
      
      const data = await response.json();
      const allSubjects: Subject[] = [];
      
      Object.entries(data).forEach(([semester, semesterSubjects]: [string, any]) => {
        if (Array.isArray(semesterSubjects)) {
          allSubjects.push(
            ...semesterSubjects.map((s: any) => ({
              ...s,
              semester: parseInt(semester)
            }))
          );
        }
      });
      
      setSubjects(allSubjects);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      toast({ title: "Error", description: "Failed to load subjects", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchMaterials = async () => {
    if (!selectedSubject) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/materials/subject/${encodeURIComponent(selectedSubject.code)}`, {
        headers: authService.getAuthHeaders()
      });
      
      if (!response.ok) throw new Error('Failed to fetch materials');
      
      const data = await response.json();
      const filtered = data.filter((m: Material) => {
        const matchesBranch = !m.branch || m.branch === userBranch;
        const materialSemester = typeof m.semester === 'string' ? parseInt(m.semester) : m.semester;
        const matchesSemester = !selectedSemester || !materialSemester || materialSemester === parseInt(selectedSemester);
        return m.subjectCode === selectedSubject.code && matchesBranch && matchesSemester;
      });
      
      setMaterials(filtered.map((m: Material) => ({
        ...m,
        url: normalizeBackendUrl(m.url || ''),
        resourceType: m.resourceType || 'notes',
        accessType: m.accessType || 'free',
        price: m.price || 0
      })));
    } catch (error) {
      console.error('Error fetching materials:', error);
      toast({ title: "Error", description: "Failed to load materials", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getResourceTypeInfo = (resourceType: string) => {
    return RESOURCE_TYPES.find(r => r.value === resourceType) || RESOURCE_TYPES[RESOURCE_TYPES.length - 1];
  };

  const getMaterialIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText className="w-5 h-5" />;
      case 'video': return <Video className="w-5 h-5" />;
      case 'notes': return <FileText className="w-5 h-5" />;
      case 'link': return <ChevronRight className="w-5 h-5" />;
      default: return <File className="w-5 h-5" />;
    }
  };

  const handleMaterialClick = (material: Material) => {
    if (material.accessType === 'paid' && !purchasedMaterials.has(material._id)) {
      toast({ 
        title: "Paid Material", 
        description: "This material requires purchase. Payment integration coming soon.",
        variant: "default"
      });
      return;
    }
    
    setViewingMaterial(material);
    if (onMaterialClick) {
      onMaterialClick(material);
    }
  };

  const filteredMaterials = materials.filter(m => {
    const matchesSearch = !searchTerm || 
      m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.subjectCode?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || m.resourceType === filterType;
    
    return matchesSearch && matchesType;
  });

  // Collect valid numeric semesters only to avoid invalid SelectItem values
  const semesterValues = subjects
    .map(s => s.semester)
    .filter((sem) => typeof sem === 'number' && !Number.isNaN(sem));

  const availableSemesters = Array.from(new Set(semesterValues)).sort();

  // Ensure selectedSemester is always a valid available semester when subjects change
  useEffect(() => {
    if (availableSemesters.length === 0) return;

    // If current selectedSemester is invalid, pick first available
    const isValid =
      selectedSemester &&
      availableSemesters.some((sem) => String(sem) === String(selectedSemester));

    if (!isValid) {
      const fallback = String(availableSemesters[0]);
      setSelectedSemester(fallback);
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('materials_lastSemester', fallback);
        }
      } catch {}
    }
  }, [availableSemesters.join(','), selectedSemester]);

  const branchSubjectsForSemester = subjects.filter(s => {
    const sem = typeof s.semester === 'number' ? s.semester : parseInt(String(s.semester));
    if (Number.isNaN(sem)) return false;
    // Match desktop behaviour: only active subjects
    if (s.isActive === false) return false;
    if (!selectedSemester) return true;
    return sem === parseInt(selectedSemester);
  });

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const visibleSubjects = branchSubjectsForSemester.filter(subject => {
    if (!normalizedSearch) return true;
    return (
      subject.name.toLowerCase().includes(normalizedSearch) ||
      subject.code.toLowerCase().includes(normalizedSearch)
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 pb-20">
      {/* Mobile Header */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-lg border-b border-slate-200 shadow-sm">
        <div className="px-4 pt-3 pb-2 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Study Materials</h1>
              {selectedSemester && (
                <p className="text-xs text-slate-500 mt-0.5">
                  Semester {selectedSemester}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="h-9 px-3"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search subjects or materials..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 bg-white border-slate-300 rounded-lg"
            />
          </div>
        </div>

        {/* Semester pills - always visible on mobile */}
        {availableSemesters.length > 0 && (
          <div className="px-4 pb-3 border-t border-slate-100 bg-white/90">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-600">Semester</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {availableSemesters.map((sem) => {
                const value = String(sem);
                const isActive = selectedSemester === value;
                return (
                  <Button
                    key={value}
                    type="button"
                    size="sm"
                    variant={isActive ? 'default' : 'outline'}
                    className={`h-8 px-3 rounded-full text-xs whitespace-nowrap ${
                      isActive
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                    onClick={() => {
                      setSelectedSemester(value);
                      try {
                        if (typeof window !== 'undefined') {
                          window.localStorage.setItem('materials_lastSemester', value);
                        }
                      } catch {}
                    }}
                  >
                    Sem {sem}
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {/* Filters Panel */}
        {showFilters && (
          <div className="px-4 pb-4 space-y-3 border-t border-slate-200 bg-slate-50/50">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1.5 block">Semester</label>
              <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                <SelectTrigger className="h-10 bg-white">
                  <SelectValue placeholder="Select semester" />
                </SelectTrigger>
                <SelectContent>
                  {availableSemesters.map(sem => {
                    const value = String(sem);
                    // Radix Select requires non-empty string values for items
                    if (!value || value.trim() === '') return null;
                    return (
                      <SelectItem key={value} value={value}>
                        Semester {sem}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1.5 block">Material Type</label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-10 bg-white">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {RESOURCE_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 py-4 space-y-6">
        {/* My Branch Subjects Section */}
        {visibleSubjects.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <GraduationCap className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-slate-800">My Branch Subjects</h2>
              <Badge variant="outline" className="ml-auto">{visibleSubjects.length}</Badge>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {visibleSubjects.map(subject => (
                <Card
                  key={subject._id}
                  className={`cursor-pointer transition-all ${
                    selectedSubject?._id === subject._id
                      ? 'ring-2 ring-blue-500 bg-blue-50'
                      : 'bg-white hover:shadow-md'
                  }`}
                  onClick={() => setSelectedSubject(subject)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-800 truncate">{subject.name}</h3>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">{subject.code}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0 ml-2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Materials List */}
        {selectedSubject && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-800">{selectedSubject.name}</h2>
                <p className="text-xs text-slate-500">{selectedSubject.code}</p>
              </div>
              <Badge variant="outline">{filteredMaterials.length} materials</Badge>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-sm text-slate-500 mt-2">Loading materials...</p>
              </div>
            ) : filteredMaterials.length === 0 ? (
              <Card className="bg-white">
                <CardContent className="p-8 text-center">
                  <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600 font-medium">No materials found</p>
                  <p className="text-sm text-slate-500 mt-1">Materials will appear here once uploaded</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredMaterials.map(material => {
                  const resourceInfo = getResourceTypeInfo(material.resourceType || 'notes');
                  const ResourceIcon = resourceInfo.icon;
                  const isPurchased = purchasedMaterials.has(material._id);
                  const isPaid = material.accessType === 'paid' && !isPurchased;

                  return (
                    <Card
                      key={material._id}
                      className="bg-white hover:shadow-lg transition-all cursor-pointer"
                      onClick={() => handleMaterialClick(material)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`p-2.5 rounded-lg ${resourceInfo.color} flex-shrink-0`}>
                            <ResourceIcon className="w-5 h-5" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-semibold text-slate-800 text-sm leading-tight line-clamp-2">
                                {material.title}
                              </h3>
                              {isPaid && (
                                <Lock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                              )}
                            </div>
                            
                            {material.description && (
                              <p className="text-xs text-slate-600 mt-1 line-clamp-1">
                                {material.description}
                              </p>
                            )}
                            
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <Badge variant="secondary" className="text-xs">
                                {resourceInfo.label}
                              </Badge>
                              {material.tags && material.tags.length > 0 && (
                                <>
                                  {material.tags.slice(0, 2).map((tag, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                  {material.tags.length > 2 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{material.tags.length - 2}
                                    </Badge>
                                  )}
                                </>
                              )}
                              {isPaid && (
                                <Badge variant="outline" className="text-xs text-amber-700 border-amber-300">
                                  <IndianRupee className="w-3 h-3 mr-0.5" />
                                  {material.price}
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                              {material.downloads !== undefined && (
                                <span className="flex items-center gap-1">
                                  <Download className="w-3 h-3" />
                                  {material.downloads}
                                </span>
                              )}
                              {material.rating !== undefined && material.rating > 0 && (
                                <span className="flex items-center gap-1">
                                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                  {material.rating.toFixed(1)}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-1.5 flex-shrink-0">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMaterialClick(material);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {material.url && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(material.url, '_blank');
                                }}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* No Subject Selected State */}
        {!selectedSubject && !loading && (
          <Card className="bg-white">
            <CardContent className="p-8 text-center">
              <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 font-medium text-lg">Select a subject</p>
              <p className="text-sm text-slate-500 mt-1">Choose a subject above to view materials</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Material Viewer Dialog */}
      {viewingMaterial && (
        <Dialog open={!!viewingMaterial} onOpenChange={() => setViewingMaterial(null)}>
          <DialogContent className="max-w-full w-full h-full p-0 m-0 sm:max-w-4xl sm:h-[90vh]">
            <MaterialViewer
              material={viewingMaterial}
              onClose={() => setViewingMaterial(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default MobileMaterialsView;

