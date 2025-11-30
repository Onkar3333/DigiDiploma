import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  GraduationCap, 
  ArrowLeft,
  ExternalLink,
  Calendar,
  BookOpen
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { authService } from "@/lib/auth";
import { ALL_BRANCHES } from "@/constants/branches";

const DEFAULT_BRANCHES = [...ALL_BRANCHES];
const DEFAULT_SEMESTERS = [1, 2, 3, 4, 5, 6];

type CourseLaunch = {
  id: string;
  _id?: string;
  title: string;
  description: string;
  branch: string;
  semester: number | string;
  subject: string;
  coverPhoto?: string | null;
  resourceUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

const Courses = () => {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  
  const user = authUser || {
    id: 'default',
    name: 'Student',
    email: '',
    branch: 'Computer Engineering',
    userType: 'student',
    semester: '1'
  };

  const [branches, setBranches] = useState<string[]>([]);
  const [selectedBranch, setSelectedBranch] = useState(user?.branch || "");
  const [semesters, setSemesters] = useState<number[]>([]);
  const [selectedSemester, setSelectedSemester] = useState("");
  const [courses, setCourses] = useState<CourseLaunch[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<CourseLaunch | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Load branches
  useEffect(() => {
    const loadBranches = async () => {
      try {
        const response = await fetch("/api/subjects/branches", {
          headers: authService.getAuthHeaders(),
        });
        const data = response.ok ? await response.json() : [];
        const list = Array.isArray(data) && data.length > 0 ? data : DEFAULT_BRANCHES;
        setBranches(list);
        setSelectedBranch((prev) => prev || user?.branch || list[0]);
      } catch (error) {
        console.error("Error fetching branches:", error);
        setBranches(DEFAULT_BRANCHES);
      }
    };
    loadBranches();
  }, [user?.branch]);

  // Load semesters when branch is selected
  useEffect(() => {
    if (!selectedBranch) {
      setSemesters([]);
      setSelectedSemester("");
      return;
    }

    const loadSemesters = async () => {
      try {
        const response = await fetch(`/api/subjects?branch=${encodeURIComponent(selectedBranch)}`, {
          headers: authService.getAuthHeaders(),
        });
        const data = response.ok ? await response.json() : [];
        const subjects = Array.isArray(data) ? data : [];
        const uniqueSemesters = [...new Set(subjects.map((s: any) => parseInt(s.semester)).filter((s: number) => !isNaN(s)))].sort((a, b) => a - b);
        
        if (uniqueSemesters.length > 0) {
          setSemesters(uniqueSemesters);
          setSelectedSemester(String(uniqueSemesters[0]));
        } else {
          setSemesters(DEFAULT_SEMESTERS);
          setSelectedSemester(String(DEFAULT_SEMESTERS[0]));
        }
      } catch (error) {
        console.error("Error fetching semesters:", error);
        setSemesters(DEFAULT_SEMESTERS);
        setSelectedSemester(String(DEFAULT_SEMESTERS[0]));
      }
    };

    loadSemesters();
  }, [selectedBranch]);

  // Fetch courses when branch and semester are selected
  const fetchCourses = useCallback(async () => {
    if (!selectedBranch || !selectedSemester) {
      setCourses([]);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        branch: selectedBranch,
        semester: selectedSemester,
      });

      const response = await fetch(`/api/courses/public?${params.toString()}`, {
        headers: authService.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch courses");
      }

      const data = await response.json();
      const list = Array.isArray(data) ? data : data.courses || [];
      setCourses(list);
    } catch (error) {
      console.error("Error fetching courses:", error);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, [selectedBranch, selectedSemester]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/student-dashboard")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Course Explorer</h1>
              <p className="text-slate-600 mt-1">Browse courses by branch and semester</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-8 border-0 bg-white/80 backdrop-blur-sm shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Filter Courses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-sm font-medium mb-2 block">Branch *</Label>
                <select
                  value={selectedBranch}
                  onChange={(e) => {
                    setSelectedBranch(e.target.value);
                    setSelectedSemester("");
                    setSemesters([]);
                    setCourses([]);
                  }}
                  className="w-full p-3 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {branches.map((branch) => (
                    <option key={branch} value={branch}>
                      {branch}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">Semester *</Label>
                <select
                  value={selectedSemester}
                  onChange={(e) => {
                    setSelectedSemester(e.target.value);
                    setCourses([]);
                  }}
                  disabled={!selectedBranch}
                  className="w-full p-3 border border-slate-200 rounded-lg bg-white disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">{selectedBranch ? "Select semester" : "Select branch first"}</option>
                  {semesters.map((sem) => (
                    <option key={sem} value={String(sem)}>
                      Semester {sem}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Courses Grid */}
        <div>
          {!selectedBranch || !selectedSemester ? (
            <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-xl">
              <CardContent className="py-12 text-center">
                <GraduationCap className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <p className="text-lg text-slate-600">Please select a branch and semester to view courses</p>
              </CardContent>
            </Card>
          ) : loading ? (
            <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-xl">
              <CardContent className="py-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-slate-600 mt-4">Loading courses...</p>
              </CardContent>
            </Card>
          ) : courses.length === 0 ? (
            <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-xl">
              <CardContent className="py-12 text-center">
                <GraduationCap className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <p className="text-lg text-slate-600">No courses found for {selectedBranch} - Semester {selectedSemester}</p>
                <p className="text-sm text-slate-500 mt-2">Check back later or try a different selection</p>
              </CardContent>
            </Card>
          ) : (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">
                  Available Courses ({courses.length})
                </h2>
                <Badge variant="outline" className="text-sm">
                  {selectedBranch} - Semester {selectedSemester}
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course) => (
                  <Card
                    key={course.id || course._id}
                    className="border-0 bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group overflow-hidden"
                    onClick={() => {
                      setSelectedCourse(course);
                      setDialogOpen(true);
                    }}
                  >
                    <div className="relative h-48 overflow-hidden">
                      {course.coverPhoto ? (
                        <img 
                          src={course.coverPhoto} 
                          alt={course.title} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-semibold">
                          {course.title.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                      <div className="absolute bottom-4 left-4 right-4 text-white">
                        <Badge className="mb-2 bg-white/20 text-white border-white/30">
                          Sem {course.semester}
                        </Badge>
                        <h3 className="text-lg font-bold line-clamp-2">{course.title}</h3>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <p className="text-sm text-slate-600 line-clamp-2 mb-3">{course.description}</p>
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                        <div className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          <span>{course.subject}</span>
                        </div>
                        {course.createdAt && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(course.createdAt).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                      <Button 
                        variant="outline" 
                        className="w-full group-hover:bg-blue-50 group-hover:border-blue-300"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCourse(course);
                          setDialogOpen(true);
                        }}
                      >
                        View Details
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Course Detail Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">{selectedCourse?.title}</DialogTitle>
              <DialogDescription>
                {selectedCourse?.branch} - Semester {selectedCourse?.semester} - {selectedCourse?.subject}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {selectedCourse?.coverPhoto && (
                <div className="relative h-64 rounded-lg overflow-hidden">
                  <img 
                    src={selectedCourse.coverPhoto} 
                    alt={selectedCourse.title} 
                    className="w-full h-full object-cover" 
                  />
                </div>
              )}
              <div>
                <h4 className="font-semibold mb-2">Description</h4>
                <p className="text-slate-600">{selectedCourse?.description}</p>
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <div className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4" />
                  <span>{selectedCourse?.subject}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {selectedCourse?.createdAt 
                      ? new Date(selectedCourse.createdAt).toLocaleDateString()
                      : 'N/A'}
                  </span>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="ghost" onClick={() => setDialogOpen(false)}>
                  Close
                </Button>
                <Button
                  onClick={() => {
                    if (selectedCourse?.resourceUrl) {
                      window.open(selectedCourse.resourceUrl, "_blank", "noopener");
                    }
                  }}
                  disabled={!selectedCourse?.resourceUrl}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Visit Course Resource
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Courses;

