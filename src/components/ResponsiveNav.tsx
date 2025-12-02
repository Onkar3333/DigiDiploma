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
      {/* Mobile Menu Button - Always visible on mobile, hidden on desktop */}
      <Button 
        variant="ghost" 
        size="icon"
        className="flex md:hidden touch-manipulation relative z-50 pointer-events-auto h-10 w-10"
        style={{ 
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation',
          minWidth: '40px',
          minHeight: '40px'
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(true);
        }}
        onTouchStart={(e) => {
          e.stopPropagation();
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(true);
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(true);
        }}
        aria-label="Open menu"
        type="button"
      >
        <Menu className="h-6 w-6" />
      </Button>

      {/* Mobile Menu Sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent 
          side="left" 
          className="w-[300px] sm:w-[400px] z-[100] [&>button]:hidden"
          onInteractOutside={(e) => {
            // Allow closing by tapping outside
            setIsOpen(false);
          }}
          onEscapeKeyDown={() => setIsOpen(false)}
        >
          <div className="flex flex-col h-full touch-manipulation">
            {/* Close Button - Custom with explicit handler */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4 h-10 w-10 touch-manipulation z-10"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsOpen(false);
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
              }}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </Button>

            {/* User Info */}
            <div className="flex items-center gap-3 p-4 border-b">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-medium">{user?.name}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>

            {/* Navigation Items */}
            <nav className="flex-1 py-4">
              <ul className="space-y-2">
                {filteredNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  
                  return (
                    <li key={item.path}>
                      <Button
                        variant={isActive ? "secondary" : "ghost"}
                        className="w-full justify-start"
                        onClick={() => handleNavClick(item.path)}
                      >
                        <Icon className="mr-3 h-4 w-4" />
                        {item.label}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Actions */}
            <div className="border-t p-4 space-y-2">
              <Button variant="ghost" className="w-full justify-start">
                <Bell className="mr-3 h-4 w-4" />
                Notifications
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start text-red-600 hover:text-red-700"
                onClick={handleLogout}
              >
                <LogOut className="mr-3 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop Navigation - Hidden on mobile, visible on desktop */}
      <nav className="hidden md:flex items-center space-x-4">
      {filteredNavItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;
        
        return (
          <Button
            key={item.path}
            variant={isActive ? "secondary" : "ghost"}
            size="sm"
            onClick={() => handleNavClick(item.path)}
          >
            <Icon className="mr-2 h-4 w-4" />
            {item.label}
          </Button>
        );
      })}
      
      <div className="flex items-center space-x-2 ml-4 pl-4 border-l">
        <Button variant="ghost" size="sm">
          <Bell className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </nav>
    </>
  );
};
