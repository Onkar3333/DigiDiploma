import React, { useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Home, BookOpen, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const MobileBottomNav: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Ensure page content is not hidden behind the bottom nav on mobile.
  // Hook must run on every render (cannot be conditional).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const previousPadding = document.body.style.paddingBottom;

    const updatePadding = () => {
      // Only add padding when nav is potentially visible on small screens
      if (window.innerWidth < 768 && isAuthenticated && user?.userType === 'student') {
        document.body.style.paddingBottom = '72px';
      } else {
        document.body.style.paddingBottom = previousPadding || '';
      }
    };

    updatePadding();
    window.addEventListener('resize', updatePadding);

    return () => {
      window.removeEventListener('resize', updatePadding);
      document.body.style.paddingBottom = previousPadding;
    };
  }, [isAuthenticated, user?.userType]);

  // Show only for authenticated students on small screens
  if (!isAuthenticated || user?.userType !== 'student') {
    return null;
  }

  const baseItemClass =
    'flex flex-col items-center justify-center flex-1 gap-0.5 text-[11px] font-medium py-1';
  const activeClass = 'text-indigo-600';
  const inactiveClass = 'text-slate-500';

  // NOTE: Search is now handled inside the Materials page itself.

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-white/95 border-t border-slate-200 shadow-[0_-4px_16px_rgba(15,23,42,0.08)]">
      <div className="max-w-6xl mx-auto px-2">
        <div className="flex items-center justify-between h-14">
          <NavLink
            to="/student-dashboard"
            className={({ isActive }) =>
              `${baseItemClass} ${
                isActive ? activeClass : inactiveClass
              }`
            }
          >
            <Home className="w-5 h-5 mb-0.5" />
            <span>Home</span>
          </NavLink>

          <NavLink
            to="/materials"
            className={({ isActive }) =>
              `${baseItemClass} ${
                isActive ? activeClass : inactiveClass
              }`
            }
          >
            <BookOpen className="w-5 h-5 mb-0.5" />
            <span>Subjects</span>
          </NavLink>

          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `${baseItemClass} ${
                isActive ? activeClass : inactiveClass
              }`
            }
          >
            <User className="w-5 h-5 mb-0.5" />
            <span>Profile</span>
          </NavLink>
        </div>
      </div>
    </nav>
  );
};

export default MobileBottomNav;


