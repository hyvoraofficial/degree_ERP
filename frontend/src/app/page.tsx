'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { 
  School, Users, ShieldCheck, Sparkles, ArrowRight, CreditCard, PlayCircle, Star, MessageCircle, HelpCircle, BookOpen, Layers
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useTenantStore } from '@/store/useTenantStore';

export default function LandingPage() {
  const { role } = useAuthStore();
  const { settings } = useTenantStore();

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 select-none">
      {/* 1. Header Navigation */}
      <header className="h-20 border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between px-6 md:px-16 w-full shadow-xs">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-black text-xl shadow-xs"
            style={{ backgroundColor: settings?.primaryColor }}
          >
            {settings?.name?.substring(0, 1) || 'H'}
          </div>
          <span className="font-black text-lg tracking-tight text-slate-950">
            {settings?.name ? `${settings.name} EduERP` : 'HYVORA EduERP'}
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-700">
          <Link href="#features" className="hover:text-slate-950 transition-colors">Features</Link>
          <Link href="#statistics" className="hover:text-slate-950 transition-colors">Stats</Link>
          <Link href="#testimonials" className="hover:text-slate-950 transition-colors">Testimonials</Link>
          <Link href="#faq" className="hover:text-slate-950 transition-colors">FAQ</Link>
        </nav>

        <div className="flex items-center gap-4">
          <Link href="/login">
            <Button size="sm" className="font-black text-xs px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-xs">
              Sign In
            </Button>
          </Link>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative py-20 md:py-32 px-6 md:px-16 flex flex-col items-center justify-center text-center max-w-5xl mx-auto w-full">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-black text-primary mb-6 shadow-xs">
          <Sparkles className="w-3.5 h-3.5" />
          Enterprise SaaS Education Management
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.15] text-slate-950 max-w-4xl">
          The software suite worth millions,{' '}
          <span className="text-primary bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent">
            powering next-gen academies.
          </span>
        </h1>

        <p className="text-base sm:text-lg md:text-xl text-slate-600 font-bold max-w-2xl mt-6 mb-8 leading-relaxed">
          A premium, multi-tenant SaaS ERP providing interactive student registers, online fee billing ledger, assignment checkers, and custom website CMS configs.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center items-center">
          <Link href="/login" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto flex items-center justify-center gap-2 font-black bg-primary hover:bg-primary/90 text-white rounded-xl shadow-md px-6 py-3">
              <span>Get Started Now</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="#features" className="w-full sm:w-auto">
            <Button variant="secondary" size="lg" className="w-full sm:w-auto font-bold bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 rounded-xl shadow-xs px-6 py-3">
              Explore Features
            </Button>
          </Link>
        </div>
      </section>

      {/* 3. Statistics Section */}
      <section id="statistics" className="py-16 bg-slate-100/80 border-y border-slate-200 px-6 md:px-16 w-full">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="flex flex-col gap-1">
            <span className="text-4xl sm:text-5xl font-black text-primary">100+</span>
            <span className="text-xs font-black uppercase tracking-wider text-slate-600 mt-1">Active Academies</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-4xl sm:text-5xl font-black text-primary">100,000+</span>
            <span className="text-xs font-black uppercase tracking-wider text-slate-600 mt-1">Enrolled Learners</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-4xl sm:text-5xl font-black text-primary">99.98%</span>
            <span className="text-xs font-black uppercase tracking-wider text-slate-600 mt-1">API Health Uptime</span>
          </div>
        </div>
      </section>

      {/* 4. Features Section */}
      <section id="features" className="py-24 px-6 md:px-16 max-w-6xl mx-auto w-full">
        <div className="text-center mb-16 flex flex-col gap-2">
          <h2 className="text-3xl font-black tracking-tight text-slate-950">Designed to outperform. Built to scale.</h2>
          <p className="text-sm text-slate-600 font-bold">Modular, customizable ERP layers suited for any academy size.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="flex flex-col gap-3 p-6 border border-slate-200 bg-white rounded-2xl shadow-xs">
            <div className="p-3 bg-primary/10 text-primary w-11 h-11 rounded-xl flex items-center justify-center shadow-xs border border-primary/20">
              <School className="w-5 h-5" />
            </div>
            <h3 className="font-black text-base text-slate-950">Subdomain Tenancy</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-bold">
              Each academy gets its own custom settings, custom landing layout, logos, SMTP configs, and themes automatically.
            </p>
          </Card>
          
          <Card className="flex flex-col gap-3 p-6 border border-slate-200 bg-white rounded-2xl shadow-xs">
            <div className="p-3 bg-primary/10 text-primary w-11 h-11 rounded-xl flex items-center justify-center shadow-xs border border-primary/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-black text-base text-slate-950">Granular RBAC Security</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-bold">
              Role permissions gatekeeper logic securing access routes for Students, Teachers, Admins, and Super Admin logs.
            </p>
          </Card>

          <Card className="flex flex-col gap-3 p-6 border border-slate-200 bg-white rounded-2xl shadow-xs">
            <div className="p-3 bg-primary/10 text-primary w-11 h-11 rounded-xl flex items-center justify-center shadow-xs border border-primary/20">
              <CreditCard className="w-5 h-5" />
            </div>
            <h3 className="font-black text-base text-slate-950">Online Fees Collection</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-bold">
              Pre-built ledger invoicing supporting gateway attempts, transaction tracking, and direct receipt printing.
            </p>
          </Card>
        </div>
      </section>

      {/* 5. FAQ Section */}
      <section id="faq" className="py-20 px-6 md:px-16 bg-slate-100/70 border-t border-slate-200 w-full">
        <div className="max-w-4xl mx-auto flex flex-col gap-12">
          <div className="text-center flex flex-col gap-2">
            <h2 className="text-3xl font-black tracking-tight text-slate-950">Frequently Asked Questions</h2>
            <p className="text-sm text-slate-600 font-bold">Have queries? We have answers.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <h4 className="font-black text-sm text-slate-950 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-primary shrink-0" />
                Is this application multi-tenant?
              </h4>
              <p className="text-xs text-slate-600 font-bold leading-relaxed">
                Yes! Every piece of data belongs to a specific tenant ID. The application loads custom styling rules dynamically based on host header subdomains.
              </p>
            </div>
            <div className="space-y-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <h4 className="font-black text-sm text-slate-950 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-primary shrink-0" />
                What databases does it support?
              </h4>
              <p className="text-xs text-slate-600 font-bold leading-relaxed">
                It is fully compatible with standard PostgreSQL and Supabase clusters, utilizing range partitioning for telemetry data.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Premium Footer */}
      <footer className="border-t border-slate-200 py-12 px-6 md:px-16 bg-white text-xs text-slate-600 font-bold flex flex-col sm:flex-row justify-between items-center gap-4 w-full">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-primary/20 text-primary flex items-center justify-center font-bold">H</div>
          <span className="font-bold text-slate-900">HYVORA Platform Inc.</span>
        </div>
        <div className="flex gap-6 font-bold">
          <Link href="#" className="hover:text-slate-950 transition-colors">Privacy Policy</Link>
          <Link href="#" className="hover:text-slate-950 transition-colors">Terms of Service</Link>
          <Link href="#" className="hover:text-slate-950 transition-colors">Contact Support</Link>
        </div>
        <span>&copy; {new Date().getFullYear()} HYVORA. All rights reserved.</span>
      </footer>
    </div>
  );
}
