'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, ArrowRight, Check, MapPin, BookOpen, Layers, User, Users, CreditCard, Copy, CheckCircle2, Search, AlertCircle 
} from 'lucide-react';
import { branchService, Branch } from '@/services/branch.service';
import { courseService, Course } from '@/services/course.service';
import { batchService, Batch } from '@/services/batch.service';
import { studentService } from '@/services/student.service';
import { financeService, FeeStructure } from '@/services/finance.service';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/providers/ToastProvider';
import { useBranchContext } from '@/providers/BranchProvider';

type AdmissionStep = 'BRANCH' | 'COURSE' | 'BATCH' | 'STUDENT_INFO' | 'PARENT_INFO' | 'FEES' | 'SUCCESS';

export default function AdmissionsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { branches: globalBranches } = useBranchContext();

  const [step, setStep] = React.useState<AdmissionStep>('BRANCH');
  const [isLoadingDropdowns, setIsLoadingDropdowns] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Dropdown options
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [courses, setCourses] = React.useState<Course[]>([]);
  const [batches, setBatches] = React.useState<Batch[]>([]);

  // Selected values
  const [selectedBranch, setSelectedBranch] = React.useState<Branch | null>(null);
  const [selectedCourse, setSelectedCourse] = React.useState<Course | null>(null);
  const [selectedBatch, setSelectedBatch] = React.useState<Batch | null>(null);

  // Search inputs for dropdown lists
  const [branchSearch, setBranchSearch] = React.useState('');
  const [courseSearch, setCourseSearch] = React.useState('');
  const [batchSearch, setBatchSearch] = React.useState('');

  // Form Fields
  // Student Info
  const [email, setEmail] = React.useState('');

  const availableBranches = branches.length > 0 ? branches : globalBranches;

  // Load branches on mount directly from database API
  React.useEffect(() => {
    const loadBranches = async () => {
      setIsLoadingDropdowns(true);
      try {
        const res = await branchService.findAll('', '', 1, 100);
        if (res.branches && res.branches.length > 0) {
          setBranches(res.branches);
        }
      } catch (err) {
        console.error('Failed to load branches:', err);
      } finally {
        setIsLoadingDropdowns(false);
      }
    };
    loadBranches();
  }, []);

  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [gender, setGender] = React.useState('male');
  const [dateOfBirth, setDateOfBirth] = React.useState('');
  const [bloodGroup, setBloodGroup] = React.useState('O+');
  const [rollNumber, setRollNumber] = React.useState('');
  
  // Parent Info
  const [fatherName, setFatherName] = React.useState('');
  const [motherName, setMotherName] = React.useState('');
  const [parentPhone, setParentPhone] = React.useState('');
  const [parentEmail, setParentEmail] = React.useState('');

  // Fees Info
  const [feePlan, setFeePlan] = React.useState('Standard Yearly Plan');
  const [feeStructures, setFeeStructures] = React.useState<FeeStructure[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Generated Account details on success
  const [createdStudent, setCreatedStudent] = React.useState<any>(null);

  // Load fee structures on mount
  React.useEffect(() => {
    const loadFeeStructures = async () => {
      try {
        const list = await financeService.findAllStructures();
        setFeeStructures(list || []);
        if (list && list.length > 0) {
          const firstVal = `${list[0].name} (INR ${Number(list[0].amount).toLocaleString('en-IN')} / ${list[0].frequency || 'Year'})`;
          setFeePlan(firstVal);
        }
      } catch (err) {
        console.error('Failed to load fee structures:', err);
      }
    };
    loadFeeStructures();
  }, []);

  // Load branches on mount
  React.useEffect(() => {
    const loadBranches = async () => {
      setIsLoadingDropdowns(true);
      try {
        const res = await branchService.findAll('', 'active', 1, 100);
        setBranches(res.branches || []);
      } catch (err) {
        console.error('Failed to load branches:', err);
      } finally {
        setIsLoadingDropdowns(false);
      }
    };
    loadBranches();
  }, []);

  // Load courses when branch is selected
  React.useEffect(() => {
    if (!selectedBranch) return;
    const loadCourses = async () => {
      setIsLoadingDropdowns(true);
      try {
        const res = await courseService.findAll('', selectedBranch.id, 'active', 1, 100);
        setCourses(res.courses || []);
        setSelectedCourse(null);
        setSelectedBatch(null);
      } catch (err) {
        console.error('Failed to load courses:', err);
      } finally {
        setIsLoadingDropdowns(false);
      }
    };
    loadCourses();
  }, [selectedBranch]);

  // Load batches when course is selected
  React.useEffect(() => {
    if (!selectedBranch || !selectedCourse) return;
    const loadBatches = async () => {
      setIsLoadingDropdowns(true);
      try {
        const res = await batchService.findAll('', selectedBranch.id, selectedCourse.id, 'active', 1, 100);
        setBatches(res.batches || []);
        setSelectedBatch(null);
      } catch (err) {
        console.error('Failed to load batches:', err);
      } finally {
        setIsLoadingDropdowns(false);
      }
    };
    loadBatches();
  }, [selectedBranch, selectedCourse]);

  // Field validation helpers
  const validateStudentStep = (): boolean => {
    const errs: Record<string, string> = {};
    if (!firstName.trim()) errs.firstName = 'First name is required.';
    if (!lastName.trim()) errs.lastName = 'Last name is required.';
    if (!email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Please enter a valid email address (e.g. student@gmail.com).';
    }
    if (!phone.trim()) {
      errs.phone = 'Student phone number is required.';
    } else if (phone.trim().replace(/\D/g, '').length < 7) {
      errs.phone = 'Please enter a valid phone number (at least 7 digits).';
    }
    if (!dateOfBirth) errs.dateOfBirth = 'Date of birth is required.';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateParentStep = (): boolean => {
    const errs: Record<string, string> = {};
    if (!fatherName.trim()) errs.fatherName = "Father's full name is required.";
    if (!motherName.trim()) errs.motherName = "Mother's full name is required.";
    if (!parentPhone.trim()) {
      errs.parentPhone = 'Parent contact phone number is required.';
    } else if (parentPhone.trim().replace(/\D/g, '').length < 7) {
      errs.parentPhone = 'Please enter a valid phone number (at least 7 digits).';
    }
    if (parentEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail.trim())) {
      errs.parentEmail = 'Please enter a valid email address (e.g. parent@gmail.com).';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Next step handlers
  const handleNextFromBranch = () => {
    if (!selectedBranch) {
      setErrors({ branch: 'Please select an operational campus branch to continue.' });
      return;
    }
    setErrors({});
    setStep('COURSE');
  };

  const handleNextFromCourse = () => {
    if (!selectedCourse) {
      setErrors({ course: 'Please select a course track to continue.' });
      return;
    }
    setErrors({});
    setStep('BATCH');
  };

  const handleNextFromBatch = () => {
    if (!selectedBatch) {
      setErrors({ batch: 'Please select a study batch to continue.' });
      return;
    }
    setErrors({});
    setStep('STUDENT_INFO');
  };

  const handleNextFromStudent = () => {
    if (validateStudentStep()) {
      setStep('PARENT_INFO');
    }
  };

  const handleNextFromParent = () => {
    if (validateParentStep()) {
      setStep('FEES');
    }
  };

  // Copy credentials helper
  const handleCopyCredentials = () => {
    if (!createdStudent) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const text = `Username/Email: ${createdStudent.email}\nGenerated Password: ${createdStudent.temporaryPassword}\nLogin Portal: ${origin}/login`;
    navigator.clipboard.writeText(text);
    toast('Copied', 'Student credentials copied to clipboard.', 'success');
  };

  const handleCreateStudent = async () => {
    if (!selectedBranch || !selectedCourse || !selectedBatch) return;

    // Run client validation across steps before submitting
    if (!validateStudentStep()) {
      setStep('STUDENT_INFO');
      return;
    }

    if (!validateParentStep()) {
      setStep('PARENT_INFO');
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      if (!selectedBranch?.id) {
        setErrors({ fees: 'Please select an operational branch in Step 1.' });
        setStep('BRANCH');
        return;
      }
      if (!selectedCourse?.id) {
        setErrors({ fees: 'Please select a course in Step 2.' });
        setStep('COURSE');
        return;
      }
      if (!selectedBatch?.id) {
        setErrors({ fees: 'Please select a batch in Step 3.' });
        setStep('BATCH');
        return;
      }

      const payload = {
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
        gender: gender || undefined,
        dateOfBirth: dateOfBirth && !isNaN(Date.parse(dateOfBirth)) ? new Date(dateOfBirth).toISOString() : undefined,
        bloodGroup: bloodGroup || undefined,
        rollNumber: rollNumber.trim() || undefined,
        branchId: selectedBranch.id,
        courseId: selectedCourse.id,
        batchId: selectedBatch.id,
        parent: {
          fatherName: fatherName.trim(),
          motherName: motherName.trim(),
          phone: parentPhone.trim(),
          email: parentEmail.trim() || undefined,
        },
        feePlan,
      };

      const res = await studentService.create(payload);
      setCreatedStudent(res.student);
      setStep('SUCCESS');
      toast('Admission Completed', 'Student profile created and welcome email dispatched.', 'success');
    } catch (err: any) {
      const errMsg = err.message || '';
      
      // Check if backend returned field validation error and map inline
      if (errMsg.toLowerCase().includes('parent.email') || errMsg.toLowerCase().includes('parent email')) {
        setErrors({ parentEmail: 'Please enter a valid parent email address.' });
        setStep('PARENT_INFO');
      } else if (errMsg.toLowerCase().includes('email') || errMsg.toLowerCase().includes('already registered') || errMsg.toLowerCase().includes('already exists')) {
        setErrors({ email: errMsg });
        setStep('STUDENT_INFO');
      } else if (errMsg.toLowerCase().includes('phone')) {
        setErrors({ phone: errMsg });
        setStep('STUDENT_INFO');
      } else {
        setErrors({ fees: errMsg || 'Registration failed. Please check form fields.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter lists based on searchable dropdown input
  const filteredBranches = availableBranches.filter(b => b.name.toLowerCase().includes(branchSearch.toLowerCase()) || b.code.toLowerCase().includes(branchSearch.toLowerCase()));
  const filteredCourses = courses.filter(c => c.name.toLowerCase().includes(courseSearch.toLowerCase()) || c.code.toLowerCase().includes(courseSearch.toLowerCase()));
  const filteredBatches = batches.filter(b => b.name.toLowerCase().includes(batchSearch.toLowerCase()) || b.code.toLowerCase().includes(batchSearch.toLowerCase()));

  const renderHeader = (title: string, subtitle: string, icon: React.ReactNode) => (
    <div className="flex items-center gap-3 border-b border-border pb-4 mb-6">
      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50">{title}</h3>
        <p className="text-xs text-zinc-500">{subtitle}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto select-none">
      
      {/* Page Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
          New Admission Registration
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 mt-1">
          Admit new student profiles, provision login credentials, and configure operational billing settings.
        </p>
      </div>

      {/* Progress Step Bar */}
      {step !== 'SUCCESS' && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-[10px] font-bold uppercase tracking-wider text-zinc-400 select-none">
          <button onClick={() => setStep('BRANCH')} className={`pb-2 border-b-2 transition-colors ${step === 'BRANCH' ? 'border-primary text-primary' : 'border-zinc-200'}`}>1. Branch</button>
          <button onClick={() => selectedBranch && setStep('COURSE')} className={`pb-2 border-b-2 transition-colors ${step === 'COURSE' ? 'border-primary text-primary' : 'border-zinc-200'}`}>2. Course</button>
          <button onClick={() => selectedCourse && setStep('BATCH')} className={`pb-2 border-b-2 transition-colors ${step === 'BATCH' ? 'border-primary text-primary' : 'border-zinc-200'}`}>3. Batch</button>
          <button onClick={() => selectedBatch && setStep('STUDENT_INFO')} className={`pb-2 border-b-2 transition-colors ${step === 'STUDENT_INFO' ? 'border-primary text-primary' : 'border-zinc-200'}`}>4. Student</button>
          <button onClick={() => selectedBatch && setStep('PARENT_INFO')} className={`pb-2 border-b-2 transition-colors ${step === 'PARENT_INFO' ? 'border-primary text-primary' : 'border-zinc-200'}`}>5. Parent</button>
          <button onClick={() => selectedBatch && setStep('FEES')} className={`pb-2 border-b-2 transition-colors ${step === 'FEES' ? 'border-primary text-primary' : 'border-zinc-200'}`}>6. Fees</button>
        </div>
      )}

      {/* STEP CARDS */}
      <Card className="p-6 border border-border">
        
        {/* STEP 1: BRANCH */}
        {step === 'BRANCH' && (
          <div className="space-y-4">
            {renderHeader('Select Operational Branch', 'Configure campus location', <MapPin className="w-5 h-5" />)}
            
            {errors.branch && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs font-semibold text-rose-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errors.branch}</span>
              </div>
            )}

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search branch list..."
                value={branchSearch}
                onChange={(e) => setBranchSearch(e.target.value)}
                className="w-full h-10 pl-9 pr-4 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary font-medium text-zinc-700 dark:text-zinc-300"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
              {filteredBranches.map(b => (
                <button
                  key={b.id}
                  onClick={() => {
                    setSelectedBranch(b);
                    setErrors({});
                  }}
                  className={`p-4 rounded-xl border text-left flex justify-between items-center transition-all ${
                    selectedBranch?.id === b.id 
                      ? 'border-primary bg-primary/5 text-primary' 
                      : 'border-border bg-card hover:bg-zinc-50 dark:hover:bg-zinc-900/60'
                  }`}
                >
                  <div>
                    <span className="font-bold text-sm block">{b.name}</span>
                    <span className="text-xs text-zinc-400 mt-0.5 block">{b.city}, {b.state}</span>
                  </div>
                  {selectedBranch?.id === b.id && <Check className="w-4 h-4 text-primary shrink-0" />}
                </button>
              ))}
            </div>

            <div className="flex justify-end pt-4 border-t border-border">
              <Button onClick={handleNextFromBranch} className="gap-2">
                Next Step <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: COURSE */}
        {step === 'COURSE' && (
          <div className="space-y-4">
            {renderHeader('Select Course tracks', 'Configure curriculum program', <BookOpen className="w-5 h-5" />)}
            
            {errors.course && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs font-semibold text-rose-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errors.course}</span>
              </div>
            )}

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search course tracks..."
                value={courseSearch}
                onChange={(e) => setCourseSearch(e.target.value)}
                className="w-full h-10 pl-9 pr-4 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary font-medium text-zinc-700 dark:text-zinc-300"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
              {filteredCourses.map(c => (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedCourse(c);
                    setErrors({});
                  }}
                  className={`p-4 rounded-xl border text-left flex justify-between items-center transition-all ${
                    selectedCourse?.id === c.id 
                      ? 'border-primary bg-primary/5 text-primary' 
                      : 'border-border bg-card hover:bg-zinc-50 dark:hover:bg-zinc-900/60'
                  }`}
                >
                  <div>
                    <span className="font-bold text-sm block">{c.name}</span>
                    <span className="text-xs text-zinc-400 mt-0.5 block">{c.code}</span>
                  </div>
                  {selectedCourse?.id === c.id && <Check className="w-4 h-4 text-primary shrink-0" />}
                </button>
              ))}
            </div>

            <div className="flex justify-between pt-4 border-t border-border">
              <Button variant="secondary" onClick={() => setStep('BRANCH')} className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
              <Button onClick={handleNextFromCourse} className="gap-2">
                Next Step <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: BATCH */}
        {step === 'BATCH' && (
          <div className="space-y-4">
            {renderHeader('Select study Batch', 'Select class session group', <Layers className="w-5 h-5" />)}
            
            {errors.batch && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs font-semibold text-rose-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errors.batch}</span>
              </div>
            )}

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search study batches..."
                value={batchSearch}
                onChange={(e) => setBatchSearch(e.target.value)}
                className="w-full h-10 pl-9 pr-4 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary font-medium text-zinc-700 dark:text-zinc-300"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
              {filteredBatches.map(b => (
                <button
                  key={b.id}
                  onClick={() => {
                    setSelectedBatch(b);
                    setErrors({});
                  }}
                  className={`p-4 rounded-xl border text-left flex justify-between items-center transition-all ${
                    selectedBatch?.id === b.id 
                      ? 'border-primary bg-primary/5 text-primary' 
                      : 'border-border bg-card hover:bg-zinc-50 dark:hover:bg-zinc-900/60'
                  }`}
                >
                  <div>
                    <span className="font-bold text-sm block">{b.name}</span>
                    <span className="text-xs text-zinc-400 mt-0.5 block">{b.code} ({b.capacity} cap)</span>
                  </div>
                  {selectedBatch?.id === b.id && <Check className="w-4 h-4 text-primary shrink-0" />}
                </button>
              ))}
            </div>

            <div className="flex justify-between pt-4 border-t border-border">
              <Button variant="secondary" onClick={() => setStep('COURSE')} className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
              <Button onClick={handleNextFromBatch} className="gap-2">
                Next Step <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: STUDENT INFO */}
        {step === 'STUDENT_INFO' && (
          <div className="space-y-4">
            {renderHeader('Student personal parameters', 'Basic profile metadata', <User className="w-5 h-5" />)}

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name *"
                id="firstName"
                value={firstName}
                error={errors.firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  setErrors(prev => ({ ...prev, firstName: '' }));
                }}
                required
                placeholder="e.g. Ramesh"
              />
              <Input
                label="Last Name *"
                id="lastName"
                value={lastName}
                error={errors.lastName}
                onChange={(e) => {
                  setLastName(e.target.value);
                  setErrors(prev => ({ ...prev, lastName: '' }));
                }}
                required
                placeholder="e.g. Kumar"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Email address (Login Username) *"
                id="email"
                type="email"
                value={email}
                error={errors.email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrors(prev => ({ ...prev, email: '' }));
                }}
                required
                placeholder="e.g. ramesh@gmail.com"
              />
              <Input
                label="Student phone *"
                id="phone"
                value={phone}
                error={errors.phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setErrors(prev => ({ ...prev, phone: '' }));
                }}
                required
                placeholder="e.g. +91 9876543210"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Input
                label="Date of Birth *"
                id="dob"
                type="date"
                value={dateOfBirth}
                error={errors.dateOfBirth}
                onChange={(e) => {
                  setDateOfBirth(e.target.value);
                  setErrors(prev => ({ ...prev, dateOfBirth: '' }));
                }}
                required
              />
              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="flex h-11 w-full rounded-xl border border-border bg-card px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <Input
                label="Blood Group"
                id="bloodGroup"
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                placeholder="e.g. O+"
              />
            </div>

            <Input
              label="Roll Number / System Index (Optional)"
              id="rollNumber"
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              placeholder="e.g. HYVORA-1234"
            />

            <div className="flex justify-between pt-4 border-t border-border">
              <Button variant="secondary" onClick={() => setStep('BATCH')} className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
              <Button onClick={handleNextFromStudent} className="gap-2">
                Next Step <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 5: PARENT INFO */}
        {step === 'PARENT_INFO' && (
          <div className="space-y-4">
            {renderHeader('Parent contact details', 'Billing & Emergency contact coordinates', <Users className="w-5 h-5" />)}

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Father Full Name *"
                id="fatherName"
                value={fatherName}
                error={errors.fatherName}
                onChange={(e) => {
                  setFatherName(e.target.value);
                  setErrors(prev => ({ ...prev, fatherName: '' }));
                }}
                required
                placeholder="e.g. Suresh Kumar"
              />
              <Input
                label="Mother Full Name *"
                id="motherName"
                value={motherName}
                error={errors.motherName}
                onChange={(e) => {
                  setMotherName(e.target.value);
                  setErrors(prev => ({ ...prev, motherName: '' }));
                }}
                required
                placeholder="e.g. Sunita Devi"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Parent contact Phone *"
                id="parentPhone"
                value={parentPhone}
                error={errors.parentPhone}
                onChange={(e) => {
                  setParentPhone(e.target.value);
                  setErrors(prev => ({ ...prev, parentPhone: '' }));
                }}
                required
                placeholder="e.g. +91 9876543211"
              />
              <Input
                label="Parent contact Email (Optional)"
                id="parentEmail"
                type="email"
                value={parentEmail}
                error={errors.parentEmail}
                onChange={(e) => {
                  setParentEmail(e.target.value);
                  setErrors(prev => ({ ...prev, parentEmail: '' }));
                }}
                placeholder="e.g. suresh@gmail.com"
              />
            </div>

            <div className="flex justify-between pt-4 border-t border-border">
              <Button variant="secondary" onClick={() => setStep('STUDENT_INFO')} className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
              <Button onClick={handleNextFromParent} className="gap-2">
                Next Step <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 6: FEES */}
        {step === 'FEES' && (
          <div className="space-y-4">
            {renderHeader('Fee details allocations', 'Configure installment layouts', <CreditCard className="w-5 h-5" />)}

            {errors.fees && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs font-semibold text-rose-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errors.fees}</span>
              </div>
            )}

            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                Installment Payment Plan
              </label>
              <select
                value={feePlan}
                onChange={(e) => setFeePlan(e.target.value)}
                className="flex h-11 w-full rounded-xl border border-border bg-card px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-bold text-zinc-800 cursor-pointer"
              >
                {feeStructures.length > 0 ? (
                  feeStructures.map(struct => {
                    const label = `${struct.name} (INR ${Number(struct.amount).toLocaleString('en-IN')} / ${struct.frequency || 'Year'})`;
                    return (
                      <option key={struct.id} value={label}>
                        {label}
                      </option>
                    );
                  })
                ) : (
                  <>
                    <option value="Standard Yearly Plan (INR 60,000 / Year)">Standard Yearly Plan (INR 60,000 / Year)</option>
                    <option value="Installment Semester Plan (2x INR 30,000)">Installment Semester Plan (2x INR 30,000)</option>
                    <option value="Quarterly Installment Plan (4x INR 15,000)">Quarterly Installment Plan (4x INR 15,000)</option>
                  </>
                )}
              </select>
            </div>

            {/* Review Parameters Details list */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-900/60 border border-border rounded-xl space-y-2 mt-4">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Admission Summary Review</span>
              <div className="grid grid-cols-2 gap-3 text-xs font-semibold text-zinc-600 dark:text-zinc-400 pt-1">
                <div>Selected Branch: <span className="text-zinc-950 dark:text-zinc-50">{selectedBranch?.name}</span></div>
                <div>Course track: <span className="text-zinc-950 dark:text-zinc-50">{selectedCourse?.name}</span></div>
                <div>Class Intake Batch: <span className="text-zinc-950 dark:text-zinc-50">{selectedBatch?.name}</span></div>
                <div>Student email: <span className="text-zinc-950 dark:text-zinc-50">{email || 'Not specified'}</span></div>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-border">
              <Button variant="secondary" onClick={() => setStep('PARENT_INFO')} className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
              <Button 
                onClick={handleCreateStudent} 
                disabled={isSubmitting} 
                className="gap-2"
              >
                {isSubmitting ? 'Registering Student...' : 'Complete Admission'}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 7: SUCCESS SCREEN */}
        {step === 'SUCCESS' && createdStudent && (
          <div className="space-y-6 py-4 flex flex-col items-center justify-center text-center">
            
            <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <CheckCircle2 className="w-10 h-10 text-white stroke-[2.5]" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-zinc-950 dark:text-zinc-50">
                Admission Successful!
              </h3>
              <p className="text-sm text-zinc-500">
                Student index created under <span className="font-semibold text-zinc-700 dark:text-zinc-300">"{selectedBranch?.name}"</span>.
              </p>
            </div>

            {/* Render credentials box */}
            <div className="w-full max-w-md p-6 bg-white border border-slate-200 rounded-2xl text-left space-y-4 shadow-sm">
              <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider block border-b border-slate-100 pb-2.5">
                Authorized Login Credentials
              </span>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Portal Login Email:</span>
                  <span className="text-slate-900 font-bold font-mono">{createdStudent.email}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Temporary Password:</span>
                  <span className="text-slate-900 bg-slate-100 border border-slate-200 px-3 py-1 rounded-md font-mono font-bold select-all">
                    {createdStudent.temporaryPassword || '••••••••'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Roll Number:</span>
                  <span className="text-slate-900 font-bold">{createdStudent.rollNumber || 'Not assigned'}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <Button variant="secondary" onClick={handleCopyCredentials} className="w-full text-xs h-10 gap-2 font-bold">
                  <Copy className="w-4 h-4" /> Copy Credentials
                </Button>
                <Button onClick={() => router.push('/admin/branches')} className="w-full text-xs h-10 font-bold">
                  Done
                </Button>
              </div>
            </div>

          </div>
        )}

      </Card>

    </div>
  );
}
