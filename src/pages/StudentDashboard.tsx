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
  Briefcase
} from "lucide-react";
import React, { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { authService } from "@/lib/auth";
import UserNotifications, { Notice, NoticeSummary } from "@/components/UserNotifications";
import InternshipForm from "@/components/InternshipForm";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/useWebSocket";


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

  const handleNoticeSummary = useCallback((summary: NoticeSummary) => {
    setUnreadNotices(summary.unread);
    setLatestNotice(summary.latest || null);
  }, []);

  useWebSocket({
    userId: user?.id || "",
    token: authService.getToken() || undefined,
    onMessage: () => {
      // Handle realtime events if needed (notices, etc.)
      // Course events are now handled in the Courses page
    },
  });

  const goToNotices = () => navigate("/notices");

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
      <div className="container mx-auto px-4 py-4 sm:py-8">
        {/* Welcome Section - Mobile Optimized */}
        <div className="mb-6 sm:mb-8">
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl sm:rounded-3xl p-4 sm:p-8 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 rounded-xl sm:rounded-2xl flex items-center justify-center backdrop-blur-sm flex-shrink-0">
                  <Sparkles className="w-6 h-6 sm:w-8 sm:h-8" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl sm:text-3xl font-bold mb-1 sm:mb-2 truncate">Welcome back, {user?.name || 'Student'}!</h2>
                  <p className="text-blue-100 text-sm sm:text-lg">Ready to continue your learning journey?</p>
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

        {/* Quick Access Cards - Mobile First Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card 
            className="group hover:shadow-xl transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm cursor-pointer active:scale-95"
            onClick={() => navigate('/materials')}
          >
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform flex-shrink-0">
                  <BookOpen className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-0.5 sm:mb-1 truncate">Materials</h3>
                  <p className="text-xs sm:text-sm text-slate-600 truncate">Access study materials</p>
                </div>
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 group-hover:text-blue-600 transition-colors flex-shrink-0" />
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
            className="group hover:shadow-xl transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm cursor-pointer"
            onClick={() => navigate("/courses")}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <GraduationCap className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-800 mb-1">Courses</h3>
                  <p className="text-sm text-slate-600">
                    Browse courses by branch and semester
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

        {/* Hidden UserNotifications component to track unread count */}
        <div style={{ display: 'none' }}>
          <UserNotifications
            userId={user?.id || ""}
            userBranch={user?.branch}
            userType={user?.userType}
            onSummaryUpdate={handleNoticeSummary}
          />
        </div>
      </div>
    </div>

    </>
  );
};

export default StudentDashboard; 