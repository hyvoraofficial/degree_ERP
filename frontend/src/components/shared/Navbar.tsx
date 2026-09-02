'use client';

import * as React from 'react';
import Link from 'next/link';
import { Sun, Moon, Bell, Plus, MapPin, X, Edit, ChevronDown, UserPlus, Check, Menu } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuthStore } from '@/store/useAuthStore';
import { useBranchContext } from '@/providers/BranchProvider';
import { branchService } from '@/services/branch.service';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/providers/ToastProvider';
import { isValidEmail, isValidPhone, parseFieldErrors } from '@/utils/validation';

export interface NavbarProps {
  onMenuClick?: () => void;
}

export function Navbar({ onMenuClick }: NavbarProps = {}) {
  const { theme, setTheme } = useTheme();
  const { user, role } = useAuthStore();
  const { toast } = useToast();
  const { branches, selectedBranchId, setSelectedBranchId, refreshBranches } = useBranchContext();

  const isAcademyAdmin = role === 'ACADEMY_ADMIN';

  // New Branch Modal states
  const [isNewBranchModalOpen, setIsNewBranchModalOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const [code, setCode] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [city, setCity] = React.useState('');
  const [state, setState] = React.useState('');
  // Branch Selector Dropdown popover state
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = React.useState(false);
  const branchDropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(event.target as Node)) {
        setIsBranchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const [pincode, setPincode] = React.useState('');
  const [contactNumber, setContactNumber] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!name.trim()) errors.name = 'Branch name is required';
    if (!code.trim()) errors.code = 'Branch code is required';
    if (!address.trim()) errors.address = 'Street address is required';
    if (!city.trim()) errors.city = 'City is required';
    if (!state.trim()) errors.state = 'State is required';
    if (!pincode.trim()) errors.pincode = 'Pincode is required';
    if (!isValidPhone(contactNumber)) errors.contactNumber = 'Please enter a valid phone number (e.g. +91-9876543210)';
    if (!isValidEmail(email)) errors.email = 'Please enter a valid email address (e.g. branch@hyvora.com)';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const newBranch = await branchService.create({
        name,
        code,
        address,
        city,
        state,
        pincode,
        contactNumber,
        email,
        status: 'active',
      });
      toast('Success', `Campus branch "${newBranch.name}" created successfully.`, 'success');
      setIsNewBranchModalOpen(false);
      await refreshBranches();
      setSelectedBranchId(newBranch.id);
      setName(''); setCode(''); setAddress(''); setCity(''); setState(''); setPincode(''); setContactNumber(''); setEmail(''); setFieldErrors({});
    } catch (err: any) {
      const parsed = parseFieldErrors(err);
      if (Object.keys(parsed).length > 0) {
        setFieldErrors(parsed);
      } else {
        toast('Creation Failed', err.message || 'Could not create branch.', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-3 sm:px-6 lg:px-8 shrink-0 select-none shadow-xs gap-2">
        {/* Left Side: Mobile Hamburger Menu & Global Branch Selector */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Mobile Hamburger Toggle (hidden on lg desktop) */}
          {onMenuClick && (
            <button
              type="button"
              onClick={onMenuClick}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 lg:hidden cursor-pointer shrink-0 transition-colors"
              aria-label="Open navigation menu"
              title="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {isAcademyAdmin && (
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="relative" ref={branchDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
                  className="flex items-center gap-1.5 sm:gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-300 hover:border-slate-400 px-2.5 sm:px-3.5 py-2 rounded-xl shadow-xs transition-all cursor-pointer font-black text-xs text-slate-900"
                >
                  <MapPin className="w-4 h-4 text-primary shrink-0" />
                  <span className="hidden sm:inline text-slate-600 font-bold">Active Branch:</span>
                  <span className="font-extrabold text-slate-950 truncate max-w-[90px] sm:max-w-none">
                    {branches.find(b => b.id === selectedBranchId)?.name || 'All Branches'}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform shrink-0 ${isBranchDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isBranchDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-60 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl z-50 py-2 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-1.5 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      Select Active Campus Branch
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBranchId('');
                        setIsBranchDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-xs font-bold flex items-center justify-between hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer ${
                        !selectedBranchId ? 'text-primary bg-primary/5 font-black' : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span>All Branches</span>
                      {!selectedBranchId && <Check className="w-4 h-4 text-primary shrink-0" />}
                    </button>
                    
                    <div className="my-1 border-t border-slate-100 dark:border-zinc-800" />

                    {branches.map((b) => {
                      const isSelected = b.id === selectedBranchId;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => {
                            setSelectedBranchId(b.id);
                            setIsBranchDropdownOpen(false);
                          }}
                          className={`w-full px-3 py-2 text-left text-xs font-bold flex items-center justify-between hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer ${
                            isSelected ? 'text-primary bg-primary/5 font-black' : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="flex flex-col">
                            <span className="font-extrabold">{b.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono font-semibold">{b.code}</span>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <Button
                onClick={() => { setFieldErrors({}); setIsNewBranchModalOpen(true); }}
                className="h-9 px-2.5 sm:px-3 text-xs gap-1 sm:gap-1.5 font-black shrink-0 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-xs cursor-pointer"
                title="New Branch"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">New Branch</span>
              </Button>

              <Link href="/admin/branches" className="hidden md:inline-flex">
                <Button
                  variant="secondary"
                  className="h-9 px-3 text-xs gap-1.5 font-semibold shrink-0 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl shadow-xs cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5 text-slate-700" /> Edit Branches
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Control panel: New Admission, Notifications, Theme toggle */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {isAcademyAdmin && (
            <Link href="/admin/admissions" className="hidden sm:inline-flex">
              <Button className="h-9 px-3 sm:px-4 text-xs gap-1.5 font-black shrink-0 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-xs cursor-pointer">
                <UserPlus className="w-4 h-4" /> <span className="hidden md:inline">New Admission</span>
              </Button>
            </Link>
          )}
          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>

          {/* Notifications Icon */}
          <button className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors relative cursor-pointer">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
          </button>

          {/* Active Profile Info */}
          <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-primary/20 text-primary font-bold text-xs flex items-center justify-center border border-primary/30 uppercase shrink-0">
              {user?.firstName ? user.firstName.substring(0, 1) : 'U'}
            </div>
            <div className="flex flex-col hidden md:flex">
              <span className="text-xs font-bold text-slate-900">
                {user ? `${user.firstName} ${user.lastName || ''}`.trim() : 'User Profile'}
              </span>
              <span className="text-[10px] font-semibold text-slate-600 truncate">
                {user?.email || ''}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* CREATE NEW BRANCH MODAL */}
      {isNewBranchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs select-none">
          <Card className="w-full max-w-lg p-6 relative border border-slate-200 bg-white shadow-2xl space-y-4">
            <button
              onClick={() => setIsNewBranchModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div>
              <h3 className="text-lg font-black text-slate-950">
                Provision Campus Branch
              </h3>
              <p className="text-xs text-slate-600 font-extrabold mt-0.5">
                Register a new physical campus branch for your academy.
              </p>
            </div>

            <form onSubmit={handleCreateBranch} className="space-y-3" noValidate>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Branch Name *"
                  id="bName"
                  placeholder="e.g. Koramangala Branch"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setFieldErrors(prev => ({ ...prev, name: '' })); }}
                  error={fieldErrors.name}
                />
                <Input
                  label="Branch Code *"
                  id="bCode"
                  placeholder="e.g. KRM-01"
                  value={code}
                  onChange={(e) => { setCode(e.target.value); setFieldErrors(prev => ({ ...prev, code: '' })); }}
                  error={fieldErrors.code}
                />
              </div>

              <Input
                label="Street Address *"
                id="bAddress"
                placeholder="e.g. 100 Feet Road, 4th Block"
                value={address}
                onChange={(e) => { setAddress(e.target.value); setFieldErrors(prev => ({ ...prev, address: '' })); }}
                error={fieldErrors.address}
              />

              <div className="grid grid-cols-3 gap-3">
                <Input
                  label="City *"
                  id="bCity"
                  placeholder="Bangalore"
                  value={city}
                  onChange={(e) => { setCity(e.target.value); setFieldErrors(prev => ({ ...prev, city: '' })); }}
                  error={fieldErrors.city}
                />
                <Input
                  label="State *"
                  id="bState"
                  placeholder="Karnataka"
                  value={state}
                  onChange={(e) => { setState(e.target.value); setFieldErrors(prev => ({ ...prev, state: '' })); }}
                  error={fieldErrors.state}
                />
                <Input
                  label="Pincode *"
                  id="bPincode"
                  placeholder="560034"
                  value={pincode}
                  onChange={(e) => { setPincode(e.target.value); setFieldErrors(prev => ({ ...prev, pincode: '' })); }}
                  error={fieldErrors.pincode}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Contact Phone *"
                  id="bPhone"
                  placeholder="+91-9876543210"
                  value={contactNumber}
                  onChange={(e) => { setContactNumber(e.target.value); setFieldErrors(prev => ({ ...prev, contactNumber: '' })); }}
                  error={fieldErrors.contactNumber}
                />
                <Input
                  label="Branch Email *"
                  id="bEmail"
                  placeholder="branch@academy.edu"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setFieldErrors(prev => ({ ...prev, email: '' })); }}
                  error={fieldErrors.email}
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <Button variant="secondary" type="button" onClick={() => setIsNewBranchModalOpen(false)} className="font-bold">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="font-bold">
                  {isSubmitting ? 'Creating...' : 'Create Campus Branch'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </>
  );
}
