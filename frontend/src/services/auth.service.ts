import { UserRole } from '@/config/roles';
import { UserSession } from '@/store/useAuthStore';
import { API_BASE_URL } from '@/config/api.config';

export interface LoginResponse {
  user: UserSession & { isDefaultPassword?: boolean };
  role: UserRole;
  token: string;
  refreshToken: string;
}

function getSubdomain(): string {
  if (typeof window === 'undefined') return 'hyvora';
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    if (parts.length > 1 && !parts[0].startsWith('localhost')) {
      return parts[0];
    }
  } else if (hostname.includes('vercel.app') || hostname.includes('onrender.com')) {
    if (parts.length > 3) {
      return parts[0];
    }
  } else {
    if (parts.length > 2) {
      return parts[0];
    }
  }
  return 'hyvora'; // Default fallback
}

export const authService = {
  login: async (email: string, password: string, role: UserRole): Promise<LoginResponse> => {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();
    const subdomain = getSubdomain();

    // 1. Attempt live API login if server is reachable
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Academy-Subdomain': subdomain,
        },
        body: JSON.stringify({ email: cleanEmail, password: cleanPass, role }),
      });

      if (response.ok) {
        const body = await response.json();
        if (body.success && body.data) {
          const { tokens, user } = body.data;
          const userRole = (user.role as UserRole) || role;
          const token = tokens.accessToken;

          document.cookie = `mock-auth-token=${token}; path=/; max-age=604800; SameSite=Lax`;
          try {
            localStorage.setItem('auth-token', token);
          } catch (e) {}

          return {
            user: {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              academyId: user.academyId,
              isDefaultPassword: user.isDefaultPassword,
            },
            role: userRole,
            token,
            refreshToken: tokens.refreshToken,
          };
        }
      }
    } catch (networkErr) {
      console.warn('Backend API connection failed, proceeding with client demo authentication session:', networkErr);
    }

    // 2. Fallback client-side demo authentication for hosted / demo environments
    const isTeacher = cleanEmail === 'teacher' || cleanEmail.includes('teacher') || cleanEmail === 'ramesh@hyvora.com' || cleanEmail === 'emp-hyv-101' || role === 'TEACHER';
    const isStudent = cleanEmail === 'student' || cleanEmail.includes('student') || cleanEmail === 'arjun@hyvora.com' || cleanEmail === 'hyv-2026-001' || role === 'STUDENT';
    const isSuperAdmin = cleanEmail === 'superadmin' || cleanEmail.includes('superadmin') || role === 'SUPER_ADMIN';

    let resolvedRole: UserRole = role;
    let mockUser: UserSession = {
      id: 'u1111111-1111-1111-1111-111111111111',
      email: 'admin@hyvora.com',
      firstName: 'Hyvora',
      lastName: 'Admin',
      academyId: 'a1111111-1111-1111-1111-111111111111',
    };

    if (role === 'SUPER_ADMIN' || isSuperAdmin) {
      resolvedRole = 'SUPER_ADMIN';
      mockUser = {
        id: '00000000-0000-0000-0000-000000000000',
        email: 'superadmin@hyvora.com',
        firstName: 'Super',
        lastName: 'Admin',
        academyId: 'platform',
      };
    } else if (role === 'TEACHER' || (isTeacher && role !== 'ACADEMY_ADMIN')) {
      resolvedRole = 'TEACHER';
      mockUser = {
        id: '22222222-2222-2222-2222-222222222222',
        email: cleanEmail.includes('@') ? cleanEmail : 'ramesh@hyvora.com',
        firstName: 'Ramesh',
        lastName: 'Kumar',
        academyId: 'a1111111-1111-1111-1111-111111111111',
      };
    } else if (role === 'STUDENT' || (isStudent && role !== 'ACADEMY_ADMIN')) {
      resolvedRole = 'STUDENT';
      mockUser = {
        id: 's1111111-1111-1111-1111-111111111111',
        email: cleanEmail.includes('@') ? cleanEmail : 'arjun@hyvora.com',
        firstName: 'Arjun',
        lastName: 'Sharma',
        academyId: 'a1111111-1111-1111-1111-111111111111',
      };
    } else {
      resolvedRole = 'ACADEMY_ADMIN';
      mockUser = {
        id: 'u1111111-1111-1111-1111-111111111111',
        email: cleanEmail.includes('@') ? cleanEmail : 'admin@hyvora.com',
        firstName: 'Hyvora',
        lastName: 'Admin',
        academyId: 'a1111111-1111-1111-1111-111111111111',
      };
    }

    const mockToken = `mock-jwt-${resolvedRole.toLowerCase()}-token-${Date.now()}`;
    
    // Set cookies and local storage
    document.cookie = `mock-auth-token=${mockToken}; path=/; max-age=604800; SameSite=Lax`;
    try {
      localStorage.setItem('auth-token', mockToken);
      localStorage.setItem('auth-user', JSON.stringify(mockUser));
      localStorage.setItem('auth-role', resolvedRole);
    } catch (e) {}

    return {
      user: {
        ...mockUser,
        isDefaultPassword: false,
      },
      role: resolvedRole,
      token: mockToken,
      refreshToken: `mock-refresh-token-${Date.now()}`,
    };
  },

  logout: async (token: string): Promise<void> => {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Academy-Subdomain': getSubdomain(),
        },
      });
    } catch (err) {
      console.warn('Logout API unreachable:', err);
    } finally {
      // Clear cookie session and local storage
      document.cookie = 'mock-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
      try {
        localStorage.removeItem('auth-token');
        localStorage.removeItem('auth-user');
        localStorage.removeItem('auth-role');
        sessionStorage.removeItem('auth-token');
        sessionStorage.removeItem('auth-user');
        sessionStorage.removeItem('auth-role');
      } catch (e) {}
    }
  },
};
