import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host') || 'localhost:3001';

  // Extract subdomain from host (e.g. demo.hyvora.com -> demo)
  const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1');
  const isVercel = hostname.includes('vercel.app');
  const parts = hostname.split('.');
  
  let subdomain = 'platform';
  if (isLocalhost) {
    if (parts.length > 1 && !parts[0].startsWith('localhost')) {
      subdomain = parts[0];
    }
  } else if (isVercel) {
    // If domain is tenant.hyvora-eduerp.vercel.app (4 parts), extract tenant
    if (parts.length > 3) {
      subdomain = parts[0];
    } else {
      subdomain = 'platform';
    }
  } else {
    if (parts.length > 2) {
      subdomain = parts[0];
    }
  }

  // Pass request with custom subdomain header
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-academy-subdomain', subdomain);

  // Check auth cookie token
  const token = request.cookies.get('mock-auth-token')?.value;

  // Protect protected route paths
  if (
    pathname.startsWith('/admin') || 
    pathname.startsWith('/student') || 
    pathname.startsWith('/teacher') || 
    pathname.startsWith('/super-admin')
  ) {
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
};
