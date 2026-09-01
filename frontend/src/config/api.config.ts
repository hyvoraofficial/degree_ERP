/**
 * HYVORA EduERP API Configuration
 * Resolves API Base URL from NEXT_PUBLIC_API_URL environment variable,
 * falling back to local NestJS development server URL.
 */
const rawBaseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1').trim().replace(/\/+$/, '');

export const API_BASE_URL = rawBaseUrl.endsWith('/api/v1')
  ? rawBaseUrl
  : `${rawBaseUrl}/api/v1`;

export const getApiUrl = (endpoint: string): string => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${cleanEndpoint}`;
};

export function getSubdomain(): string {
  if (typeof window === 'undefined') return 'hyvora';
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    if (parts.length > 1 && !parts[0].startsWith('localhost')) {
      return parts[0];
    }
  } else {
    if (parts.length > 2) {
      return parts[0];
    }
  }
  return 'hyvora';
}

export function getAuthToken(): string {
  if (typeof window === 'undefined') return '';
  
  const nameEQ = 'mock-auth-token=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i].trim();
    if (c.indexOf(nameEQ) === 0) {
      const val = c.substring(nameEQ.length, c.length);
      if (val && val !== 'null' && val !== 'undefined') return val;
    }
  }

  const localToken = localStorage.getItem('auth-token');
  if (localToken && localToken !== 'null' && localToken !== 'undefined') {
    return localToken;
  }

  try {
    const authUserStr = localStorage.getItem('auth-user');
    if (authUserStr) {
      const parsed = JSON.parse(authUserStr);
      if (parsed.token) return parsed.token;
    }
  } catch (e) {}

  return '';
}

export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  const subdomain = getSubdomain();
  const headers: Record<string, string> = {
    'X-Academy-Subdomain': subdomain,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}
