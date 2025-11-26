import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
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
import { useIsMobile } from '@/hooks/use-mobile';

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
  const isMobile = useIsMobile();

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

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="sm" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[300px] sm:w-[400px]">
          <div className="flex flex-col h-full">
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
    );
  }

  return (
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
  );
};
