import React from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { Loader2, Settings, ArrowLeft, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredUserType?: 'student' | 'admin';
  fallbackPath?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredUserType,
  fallbackPath = '/',
}) => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();
  const [maintenance, setMaintenance] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/system/maintenance');
        if (res.ok) {
          const data = await res.json();
          setMaintenance(!!data.maintenance);
        }
      } catch {}
    };
    check();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to landing with login prompt so the login panel opens
    return <Navigate to="/?login=1" state={{ from: location }} replace />;
  }

  if (requiredUserType && user?.userType !== requiredUserType) {
    return <Navigate to={fallbackPath} replace />;
  }

  // If maintenance is on and user is not admin, block access
  if (maintenance && user?.userType !== 'admin') {
    return <MaintenancePage user={user} />;
  }

  return <>{children}</>;
};

// Maintenance Page Component with Animations
const MaintenancePage: React.FC<{ user: any }> = ({ user }) => {
  const navigate = useNavigate();
  const isAdmin = user?.userType === 'admin';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      <div className="max-w-2xl w-full text-center space-y-8 animate-in fade-in-0 zoom-in-95 duration-500">
        {/* Animated Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping" />
            <div className="absolute inset-0 bg-blue-500/30 rounded-full animate-pulse" />
            <div className="relative bg-gradient-to-br from-blue-500 to-indigo-600 p-6 rounded-full shadow-2xl">
              <Wrench className="w-16 h-16 text-white animate-spin-slow" />
            </div>
          </div>
        </div>

        {/* Animated Text */}
        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent animate-pulse">
            Under Maintenance
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 max-w-md mx-auto">
            We're currently performing some scheduled maintenance to improve your experience.
          </p>
          <p className="text-sm text-slate-500">
            We'll be back online shortly. Thank you for your patience!
          </p>
        </div>

        {/* Animated Progress Bar */}
        <div className="w-full max-w-md mx-auto space-y-2 animate-in slide-in-from-bottom-8 duration-1000">
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full animate-progress" />
          </div>
          <p className="text-xs text-slate-500">Maintenance in progress...</p>
        </div>

        {/* Back to Dashboard Button (for admin) */}
        {isAdmin && (
          <div className="pt-4 animate-in slide-in-from-bottom-12 duration-1200">
            <Button
              onClick={() => navigate('/admin-dashboard')}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-6 py-3 rounded-xl"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        )}

        {/* Floating Animation Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-20 h-20 bg-blue-200/30 rounded-full blur-xl animate-float" />
          <div className="absolute bottom-20 right-10 w-32 h-32 bg-indigo-200/30 rounded-full blur-xl animate-float-delayed" />
          <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-purple-200/30 rounded-full blur-xl animate-float-slow" />
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-30px) rotate(-5deg); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(3deg); }
        }
        @keyframes progress {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 100%; }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-delayed 8s ease-in-out infinite;
        }
        .animate-float-slow {
          animation: float-slow 10s ease-in-out infinite;
        }
        .animate-progress {
          animation: progress 3s ease-in-out infinite;
        }
        .animate-spin-slow {
          animation: spin 3s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default ProtectedRoute;
