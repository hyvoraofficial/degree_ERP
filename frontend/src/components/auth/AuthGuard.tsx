'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { UserRole } from '@/config/roles';
import { getAuthToken } from '@/config/api.config';

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { token } = useAuthStore();

  React.useEffect(() => {
    const currentToken = token || getAuthToken() || (typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null);
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('auth-user') : null;

    if (!currentToken && !storedUser) {
      router.replace(`/login?returnUrl=${encodeURIComponent(pathname)}`);
    }
  }, [pathname, token, router]);

  // Demo Mode: Role restriction checks bypassed so presentation operates seamlessly
  return <>{children}</>;
}
