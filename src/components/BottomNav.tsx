import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Home, 
  GraduationCap, 
  BookOpen, 
  User,
  Settings
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
  { label: 'Admin', path: '/admin-dashboard', icon: Settings, userType: 'admin' },
  { label: 'Materials', path: '/materials', icon: BookOpen },
  { label: 'Profile', path: '/profile', icon: User },
];

export const BottomNav: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!isAuthenticated) {
    return null;
  }

  // Hide bottom nav on dashboard pages
  const isDashboardPage = location.pathname === '/student-dashboard' || 
                          location.pathname === '/admin-dashboard' ||
                          location.pathname === '/admin';
  
  if (isDashboardPage) {
    return null;
  }

  const filteredNavItems = navItems.filter(item => 
    !item.userType || item.userType === user?.userType
  );

  const handleNavClick = (path: string) => {
    navigate(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {filteredNavItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <button
              key={item.path}
              onClick={() => handleNavClick(item.path)}
              className={`flex flex-col items-center justify-center flex-1 h-full touch-manipulation transition-colors ${
                isActive 
                  ? 'text-primary' 
                  : 'text-gray-600 hover:text-primary'
              }`}
              style={{
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation',
                minHeight: '64px'
              }}
              aria-label={item.label}
            >
              <Icon className={`h-5 w-5 mb-1 ${isActive ? 'text-primary' : ''}`} />
              <span className={`text-xs font-medium ${isActive ? 'text-primary' : 'text-gray-600'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

