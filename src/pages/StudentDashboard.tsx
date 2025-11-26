import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  BookOpen, 
  Calendar, 
  GraduationCap, 
  Users, 
  Bell, 
  Settings, 
  LogOut,
  ArrowRight,
  Clock,
  Star,
  TrendingUp,
  Code,
  Award,
  Target,
  BarChart3,
  FileText,
  Video,
  Download,
  Eye,
  ChevronRight,
  Sparkles,
  Zap,
  CheckCircle,
  AlertCircle,
  BookMarked,
  Timer,
  User,
  FolderOpen,
  Briefcase,
  ExternalLink
} from "lucide-react";
import React, { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { authService } from "@/lib/auth";
import UserNotifications, { Notice, NoticeSummary } from "@/components/UserNotifications";
import InternshipForm from "@/components/InternshipForm";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/useWebSocket";
import { ALL_BRANCHES } from "@/constants/branches";

const DEFAULT_BRANCHES = [...ALL_BRANCHES];

const DEFAULT_SEMESTERS = [1, 2, 3, 4, 5, 6];


const StudentDashboard = () => {
  const { user: authUser, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Get user from auth context
  const user = authUser || {
    id: 'default',
    name: 'Student',
    email: '',
    branch: 'Computer Engineering',
    userType: 'student',
    semester: '1'
  };

  const [unreadNotices, setUnreadNotices] = useState(0);
  const [latestNotice, setLatestNotice] = useState<Notice | null>(null);
  const [showCourseExplorer, setShowCourseExplorer] = useState(false);
  const [courseBranches, setCourseBranches] = useState<string[]>([]);
  const [selectedCourseBranch, setSelectedCourseBranch] = useState(user?.branch || "");
  const [courseSemesters, setCourseSemesters] = useState<number[]>([]);
  const [selectedCourseSemester, setSelectedCourseSemester] = useState("");
  const [courseSubjects, setCourseSubjects] = useState<{ name: string; code: string }[]>([]);
  const [selectedCourseSubject, setSelectedCourseSubject] = useState("");
  const [courseResults, setCourseResults] = useState<CourseLaunch[]>([]);
  const [courseResultsLoading, setCourseResultsLoading] = useState(false);
  const [selectedCourseCard, setSelectedCourseCard] = useState<CourseLaunch | null>(null);
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);

  const handleNoticeSummary = useCallback((summary: NoticeSummary) => {
    setUnreadNotices(summary.unread);
    setLatestNotice(summary.latest || null);
  }, []);

  useEffect(() => {
    const loadBranches = async () => {
      try {
        const response = await fetch("/api/subjects/branches", {
          headers: authService.getAuthHeaders(),
        });
        const data = response.ok ? await response.json() : [];
        const list = Array.isArray(data) && data.length > 0 ? data : DEFAULT_BRANCHES;
        setCourseBranches(list);
        setSelectedCourseBranch((prev) => prev || user?.branch || list[0]);
      } catch (error) {
        console.error("Error fetching branches:", error);
        setCourseBranches(DEFAULT_BRANCHES);
        setSelectedCourseBranch((prev) => prev || user?.branch || DEFAULT_BRANCHES[0]);
      }
    };
    loadBranches();
  }, [user?.branch]);

  useEffect(() => {
    if (!selectedCourseBranch) {
      setCourseSemesters([]);
      setSelectedCourseSemester("");
      return;
    }
    const loadSemesters = async () => {
      try {
        const response = await fetch(`/api/subjects/branches/${encodeURIComponent(selectedCourseBranch)}/semesters`, {
          headers: authService.getAuthHeaders(),
        });
        const data = response.ok ? await response.json() : [];
        const list = Array.isArray(data) && data.length > 0 ? data : DEFAULT_SEMESTERS;
        setCourseSemesters(list);
        setSelectedCourseSemester(String(list[0]));
      } catch (error) {
        console.error("Error fetching semesters:", error);
        setCourseSemesters(DEFAULT_SEMESTERS);
        setSelectedCourseSemester(String(DEFAULT_SEMESTERS[0]));
      }
    };
    loadSemesters();
  }, [selectedCourseBranch]);

  useEffect(() => {
    if (!selectedCourseBranch || !selectedCourseSemester) {
      setCourseSubjects([]);
      setSelectedCourseSubject("");
      return;
    }
    const loadSubjects = async () => {
      try {
        const params = new URLSearchParams({
          branch: selectedCourseBranch,
          semester: selectedCourseSemester,
        });
        const response = await fetch(`/api/subjects?${params.toString()}`, {
          headers: authService.getAuthHeaders(),
        });
        const data = response.ok ? await response.json() : [];
        const list = Array.isArray(data) ? data : [];
        setCourseSubjects(list);
        if (list.length > 0) {
          setSelectedCourseSubject(list[0].name);
        } else {
          setSelectedCourseSubject("");
        }
      } catch (error) {
        console.error("Error fetching subjects:", error);
        setCourseSubjects([]);
        setSelectedCourseSubject("");
      }
    };
    loadSubjects();
  }, [selectedCourseBranch, selectedCourseSemester]);

  const fetchCourseResults = useCallback(async () => {
    if (!selectedCourseBranch || !selectedCourseSemester || !selectedCourseSubject) return;
    setCourseResultsLoading(true);
    try {
      const params = new URLSearchParams({
        branch: selectedCourseBranch,
        semester: selectedCourseSemester,
        subject: selectedCourseSubject,
        limit: "0",
      });
      const response = await fetch(`/api/courses/public?${params.toString()}`, {
        headers: authService.getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        const list = Array.isArray(data) ? data : data.courses || [];
        const normalized = list.map((course: any) => ({
          _id: course._id || course.id,
          id: course._id || course.id,
          title: course.title,
          description: course.description,
          branch: course.branch,
          subject: course.subject,
          semester: course.semester,
          poster: course.poster,
          coverPhoto: course.coverPhoto || course.poster || "",
          resourceUrl: course.resourceUrl || "",
          createdAt: course.createdAt || new Date().toISOString(),
          updatedAt: course.updatedAt || course.createdAt || new Date().toISOString(),
        }));
        setCourseResults(normalized);
      } else {
        setCourseResults([]);
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
      setCourseResults([]);
    } finally {
      setCourseResultsLoading(false);
    }
  }, [selectedCourseBranch, selectedCourseSemester, selectedCourseSubject]);

  useEffect(() => {
    if (selectedCourseBranch && selectedCourseSemester && selectedCourseSubject) {
      fetchCourseResults();
    } else {
      setCourseResults([]);
    }
  }, [selectedCourseBranch, selectedCourseSemester, selectedCourseSubject, fetchCourseResults]);

  const handleRealtimeEvent = useCallback(
    (message: { type: string; [key: string]: any }) => {
      if (!message) return;
      if (message.type === "course_deleted" && message.courseId) {
        setCourseResults((prev) => prev.filter((item) => item.id !== message.courseId));
        if (selectedCourseCard?.id === message.courseId) {
          setCourseDialogOpen(false);
          setSelectedCourseCard(null);
        }
        return;
      }
      if (
        message.course &&
        selectedCourseBranch &&
        selectedCourseSemester &&
        selectedCourseSubject &&
        ["course_launched", "course_updated"].includes(message.type)
      ) {
        const course = message.course;
        const matchesBranch = !selectedCourseBranch || course.branch === selectedCourseBranch;
        const matchesSemester =
          !selectedCourseSemester || String(course.semester) === String(selectedCourseSemester);
        const matchesSubject = !selectedCourseSubject || course.subject === selectedCourseSubject;
        if (matchesBranch && matchesSemester && matchesSubject) {
          const normalized: CourseLaunch = {
            _id: course._id || course.id,
            id: course._id || course.id,
            title: course.title,
            description: course.description,
            branch: course.branch,
            subject: course.subject,
            semester: course.semester,
            poster: course.poster,
            coverPhoto: course.coverPhoto || course.poster || "",
            resourceUrl: course.resourceUrl || "",
            createdAt: course.createdAt || new Date().toISOString(),
            updatedAt: course.updatedAt || course.createdAt || new Date().toISOString(),
          };
          setCourseResults((prev) => {
            const exists = prev.some((item) => item.id === normalized.id);
            return exists ? prev.map((item) => (item.id === normalized.id ? { ...item, ...normalized } : item)) : [normalized, ...prev];
          });
        }
      }
    },
    [selectedCourseBranch, selectedCourseSemester, selectedCourseSubject, selectedCourseCard]
  );

  useWebSocket({
    userId: user?.id || "",
    token: authService.getToken() || undefined,
    onMessage: handleRealtimeEvent,
  });

  const goToNotices = () => navigate("/notices");

  const handleToggleCourses = () => {
    setShowCourseExplorer((prev) => !prev);
  };

  const handleLogout = () => {
    logout();
    toast({ title: "Logged out successfully", description: "You have been logged out." });
    navigate("/");
  };

  return (
    <>
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      {/* Modern Header with Glassmorphism */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-white/20 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                    Student Dashboard
                  </h1>
                  <p className="text-slate-600 text-sm">
                    {user?.branch || 'Computer Engineering'} • Semester {user?.semester || '1'}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="relative"
                onClick={goToNotices}
              >
                <Bell className="w-5 h-5" />
                {unreadNotices > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
                    {unreadNotices > 9 ? '9+' : unreadNotices}
                  </span>
                )}
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/profile')}
              >
                <User className="w-5 h-5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="border-slate-300 hover:bg-slate-50"
              >
                <LogOut className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-8 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold mb-2">Welcome back, {user?.name || 'Student'}!</h2>
                  <p className="text-blue-100 text-lg">Ready to continue your learning journey?</p>
                </div>
              </div>
              {latestNotice && (
                <div className="mt-4 p-4 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
                  <div className="flex items-start gap-3">
                    <Bell className="w-5 h-5 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-sm mb-1">
                        {latestNotice ? `Latest Notice: ${latestNotice.title}` : 'No recent notices'}
                      </p>
                      <p className="text-blue-100 text-xs line-clamp-2">
                        {latestNotice ? latestNotice.content : 'Stay tuned for updates from the admin team.'}
                      </p>
                </div>
                </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Access Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card 
            className="group hover:shadow-xl transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm cursor-pointer"
            onClick={() => navigate('/materials')}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <BookOpen className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-800 mb-1">Materials</h3>
                  <p className="text-sm text-slate-600">Access study materials</p>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
              </div>
            </CardContent>
          </Card>

          <Card 
            className="group hover:shadow-xl transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm cursor-pointer"
            onClick={() => navigate('/projects')}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Code className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-800 mb-1">Projects</h3>
                  <p className="text-sm text-slate-600">Browse & upload projects</p>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-green-600 transition-colors" />
              </div>
            </CardContent>
          </Card>

          <Card 
            className="group hover:shadow-xl transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm cursor-pointer"
            onClick={() => navigate('/profile')}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <User className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-800 mb-1">Profile</h3>
                  <p className="text-sm text-slate-600">Manage your account</p>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-purple-600 transition-colors" />
              </div>
            </CardContent>
          </Card>

          <Card 
            className="group hover:shadow-xl transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm cursor-pointer"
            onClick={goToNotices}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform relative">
                  <Bell className="w-7 h-7 text-white" />
                  {unreadNotices > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center border-2 border-white">
                      {unreadNotices > 9 ? '9+' : unreadNotices}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-800 mb-1">Notices</h3>
                  <p className="text-sm text-slate-600">
                    {unreadNotices > 0 ? `${unreadNotices} new notice${unreadNotices > 1 ? 's' : ''}` : 'View notices'}
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-orange-600 transition-colors" />
              </div>
            </CardContent>
          </Card>
          <Card
            className={`group hover:shadow-xl transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm cursor-pointer ${showCourseExplorer ? "ring-2 ring-blue-400" : ""}`}
            onClick={handleToggleCourses}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <GraduationCap className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-800 mb-1">Courses</h3>
                  <p className="text-sm text-slate-600">
                    {showCourseExplorer ? "Hide explorer" : "Browse by branch"}
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
              </div>
            </CardContent>
          </Card>
          <Card 
            className="group hover:shadow-xl transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm cursor-pointer"
            onClick={() => window.open('/internship', '_blank', 'noopener')}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Briefcase className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-800 mb-1">Internships</h3>
                  <p className="text-sm text-slate-600">Apply & track applications</p>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-orange-600 transition-colors" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Course Explorer */}
        {showCourseExplorer && (
          <div id="courses-section" className="mb-8">
          <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5" />
                  Course Explorer
                  {selectedCourseBranch && (
                    <Badge variant="outline" className="text-xs">
                      {selectedCourseBranch}
                    </Badge>
                )}
              </CardTitle>
            </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Branch</Label>
                    <select
                      value={selectedCourseBranch}
                      onChange={(e) => setSelectedCourseBranch(e.target.value)}
                      className="mt-2 w-full p-3 border border-slate-200 rounded-lg bg-white"
                    >
                      {courseBranches.map((branch) => (
                        <option key={branch} value={branch}>
                          {branch}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Semester</Label>
                    <select
                      value={selectedCourseSemester}
                      onChange={(e) => setSelectedCourseSemester(e.target.value)}
                      className="mt-2 w-full p-3 border border-slate-200 rounded-lg bg-white"
                    >
                      {courseSemesters.map((sem) => (
                        <option key={sem} value={String(sem)}>
                          Semester {sem}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Subject</Label>
                    <select
                      value={selectedCourseSubject}
                      onChange={(e) => setSelectedCourseSubject(e.target.value)}
                      className="mt-2 w-full p-3 border border-slate-200 rounded-lg bg-white"
                    >
                      <option value="">Select subject</option>
                      {courseSubjects.map((subject) => (
                        <option key={subject.code} value={subject.name}>
                          {subject.name} ({subject.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
                  {!selectedCourseSubject ? (
                    <div className="text-center text-muted-foreground py-6">
                      Choose a subject to view available courses.
                    </div>
                  ) : courseResultsLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : courseResults.length === 0 ? (
                    <div className="text-center text-muted-foreground py-6">
                      No courses found for this selection.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {courseResults.map((course) => (
                        <div
                          key={course.id}
                          className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col gap-3 cursor-pointer group hover:shadow-lg transition-shadow"
                          onClick={() => {
                            setSelectedCourseCard(course);
                            setCourseDialogOpen(true);
                          }}
                        >
                          <div className="relative h-32 rounded-lg overflow-hidden">
                            {course.coverPhoto ? (
                              <img src={course.coverPhoto} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-semibold">
                                {course.title.slice(0, 1)}
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                            <div className="absolute bottom-3 left-3 text-white">
                              <p className="text-xs uppercase tracking-wide opacity-80">Sem {course.semester || "-"}</p>
                              <h4 className="text-lg font-semibold">{course.title}</h4>
                            </div>
                          </div>
                          <p className="text-sm text-slate-600 line-clamp-2">{course.description}</p>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{course.subject}</span>
                            <span>{new Date(course.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-right text-xs font-medium text-blue-600">
                            Click for details
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
            </CardContent>
          </Card>
        </div>
        )}

        {/* Internship application form */}
        <div className="mb-8">
          <Card className="bg-white border border-slate-100 shadow-xl">
            <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-blue-500">Internship</p>
                <CardTitle className="text-2xl">Submit your application</CardTitle>
              </div>
              <Button variant="outline" onClick={() => window.open('/internship', '_blank', 'noopener')}>
                View full details
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700">
                Hardware + Software tracks with Hybrid, Onsite, and Online options. Choose durations and
                receive verified certificates plus mentor evaluation. Use the button above to open the dedicated internship portal and submit your application.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Notices managed on dedicated page */}
      </div>
    </div>

    <Dialog
      open={courseDialogOpen}
      onOpenChange={(open) => {
        setCourseDialogOpen(open);
        if (!open) setSelectedCourseCard(null);
      }}
    >
      <DialogContent className="max-w-md p-0 overflow-hidden border-0 shadow-2xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
        {selectedCourseCard?.coverPhoto && (
          <div className="h-48 overflow-hidden">
            <img
              src={selectedCourseCard.coverPhoto}
              alt={selectedCourseCard.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold">{selectedCourseCard?.title}</DialogTitle>
            <DialogDescription>
              {selectedCourseCard?.subject} • Branch: {selectedCourseCard?.branch} • Semester{" "}
              {selectedCourseCard?.semester || "-"}
            </DialogDescription>
          </DialogHeader>
          {selectedCourseCard?.description && (
            <p className="text-sm text-slate-600">{selectedCourseCard.description}</p>
          )}
          <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
            <div>
              <p className="font-medium text-slate-900">Subject</p>
              <p>{selectedCourseCard?.subject}</p>
            </div>
            <div>
              <p className="font-medium text-slate-900">Semester</p>
              <p>{selectedCourseCard?.semester || "-"}</p>
            </div>
            <div>
              <p className="font-medium text-slate-900">Branch</p>
              <p>{selectedCourseCard?.branch}</p>
            </div>
            <div>
              <p className="font-medium text-slate-900">Updated</p>
              <p>
                {selectedCourseCard?.updatedAt
                  ? new Date(selectedCourseCard.updatedAt).toLocaleDateString()
                  : new Date(selectedCourseCard?.createdAt || "").toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCourseDialogOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() =>
                selectedCourseCard?.resourceUrl &&
                window.open(selectedCourseCard.resourceUrl, "_blank", "noopener")
              }
              disabled={!selectedCourseCard?.resourceUrl}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Visit Resource
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};

interface CourseLaunch {
  _id?: string;
  id?: string;
  title: string;
  description: string;
  branch: string;
  subject: string;
  semester?: number | string;
  poster?: string;
  coverPhoto?: string;
  resourceUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

export default StudentDashboard; 