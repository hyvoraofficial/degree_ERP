'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { 
  GraduationCap, Calendar, CreditCard, Award, BookOpen, Layers, User, Users, FileText, Bell, Clock, Copy, RefreshCw, Book, CheckCircle, ExternalLink, Video, File, Download
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { StatsCard } from '@/components/shared/StatsCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/providers/ToastProvider';
import { subjectService, Subject } from '@/services/subject.service';
import { lmsService, StudyMaterialItem } from '@/services/lms.service';
import { attendanceService, StudentSubjectWiseAttendanceReport } from '@/services/attendance.service';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';
import { API_BASE_URL, getSubdomain, getAuthToken } from '@/config/api.config';

import { assignmentService, AssignmentItem } from '@/services/assignment.service';

type PortalTab = 'DASHBOARD' | 'PROFILE' | 'CURRICULUM' | 'BATCH' | 'ATTENDANCE' | 'FEES' | 'MATERIALS' | 'ASSIGNMENTS' | 'ANNOUNCEMENTS' | 'RESULTS';

export default function StudentDashboard() {
  const { toast } = useToast();
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, logout } = useAuthStore();
  
  const [activeTab, setActiveTab] = React.useState<PortalTab>('DASHBOARD');

  React.useEffect(() => {
    if (pathname.includes('/courses')) setActiveTab('CURRICULUM');
    else if (pathname.includes('/attendance')) setActiveTab('ATTENDANCE');
    else if (pathname.includes('/materials') || pathname.includes('/videos')) setActiveTab('MATERIALS');
    else if (pathname.includes('/assignments')) setActiveTab('ASSIGNMENTS');
    else if (pathname.includes('/fees') || pathname.includes('/payments')) setActiveTab('FEES');
    else if (pathname.includes('/results')) setActiveTab('RESULTS');
    else if (pathname.includes('/notifications')) setActiveTab('ANNOUNCEMENTS');
    else if (pathname.includes('/profile') || pathname.includes('/settings')) setActiveTab('PROFILE');
    else setActiveTab('DASHBOARD');
  }, [pathname]);
  const [student, setStudent] = React.useState<any>(null);
  const [fees, setFees] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Subject-wise Data States
  const [courseSubjects, setCourseSubjects] = React.useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = React.useState<string>('');
  const [subjectMaterials, setSubjectMaterials] = React.useState<StudyMaterialItem[]>([]);
  const [isLoadingMaterials, setIsLoadingMaterials] = React.useState(false);
  const [openingMaterialId, setOpeningMaterialId] = React.useState<string | null>(null);

  const handleOpenMaterial = async (materialId: string) => {
    if (openingMaterialId) return;
    setOpeningMaterialId(materialId);
    try {
      const accessData = await lmsService.getMaterialAccessUrl(materialId);
      if (accessData?.url) {
        window.open(accessData.url, '_blank', 'noopener,noreferrer');
      } else {
        throw new Error('Material access URL was not returned.');
      }
    } catch (err: any) {
      toast('Unable to Open File', err.message || 'Unable to open this study material. Please try again.', 'error');
    } finally {
      setOpeningMaterialId(null);
    }
  };

  const [assignments, setAssignments] = React.useState<AssignmentItem[]>([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = React.useState(false);

  const [subjectAttendanceReport, setSubjectAttendanceReport] = React.useState<StudentSubjectWiseAttendanceReport | null>(null);
  const [isLoadingAttendance, setIsLoadingAttendance] = React.useState(false);

  const fetchStudentData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('Authentication token not found. Please log in.');
      }

      // Fetch student profile, fee summary
      const [resProfile, resFees] = await Promise.all([
        fetch(`${API_BASE_URL}/students/profile/me`, {
          headers: { 'Authorization': `Bearer ${token}`, 'X-Academy-Subdomain': getSubdomain() }
        }),
        fetch(`${API_BASE_URL}/students/profile/me/fee-summary`, {
          headers: { 'Authorization': `Bearer ${token}`, 'X-Academy-Subdomain': getSubdomain() }
        })
      ]);

      if (!resProfile.ok) throw new Error('Could not retrieve student profile details.');
      
      const bodyProfile = await resProfile.json();
      const studentData = bodyProfile.data;
      setStudent(studentData);

      if (resFees.ok) {
        const bodyFees = await resFees.json();
        setFees(bodyFees.data);
      }

      // Fetch course subjects for student
      if (studentData?.courseId) {
        const subs = await subjectService.findAll(studentData.courseId);
        setCourseSubjects(subs);
      }

      // Fetch subject-wise attendance breakdown
      if (studentData?.id) {
        setIsLoadingAttendance(true);
        try {
          const report = await attendanceService.getStudentSubjectWise(studentData.id);
          setSubjectAttendanceReport(report);
        } catch (err) {
          console.error('Failed to fetch attendance summary:', err);
        } finally {
          setIsLoadingAttendance(false);
        }
      }
    } catch (err: any) {
      if (role === 'STUDENT') {
        toast('Failed to load dashboard data', err.message || 'Server error', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  }, [toast, role]);

  React.useEffect(() => {
    fetchStudentData();
  }, [fetchStudentData]);

  // Fetch subject-specific or overall study materials when student changes selected subject
  React.useEffect(() => {
    setIsLoadingMaterials(true);
    const batchId = student?.batchId || student?.batch?.id || undefined;
    lmsService.findAllMaterials({ 
      subjectId: selectedSubjectId || undefined, 
      batchId, 
      limit: 100 
    })
      .then((res) => {
        setSubjectMaterials(res.materials);
      })
      .catch((err) => {
        console.error('Error loading subject materials:', err);
      })
      .finally(() => {
        setIsLoadingMaterials(false);
      });
  }, [selectedSubjectId, student]);

  // Fetch assignments for student's batch
  React.useEffect(() => {
    const batchId = student?.batchId || student?.batch?.id || undefined;
    if (batchId) {
      setIsLoadingAssignments(true);
      assignmentService.findAllAssignments({ batchId })
        .then((res) => setAssignments(res))
        .catch((err) => console.error('Error loading assignments:', err))
        .finally(() => setIsLoadingAssignments(false));
    }
  }, [student]);

  if (isLoading) {
    return (
      <div className="p-16 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <p className="text-sm font-semibold text-zinc-500 animate-pulse">Loading Student Portal...</p>
      </div>
    );
  }

  if (!student) {
    const currentRole = role || useAuthStore.getState().role;
    const currentUser = user || useAuthStore.getState().user;
    const isTeacher = currentRole === 'TEACHER';
    const isAdmin = currentRole === 'ACADEMY_ADMIN' || currentRole === 'SUPER_ADMIN';

    return (
      <div className="p-12 flex flex-col items-center justify-center text-center space-y-6 max-w-xl mx-auto my-8 border border-border rounded-3xl bg-card shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-2xl font-bold shrink-0">
          <GraduationCap className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <Badge variant="warning" className="px-3 py-1 font-bold">
            {isAdmin ? 'Admin Session Active' : isTeacher ? 'Teacher Session Active' : 'Student Profile Not Linked'}
          </Badge>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            {isAdmin || isTeacher 
              ? `You are logged in as an ${isAdmin ? 'Academy Administrator' : 'Institutional Teacher'}`
              : 'Student Profile Not Linked'}
          </h3>
          <p className="text-xs text-zinc-500 max-w-md leading-relaxed">
            {isAdmin || isTeacher
              ? `Active browser session (${currentUser?.email || 'Logged in User'}) belongs to an ${isAdmin ? 'Academy Administrator' : 'Institutional Faculty Teacher'}. Click below to switch to your active workspace, or log in with student credentials.`
              : 'We could not resolve an active student profile mapping linked to this user login.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {isAdmin && (
            <Button onClick={() => router.push('/admin')} className="h-10 gap-2 cursor-pointer">
              <Layers className="w-4 h-4" /> Go to Admin Portal
            </Button>
          )}
          {isTeacher && (
            <Button onClick={() => router.push('/teacher')} className="h-10 gap-2 cursor-pointer">
              <User className="w-4 h-4" /> Go to Teacher Portal
            </Button>
          )}
          <Button 
            variant="secondary" 
            onClick={() => {
              logout();
              localStorage.removeItem('auth-user');
              localStorage.removeItem('auth-role');
              document.cookie = 'mock-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
              router.push('/login');
            }} 
            className="h-10 gap-2 shrink-0 cursor-pointer"
          >
            Log In with Student Account
          </Button>
          <Button variant="outline" onClick={fetchStudentData} className="h-10 gap-1.5 shrink-0 cursor-pointer">
            <RefreshCw className="w-4 h-4" /> Retry Check
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in select-none">
      
      {/* Header welcome banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
            Welcome back, {student.firstName}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 font-bold mt-0.5">
            Admission Code: {student.admissionNumber} • Course: {student.course?.name || 'NEET Medical'}
          </p>
        </div>
        <Button variant="secondary" onClick={fetchStudentData} className="h-10 gap-1.5 shrink-0 font-bold cursor-pointer">
          <RefreshCw className="w-4 h-4" /> Refresh Data
        </Button>
      </div>

      {/* Tabs navigation bar */}
      <div className="flex flex-nowrap sm:flex-wrap gap-2 border-b border-slate-200 pb-2 overflow-x-auto scrollbar-none">
        {[
          { id: 'DASHBOARD', label: 'Overview', icon: <GraduationCap className="w-4 h-4" /> },
          { id: 'PROFILE', label: 'Profile', icon: <User className="w-4 h-4" /> },
          { id: 'CURRICULUM', label: 'Course Track', icon: <BookOpen className="w-4 h-4" /> },
          { id: 'BATCH', label: 'My Batch', icon: <Layers className="w-4 h-4" /> },
          { id: 'ATTENDANCE', label: 'Subject Attendance', icon: <Calendar className="w-4 h-4" /> },
          { id: 'MATERIALS', label: 'Study Materials', icon: <FileText className="w-4 h-4" /> },
          { id: 'ASSIGNMENTS', label: 'Assignments', icon: <Book className="w-4 h-4" /> },
          { id: 'FEES', label: 'Fees & Invoices', icon: <CreditCard className="w-4 h-4" /> },
          { id: 'ANNOUNCEMENTS', label: 'Bulletins', icon: <Bell className="w-4 h-4" /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as PortalTab)}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider rounded-xl border transition-all cursor-pointer shrink-0 whitespace-nowrap ${
              activeTab === tab.id 
                ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm' 
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT SECTIONS */}

      {/* SECTION 1: DASHBOARD */}
      {activeTab === 'DASHBOARD' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              title="Course Track"
              value={student.course?.name || 'JEE Advanced'}
              description={student.course?.code || 'JEE2027'}
              icon={<BookOpen className="w-5 h-5 text-indigo-600" />}
            />
            <StatsCard
              title="Class Batch"
              value={student.batch?.name || 'Batch A'}
              description={student.batch?.code || 'EC-JEE-A'}
              icon={<Layers className="w-5 h-5 text-indigo-600" />}
            />
            <StatsCard
              title="Overall Attendance"
              value={`${subjectAttendanceReport?.overallPercentage ?? 91.3}%`}
              description="Subject Aggregate"
              icon={<Calendar className="w-5 h-5 text-emerald-600" />}
            />
            <StatsCard
              title="Branch"
              value={student.branch?.name || 'Electronic City'}
              description="Primary Campus"
              icon={<Clock className="w-5 h-5 text-indigo-600" />}
            />
          </div>

          {/* Quick Subject Overview */}
          <Card className="space-y-4 border border-slate-200 bg-white shadow-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <h3 className="text-sm font-extrabold text-slate-900">Course Subjects</h3>
              <Badge variant="neutral" className="font-bold">{courseSubjects.length} Mapped Subjects</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {courseSubjects.map(sub => (
                <div key={sub.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-1">
                  <span className="text-xs font-extrabold text-slate-900 block">{sub.name}</span>
                  <span className="text-[11px] text-slate-600 font-semibold capitalize block">Type: {sub.subjectType || 'Theory'}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* SECTION 2: PROFILE */}
      {activeTab === 'PROFILE' && (
        <Card className="space-y-6 border border-slate-200 bg-white shadow-xs">
          <div className="flex gap-4 items-center p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-xl font-black uppercase shrink-0 shadow-xs">
              {student.firstName[0]}{student.lastName[0]}
            </div>
            <div>
              <span className="text-base font-extrabold text-slate-900 block">
                {student.firstName} {student.lastName}
              </span>
              <span className="text-xs text-slate-600 font-semibold block mt-0.5">{student.user?.email}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-600" /> Personal Details
              </span>
              <div className="grid grid-cols-2 gap-4 text-xs font-semibold bg-white p-4 rounded-xl border border-slate-200">
                <div className="text-slate-600">Gender: <span className="text-slate-900 font-extrabold block mt-0.5">{student.gender}</span></div>
                <div className="text-slate-600">Blood Group: <span className="text-slate-900 font-extrabold block mt-0.5">{student.bloodGroup || 'Not specified'}</span></div>
                <div className="text-slate-600">Contact Phone: <span className="text-slate-900 font-extrabold block mt-0.5">{student.phone}</span></div>
                <div className="text-slate-600">Admission No: <span className="text-slate-900 font-extrabold block mt-0.5 font-mono">{student.admissionNumber}</span></div>
              </div>
            </div>

            <div className="space-y-3">
              <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-600" /> Parent Info
              </span>
              <div className="grid grid-cols-2 gap-4 text-xs font-semibold bg-white p-4 rounded-xl border border-slate-200">
                <div className="text-slate-600">Father Name: <span className="text-slate-900 font-extrabold block mt-0.5">{student.fatherName || 'Not specified'}</span></div>
                <div className="text-slate-600">Parent Phone: <span className="text-slate-900 font-extrabold block mt-0.5">{student.parentPhone || 'Not specified'}</span></div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* SECTION 3: COURSE */}
      {activeTab === 'CURRICULUM' && (
        <Card className="space-y-4 border border-slate-200 bg-white shadow-xs">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Course Track Details</h3>
            <p className="text-xs text-slate-600 font-medium mt-0.5">Your mapped academic curriculum tracking parameters.</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs font-semibold bg-white p-4 rounded-xl border border-slate-200">
            <div className="text-slate-600">Course Name: <span className="text-slate-900 font-extrabold block mt-0.5">{student.course?.name || 'JEE Advanced'}</span></div>
            <div className="text-zinc-500">Course Code: <span className="text-slate-900 font-extrabold block mt-0.5">{student.course?.code || 'JEE2027'}</span></div>
          </div>
        </Card>
      )}

      {/* SECTION 4: BATCH */}
      {activeTab === 'BATCH' && (
        <Card className="space-y-4 border border-slate-200 bg-white shadow-xs">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Class Batch Details</h3>
            <p className="text-xs text-slate-600 font-medium mt-0.5">Your operational study session grouping details.</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs font-semibold bg-white p-4 rounded-xl border border-slate-200">
            <div className="text-slate-600">Batch Name: <span className="text-slate-900 font-extrabold block mt-0.5">{student.batch?.name || '2026 Batch A'}</span></div>
            <div className="text-slate-600">Batch Code: <span className="text-slate-900 font-extrabold block mt-0.5">{student.batch?.code || 'JEE26A'}</span></div>
          </div>
        </Card>
      )}

      {/* SECTION 5: SUBJECT-WISE ATTENDANCE */}
      {activeTab === 'ATTENDANCE' && (
        <div className="space-y-6">
          <Card className="p-6 border border-emerald-300 flex items-center justify-between bg-emerald-50 shadow-xs">
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-emerald-800">Overall Course Attendance</h3>
              <p className="text-2xl font-black text-emerald-900 mt-1">
                {subjectAttendanceReport?.overallPercentage ?? 91.3}%
              </p>
            </div>
            <Badge variant="success" className="px-3 py-1.5 text-xs font-extrabold">Good Standing</Badge>
          </Card>

          <Card className="space-y-4 border border-slate-200 bg-white shadow-xs">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Subject-wise Attendance Breakdown</h3>
              <p className="text-xs text-slate-600 font-medium mt-0.5">Individual attendance tracking per subject within your Course.</p>
            </div>

            {isLoadingAttendance ? (
              <div className="p-12 text-center text-xs font-bold text-slate-500 animate-pulse">Calculating subject attendance stats...</div>
            ) : !subjectAttendanceReport || subjectAttendanceReport.subjectStats.length === 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-2">
                  <span className="text-xs font-extrabold text-slate-900 block">Physics</span>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-600 font-semibold">Attendance:</span>
                    <span className="font-extrabold text-emerald-700">95%</span>
                  </div>
                </div>
                <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-2">
                  <span className="text-xs font-extrabold text-slate-900 block">Chemistry</span>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-600 font-semibold">Attendance:</span>
                    <span className="font-extrabold text-emerald-700">88%</span>
                  </div>
                </div>
                <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-2">
                  <span className="text-xs font-extrabold text-slate-900 block">Mathematics</span>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-600 font-semibold">Attendance:</span>
                    <span className="font-extrabold text-emerald-700">91%</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {subjectAttendanceReport.subjectStats.map(stat => (
                  <div key={stat.subjectId} className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-extrabold text-slate-900 block">{stat.subjectName}</span>
                      <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 bg-slate-200 text-slate-800 rounded">{stat.subjectCode}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs pt-1">
                      <span className="text-slate-600 font-bold">{stat.presentCount} / {stat.totalSessions} Sessions</span>
                      <span className={`font-black text-sm ${stat.percentage >= 75 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {stat.percentage}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${stat.percentage >= 75 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                        style={{ width: `${Math.min(stat.percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* SECTION 6: FEES */}
      {activeTab === 'FEES' && (
        <Card className="space-y-6 border border-slate-200 bg-white shadow-xs">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Billing Installments Ledger</h3>
            <p className="text-xs text-slate-600 font-medium mt-0.5">Summary of due amount invoices and mapped payment structures.</p>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center text-xs font-semibold bg-white p-4 rounded-xl border border-slate-200">
            <div className="p-3 bg-slate-100 rounded-xl">
              <span className="text-slate-600 font-bold block mb-1">Plan Total Amount</span>
              <span className="text-base font-extrabold text-slate-900">INR {fees?.totalAmount || '60,000'}</span>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl">
              <span className="text-emerald-700 font-bold block mb-1">Total Paid Invoices</span>
              <span className="text-base font-extrabold text-emerald-800">INR {fees?.paidAmount || '0'}</span>
            </div>
            <div className="p-3 bg-rose-50 rounded-xl">
              <span className="text-rose-700 font-bold block mb-1">Outstanding Balance</span>
              <span className="text-base font-extrabold text-rose-800">INR {fees?.balance || '60,000'}</span>
            </div>
          </div>
        </Card>
      )}

      {/* SECTION 7: STUDY MATERIALS (Subject Selection -> Materials) */}
      {activeTab === 'MATERIALS' && (
        <div className="space-y-6">
          <Card className="space-y-4 border border-slate-200 bg-white shadow-xs">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Subject Study Materials</h3>
              <p className="text-xs text-slate-600 font-medium mt-0.5">Select a subject below to view PDFs, notes, and external links for that subject.</p>
            </div>

            {/* Subject Selector Pills */}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={() => setSelectedSubjectId('')}
                className={`px-4 py-2.5 text-xs font-extrabold rounded-xl border transition-all cursor-pointer ${
                  selectedSubjectId === ''
                    ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                    : 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                All Subjects
              </button>
              {courseSubjects.map(sub => (
                <button
                  key={sub.id}
                  onClick={() => setSelectedSubjectId(sub.id)}
                  className={`px-4 py-2.5 text-xs font-extrabold rounded-xl border transition-all cursor-pointer ${
                    selectedSubjectId === sub.id
                      ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                      : 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  {sub.name}
                </button>
              ))}
            </div>
          </Card>

          {/* Selected Subject Materials List */}
          <Card className="space-y-4 border border-slate-200 bg-white shadow-xs">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                Materials for: {courseSubjects.find(s => s.id === selectedSubjectId)?.name || 'Selected Subject'}
              </h4>
              <Badge variant="neutral" className="font-bold">{subjectMaterials.length} Items</Badge>
            </div>

            {isLoadingMaterials ? (
              <div className="p-12 text-center text-xs font-bold text-slate-500 animate-pulse">Loading study materials...</div>
            ) : subjectMaterials.length === 0 ? (
              <div className="p-12 text-center text-xs font-bold text-slate-500 space-y-1">
                <Book className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                <p className="text-slate-900 font-extrabold text-sm">No Materials Uploaded</p>
                <p className="text-slate-600">No study materials have been uploaded yet for this subject.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {subjectMaterials.map(mat => (
                  <div key={mat.id} className="p-5 border border-slate-200 bg-white rounded-2xl flex flex-col justify-between hover:border-indigo-600 hover:shadow-md transition-all gap-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 font-bold">
                          {mat.materialType === 'youtube' ? <Video className="w-5 h-5 text-rose-600" /> :
                           mat.materialType === 'link' ? <ExternalLink className="w-5 h-5 text-blue-600" /> :
                           mat.materialType === 'notes' ? <Book className="w-5 h-5 text-amber-600" /> :
                           <FileText className="w-5 h-5 text-indigo-600" />}
                        </div>
                        <div>
                          <span className="text-sm font-extrabold text-slate-900 block line-clamp-1">{mat.title}</span>
                          <span className="text-[11px] text-slate-600 font-bold block mt-0.5 uppercase font-mono">{mat.materialType} • {mat.subject?.name || 'General'}</span>
                        </div>
                      </div>
                      <Badge variant="neutral" className="text-[10px] uppercase font-mono font-bold">{mat.materialType}</Badge>
                    </div>

                    {mat.description && (
                      <p className="text-xs text-slate-600 line-clamp-2 font-medium">{mat.description}</p>
                    )}

                    {mat.mediaFile && (
                      <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 text-xs space-y-0.5">
                        <div className="text-slate-900 font-extrabold truncate">
                          {mat.mediaFile.originalFilename}
                        </div>
                        <div className="text-[11px] text-slate-600 font-mono font-semibold">
                          {(Number(mat.mediaFile.fileSize) / (1024 * 1024)).toFixed(2)} MB • Storage File
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                      <Button
                        size="sm"
                        onClick={() => handleOpenMaterial(mat.id)}
                        disabled={openingMaterialId === mat.id}
                        className="text-xs font-extrabold gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer px-4 py-2 rounded-xl shadow-xs"
                      >
                        {openingMaterialId === mat.id ? (
                          <>
                            <div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                            Resolving Secure Access...
                          </>
                        ) : mat.mediaFile ? (
                          <>
                            <Download className="w-3.5 h-3.5" /> Open / Download Material
                          </>
                        ) : (
                          <>
                            View Resource <ExternalLink className="w-3.5 h-3.5" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* SECTION: ASSIGNMENTS */}
      {activeTab === 'ASSIGNMENTS' && (
        <Card className="space-y-6 border border-border">
          <div className="flex justify-between items-center border-b border-border pb-3">
            <div>
              <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50">Course Assignments</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Tasks, homework exercises, and submissions published by your teachers.</p>
            </div>
            <Badge variant="neutral">{assignments.length} Total Tasks</Badge>
          </div>

          {isLoadingAssignments ? (
            <div className="p-12 text-center text-xs font-semibold text-zinc-400 animate-pulse">Loading assignments list...</div>
          ) : assignments.length === 0 ? (
            <div className="p-12 text-center text-xs font-semibold text-zinc-400 space-y-1">
              <Book className="w-8 h-8 mx-auto text-zinc-300 mb-2" />
              <p className="text-zinc-600 dark:text-zinc-300 font-bold">No Assignments Assigned</p>
              <p>No active assignments have been published for your class batch yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assignments.map(asg => (
                <div key={asg.id} className="p-4 border border-border bg-card rounded-2xl space-y-3 hover:border-primary transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <Badge variant="primary" className="mb-1">{asg.subject?.name || 'Subject'}</Badge>
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{asg.title}</h4>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Due Date: {new Date(asg.dueDate).toLocaleDateString()} • Max Marks: {asg.maxMarks}
                      </p>
                    </div>
                  </div>
                  {asg.description && (
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2">{asg.description}</p>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-border/60">
                    <span className="text-[10px] text-zinc-400 font-semibold">Teacher: {asg.teacher?.user?.firstName || 'Assigned Teacher'}</span>
                    <Button size="sm" variant="outline" className="text-xs h-8">
                      View Task
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* SECTION 8: ANNOUNCEMENTS */}
      {activeTab === 'ANNOUNCEMENTS' && (
        <Card className="space-y-6">
          <div>
            <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50">Announcements Feed</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Important announcements and dates from Hyvora administration staff.</p>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-zinc-50 dark:bg-zinc-900/60 border border-border rounded-2xl space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-primary">JEE Mock Test Schedule</span>
                <span className="text-[10px] text-zinc-400">2 hours ago</span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                The monthly JEE preparatory mock test is scheduled for next Saturday. Reporting time is 09:00 AM sharp at the Electronic City branch.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* SECTION 9: STUDENT SUBJECT RESULTS */}
      {activeTab === 'RESULTS' && (
        <Card className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
            <div>
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50">My Subject Examination Results</h3>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Official grade report card for <strong className="text-zinc-700 dark:text-zinc-200">{user ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Student'}</strong> across your enrolled course subjects.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2 h-9 text-xs">
              <Download className="w-3.5 h-3.5" /> Download Report Card PDF
            </Button>
          </div>

          {/* Student Overview Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 border border-border rounded-xl space-y-1 bg-indigo-50/40 dark:bg-indigo-950/20">
              <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider block">Cumulative GPA</span>
              <span className="text-xl font-black text-indigo-600">3.88 / 4.0</span>
            </div>
            <div className="p-4 border border-border rounded-xl space-y-1 bg-emerald-50/40 dark:bg-emerald-950/20">
              <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider block">Pass Status</span>
              <span className="text-xl font-black text-emerald-600">Qualified</span>
            </div>
            <div className="p-4 border border-border rounded-xl space-y-1 bg-blue-50/40 dark:bg-blue-950/20">
              <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider block">Overall Percentage</span>
              <span className="text-xl font-black text-blue-600">89.6 %</span>
            </div>
            <div className="p-4 border border-border rounded-xl space-y-1 bg-purple-50/40 dark:bg-purple-950/20">
              <span className="text-[10px] font-extrabold text-purple-600 uppercase tracking-wider block">Class Rank</span>
              <span className="text-xl font-black text-purple-600">Rank # 1</span>
            </div>
          </div>

          {/* Subject-Wise Results Table */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-zinc-500">Enrolled Subjects Scorecard</h4>
            
            <div className="overflow-x-auto border border-border rounded-2xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 dark:bg-zinc-800/60 border-b border-border text-zinc-700 dark:text-zinc-300 font-extrabold uppercase tracking-wider">
                    <th className="py-3.5 px-4">Subject Name</th>
                    <th className="py-3.5 px-4">Exam Assessment</th>
                    <th className="py-3.5 px-4 text-center">Marks Obtained</th>
                    <th className="py-3.5 px-4 text-center">Max Marks</th>
                    <th className="py-3.5 px-4 text-center">Percentage</th>
                    <th className="py-3.5 px-4 text-center">Grade</th>
                    <th className="py-3.5 px-4 text-center">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-medium">
                  <tr className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40">
                    <td className="py-3.5 px-4 font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-indigo-500" />
                      Advanced Mathematics
                    </td>
                    <td className="py-3.5 px-4 text-zinc-700 dark:text-zinc-300 font-semibold">Mid-Term STEM Assessment</td>
                    <td className="py-3.5 px-4 text-center font-bold text-zinc-900 dark:text-zinc-100">95.0</td>
                    <td className="py-3.5 px-4 text-center text-zinc-400">100</td>
                    <td className="py-3.5 px-4 text-center font-bold text-emerald-600">95.0%</td>
                    <td className="py-3.5 px-4 text-center"><span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-black text-[11px]">A+</span></td>
                    <td className="py-3.5 px-4 text-center"><Badge variant="success">Passed</Badge></td>
                  </tr>

                  <tr className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40">
                    <td className="py-3.5 px-4 font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-indigo-500" />
                      Classical Physics
                    </td>
                    <td className="py-3.5 px-4 text-zinc-700 dark:text-zinc-300 font-semibold">Mid-Term STEM Assessment</td>
                    <td className="py-3.5 px-4 text-center font-bold text-zinc-900 dark:text-zinc-100">84.5</td>
                    <td className="py-3.5 px-4 text-center text-zinc-400">100</td>
                    <td className="py-3.5 px-4 text-center font-bold text-emerald-600">84.5%</td>
                    <td className="py-3.5 px-4 text-center"><span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-black text-[11px]">A</span></td>
                    <td className="py-3.5 px-4 text-center"><Badge variant="success">Passed</Badge></td>
                  </tr>

                  <tr className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40">
                    <td className="py-3.5 px-4 font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-indigo-500" />
                      Computer Science & Logic
                    </td>
                    <td className="py-3.5 px-4 text-zinc-700 dark:text-zinc-300 font-semibold">Mid-Term STEM Assessment</td>
                    <td className="py-3.5 px-4 text-center font-bold text-zinc-900 dark:text-zinc-100">91.0</td>
                    <td className="py-3.5 px-4 text-center text-zinc-400">100</td>
                    <td className="py-3.5 px-4 text-center font-bold text-emerald-600">91.0%</td>
                    <td className="py-3.5 px-4 text-center"><span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-black text-[11px]">A+</span></td>
                    <td className="py-3.5 px-4 text-center"><Badge variant="success">Passed</Badge></td>
                  </tr>

                  <tr className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40">
                    <td className="py-3.5 px-4 font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-indigo-500" />
                      Chemistry & Laboratory Studies
                    </td>
                    <td className="py-3.5 px-4 text-zinc-700 dark:text-zinc-300 font-semibold">Mid-Term STEM Assessment</td>
                    <td className="py-3.5 px-4 text-center font-bold text-zinc-900 dark:text-zinc-100">88.0</td>
                    <td className="py-3.5 px-4 text-center text-zinc-400">100</td>
                    <td className="py-3.5 px-4 text-center font-bold text-emerald-600">88.0%</td>
                    <td className="py-3.5 px-4 text-center"><span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-black text-[11px]">A</span></td>
                    <td className="py-3.5 px-4 text-center"><Badge variant="success">Passed</Badge></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

    </div>
  );
}
