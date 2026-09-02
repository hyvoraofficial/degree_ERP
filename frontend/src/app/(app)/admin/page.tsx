'use client';

import * as React from 'react';
import { 
  BookOpen, Users, GraduationCap, ArrowLeft, ArrowRight, Search, RefreshCw, Key, Copy, Check, CalendarCheck, ShieldCheck, ChevronRight, Layers, Trash2, AlertTriangle, Plus, X, Eye, Book, User, CreditCard, FileText
} from 'lucide-react';
import { branchService, Branch } from '@/services/branch.service';
import { courseService, Course } from '@/services/course.service';
import { studentService, Student } from '@/services/student.service';
import { teacherService, Teacher } from '@/services/teacher.service';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/providers/ToastProvider';
import { useBranchContext } from '@/providers/BranchProvider';
import { parseFieldErrors } from '@/utils/validation';
import { API_BASE_URL, getSubdomain } from '@/config/api.config';

type NavigationLevel = 'COURSES' | 'COURSE_DETAILS';
type CourseSubTab = 'TEACHERS' | 'STUDENTS';

export default function AdminDashboard() {
  const { toast } = useToast();
  const { branches, selectedBranchId, selectedBranch } = useBranchContext();

  // Navigation Hierarchy States
  const [level, setLevel] = React.useState<NavigationLevel>('COURSES');
  const [selectedCourse, setSelectedCourse] = React.useState<Course | null>(null);
  const [activeSubTab, setActiveSubTab] = React.useState<CourseSubTab>('STUDENTS');

  // Loaded Data lists
  const [courses, setCourses] = React.useState<Course[]>([]);
  const [students, setStudents] = React.useState<Student[]>([]);
  const [teachers, setTeachers] = React.useState<Teacher[]>([]);

  // Modals state
  const [isNewCourseModalOpen, setIsNewCourseModalOpen] = React.useState(false);
  const [isDeleteTeacherOpen, setIsDeleteTeacherOpen] = React.useState(false);
  const [teacherToDelete, setTeacherToDelete] = React.useState<Teacher | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Student Detail Drawer state
  const [selectedStudentForDetail, setSelectedStudentForDetail] = React.useState<Student | null>(null);
  const [isStudentDetailDrawerOpen, setIsStudentDetailDrawerOpen] = React.useState(false);
  const [studentFeeSummary, setStudentFeeSummary] = React.useState<any>(null);
  const [studentAttendanceSummary, setStudentAttendanceSummary] = React.useState<any>(null);
  const [isLoadingStudentSummary, setIsLoadingStudentSummary] = React.useState(false);

  // Teacher Detail Drawer state
  const [selectedTeacherForDetail, setSelectedTeacherForDetail] = React.useState<Teacher | null>(null);
  const [isTeacherDetailDrawerOpen, setIsTeacherDetailDrawerOpen] = React.useState(false);

  const handleOpenStudentDetail = async (student: Student) => {
    setSelectedStudentForDetail(student);
    setIsStudentDetailDrawerOpen(true);
    setIsLoadingStudentSummary(true);
    setStudentFeeSummary(null);
    setStudentAttendanceSummary(null);

    const token = document.cookie.split('; ').find(row => row.startsWith('mock-auth-token='))?.split('=')[1] || '';
    try {
      const [resFee, resAtt] = await Promise.all([
        fetch(`${API_BASE_URL}/students/${student.id}/fee-summary`, {
          headers: { 'Authorization': `Bearer ${token}`, 'X-Academy-Subdomain': getSubdomain() }
        }),
        fetch(`${API_BASE_URL}/students/${student.id}/attendance-summary`, {
          headers: { 'Authorization': `Bearer ${token}`, 'X-Academy-Subdomain': getSubdomain() }
        })
      ]);
      if (resFee.ok) {
        const body = await resFee.json();
        setStudentFeeSummary(body.data || body);
      }
      if (resAtt.ok) {
        const body = await resAtt.json();
        setStudentAttendanceSummary(body.data || body);
      }
    } catch (e) {
      console.error('Failed to load student details:', e);
    } finally {
      setIsLoadingStudentSummary(false);
    }
  };

  const handleOpenTeacherDetail = (teacher: Teacher) => {
    setSelectedTeacherForDetail(teacher);
    setIsTeacherDetailDrawerOpen(true);
  };

  // New Course Form state
  const [courseName, setCourseName] = React.useState('');
  const [courseCode, setCourseCode] = React.useState('');
  const [courseBranchId, setCourseBranchId] = React.useState('');
  const [courseDuration, setCourseDuration] = React.useState('2 Years');
  const [courseDescription, setCourseDescription] = React.useState('');

  // Search & Loading states
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  // Fetch Courses based on active branch selection
  const fetchCourses = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await courseService.findAll('', selectedBranchId || undefined, '', 1, 100);
      setCourses(res.courses || []);
    } catch (err: any) {
      toast('Failed to load courses', err.message || 'Server error', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [selectedBranchId, toast]);

  React.useEffect(() => {
    fetchCourses();
    if (level === 'COURSE_DETAILS') {
      setLevel('COURSES');
      setSelectedCourse(null);
    }
  }, [selectedBranchId, fetchCourses]);

  // Set default branch for new course form when modal opens
  React.useEffect(() => {
    if (branches.length > 0 && !courseBranchId) {
      setCourseBranchId(selectedBranchId || branches[0].id);
    }
  }, [branches, selectedBranchId, courseBranchId]);

  // Fetch Students & Teachers when a Course is selected
  const fetchCoursePersonnel = async (course: Course) => {
    setIsLoading(true);
    try {
      const branchIdToPass = course.branchId || selectedBranchId || '';
      const [resStudents, listTeachers] = await Promise.all([
        studentService.findAll(branchIdToPass, course.id, '', 1, 100),
        teacherService.getTeachers(),
      ]);
      setStudents(resStudents.students || []);
      setTeachers(listTeachers || []);
    } catch (err: any) {
      toast('Failed to load course details', err.message || 'Server error', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCourse = async (course: Course) => {
    setSelectedCourse(course);
    setLevel('COURSE_DETAILS');
    await fetchCoursePersonnel(course);
  };

  const [courseFieldErrors, setCourseFieldErrors] = React.useState<Record<string, string>>({});
  
  // Course subjects state for creation modal
  const [courseSubjects, setCourseSubjects] = React.useState<{ name: string; code: string; subjectType: string }[]>([
    { name: '', code: '', subjectType: 'theory' }
  ]);

  const handleOpenNewCourseModal = () => {
    setCourseName('');
    setCourseCode('');
    setCourseDescription('');
    setCourseDuration('2 Years');
    setCourseBranchId(branches[0]?.id || selectedBranchId || '');
    setCourseSubjects([
      { name: '', code: '', subjectType: 'theory' }
    ]);
    setCourseFieldErrors({});
    setIsNewCourseModalOpen(true);
  };

  const addCourseSubjectRow = () => {
    setCourseSubjects(prev => [
      ...prev,
      { name: '', code: '', subjectType: 'theory' }
    ]);
  };

  const removeCourseSubjectRow = (index: number) => {
    setCourseSubjects(prev => prev.filter((_, i) => i !== index));
  };

  const updateCourseSubjectField = (index: number, field: 'name' | 'code' | 'subjectType', value: string) => {
    setCourseSubjects(prev => {
      const next = [...prev];
      const current = { ...next[index], [field]: value };
      if (field === 'name' && (!current.code || current.code.endsWith('-10' + (index + 1)))) {
        const cleaned = value.trim().toUpperCase();
        if (cleaned) {
          const words = cleaned.split(/\s+/);
          const prefix = words.length > 1 
            ? words.map(w => w[0]).join('').substring(0, 4) 
            : cleaned.substring(0, 4);
          current.code = `${prefix}-10${index + 1}`;
        }
      }
      next[index] = current;
      return next;
    });
  };

  // Create New Course handler
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!courseName.trim()) errors.name = 'Course name is required';
    if (!courseCode.trim()) errors.code = 'Course code is required';
    if (!courseBranchId) errors.branchId = 'Please select a target campus branch';

    const filteredSubs = courseSubjects.filter(s => s.name.trim());

    if (filteredSubs.length === 0) {
      errors.subjects = 'Please enter at least one Subject Name for this course';
    }

    if (Object.keys(errors).length > 0) {
      setCourseFieldErrors(errors);
      return;
    }

    setCourseFieldErrors({});
    setIsSubmitting(true);
    try {
      await courseService.create({
        name: courseName,
        code: courseCode,
        branchId: courseBranchId,
        duration: courseDuration,
        description: courseDescription,
        status: 'active',
        subjects: filteredSubs,
      });
      toast('Success', `Course "${courseName}" and subjects created successfully.`, 'success');
      setIsNewCourseModalOpen(false);
      setCourseName('');
      setCourseCode('');
      setCourseDescription('');
      setCourseSubjects([{ name: '', code: '', subjectType: 'theory' }]);
      setCourseFieldErrors({});
      fetchCourses();
    } catch (err: any) {
      const parsed = parseFieldErrors(err);
      if (Object.keys(parsed).length > 0) {
        setCourseFieldErrors(parsed);
      }
      toast('Failed to create course', err.message || 'Validation error', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Copy credentials helper
  const handleCopyCredentials = (email: string, pass: string, role: string, id: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const text = `${role} Portal Credentials\nUsername: ${email}\nPassword: ${pass}\nLogin URL: ${origin}/login`;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast('Credentials Copied', `Portal login credentials copied to clipboard.`, 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Delete teacher handler
  const handleOpenDeleteTeacher = (teacher: Teacher) => {
    setTeacherToDelete(teacher);
    setIsDeleteTeacherOpen(true);
  };

  const handleDeleteTeacherConfirm = async () => {
    if (!teacherToDelete || !selectedCourse) return;
    setIsSubmitting(true);
    try {
      await teacherService.remove(teacherToDelete.id);
      toast('Success', 'Teacher profile archived successfully.', 'success');
      setIsDeleteTeacherOpen(false);
      fetchCoursePersonnel(selectedCourse);
    } catch (err: any) {
      toast('Failed to archive teacher', err.message || 'Could not delete teacher profile.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Search Filtered Lists
  const filteredCourses = courses.filter(c => {
    if (!c) return false;
    const q = searchQuery.toLowerCase();
    return (
      (c.name || '').toLowerCase().includes(q) ||
      (c.code || '').toLowerCase().includes(q) ||
      (c.branch?.name || '').toLowerCase().includes(q)
    );
  });

  const filteredStudents = students.filter(s => {
    if (!s) return false;
    const q = searchQuery.toLowerCase();
    return (
      (s.firstName || '').toLowerCase().includes(q) ||
      (s.lastName || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q) ||
      (s.admissionNumber || '').toLowerCase().includes(q)
    );
  });

  const filteredTeachers = teachers.filter(t => {
    if (!t) return false;
    const q = searchQuery.toLowerCase();
    const fn = t.user?.firstName || (t as any).firstName || '';
    const ln = t.user?.lastName || (t as any).lastName || '';
    const em = t.user?.email || (t as any).email || '';
    return fn.toLowerCase().includes(q) || ln.toLowerCase().includes(q) || em.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 select-none animate-fade-in">
      
      {/* Back Button for Course Details View */}
      {level === 'COURSE_DETAILS' && (
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <span className="text-slate-950 font-black text-sm">
              Course Details: {selectedCourse?.name}
            </span>
          </div>
          <Button 
            variant="secondary" 
            onClick={() => { setLevel('COURSES'); setSelectedCourse(null); setSearchQuery(''); }}
            className="h-8 text-xs gap-1.5 font-bold cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Courses
          </Button>
        </div>
      )}

      {/* ==================================================== */}
      {/* LEVEL 1: COURSES VIEW (ALL OR BRANCH-FILTERED) */}
      {/* ==================================================== */}
      {level === 'COURSES' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950">
                Academic Courses & Curriculum Tracks
              </h1>
              <p className="text-xs text-slate-600 font-extrabold mt-0.5">
                {selectedBranch 
                  ? `Displaying courses offered at ${selectedBranch.name}. Select a course to view faculty & students.`
                  : 'Displaying courses across all campus branches. Select a course to inspect its faculty & enrolled students.'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search course name or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-950 shadow-xs"
                />
              </div>

              <Button
                onClick={handleOpenNewCourseModal}
                className="h-10 px-4 text-xs gap-2 font-black shrink-0 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" /> New Course
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="p-16 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              <p className="text-xs font-extrabold text-slate-600 animate-pulse">Loading Academic Courses...</p>
            </div>
          ) : filteredCourses.length === 0 ? (
            <Card className="p-12 text-center text-slate-600 font-bold border border-slate-200">
              No courses configured {selectedBranch ? `for ${selectedBranch.name}` : ''} matching search query.
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course) => (
                <Card 
                  key={course.id} 
                  className="p-6 border border-slate-200 bg-white hover:border-primary/50 transition-all cursor-pointer group shadow-xs flex flex-col justify-between"
                  onClick={() => handleSelectCourse(course)}
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center font-bold shrink-0">
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <Badge variant={course.status === 'active' ? 'success' : 'neutral'}>
                        {course.status}
                      </Badge>
                    </div>

                    <div>
                      <h3 className="text-lg font-black text-slate-950 group-hover:text-primary transition-colors">
                        {course.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-600 font-bold font-mono">
                          Code: {course.code}
                        </span>
                        {course.branch?.name && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-800 font-extrabold">
                            {course.branch.name}
                          </span>
                        )}
                      </div>
                      {course.description && (
                        <p className="text-xs text-slate-500 font-semibold line-clamp-2 mt-2">
                          {course.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between text-xs font-extrabold">
                    <span className="text-slate-600">Faculty & Students</span>
                    <span className="text-primary flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      Explore Course <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* LEVEL 2: COURSE DETAILS (TEACHERS & STUDENTS) */}
      {/* ==================================================== */}
      {level === 'COURSE_DETAILS' && selectedCourse && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                {selectedCourse.branch?.name && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-800 font-bold">
                    {selectedCourse.branch.name}
                  </span>
                )}
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-primary font-black">
                  {selectedCourse.name} ({selectedCourse.code})
                </span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-950 mt-1">
                Course Roster & Faculty Personnel
              </h1>
              <p className="text-xs text-slate-600 font-extrabold mt-0.5">
                Inspect assigned teachers and registered student profiles under {selectedCourse.name}.
              </p>
            </div>

            {/* Toggle Action Buttons: Teachers vs Students */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center p-1 bg-slate-100 border border-slate-200 rounded-2xl shrink-0 gap-1 sm:gap-0">
              <button
                onClick={() => setActiveSubTab('STUDENTS')}
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activeSubTab === 'STUDENTS'
                    ? 'bg-white text-primary shadow-xs border border-slate-200'
                    : 'text-slate-700 hover:text-slate-950'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                Enrolled Students ({filteredStudents.length})
              </button>
              <button
                onClick={() => setActiveSubTab('TEACHERS')}
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activeSubTab === 'TEACHERS'
                    ? 'bg-white text-primary shadow-xs border border-slate-200'
                    : 'text-slate-700 hover:text-slate-950'
                }`}
              >
                <Users className="w-4 h-4" />
                Academic Faculty ({filteredTeachers.length})
              </button>
            </div>
          </div>

          {/* Search bar inside course details */}
          <Card className="p-4 flex items-center justify-between border border-slate-200 bg-white shadow-xs">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder={activeSubTab === 'STUDENTS' ? "Search students by name, email, or ADM..." : "Search faculty by name or email..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-950 shadow-xs"
              />
            </div>
          </Card>

          {/* TAB 1: ENROLLED STUDENTS TABLE */}
          {activeSubTab === 'STUDENTS' && (
            <Card className="overflow-hidden border border-slate-200 bg-white shadow-xs">
              {isLoading ? (
                <div className="p-16 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                  <p className="text-xs font-extrabold text-slate-600 animate-pulse">Loading Student Roster...</p>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="p-16 text-center space-y-2">
                  <GraduationCap className="w-8 h-8 text-slate-400 mx-auto" />
                  <h3 className="text-base font-extrabold text-slate-950">No Enrolled Students</h3>
                  <p className="text-xs text-slate-600 font-bold">No student records found under {selectedCourse.name}.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-100 text-xs font-extrabold uppercase tracking-wider text-slate-900">
                        <th className="px-6 py-4">Student</th>
                        <th className="px-6 py-4">Portal Credentials</th>
                        <th className="px-6 py-4">Adm Number</th>
                        <th className="px-6 py-4">Batch</th>
                        <th className="px-6 py-4">Parent Phone</th>
                        <th className="px-6 py-4">Attendance</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-bold text-slate-900">
                      {filteredStudents.map((student) => (
                        <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <button
                              type="button"
                              onClick={() => handleOpenStudentDetail(student)}
                              className="flex flex-col text-left group cursor-pointer focus:outline-none"
                            >
                              <span className="font-extrabold text-slate-950 text-sm group-hover:text-indigo-600 group-hover:underline transition-colors">
                                {student.firstName} {student.lastName}
                              </span>
                              <span className="text-xs text-slate-600 font-semibold">{student.phone}</span>
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1 text-xs">
                              <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                                <span className="text-slate-500 font-bold">User:</span>
                                <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-bold text-indigo-700">{student.email}</span>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-500 font-bold">Pass:</span>
                                  <span className="font-mono bg-amber-50 border border-amber-200 text-amber-800 px-1.5 py-0.5 rounded text-[11px] font-bold">
                                    {(student as any).temporaryPassword || 'Student@123'}
                                  </span>
                                </div>
                                <button
                                  onClick={() => handleCopyCredentials(student.email, (student as any).temporaryPassword || 'Student@123', 'Student', student.id)}
                                  className="p-1 rounded hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                                  title="Copy Portal Credentials"
                                >
                                  {copiedId === student.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              type="button"
                              onClick={() => handleOpenStudentDetail(student)}
                              className="px-2 py-1 bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-900 hover:text-indigo-600 text-xs rounded font-extrabold font-mono transition-colors cursor-pointer"
                            >
                              {student.admissionNumber}
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs text-slate-800 font-bold">{student.batch?.name || 'Batch A'}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs text-slate-600 font-bold">{student.parentPhone || student.phone}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5">
                              <CalendarCheck className="w-4 h-4 text-emerald-600" />
                              <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                92.4% Avg
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant={student.status === 'active' ? 'success' : 'neutral'}>
                              {student.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleOpenStudentDetail(student)}
                              className="p-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:text-indigo-600 hover:border-indigo-400 transition-colors cursor-pointer shadow-xs"
                              title="View Full Student Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {/* TAB 2: FACULTY TEACHERS TABLE */}
          {activeSubTab === 'TEACHERS' && (
            <Card className="overflow-hidden border border-slate-200 bg-white shadow-xs">
              {isLoading ? (
                <div className="p-16 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                  <p className="text-xs font-extrabold text-slate-600 animate-pulse">Loading Faculty Teachers...</p>
                </div>
              ) : filteredTeachers.length === 0 ? (
                <div className="p-16 text-center space-y-2">
                  <Users className="w-8 h-8 text-slate-400 mx-auto" />
                  <h3 className="text-base font-extrabold text-slate-950">No Teachers Mapped</h3>
                  <p className="text-xs text-slate-600 font-bold">No faculty records found matching search query.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-100 text-xs font-extrabold uppercase tracking-wider text-slate-900">
                        <th className="px-6 py-4">Faculty Member</th>
                        <th className="px-6 py-4">Portal Credentials</th>
                        <th className="px-6 py-4">Employee ID</th>
                        <th className="px-6 py-4">Designation</th>
                        <th className="px-6 py-4">Qualification</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-bold text-slate-900">
                      {filteredTeachers.map((teacher) => {
                        const firstName = teacher.user?.firstName || (teacher as any).firstName || 'Faculty';
                        const lastName = teacher.user?.lastName || (teacher as any).lastName || 'Member';
                        const email = teacher.user?.email || (teacher as any).email || 'teacher@hyvora.com';
                        const phone = teacher.user?.phone || (teacher as any).phone || '+91-9876543210';
                        const empNumber = teacher.employeeNumber || `EMP-${teacher.id.substring(0, 5)}`;

                        return (
                          <tr key={teacher.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                              <button
                                type="button"
                                onClick={() => handleOpenTeacherDetail(teacher)}
                                className="flex items-center gap-3 text-left group cursor-pointer focus:outline-none"
                              >
                                <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-200 text-primary flex items-center justify-center font-black text-xs shrink-0 uppercase">
                                  {firstName[0]}{lastName[0]}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-extrabold text-slate-950 text-sm group-hover:text-indigo-600 group-hover:underline transition-colors">{firstName} {lastName}</span>
                                  <span className="text-xs text-slate-600 font-semibold">{phone}</span>
                                </div>
                              </button>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1 text-xs">
                                <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                                  <span className="text-slate-500 font-bold">User:</span>
                                  <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-bold text-indigo-700">{email}</span>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-slate-500 font-bold">Pass:</span>
                                    <span className="font-mono bg-amber-50 border border-amber-200 text-amber-800 px-1.5 py-0.5 rounded text-[11px] font-bold">
                                      {teacher.temporaryPassword || (teacher as any).temporaryPassword || 'Teacher@123'}
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => handleCopyCredentials(email, teacher.temporaryPassword || (teacher as any).temporaryPassword || 'Teacher@123', 'Teacher', teacher.id)}
                                    className="p-1 rounded hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                                    title="Copy Portal Credentials"
                                  >
                                    {copiedId === teacher.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <button
                                type="button"
                                onClick={() => handleOpenTeacherDetail(teacher)}
                                className="px-2 py-1 bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-900 hover:text-indigo-600 text-xs rounded font-extrabold font-mono transition-colors cursor-pointer"
                              >
                                {empNumber}
                              </button>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-xs text-slate-800 font-bold">{teacher.designation || 'Senior Faculty'}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-xs text-slate-600 font-bold">{teacher.qualification || 'M.Sc, B.Ed'}</span>
                            </td>
                            <td className="px-6 py-4">
                              <Badge variant={teacher.status === 'active' ? 'success' : 'neutral'}>
                                {teacher.status || 'active'}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleOpenTeacherDetail(teacher)}
                                  className="p-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:text-indigo-600 hover:border-indigo-400 transition-colors cursor-pointer shadow-xs"
                                  title="View Full Teacher Profile"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleOpenDeleteTeacher(teacher)}
                                  className="p-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:text-rose-600 hover:border-rose-400 transition-colors cursor-pointer shadow-xs"
                                  title="Archive Teacher Profile"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* CREATE NEW COURSE MODAL */}
      {isNewCourseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto">
          <Card className="w-full max-w-xl p-6 relative border border-slate-200 bg-white shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto scrollbar-thin">
            <button
              onClick={() => setIsNewCourseModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div>
              <h3 className="text-lg font-black text-slate-950">
                Create New Academic Course Track
              </h3>
              <p className="text-xs text-slate-600 font-extrabold mt-0.5">
                Provision a new course offering and its subjects for your campus branch.
              </p>
            </div>

            <form onSubmit={handleCreateCourse} className="space-y-4" noValidate>
              <Input
                label="Course Name *"
                id="cName"
                placeholder="e.g. JEE Masterclass 2026"
                value={courseName}
                onChange={(e) => { setCourseName(e.target.value); setCourseFieldErrors(prev => ({ ...prev, name: '' })); }}
                error={courseFieldErrors.name}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Course Code *"
                  id="cCode"
                  placeholder="e.g. JEE-2026"
                  value={courseCode}
                  onChange={(e) => { setCourseCode(e.target.value); setCourseFieldErrors(prev => ({ ...prev, code: '' })); }}
                  error={courseFieldErrors.code}
                />
                <Input
                  label="Duration"
                  id="cDuration"
                  placeholder="e.g. 2 Years"
                  value={courseDuration}
                  onChange={(e) => setCourseDuration(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-xs font-bold text-slate-700">Campus Branch *</label>
                <select
                  value={courseBranchId}
                  onChange={(e) => { setCourseBranchId(e.target.value); setCourseFieldErrors(prev => ({ ...prev, branchId: '' })); }}
                  className={`flex h-11 w-full rounded-xl border bg-white px-4 py-2 text-sm focus:outline-none font-bold text-slate-900 shadow-xs cursor-pointer ${
                    courseFieldErrors.branchId ? 'border-rose-500' : 'border-slate-300'
                  }`}
                >
                  <option value="">Select a branch</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                  ))}
                </select>
                {courseFieldErrors.branchId && (
                  <span className="text-xs text-rose-500 font-medium mt-0.5">{courseFieldErrors.branchId}</span>
                )}
              </div>

              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-xs font-bold text-slate-700">Course Description</label>
                <textarea
                  placeholder="Brief summary of syllabus and targets..."
                  value={courseDescription}
                  onChange={(e) => setCourseDescription(e.target.value)}
                  className="w-full h-20 rounded-xl border border-slate-300 bg-white p-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
                />
              </div>

              {/* Course Subjects Section */}
              <div className="pt-3 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between bg-primary/5 p-3 rounded-xl border border-primary/20">
                  <div>
                    <span className="text-xs font-black text-primary uppercase tracking-wider block">Course Subjects (Required)</span>
                    <span className="text-[11px] font-bold text-slate-500">Define subjects created along with this course.</span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={addCourseSubjectRow}
                    className="text-xs h-8 gap-1.5 font-bold cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Subject
                  </Button>
                </div>

                {courseFieldErrors.subjects && (
                  <span className="text-xs text-rose-500 font-bold block">{courseFieldErrors.subjects}</span>
                )}

                <div className="space-y-2.5">
                  {courseSubjects.map((sub, i) => (
                    <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-2">
                      <div className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-7">
                          <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block mb-1">Subject Name *</label>
                          <input
                            type="text"
                            placeholder="e.g. Physics"
                            value={sub.name}
                            onChange={(e) => updateCourseSubjectField(i, 'name', e.target.value)}
                            className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:ring-2 focus:ring-primary"
                          />
                        </div>
                        <div className="col-span-4">
                          <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block mb-1">Type</label>
                          <select
                            value={sub.subjectType}
                            onChange={(e) => updateCourseSubjectField(i, 'subjectType', e.target.value)}
                            className="w-full h-9 px-2 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-900 cursor-pointer"
                          >
                            <option value="theory">Theory</option>
                            <option value="practical">Practical</option>
                            <option value="lab">Lab</option>
                          </select>
                        </div>
                        <div className="col-span-1 flex justify-end pt-4">
                          {courseSubjects.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeCourseSubjectRow(i)}
                              className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <Button variant="secondary" type="button" onClick={() => setIsNewCourseModalOpen(false)} className="font-bold">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="font-bold">
                  {isSubmitting ? 'Creating...' : 'Provision Course Track'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* CONFIRM DELETE TEACHER PROFILE DIALOG */}
      {isDeleteTeacherOpen && teacherToDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <Card className="w-full max-w-md p-6 border border-slate-200 bg-white shadow-xl space-y-4">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 shrink-0 border border-rose-200">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-950">
                  Archive Teacher Profile?
                </h3>
                <p className="text-xs text-slate-600 font-bold">
                  Are you sure you want to archive teacher <span className="font-black text-slate-950">"{teacherToDelete.user?.firstName || (teacherToDelete as any).firstName} {teacherToDelete.user?.lastName || (teacherToDelete as any).lastName}"</span>?
                  This will soft-delete their profile and revoke portal access.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setIsDeleteTeacherOpen(false)} className="font-bold">
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDeleteTeacherConfirm} disabled={isSubmitting} className="font-bold">
                {isSubmitting ? 'Archiving...' : 'Archive Profile'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* DETAIL DRAWER / SLIDE-OUT OVERLAY FOR STUDENT */}
      {isStudentDetailDrawerOpen && selectedStudentForDetail && (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-end backdrop-blur-xs">
          <div className="w-full max-w-full sm:max-w-xl md:max-w-2xl bg-white border-l border-slate-200 h-full flex flex-col shadow-2xl p-4 sm:p-6 overflow-y-auto animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
              <div>
                <h3 className="text-lg font-black text-slate-950">
                  Student Profile Sheet
                </h3>
                <p className="text-xs text-slate-600 font-extrabold uppercase tracking-wider mt-0.5">
                  adm code: {selectedStudentForDetail.admissionNumber}
                </p>
              </div>
              <button
                onClick={() => setIsStudentDetailDrawerOpen(false)}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Profile Header Card */}
              <div className="flex gap-4 items-center p-4 bg-slate-50 rounded-2xl border border-slate-200 shadow-xs">
                <div className="w-14 h-14 rounded-2xl bg-primary/20 text-primary flex items-center justify-center text-xl font-black shrink-0 uppercase border border-primary/30">
                  {selectedStudentForDetail.firstName[0]}{selectedStudentForDetail.lastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-base font-black text-slate-950 block">
                    {selectedStudentForDetail.firstName} {selectedStudentForDetail.lastName}
                  </span>
                  <span className="text-xs text-slate-600 font-bold block mt-0.5">{selectedStudentForDetail.email}</span>
                </div>
                <Badge variant={selectedStudentForDetail.status === 'active' ? 'success' : 'neutral'}>
                  {selectedStudentForDetail.status}
                </Badge>
              </div>

              {/* Student Portal Credentials Box */}
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-amber-700" /> Student Portal Authorized Credentials
                  </span>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      const code = (selectedStudentForDetail.admissionNumber || 'STD').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                      const passText = selectedStudentForDetail.temporaryPassword || (selectedStudentForDetail as any).temporaryPassword || `Std#${code}2026!`;
                      const origin = typeof window !== 'undefined' ? window.location.origin : '';
                      const text = `Student Portal Credentials\nUsername: ${selectedStudentForDetail.email}\nPassword: ${passText}\nLogin Portal: ${origin}/login`;
                      navigator.clipboard.writeText(text);
                      toast('Credentials Copied', `Portal login info for ${selectedStudentForDetail.firstName} copied to clipboard.`, 'success');
                    }}
                    className="h-8 text-xs px-3 gap-1.5 border-amber-300 bg-white hover:bg-amber-100 text-amber-900 font-bold"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy Credentials
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs font-bold pt-1">
                  <div className="p-2.5 bg-white rounded-xl border border-amber-200">
                    <span className="text-slate-500 block text-[10px] uppercase mb-0.5">Portal Username</span>
                    <span className="text-slate-950 font-mono font-black select-all">{selectedStudentForDetail.email}</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-amber-200">
                    <span className="text-slate-500 block text-[10px] uppercase mb-0.5">Portal Password</span>
                    <span className="text-amber-800 font-mono font-black select-all">
                      {selectedStudentForDetail.temporaryPassword || (selectedStudentForDetail as any).temporaryPassword || `Std#${(selectedStudentForDetail.admissionNumber || 'STD').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}2026!`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Attendance Statistics & Breakdown */}
              <div className="space-y-3">
                <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <CalendarCheck className="w-4 h-4 text-emerald-600" /> Attendance Performance & Subject Breakdown
                </span>
                
                {isLoadingStudentSummary ? (
                  <div className="py-6 flex justify-center text-xs font-bold text-slate-600">Loading Attendance Summary...</div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-4 gap-3 text-xs font-bold bg-white p-4 rounded-xl border border-slate-200 text-center shadow-xs">
                      <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
                        <span className="text-emerald-700 block text-[10px] uppercase font-black">Overall Rate</span>
                        <span className="text-base font-black text-emerald-800">
                          {studentAttendanceSummary?.overall?.percentage ?? 0}%
                        </span>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-slate-600 block text-[10px] uppercase font-extrabold">Total Sessions</span>
                        <span className="text-sm font-black text-slate-900">
                          {studentAttendanceSummary?.overall?.total ?? 0}
                        </span>
                      </div>
                      <div className="p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-100">
                        <span className="text-emerald-600 block text-[10px] uppercase font-extrabold">Present Count</span>
                        <span className="text-sm font-black text-emerald-700">
                          {studentAttendanceSummary?.overall?.present ?? 0}
                        </span>
                      </div>
                      <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200">
                        <span className="text-rose-600 block text-[10px] uppercase font-extrabold">Absent Count</span>
                        <span className="text-sm font-black text-rose-700">
                          {studentAttendanceSummary?.overall?.absent ?? 0}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2.5 shadow-xs">
                      <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider block border-b border-slate-200 pb-2">
                        Subject-Wise Attendance Metrics
                      </span>
                      {studentAttendanceSummary?.subjects && studentAttendanceSummary.subjects.length > 0 ? (
                        studentAttendanceSummary.subjects.map((sub: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 last:border-0">
                            <div className="flex flex-col">
                              <span className="font-extrabold text-slate-950">{sub.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-bold text-slate-700">{sub.present || sub.presentCount || 0} / {sub.total || sub.totalSessions || 0} Sessions</span>
                              <span className="px-2 py-0.5 rounded-full text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                                {sub.percentage ?? 0}%
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-center text-xs font-bold text-slate-400 italic">
                          No attendance records logged for this student.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Personal Section */}
              <div className="space-y-3">
                <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-4 h-4 text-slate-600" /> Personal Information
                </span>
                <div className="grid grid-cols-2 gap-4 text-xs font-bold bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="text-slate-600">Gender: <span className="text-slate-950 block mt-0.5 font-black">{selectedStudentForDetail.gender}</span></div>
                  <div className="text-slate-600">Blood Group: <span className="text-slate-950 block mt-0.5 font-black">{selectedStudentForDetail.bloodGroup || 'Not specified'}</span></div>
                  <div className="text-slate-600">Date of Birth: <span className="text-slate-950 block mt-0.5 font-black">{new Date(selectedStudentForDetail.dateOfBirth).toLocaleDateString()}</span></div>
                  <div className="text-slate-600">Contact Phone: <span className="text-slate-950 block mt-0.5 font-black">{selectedStudentForDetail.phone}</span></div>
                </div>
              </div>

              {/* Parent Info Section */}
              <div className="space-y-3">
                <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-slate-600" /> Parent & Guardian Coordinates
                </span>
                <div className="grid grid-cols-2 gap-4 text-xs font-bold bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="text-slate-600">Father Name: <span className="text-slate-950 block mt-0.5 font-black">{selectedStudentForDetail.fatherName || 'Not specified'}</span></div>
                  <div className="text-slate-600">Mother Name: <span className="text-slate-950 block mt-0.5 font-black">{selectedStudentForDetail.motherName || 'Not specified'}</span></div>
                  <div className="text-slate-600">Parent Phone: <span className="text-slate-950 block mt-0.5 font-black">{selectedStudentForDetail.parentPhone || 'Not specified'}</span></div>
                  <div className="text-slate-600">Parent Email: <span className="text-slate-950 block mt-0.5 font-black">{selectedStudentForDetail.parentEmail || 'Not specified'}</span></div>
                </div>
              </div>

              {/* Billing / Fee Summary Section */}
              <div className="space-y-3">
                <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-slate-600" /> Fees Structure & Balance Status
                </span>
                {isLoadingStudentSummary ? (
                  <div className="py-6 flex justify-center text-xs font-bold text-slate-600">Loading Billing Summary...</div>
                ) : (
                  <div className="grid grid-cols-3 gap-4 text-xs font-bold bg-white p-4 rounded-xl border border-slate-200 text-center shadow-xs">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-600 block mb-1 text-[10px] uppercase font-extrabold">Total Fee Amount</span>
                      <span className="text-sm font-black text-slate-950">INR {studentFeeSummary?.totalAllocated?.toLocaleString() || '60,000'}</span>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                      <span className="text-emerald-700 block mb-1 text-[10px] uppercase font-extrabold">Paid Amount</span>
                      <span className="text-sm font-black text-emerald-800">INR {studentFeeSummary?.totalPaid?.toLocaleString() || '30,000'}</span>
                    </div>
                    <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                      <span className="text-rose-700 block mb-1 text-[10px] uppercase font-extrabold">Remaining Balance</span>
                      <span className="text-sm font-black text-rose-800">INR {studentFeeSummary?.totalBalance?.toLocaleString() || '30,000'}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL DRAWER / SLIDE-OUT OVERLAY FOR TEACHER */}
      {isTeacherDetailDrawerOpen && selectedTeacherForDetail && (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-end backdrop-blur-xs">
          <div className="w-full max-w-full sm:max-w-xl md:max-w-2xl bg-white border-l border-slate-200 h-full flex flex-col shadow-2xl p-4 sm:p-6 overflow-y-auto animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
              <div>
                <h3 className="text-lg font-black text-slate-950">
                  Teacher Profile Sheet
                </h3>
                <p className="text-xs text-slate-600 font-extrabold uppercase tracking-wider mt-0.5">
                  emp code: {selectedTeacherForDetail.employeeNumber}
                </p>
              </div>
              <button
                onClick={() => setIsTeacherDetailDrawerOpen(false)}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Profile Header Card */}
              <div className="flex gap-4 items-center p-4 bg-slate-50 rounded-2xl border border-slate-200 shadow-xs">
                <div className="w-14 h-14 rounded-2xl bg-primary/20 text-primary flex items-center justify-center text-xl font-black shrink-0 uppercase border border-primary/30">
                  {(selectedTeacherForDetail.user?.firstName || (selectedTeacherForDetail as any).firstName || 'F')[0]}
                  {(selectedTeacherForDetail.user?.lastName || (selectedTeacherForDetail as any).lastName || 'M')[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-base font-black text-slate-950 block">
                    {selectedTeacherForDetail.user?.firstName || (selectedTeacherForDetail as any).firstName}{' '}
                    {selectedTeacherForDetail.user?.lastName || (selectedTeacherForDetail as any).lastName}
                  </span>
                  <span className="text-xs text-slate-600 font-bold block mt-0.5">
                    {selectedTeacherForDetail.user?.email || (selectedTeacherForDetail as any).email}
                  </span>
                </div>
                <Badge variant={selectedTeacherForDetail.status === 'active' ? 'success' : 'neutral'}>
                  {selectedTeacherForDetail.status || 'active'}
                </Badge>
              </div>

              {/* Teacher Portal Credentials Box */}
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-amber-700" /> Teacher Portal Authorized Credentials
                  </span>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      const email = selectedTeacherForDetail.user?.email || (selectedTeacherForDetail as any).email;
                      const pass = selectedTeacherForDetail.temporaryPassword || `Tch#${(selectedTeacherForDetail.employeeNumber || 'TCH').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}2026!`;
                      navigator.clipboard.writeText(`User: ${email}\nPass: ${pass}`);
                      toast('Credentials Copied', `Portal login info copied to clipboard.`, 'success');
                    }}
                    className="h-8 text-xs px-3 gap-1.5 border-amber-300 bg-white hover:bg-amber-100 text-amber-900 font-bold"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy Credentials
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs font-bold pt-1">
                  <div className="p-2.5 bg-white rounded-xl border border-amber-200">
                    <span className="text-slate-500 block text-[10px] uppercase mb-0.5">Portal Username</span>
                    <span className="text-slate-950 font-mono font-black select-all">
                      {selectedTeacherForDetail.user?.email || (selectedTeacherForDetail as any).email}
                    </span>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-amber-200">
                    <span className="text-slate-500 block text-[10px] uppercase mb-0.5">Portal Password</span>
                    <span className="text-amber-800 font-mono font-black select-all">
                      {selectedTeacherForDetail.temporaryPassword || `Tch#${(selectedTeacherForDetail.employeeNumber || 'TCH').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}2026!`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Personal & Academic Info Section */}
              <div className="space-y-3">
                <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-slate-600" /> Personal & Academic Profile
                </span>
                <div className="grid grid-cols-2 gap-4 text-xs font-bold bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="text-slate-600">Designation: <span className="text-slate-950 block mt-0.5 font-black">{selectedTeacherForDetail.designation || 'Lecturer'}</span></div>
                  <div className="text-slate-600">Qualification: <span className="text-slate-950 block mt-0.5 font-black">{selectedTeacherForDetail.qualification || 'M.Sc, B.Ed'}</span></div>
                  <div className="text-slate-600">Contact Phone: <span className="text-slate-950 block mt-0.5 font-black">{selectedTeacherForDetail.user?.phone || (selectedTeacherForDetail as any).phone || '+91-9876543210'}</span></div>
                  <div className="text-slate-600">Joining Date: <span className="text-slate-950 block mt-0.5 font-black">{selectedTeacherForDetail.joiningDate ? new Date(selectedTeacherForDetail.joiningDate).toLocaleDateString() : 'Active Member'}</span></div>
                </div>
              </div>

              {/* Mapped Subjects & Cohorts Section */}
              <div className="space-y-3">
                <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Book className="w-4 h-4 text-indigo-600" /> Mapped Subjects & Academic Cohorts ({selectedTeacherForDetail.subjects?.length || 0})
                </span>
                {selectedTeacherForDetail.subjects && selectedTeacherForDetail.subjects.length > 0 ? (
                  <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2.5 shadow-xs">
                    {selectedTeacherForDetail.subjects.map((sub: any, idx: number) => {
                      const sName = sub?.name || sub?.subject?.name || 'Subject';
                      const sCode = sub?.code || sub?.subject?.code;
                      const cName = sub?.courseName || sub?.course?.name;
                      const bName = sub?.batchName || sub?.batch?.name;
                      return (
                        <div key={idx} className="flex items-center justify-between text-xs py-2 border-b border-slate-100 last:border-0">
                          <div className="flex flex-col">
                            <span className="font-extrabold text-slate-950 flex items-center gap-1.5">
                              <Book className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                              {sName} {sCode ? `(${sCode})` : ''}
                            </span>
                            {cName && <span className="text-[10px] text-slate-500 font-bold mt-0.5 pl-5">Course: {cName}</span>}
                          </div>
                          {bName && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-indigo-50 text-indigo-800 border border-indigo-200">
                              {bName}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 text-center rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-400 italic shadow-xs">
                    No active subject or cohort assignments mapped to this teacher.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
