import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import MobileBottomNav from "@/components/MobileBottomNav";
import NotificationHandler from "@/components/NotificationHandler";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import { useServiceWorker } from "@/hooks/useServiceWorker";
import { useEffect, useState } from "react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/AdminDashboard";
import SemesterPageWrapper from "./pages/SemesterPageWrapper";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Cookies from "./pages/Cookies";
import AdminRoute from "./components/AdminRoute";
import NotAuthorized from "./pages/NotAuthorized";
import StudentDashboard from "./pages/StudentDashboard";
import BranchSubjectsPage from "./pages/BranchSubjectsPage";
import Materials from "./pages/Materials";
import Internship from "./pages/Internship";
import Projects from "./pages/Projects";
import Profile from "./pages/Profile";
import StudentNotices from "./pages/StudentNotices";
import Courses from "./pages/Courses";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLogin from "@/pages/AdminLogin";
import Login from "@/pages/Login";

const queryClient = new QueryClient();

const MaintenanceGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [maintenance, setMaintenance] = useState(false);
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/system/maintenance');
        if (res.ok) {
          const data = await res.json();
          setMaintenance(!!data.maintenance);
        }
      } catch {
        // Silently fail - don't block the app if maintenance check fails
      }
    };
    check();
    // Reduce frequency to every 60 seconds (was 15 seconds) to avoid rate limiting
    const id = setInterval(check, 60000);
    return () => clearInterval(id);
  }, []);
  // Only gate protected app content; allow landing and auth routes always
  return <>{children}</>;
};

const App = () => {
  const { isSupported, isUpdated, updateServiceWorker } = useServiceWorker();

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <Sonner />
            <NotificationHandler />
            <PWAInstallPrompt />
            <BrowserRouter>
            <MaintenanceGate>
              <>
              <Routes>
            <Route path="/" element={<Index />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            {/* Student login (for purchasing paid materials) */}
            <Route path="/login" element={<Login />} />
            {/* Admin login route (public) */}
            <Route path="/admin-login" element={<AdminLogin />} />
            {/* Admin routes (protected) */}
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute requiredUserType="admin" fallbackPath="/admin-login">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route 
              path="/admin-dashboard" 
              element={
                <ProtectedRoute requiredUserType="admin" fallbackPath="/admin-login">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route 
              path="/student-dashboard" 
              element={
                <ProtectedRoute requiredUserType="student">
                  <StudentDashboard />
                </ProtectedRoute>
              } 
            />
            {/* Public dashboard access without auth (guest student) */}
            <Route 
              path="/open-dashboard"
              element={<StudentDashboard />}
            />
            <Route 
              path="/notices" 
              element={
                <ProtectedRoute requiredUserType="student">
                  <StudentNotices />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/courses" 
              element={
                <ProtectedRoute requiredUserType="student">
                  <Courses />
                </ProtectedRoute>
              } 
            />
            <Route path="/semester/:semester" element={<SemesterPageWrapper />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/internship" element={<Internship />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/cookies" element={<Cookies />} />
            <Route path="/not-authorized" element={<NotAuthorized />} />
            <Route path="/branch/:branchName" element={<BranchSubjectsPage />} />
            <Route path="/materials" element={<Materials />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:id" element={<Projects />} />
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } 
            />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <MobileBottomNav />
            </>
            </MaintenanceGate>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
  );
};

export default App;
