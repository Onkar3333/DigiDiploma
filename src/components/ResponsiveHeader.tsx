import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ResponsiveNav } from './ResponsiveNav';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { BookOpen, User } from 'lucide-react';

export const ResponsiveHeader: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogin = () => {
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="flex items-center space-x-2"
            >
              <BookOpen className="h-6 w-6 text-primary" />
              <span className="hidden sm:inline-block font-bold text-lg">
                EduPortal
              </span>
            </Button>
          </div>

          {/* Navigation */}
          {isAuthenticated ? (
            <ResponsiveNav />
          ) : (
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogin}
                className="hidden sm:inline-flex"
              >
                <User className="h-4 w-4 mr-2" />
                Login
              </Button>
              <Button
                size="sm"
                onClick={handleLogin}
                className="sm:hidden"
              >
                <User className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
