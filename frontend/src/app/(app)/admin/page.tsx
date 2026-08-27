'use client';

import * as React from 'react';
import { 
  BookOpen, Users, GraduationCap, ArrowLeft, ArrowRight, Search, RefreshCw, Key, Copy, Check, CalendarCheck, ShieldCheck, ChevronRight, Layers, Trash2, AlertTriangle, Plus, X
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

    const filteredSubs = courseSubjects.filter(s => s.name.trim() && s.code.trim());

    if (filteredSubs.length === 0) {
      errors.subjects = 'Please enter at least one Subject (Name & Code) for this course';
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
    <div className="p-8 space-y-6 select-none animate-fade-in">
      
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
            className="h-8 text-xs gap-1.5 font-bold"
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
              <h1 className="text-2xl font-black tracking-tight text-slate-950">
                Academic Courses & Curriculum Tracks
              </h1>
              <p className="text-xs text-slate-600 font-extrabold mt-0.5">
                {selectedBranch 
                  ? `Displaying courses offered at ${selectedBranch.name}. Select a course to view faculty & students.`
                  : 'Displaying courses across all campus branches. Select a course to inspect its faculty & enrolled students.'}
              </p>
            </div>

            <div className="flex items-center gap-3">
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
            <div className="flex items-center p-1 bg-slate-100 border border-slate-200 rounded-2xl shrink-0">
              <button
                onClick={() => setActiveSubTab('STUDENTS')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
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
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
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
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-bold text-slate-900">
                      {filteredStudents.map((student) => (
                        <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-extrabold text-slate-950 text-sm">{student.firstName} {student.lastName}</span>
                              <span className="text-xs text-slate-600 font-semibold">{student.phone}</span>
                            </div>
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
                                    Student@123
                                  </span>
                                </div>
                                <button
                                  onClick={() => handleCopyCredentials(student.email, 'Student@123', 'Student', student.id)}
                                  className="p-1 rounded hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                                  title="Copy Portal Credentials"
                                >
                                  {copiedId === student.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 bg-slate-100 border border-slate-200 text-slate-900 text-xs rounded font-extrabold font-mono">
                              {student.admissionNumber}
                            </span>
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

                        return (
                          <tr key={teacher.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-200 text-primary flex items-center justify-center font-black text-xs shrink-0 uppercase">
                                  {firstName[0]}{lastName[0]}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-extrabold text-slate-950 text-sm">{firstName} {lastName}</span>
                                  <span className="text-xs text-slate-600 font-semibold">{phone}</span>
                                </div>
                              </div>
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
                                      Teacher@123
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => handleCopyCredentials(email, 'Teacher@123', 'Teacher', teacher.id)}
                                    className="p-1 rounded hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                                    title="Copy Portal Credentials"
                                  >
                                    {copiedId === teacher.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-2 py-1 bg-slate-100 border border-slate-200 text-slate-900 text-xs rounded font-extrabold font-mono">
                                {teacher.employeeNumber || `EMP-${teacher.id.substring(0, 5)}`}
                              </span>
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
                              <button
                                onClick={() => handleOpenDeleteTeacher(teacher)}
                                className="p-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:text-rose-600 hover:border-rose-400 transition-colors cursor-pointer shadow-xs"
                                title="Archive Teacher Profile"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
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
                        <div className="col-span-5">
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
                          <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block mb-1">Subject Code *</label>
                          <input
                            type="text"
                            placeholder="e.g. PHY-101"
                            value={sub.code}
                            onChange={(e) => updateCourseSubjectField(i, 'code', e.target.value)}
                            className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:ring-2 focus:ring-primary"
                          />
                        </div>
                        <div className="col-span-2">
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

    </div>
  );
}
