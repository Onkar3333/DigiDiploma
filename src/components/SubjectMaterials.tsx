import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BookOpen, 
  FileText,
  Video,
  Download,
  ExternalLink,
  Clock,
  User,
  Calendar,
  Star,
  Play,
  File,
  Image,
  Code,
  Globe,
  Share2,
  Bookmark,
  Eye,
  ThumbsUp,
  MessageCircle,
  MoreHorizontal
} from 'lucide-react';

interface Material {
  _id: string;
  title: string;
  type: 'pdf' | 'video' | 'link' | 'document' | 'image' | 'code';
  url: string;
  description?: string;
  uploadedBy: string;
  uploadedAt: string;
  subjectId: string;
  subjectName: string;
  // Academic resource category from admin
  resourceType?: string;
  downloads: number;
  rating: number;
  tags: string[];
}

interface SubjectMaterialsProps {
  subjectId: string;
  subjectName: string;
  subjectCode?: string;
}

const RESOURCE_TYPE_LABELS: Record<string, string> = {
  syllabus: 'Syllabus',
  manual_answer: 'Manual Answer',
  guess_papers: 'Guessing Papers',
  model_answer_papers: 'Model Answer Papers',
  msbte_imp: 'DigiDiploma VVIMP',
  pyqs: "PYQ's",
  micro_project_topics: 'Micro Project Topics',
  notes: 'Notes'
};

const formatResourceTypeLabel = (type?: string) => {
  if (!type) return '';
  return RESOURCE_TYPE_LABELS[type] || type.replace(/_/g, ' ');
};

const SubjectMaterials: React.FC<SubjectMaterialsProps> = ({
  subjectId,
  subjectName,
  subjectCode
}) => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetchMaterials();
  }, [subjectId, subjectCode]);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      setError(null);
      // Use subjectCode if available (preferred), otherwise fall back to subjectId
      const identifier = subjectCode || subjectId;
      const response = await fetch(`/api/materials/subject/${encodeURIComponent(identifier)}`, {
        headers: {
          ...((await import('@/lib/auth')).authService.getAuthHeaders()),
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch materials');
      }
      
      const data = await response.json();
      // Ensure we have an array
      setMaterials(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching materials:', err);
      setError('Failed to load materials. Please try again.');
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  };

  const getMaterialIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText className="w-5 h-5" />;
      case 'video': return <Video className="w-5 h-5" />;
      case 'link': return <ExternalLink className="w-5 h-5" />;
      case 'document': return <File className="w-5 h-5" />;
      case 'image': return <Image className="w-5 h-5" />;
      case 'code': return <Code className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  const getMaterialColor = (type: string) => {
    switch (type) {
      case 'pdf': return 'text-red-500 bg-red-50';
      case 'video': return 'text-blue-500 bg-blue-50';
      case 'link': return 'text-green-500 bg-green-50';
      case 'document': return 'text-purple-500 bg-purple-50';
      case 'image': return 'text-orange-500 bg-orange-50';
      case 'code': return 'text-indigo-500 bg-indigo-50';
      default: return 'text-gray-500 bg-gray-50';
    }
  };

  const filteredMaterials = activeTab === 'all' 
    ? materials 
    : materials.filter(material => material.type === activeTab);

  const handleDownload = async (materialId: string, url: string) => {
    try {
      const response = await fetch(`/api/materials/${materialId}/download`, {
        method: 'POST',
        headers: {
          ...((await import('@/lib/auth')).authService.getAuthHeaders()),
        }
      });
      if (response.ok) {
        const data = await response.json().catch(() => null);
        if (data?.material) {
          setMaterials(prev => prev.map(m => m._id === materialId ? { ...m, ...data.material } : m));
        }
      }
    } catch {}
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2">Loading materials...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center text-red-500">
          <FileText className="w-5 h-5 mr-2" />
          {error}
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            {subjectName} - Learning Materials
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Access study materials, videos, documents, and resources for this subject
          </p>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">All ({materials.length})</TabsTrigger>
              <TabsTrigger value="pdf">PDFs</TabsTrigger>
              <TabsTrigger value="video">Videos</TabsTrigger>
              <TabsTrigger value="document">Documents</TabsTrigger>
              <TabsTrigger value="link">Links</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-4 mt-6">
              {filteredMaterials.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">No materials available</h3>
                  <p className="text-gray-500">Materials for this subject will appear here once uploaded by your instructors.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredMaterials.map((material) => (
                    <Card key={material._id} className="hover:shadow-lg transition-all duration-300 group">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className={`p-3 rounded-lg ${getMaterialColor(material.type)}`}>
                            {getMaterialIcon(material.type)}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm">
                              <Bookmark className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">
                              {material.title}
                            </h3>
                            {material.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {material.description}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {material.tags.map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>

                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                <span>{material.uploadedBy}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span>{new Date(material.uploadedAt).toLocaleDateString()}</span>
                              </div>
                              {material.resourceType && (
                                <div className="flex items-center gap-1">
                                  <Star className="w-3 h-3 text-yellow-500" />
                                  <span className="text-xs">
                                    {formatResourceTypeLabel(material.resourceType)}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <Download className="w-3 h-3" />
                              <span>{material.downloads}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-3 border-t border-border">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 text-yellow-500 fill-current" />
                                <span className="text-sm font-medium">{material.rating}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Eye className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-gray-500">View</span>
                              </div>
                            </div>
                            
                            <div className="flex gap-2">
                              {material.type === 'video' && (
                                <Button size="sm" variant="outline">
                                  <Play className="w-4 h-4 mr-1" />
                                  Watch
                                </Button>
                              )}
                              <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={() => handleDownload(material._id, material.url)}>
                                <Download className="w-4 h-4 mr-1" />
                                Download
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubjectMaterials;
