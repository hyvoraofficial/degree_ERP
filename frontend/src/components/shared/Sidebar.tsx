'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as LucideIcons from 'lucide-react';
import { LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useTenantStore } from '@/store/useTenantStore';
import { authService } from '@/services/auth.service';
import { NAVIGATION_ITEMS } from '@/config/navigation';

export interface SidebarProps {
  onClose?: () => void;
  isMobileDrawer?: boolean;
}

export function Sidebar({ onClose, isMobileDrawer = false }: SidebarProps = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const { role, user, token, logout } = useAuthStore();
  const { settings } = useTenantStore();

  const menuItems = role ? NAVIGATION_ITEMS[role] || [] : [];

  const getPortalLabel = () => {
    if (role === 'TEACHER' || pathname?.startsWith('/teacher')) return 'Faculty Portal';
    if (role === 'STUDENT' || pathname?.startsWith('/student')) return 'Student Portal';
    if (role === 'SUPER_ADMIN' || pathname?.startsWith('/super-admin')) return 'Super Admin Portal';
    return 'College Admin Portal';
  };
  
  const handleLogout = async () => {
    if (onClose) onClose();
    if (token) {
      await authService.logout(token).catch(() => {});
    }
    logout();
    localStorage.clear();
    sessionStorage.clear();
    document.cookie = 'mock-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    router.push('/login');
  };

  return (
    <aside className={`w-64 border-r border-slate-200 bg-white flex flex-col h-screen shrink-0 select-none shadow-xs ${isMobileDrawer ? 'relative' : 'sticky top-0'}`}>
      {/* Academy Logo / Academic Admin Portal Header */}
      <div className="h-16 border-b border-slate-200 flex items-center justify-between px-4 shrink-0 bg-slate-50/80">
        <div className="flex items-center gap-3 min-w-0">
          <div 
            className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white font-black text-base shadow-xs shrink-0"
            style={{ backgroundColor: settings?.primaryColor }}
          >
            {settings?.name?.substring(0, 1) || 'H'}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-extrabold text-sm truncate text-slate-900 leading-tight">
              {settings?.name || 'HYVORA'}
            </span>
            <span className="inline-flex items-center text-[9px] font-black text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full uppercase tracking-wider w-fit mt-0.5">
              {getPortalLabel()}
            </span>
          </div>
        </div>
        {isMobileDrawer && onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors lg:hidden cursor-pointer"
            aria-label="Close menu"
          >
            <LucideIcons.X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation menu list */}
      <nav className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-1.5 scrollbar-thin">
        {menuItems.map((item, idx) => {
          const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href + '/'));
          
          // Dynamically fetch Lucide Icon matching its configure name
          const LucideIcon = (LucideIcons as any)[item.icon] || LucideIcons.BookOpen;

          return (
            <Link
              key={`${item.href}-${idx}`}
              href={item.href}
              onClick={() => {
                if (onClose) onClose();
              }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-primary/10 text-primary border border-primary/20 shadow-xs'
                  : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100'
              }`}
            >
              <LucideIcon 
                className={`w-4 h-4 shrink-0 ${isActive ? 'text-primary' : 'text-slate-600'}`} 
                style={isActive ? { color: settings?.primaryColor } : undefined}
              />
              <span className="truncate">{item.title}</span>
              {item.badge && (
                <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary"
                  style={{ backgroundColor: `${settings?.primaryColor}15`, color: settings?.primaryColor }}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User profile & Logout button */}
      <div className="p-4 border-t border-slate-200 bg-slate-50/80 shrink-0 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/30 uppercase">
            {user?.firstName ? user.firstName.substring(0, 1) : 'U'}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-xs truncate text-slate-900">
              {user ? `${user.firstName} ${user.lastName || ''}`.trim() : 'User Profile'}
            </span>
            <span className="text-[10px] font-semibold text-slate-600 truncate">
              {user?.email || ''}
            </span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="p-1.5 rounded-lg hover:bg-rose-100 text-slate-600 hover:text-rose-600 transition-colors cursor-pointer"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
