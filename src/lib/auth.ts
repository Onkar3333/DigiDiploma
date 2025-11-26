export interface AuthUser {
  id: string;
  name: string;
  email: string;
  userType: 'student' | 'admin';
  branch?: string;
  semester?: string;
  studentId?: string;
}

export interface LoginCredentials {
  emailOrStudentId: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  studentId: string;
  password: string;
  branch: string;
  semester: string;
  college: string;
  phone: string;
}

class AuthService {
  private tokenKey = 'auth_token';
  private userKey = 'auth_user';

  // Login user
  async login(credentials: LoginCredentials | { email?: string; password: string }): Promise<{ user: AuthUser; token: string; message?: string } | { error: string }> {
    try {
      // Normalize credentials to expected backend shape
      const payload: { emailOrStudentId: string; password: string } = {
        emailOrStudentId: (credentials as any).emailOrStudentId || (credentials as any).email || '',
        password: (credentials as any).password,
      };

      if (!payload.emailOrStudentId || !payload.password) {
        return { error: 'Email/Enrollment number and password are required.' };
      }

      const response = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        // Extract error message from backend response
        const errorMessage = data.error || data.message || 'Login failed. Please check your credentials and try again.';
        return { error: errorMessage };
      }
      
      // Store token and user data
      this.setToken(data.token);
      this.setUser(data.user);
      
      return { 
        user: data.user, 
        token: data.token,
        message: data.message || 'Login successful'
      };
    } catch (error: any) {
      console.error('Login error:', error);
      return { error: error.message || 'Network error. Please check your connection and try again.' };
    }
  }

  // Register user
  async register(credentials: RegisterCredentials): Promise<{ user: AuthUser; token: string; message?: string } | { error: string }> {
    try {
      const response = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (!response.ok) {
        // Extract error message from backend response
        const errorMessage = data.error || data.message || 'Registration failed. Please try again.';
        return { error: errorMessage };
      }
      
      // Store token and user data
      this.setToken(data.token);
      this.setUser(data.user);
      
      return { 
        user: data.user, 
        token: data.token,
        message: data.message || 'User registered successfully'
      };
    } catch (error: any) {
      console.error('Registration error:', error);
      return { error: error.message || 'Network error. Please check your connection and try again.' };
    }
  }

  // Logout user
  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }

  // Get current user
  getCurrentUser(): AuthUser | null {
    const userStr = localStorage.getItem(this.userKey);
    if (!userStr) return null;
    
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  // Get token
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;

    try {
      // Simple token validation - check if it exists and is not empty
      return token.length > 0;
    } catch {
      this.logout();
      return false;
    }
  }

  // Set token
  private setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  // Set user
  private setUser(user: AuthUser): void {
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  // Get auth headers for API requests
  getAuthHeaders(): Record<string, string> {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // Refresh token
  async refreshToken(): Promise<boolean> {
    try {
      const token = this.getToken();
      if (!token) {
        console.error('❌ No token to refresh');
        this.logout();
        return false;
      }

      const response = await fetch('/api/users/refresh', {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Token refresh failed:', response.status, errorData);
        this.logout();
        return false;
      }

      const data = await response.json();
      if (data.token) {
        this.setToken(data.token);
        console.log('✅ Token refreshed successfully');
        return true;
      } else {
        console.error('❌ No token in refresh response');
        this.logout();
        return false;
      }
    } catch (error) {
      console.error('❌ Error refreshing token:', error);
      this.logout();
      return false;
    }
  }
}

export const authService = new AuthService();
