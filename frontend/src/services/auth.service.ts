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
    const subdomain = getSubdomain();
    
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Academy-Subdomain': subdomain,
      },
      body: JSON.stringify({ email, password, role }),
    });

    const body = await response.json();
    if (!response.ok || !body.success) {
      throw new Error(body.error?.message || 'Invalid email or password.');
    }

    const { tokens, user } = body.data;

    // Save auth token in browser cookies and localStorage for middleware and API verification
    document.cookie = `mock-auth-token=${tokens.accessToken}; path=/; max-age=604800; SameSite=Lax`;
    try {
      localStorage.setItem('auth-token', tokens.accessToken);
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
      role: (user.role as UserRole) || role,
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
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
      console.error('Logout request failed:', err);
    } finally {
      // Clear cookie session
      document.cookie = 'mock-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
    }
  },
};
