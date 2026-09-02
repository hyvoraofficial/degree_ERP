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
    
    let response: Response;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Academy-Subdomain': subdomain,
        },
        body: JSON.stringify({ email, password, role }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (netErr: any) {
      if (netErr.name === 'AbortError') {
        throw new Error(`Authentication request timed out. Could not reach backend API at ${API_BASE_URL}`);
      }
      throw new Error(`Cannot connect to backend server (${API_BASE_URL}). Please verify your backend deployment URL and network connection.`);
    }

    let body: any;
    try {
      body = await response.json();
    } catch (e) {
      throw new Error(`Invalid server response received from ${API_BASE_URL}`);
    }

    if (!response.ok || !body.success) {
      throw new Error(body.error?.message || body.message || 'Invalid email or password.');
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
