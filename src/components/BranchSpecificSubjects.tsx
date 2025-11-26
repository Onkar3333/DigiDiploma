import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { authService } from '@/lib/auth';
import { 
  BookOpen, 
  Code2,
  Clock,
  Award,
  CheckCircle,
  AlertCircle,
  Info,
  Database,
  Network,
  Cpu,
  FlaskConical,
  Calculator,
  Globe,
  Shield,
  Zap,
  Lightbulb,
  Rocket,
  Target,
  FileText,
  Users,
  Calendar,
  TrendingUp,
  Star,
  Play,
  Download,
  ExternalLink,
  Eye,
  Bookmark,
  Share2
} from 'lucide-react';
import SubjectMaterials from './SubjectMaterials';

interface Subject {
  _id: string;
  name: string;
  code: string;
  branch: string;
  semester: number;
  credits: number;
  hours: number;
  type: 'Theory' | 'Practical' | 'Project';
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface BranchSpecificSubjectsProps {
  studentBranch: string;
  studentSemester: string;
}

const subjectIcons = [
  BookOpen, Code2, Database, Network, Cpu, FlaskConical, 
  Calculator, Globe, Shield, Zap, Lightbulb, Rocket, Target
];

const BranchSpecificSubjects: React.FC<BranchSpecificSubjectsProps> = ({
  studentBranch,
  studentSemester
}) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('current');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [showMaterials, setShowMaterials] = useState(false);

  useEffect(() => {
    fetchBranchSubjects();
  }, [studentBranch]);

  const fetchBranchSubjects = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/subjects/branch/${encodeURIComponent(studentBranch)}`, {
        headers: authService.getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch subjects');
      }
      
      const data = await response.json();
      
      // Convert grouped data to flat array
      const allSubjects: Subject[] = [];
      Object.entries(data).forEach(([semester, semesterSubjects]: [string, any]) => {
        allSubjects.push(...semesterSubjects);
      });
      
      setSubjects(allSubjects);
    } catch (err) {
      console.error('Error fetching subjects:', err);
      setError('Failed to load subjects');
    } finally {
      setLoading(false);
    }
  };

  // Filter subjects by semester
  const currentSemesterSubjects = subjects.filter(subject => 
    subject.semester === parseInt(studentSemester)
  );
  
  const allSemesterSubjects = subjects.filter(subject => 
    subject.isActive
  );

  // Group subjects by semester
  const subjectsBySemester = allSemesterSubjects.reduce((acc, subject) => {
    if (!acc[subject.semester]) {
      acc[subject.semester] = [];
    }
    acc[subject.semester].push(subject);
    return acc;
  }, {} as Record<number, Subject[]>);

  if (loading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2">Loading subjects...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center text-red-500">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-6 border border-primary/20">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-primary mb-2">
              {studentBranch} Learning Hub
            </h2>
            <p className="text-muted-foreground">
              Explore subjects, access materials, and track your academic progress
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{subjects.length}</div>
              <div className="text-sm text-muted-foreground">Total Subjects</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{currentSemesterSubjects.length}</div>
              <div className="text-sm text-muted-foreground">Current Semester</div>
            </div>
          </div>
        </div>
      </div>

      {showMaterials && selectedSubject ? (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => setShowMaterials(false)}
              className="flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4" />
              Back to Subjects
            </Button>
            <h3 className="text-xl font-semibold">{selectedSubject.name} Materials</h3>
          </div>
          <SubjectMaterials 
            subjectId={selectedSubject._id}
            subjectName={selectedSubject.name}
            subjectCode={selectedSubject.code}
          />
        </div>
      ) : (
        <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50/50">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b border-primary/20">
            <CardTitle className="flex items-center gap-2 text-primary">
              <BookOpen className="w-6 h-6" />
              Subject Catalog
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Browse and access learning materials for each subject
            </p>
          </CardHeader>
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="current" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Current Semester
                </TabsTrigger>
                <TabsTrigger value="all" className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  All Semesters
                </TabsTrigger>
              </TabsList>

            <TabsContent value="current" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Semester {studentSemester} Subjects</h3>
                <Badge variant="secondary">
                  {currentSemesterSubjects.length} subjects
                </Badge>
              </div>
              
              {currentSemesterSubjects.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No subjects available for Semester {studentSemester}</p>
                  <p className="text-sm">Contact your admin to add subjects for this semester.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {currentSemesterSubjects.map((subject, index) => {
                    const IconComponent = subjectIcons[index % subjectIcons.length];
                    return (
                      <Card key={subject._id} className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-white to-gray-50/30 hover:from-primary/5 hover:to-primary/10">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                                <IconComponent className="w-6 h-6 text-primary" />
                              </div>
                              <div>
                                <h4 className="font-bold text-lg group-hover:text-primary transition-colors">{subject.name}</h4>
                                <p className="text-sm text-muted-foreground font-mono">{subject.code}</p>
                              </div>
                            </div>
                            <Badge variant={subject.type === 'Theory' ? 'default' : 'secondary'} className="text-xs">
                              {subject.type}
                            </Badge>
                          </div>
                          
                          <div className="space-y-3 mb-4">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                                <Clock className="w-4 h-4 text-blue-500" />
                                <div>
                                  <p className="text-xs text-muted-foreground">Hours</p>
                                  <p className="font-semibold text-sm">{subject.hours}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                                <Award className="w-4 h-4 text-green-500" />
                                <div>
                                  <p className="text-xs text-muted-foreground">Credits</p>
                                  <p className="font-semibold text-sm">{subject.credits}</p>
                                </div>
                              </div>
                            </div>
                            {subject.description && (
                              <p className="text-sm text-muted-foreground leading-relaxed">{subject.description}</p>
                            )}
                          </div>
                          
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span>Added: {new Date(subject.createdAt).toLocaleDateString()}</span>
                              </div>
                              {subject.isActive ? (
                                <div className="flex items-center gap-1 text-green-600">
                                  <CheckCircle className="w-3 h-3" />
                                  <span>Active</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 text-orange-600">
                                  <AlertCircle className="w-3 h-3" />
                                  <span>Inactive</span>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                className="flex-1 bg-primary hover:bg-primary/90"
                                onClick={() => {
                                  setSelectedSubject(subject);
                                  setShowMaterials(true);
                                }}
                              >
                                <FileText className="w-4 h-4 mr-2" />
                                View Materials
                              </Button>
                              <Button size="sm" variant="outline">
                                <Bookmark className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="all" className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">All Semester Subjects</h3>
                <Badge variant="secondary">
                  {allSemesterSubjects.length} total subjects
                </Badge>
              </div>
              
              {Object.keys(subjectsBySemester).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No subjects available for {studentBranch}</p>
                  <p className="text-sm">Contact your admin to add subjects for this branch.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(subjectsBySemester)
                    .sort(([a], [b]) => parseInt(a) - parseInt(b))
                    .map(([semester, semesterSubjects]) => (
                      <Card key={semester}>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <span>Semester {semester}</span>
                            <Badge variant="outline">{semesterSubjects.length} subjects</Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {semesterSubjects.map((subject, index) => {
                              const IconComponent = subjectIcons[index % subjectIcons.length];
                              return (
                                <div key={subject._id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                                  <IconComponent className="w-4 h-4 text-primary flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{subject.name}</p>
                                    <p className="text-xs text-muted-foreground font-mono">{subject.code}</p>
                                  </div>
                                  <Badge variant="outline" className="text-xs">
                                    {subject.type}
                                  </Badge>
                                </div>
                              );
                            })}
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
      )}
    </div>
  );
};

export default BranchSpecificSubjects;
