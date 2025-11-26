import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

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
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          <h1 className="text-3xl font-bold mb-3">We’ll be back soon</h1>
          <p className="text-muted-foreground">The website is under maintenance. Please try again later.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
