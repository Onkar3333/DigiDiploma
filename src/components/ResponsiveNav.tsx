import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { 
  Menu, 
  X, 
  User, 
  LogOut, 
  Bell, 
  Settings,
  GraduationCap,
  BookOpen,
  Home
} from 'lucide-react';

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  userType?: 'student' | 'admin';
}

const navItems: NavItem[] = [
  { label: 'Home', path: '/', icon: Home },
  { label: 'Dashboard', path: '/student-dashboard', icon: GraduationCap, userType: 'student' },
  { label: 'Admin Panel', path: '/admin-dashboard', icon: Settings, userType: 'admin' },
  { label: 'Materials', path: '/materials', icon: BookOpen },
  { label: 'Profile', path: '/profile', icon: User },
];

export const ResponsiveNav: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsOpen(false);
  };

  const handleNavClick = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  const filteredNavItems = navItems.filter(item => 
    !item.userType || item.userType === user?.userType
  );

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      {/* Desktop Navigation - Hidden on mobile, visible on desktop */}
      <nav className="hidden md:flex items-center space-x-2">
      {filteredNavItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;
        
        return (
          <Button
            key={item.path}
            variant={isActive ? "secondary" : "ghost"}
            size="sm"
            onClick={() => handleNavClick(item.path)}
            className="group relative transition-all duration-300 hover:scale-105 hover:shadow-md"
          >
            <Icon className="mr-2 h-4 w-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3" />
            <span className="relative z-10">{item.label}</span>
            {!isActive && (
              <span className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
            )}
          </Button>
        );
      })}
      
      <div className="flex items-center space-x-2 ml-4 pl-4 border-l">
        <Button 
          variant="ghost" 
          size="sm"
          className="group relative transition-all duration-300 hover:scale-110 hover:bg-yellow-50 hover:text-yellow-600"
        >
          <Bell className="h-4 w-4 transition-transform duration-300 group-hover:animate-pulse" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleLogout}
          className="group relative transition-all duration-300 hover:scale-110 hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="h-4 w-4 transition-transform duration-300 group-hover:rotate-12" />
        </Button>
      </div>
    </nav>
    </>
  );
};
