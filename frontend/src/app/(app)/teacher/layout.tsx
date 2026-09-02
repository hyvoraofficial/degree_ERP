'use client';

import * as React from 'react';
import { Sidebar } from '@/components/shared/Sidebar';
import { Navbar } from '@/components/shared/Navbar';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { AuthGuard } from '@/components/auth/AuthGuard';

export default function TeacherPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  return (
    <AuthGuard allowedRoles={['TEACHER', 'ACADEMY_ADMIN', 'SUPER_ADMIN']}>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Desktop Sidebar - unchanged */}
        <div className="hidden lg:flex shrink-0">
          <Sidebar />
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div 
              className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="relative z-50 animate-in slide-in-from-left duration-200">
              <Sidebar onClose={() => setIsMobileMenuOpen(false)} isMobileDrawer={true} />
            </div>
          </div>
        )}

        {/* Main Content Workspace */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Navbar onMenuClick={() => setIsMobileMenuOpen(true)} />
          <main className="flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 scrollbar-thin">
            <Breadcrumb />
            <div className="max-w-7xl mx-auto w-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
