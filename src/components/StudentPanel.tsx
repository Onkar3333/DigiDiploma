import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BookOpen, 
  GraduationCap, 
  Users, 
  Calendar, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  FileText,
  Code2,
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
  Award,
  Clock,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import { ALL_BRANCHES } from '@/constants/branches';
// Available branches for the application
const AVAILABLE_BRANCHES = [...ALL_BRANCHES];
import BranchSpecificSubjects from './BranchSpecificSubjects';

interface Student {
  _id: string;
  name: string;
  email: string;
  studentId: string;
  branch: string;
  semester: string;
  college: string;
  userType: string;
  createdAt: string;
}

interface Subject {
  name: string;
  code: string;
  credits?: number;
  hours?: number;
  type?: 'Theory' | 'Practical' | 'Project';
}

interface SemesterData {
  semester: number;
  subjects: Subject[];
  totalCredits: number;
  totalHours: number;
  studentCount: number;
}

interface StudentPanelProps {
  students: Student[];
  subjects?: { _id?: string; name: string; code: string; branch: string; semester: number }[];
  onAddStudent: (student: Partial<Student>) => void;
  onDeleteStudent: (id: string) => void;
  onUpdateStudent: (id: string, updates: Partial<Student>) => void;
}

const StudentPanel: React.FC<StudentPanelProps> = ({
  students,
  subjects = [],
  onAddStudent,
  onDeleteStudent,
  onUpdateStudent
}) => {
  const [selectedBranch, setSelectedBranch] = useState<string>('Computer Engineering');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Available branches
  const availableBranches = AVAILABLE_BRANCHES;

  // Filter students by branch and search
  const filteredStudents = students.filter(student => 
    student.branch === selectedBranch &&
    (student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
     student.studentId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Generate semester data for selected branch
  const generateSemesterData = (): SemesterData[] => {
    const semesters = new Map<number, Subject[]>();
    subjects
      .filter(s => s.branch === selectedBranch)
      .forEach(s => {
        const list = semesters.get(s.semester) || [];
        list.push({ name: s.name, code: s.code });
        semesters.set(s.semester, list);
      });

    const data: SemesterData[] = Array.from(semesters.entries()).map(([semester, subs]) => ({
      semester,
      subjects: subs,
      totalCredits: subs.length * 4,
      totalHours: subs.length * 60,
      studentCount: students.filter(st => parseInt(st.semester) === semester && st.branch === selectedBranch).length
    }));

    return data.sort((a, b) => a.semester - b.semester);
  };

  const semesterData = generateSemesterData();

  // Get subject icon based on subject name
  const getSubjectIcon = (subjectName: string) => {
    const name = subjectName.toLowerCase();
    if (name.includes('programming') || name.includes('coding') || name.includes('c++') || name.includes('java') || name.includes('python')) return <Code2 className="w-4 h-4" />;
    if (name.includes('database') || name.includes('dbms')) return <Database className="w-4 h-4" />;
    if (name.includes('network') || name.includes('communication')) return <Network className="w-4 h-4" />;
    if (name.includes('microprocessor') || name.includes('microcontroller')) return <Cpu className="w-4 h-4" />;
    if (name.includes('chemistry') || name.includes('physics')) return <FlaskConical className="w-4 h-4" />;
    if (name.includes('mathematics') || name.includes('math')) return <Calculator className="w-4 h-4" />;
    if (name.includes('web') || name.includes('internet')) return <Globe className="w-4 h-4" />;
    if (name.includes('security') || name.includes('cyber')) return <Shield className="w-4 h-4" />;
    if (name.includes('electrical') || name.includes('electronics')) return <Zap className="w-4 h-4" />;
    if (name.includes('project') || name.includes('capstone')) return <Rocket className="w-4 h-4" />;
    if (name.includes('entrepreneurship') || name.includes('management')) return <Target className="w-4 h-4" />;
    if (name.includes('internship') || name.includes('training')) return <Award className="w-4 h-4" />;
    return <BookOpen className="w-4 h-4" />;
  };

  // Get semester color
  const getSemesterColor = (semester: number) => {
    const colors = [
      'bg-blue-100 text-blue-800',
      'bg-green-100 text-green-800',
      'bg-purple-100 text-purple-800',
      'bg-orange-100 text-orange-800',
      'bg-red-100 text-red-800',
      'bg-indigo-100 text-indigo-800'
    ];
    return colors[(semester - 1) % colors.length];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Student Management Panel</h2>
          <p className="text-gray-600">Manage students and subjects for {selectedBranch}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowAddModal(true)} className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            Add Student
          </Button>
        </div>
      </div>

      {/* Branch Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            Branch Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Select Branch</label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="bg-white text-slate-900 border-slate-300 hover:bg-slate-50">
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 z-[100]">
                  {availableBranches.map(branch => (
                    <SelectItem key={branch} value={branch} className="text-slate-900 focus:bg-slate-100 cursor-pointer">
                      {branch}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Search Students</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by name, email, or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="semesters">Semester Structure</TabsTrigger>
          <TabsTrigger value="students">Student List</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Students</p>
                    <p className="text-2xl font-bold text-gray-900">{filteredStudents.length}</p>
                  </div>
                  <Users className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Semesters</p>
                    <p className="text-2xl font-bold text-gray-900">{semesterData.length}</p>
                  </div>
                  <Calendar className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Subjects</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {semesterData.reduce((total, sem) => total + sem.subjects.length, 0)}
                    </p>
                  </div>
                  <BookOpen className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">MSBTE K-Scheme</p>
                    <p className="text-2xl font-bold text-gray-900">Active</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Semester Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Semester Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {semesterData.map((semester) => (
                  <Card key={semester.semester} className="border-l-4 border-l-primary">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-lg">Semester {semester.semester}</h3>
                        <Badge className={getSemesterColor(semester.semester)}>
                          {semester.studentCount} students
                        </Badge>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Subjects:</span>
                          <span className="font-medium">{semester.subjects.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Credits:</span>
                          <span className="font-medium">{semester.totalCredits}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Hours:</span>
                          <span className="font-medium">{semester.totalHours}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Semester Structure Tab */}
        <TabsContent value="semesters" className="space-y-6">
          <BranchSpecificSubjects 
            studentBranch={selectedBranch}
            studentSemester="1"
          />
        </TabsContent>

        {/* Student List Tab */}
        <TabsContent value="students" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Student List - {selectedBranch}</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredStudents.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No students found for {selectedBranch}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Student
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Semester
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          College
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Joined
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredStudents.map((student) => (
                        <tr key={student._id || student.studentId} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                  <span className="text-sm font-medium text-primary">
                                    {student.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{student.name}</div>
                                <div className="text-sm text-gray-500">{student.email}</div>
                                <div className="text-xs text-gray-400">ID: {student.studentId}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge className={getSemesterColor(parseInt(student.semester))}>
                              Semester {student.semester}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {student.college}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(student.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex gap-2">
                              <Button
                                key={`edit-${student._id}`}
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingStudent(student)}
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button
                                key={`delete-${student._id}`}
                                variant="outline"
                                size="sm"
                                onClick={() => onDeleteStudent(student._id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StudentPanel;
