'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { authService } from '@/services/auth.service';
import { ROLES, UserRole } from '@/config/roles';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/providers/ToastProvider';
import { parseFieldErrors } from '@/utils/validation';
import { ShieldCheck, GraduationCap, Users, LayoutDashboard, Lock, Eye, EyeOff } from 'lucide-react';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { login } = useAuthStore();
  
  const returnUrl = searchParams.get('returnUrl') || '';
  
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [selectedRole, setSelectedRole] = React.useState<UserRole>('ACADEMY_ADMIN');
  const [rememberMe, setRememberMe] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = React.useState(false);

  // Sync role based on returnUrl parameter
  React.useEffect(() => {
    if (returnUrl.startsWith('/admin')) {
      setSelectedRole('ACADEMY_ADMIN');
    } else if (returnUrl.startsWith('/teacher')) {
      setSelectedRole('TEACHER');
    } else if (returnUrl.startsWith('/student')) {
      setSelectedRole('STUDENT');
    } else if (returnUrl.startsWith('/super-admin')) {
      setSelectedRole('SUPER_ADMIN');
    }
  }, [returnUrl]);

  React.useEffect(() => {
    const savedEmail = localStorage.getItem('login-remember-email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  let portalTitle = 'Sign in to HYVORA';
  let portalSubtitle = 'Educational SaaS ERP Portal';
  let portalIcon = <Lock className="w-6 h-6 text-white" />;

  if (selectedRole === 'ACADEMY_ADMIN') {
    portalTitle = 'Academy Admin Portal';
    portalSubtitle = 'Sign in to manage Branch, Staff & Financials';
    portalIcon = <LayoutDashboard className="w-6 h-6 text-white" />;
  } else if (selectedRole === 'TEACHER') {
    portalTitle = 'Faculty Teacher Portal';
    portalSubtitle = 'Sign in to manage Classes, Attendance & Notes';
    portalIcon = <Users className="w-6 h-6 text-white" />;
  } else if (selectedRole === 'STUDENT') {
    portalTitle = 'Student Learning Portal';
    portalSubtitle = 'Sign in to view Courses, Materials & Results';
    portalIcon = <GraduationCap className="w-6 h-6 text-white" />;
  } else if (selectedRole === 'SUPER_ADMIN') {
    portalTitle = 'Platform Governance Portal';
    portalSubtitle = 'Super Admin Control Center';
    portalIcon = <ShieldCheck className="w-6 h-6 text-white" />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!email.trim()) errors.email = 'Please enter your username or email address';
    if (!password.trim()) errors.password = 'Please enter your password';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setIsLoading(true);

    try {
      const res = await authService.login(email, password, selectedRole);
      
      // 1. Synchronously set document cookie so Next.js middleware receives token on HTTP request
      document.cookie = `mock-auth-token=${res.token}; path=/; max-age=604800; SameSite=Lax`;
      
      // 2. Save session in localStorage and sessionStorage
      localStorage.setItem('auth-user', JSON.stringify(res.user));
      localStorage.setItem('auth-role', res.role);
      localStorage.setItem('auth-token', res.token);
      sessionStorage.setItem('auth-user', JSON.stringify(res.user));
      sessionStorage.setItem('auth-role', res.role);
      sessionStorage.setItem('auth-token', res.token);

      if (rememberMe) {
        localStorage.setItem('login-remember-email', email);
      } else {
        localStorage.removeItem('login-remember-email');
      }

      login(res.user, res.role, res.token);
      toast(`Authentication Successful`, `Welcome back, ${res.user.firstName}!`, 'success');
      
      // 3. Resolve destination portal URL and redirect
      let destination = ROLES[res.role].landingPath;
      if (returnUrl && returnUrl.startsWith('/') && returnUrl !== '/login') {
        destination = returnUrl;
      }
      
      setTimeout(() => {
        window.location.href = destination;
      }, 100);
    } catch (err: any) {
      const parsed = parseFieldErrors(err);
      if (Object.keys(parsed).length > 0) {
        setFieldErrors(parsed);
      } else {
        toast('Authentication Failed', err.message || 'Please verify your credentials and selected portal role.', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-6 py-12 select-none">
      <div className="w-full max-w-md space-y-6 bg-white border border-slate-200/80 p-8 rounded-3xl shadow-2xl">
        
        {/* Header branding */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-md">
            {portalIcon}
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            {portalTitle}
          </h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
            {portalSubtitle}
          </p>
        </div>

        {/* Portal Selection Switcher */}
        <div className="space-y-1.5 pt-1">
          <label className="text-xs font-bold text-slate-700">
            Select Portal Role *
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setSelectedRole('ACADEMY_ADMIN')}
              className={`py-2.5 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                selectedRole === 'ACADEMY_ADMIN'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700 hover:text-slate-900'
              }`}
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => setSelectedRole('TEACHER')}
              className={`py-2.5 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                selectedRole === 'TEACHER'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700 hover:text-slate-900'
              }`}
            >
              Teacher
            </button>
            <button
              type="button"
              onClick={() => setSelectedRole('STUDENT')}
              className={`py-2.5 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                selectedRole === 'STUDENT'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700 hover:text-slate-900'
              }`}
            >
              Student
            </button>
          </div>
        </div>

        {/* Demo Credentials Helper Pill */}
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs flex items-center justify-between">
          <div>
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
              Admin Credentials
            </div>
            <div className="text-slate-500 text-[11px] mt-0.5">
              Username: <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-slate-900 font-bold">admin</code> &bull; Pass: <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-slate-900 font-bold">admin</code>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedRole('ACADEMY_ADMIN');
              setEmail('admin');
              setPassword('admin');
              setFieldErrors({});
            }}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition-colors border border-indigo-200"
          >
            Auto-fill
          </button>
        </div>

        {/* Login form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-1" noValidate>
          <Input
            label="Username or Email *"
            id="email"
            type="text"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setFieldErrors(prev => ({ ...prev, email: '' })); }}
            error={fieldErrors.email}
            placeholder={
              selectedRole === 'ACADEMY_ADMIN' ? 'admin' :
              selectedRole === 'TEACHER' ? 'teacher@yourdomain.com' :
              selectedRole === 'STUDENT' ? 'student@yourdomain.com' : 'user@yourdomain.com'
            }
          />

          <Input
            label="Password *"
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => { setPassword(e.target.value); setFieldErrors(prev => ({ ...prev, password: '' })); }}
            error={fieldErrors.password}
            placeholder={selectedRole === 'ACADEMY_ADMIN' ? 'admin' : 'Enter your password'}
            rightElement={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-1 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer transition-colors"
                title={showPassword ? "Hide password" : "Show password"}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
          />

          {/* Remember Me checkbox */}
          <div className="flex items-center justify-between pt-1 pb-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
              />
              Remember my email
            </label>
            <Link href="/reset-password" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline">
              Forgot password?
            </Link>
          </div>

          <Button type="submit" className="w-full h-11 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg cursor-pointer" disabled={isLoading}>
            {isLoading ? 'Authenticating...' : `Sign In to ${selectedRole === 'ACADEMY_ADMIN' ? 'Admin' : selectedRole === 'TEACHER' ? 'Teacher' : 'Student'} Portal`}
          </Button>
        </form>

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-zinc-950 p-6">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    }>
      <LoginFormContent />
    </React.Suspense>
  );
}
