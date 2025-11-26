import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthUser, authService } from '@/lib/auth';

interface AuthActionResult {
  success: boolean;
  error?: string;
  message?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: any) => Promise<AuthActionResult>;
  register: (credentials: any) => Promise<AuthActionResult>;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      try {
        if (authService.isAuthenticated()) {
          const currentUser = authService.getCurrentUser();
          setUser(currentUser);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        authService.logout();
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (credentials: any): Promise<AuthActionResult> => {
    try {
      setIsLoading(true);
      const result = await authService.login(credentials);
      if ('error' in result) {
        return { success: false, error: result.error };
      }
      if (result && result.user) {
        setUser(result.user);
        return { success: true, message: result.message };
      }
      return { success: false, error: 'Login failed. Please try again.' };
    } catch (error: any) {
      console.error('Login error:', error);
      return { success: false, error: error.message || 'An unexpected error occurred during login.' };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (credentials: any): Promise<AuthActionResult> => {
    try {
      setIsLoading(true);
      const result = await authService.register(credentials);
      if ('error' in result) {
        return { success: false, error: result.error };
      }
      if (result && result.user) {
        setUser(result.user);
        return { success: true, message: result.message };
      }
      return { success: false, error: 'Registration failed. Please try again.' };
    } catch (error: any) {
      console.error('Registration error:', error);
      return { success: false, error: error.message || 'An unexpected error occurred during registration.' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const refreshToken = async (): Promise<boolean> => {
    try {
      return await authService.refreshToken();
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
