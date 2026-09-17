'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Users, BookOpen, Clock, Award, ClipboardList, Layers, User, Bell, FileText, CheckCircle, XCircle, Calendar, RefreshCw, Plus, Link, Video, File, Book, Trash2, VideoIcon, FileSpreadsheet, UploadCloud, Presentation, FileCode, Image as ImageIcon, X
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { StatsCard } from '@/components/shared/StatsCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/providers/ToastProvider';
import { branchService, Branch } from '@/services/branch.service';
import { courseService, Course } from '@/services/course.service';
import { subjectService, Subject } from '@/services/subject.service';
import { batchService, Batch } from '@/services/batch.service';
import { attendanceService } from '@/services/attendance.service';
import { lmsService, StudyMaterialItem } from '@/services/lms.service';
import { assignmentService, AssignmentItem } from '@/services/assignment.service';
import { API_BASE_URL, getSubdomain } from '@/config/api.config';

type TeacherTab = 'DASHBOARD' | 'PROFILE' | 'ATTENDANCE' | 'STUDENTS' | 'MATERIALS' | 'ASSIGNMENTS' | 'VIDEOS' | 'EXAMS' | 'RESULTS';

export default function TeacherDashboard() {
  const { toast } = useToast();
  const pathname = usePathname();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = React.useState<TeacherTab>('DASHBOARD');

  React.useEffect(() => {
    if (pathname.includes('/students')) setActiveTab('STUDENTS');
    else if (pathname.includes('/attendance')) setActiveTab('ATTENDANCE');
    else if (pathname.includes('/assignments')) setActiveTab('ASSIGNMENTS');
    else if (pathname.includes('/materials')) setActiveTab('MATERIALS');
    else if (pathname.includes('/videos')) setActiveTab('VIDEOS');
    else if (pathname.includes('/exams')) setActiveTab('EXAMS');
    else if (pathname.includes('/results')) setActiveTab('RESULTS');
    else if (pathname.includes('/profile')) setActiveTab('PROFILE');
    else setActiveTab('DASHBOARD');
  }, [pathname]);
  const [teacher, setTeacher] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Flow parameters
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [courses, setCourses] = React.useState<Course[]>([]);
  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [batches, setBatches] = React.useState<Batch[]>([]);

  // Selected flow targets
  const [selectedBranch, setSelectedBranch] = React.useState<Branch | null>(null);
  const [selectedCourse, setSelectedCourse] = React.useState<Course | null>(null);
  const [selectedSubject, setSelectedSubject] = React.useState<Subject | null>(null);
  const [selectedBatch, setSelectedBatch] = React.useState<Batch | null>(null);
  const [selectedDate, setSelectedDate] = React.useState(() => new Date().toISOString().substring(0, 10));

  // Search filter inside lists
  const [branchSearch, setBranchSearch] = React.useState('');
  const [courseSearch, setCourseSearch] = React.useState('');
  const [subjectSearch, setSubjectSearch] = React.useState('');
  const [batchSearch, setBatchSearch] = React.useState('');

  // Attendance target students
  const [students, setStudents] = React.useState<any[]>([]);
  const [attendanceSheet, setAttendanceSheet] = React.useState<Record<string, 'present' | 'absent'>>({});
  const [isSubmittingAttendance, setIsSubmittingAttendance] = React.useState(false);

  // Study Materials State
  const [materials, setMaterials] = React.useState<StudyMaterialItem[]>([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = React.useState(false);
  const [matTitle, setMatTitle] = React.useState('');
  const [matDescription, setMatDescription] = React.useState('');
  const [matSubjectId, setMatSubjectId] = React.useState('');
  const [matType, setMatType] = React.useState<'pdf' | 'notes' | 'link' | 'youtube'>('pdf');
  const [matUrl, setMatUrl] = React.useState('');
  const [matBatchIds, setMatBatchIds] = React.useState<string[]>([]);
  const [isSubmittingMaterial, setIsSubmittingMaterial] = React.useState(false);

  // File Upload State
  const [uploadSource, setUploadSource] = React.useState<'file' | 'url'>('file');
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [fileError, setFileError] = React.useState<string | null>(null);

  // Assignments State
  const [assignments, setAssignments] = React.useState<AssignmentItem[]>([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = React.useState(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = React.useState(false);
  const [asgTitle, setAsgTitle] = React.useState('');
  const [asgDescription, setAsgDescription] = React.useState('');
  const [asgSubjectId, setAsgSubjectId] = React.useState('');
  const [asgBatchId, setAsgBatchId] = React.useState('');
  const [asgMaxMarks, setAsgMaxMarks] = React.useState('100');
  const [asgDueDate, setAsgDueDate] = React.useState(() => new Date(Date.now() + 7 * 86400000).toISOString().substring(0, 10));
  const [isSubmittingAssignment, setIsSubmittingAssignment] = React.useState(false);

  const fetchTeacherProfile = React.useCallback(async () => {
    setIsLoading(true);
    try {
      let token = '';
      if (typeof window !== 'undefined') {
        const nameEQ = 'mock-auth-token=';
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
          let c = ca[i].trim();
          if (c.indexOf(nameEQ) === 0) {
            token = c.substring(nameEQ.length, c.length);
            break;
          }
        }
        if (!token || token === 'null' || token === 'undefined') {
          token = localStorage.getItem('auth-token') || '';
        }
        if (!token || token === 'null' || token === 'undefined') {
          try {
            const authUserStr = localStorage.getItem('auth-user');
            if (authUserStr) {
              const parsed = JSON.parse(authUserStr);
              token = parsed.token || '';
            }
          } catch (e) {}
        }
      }

      const res = await fetch(`${API_BASE_URL}/teachers/profile/me`, {
        headers: { 
          'Authorization': token ? `Bearer ${token}` : '', 
          'X-Academy-Subdomain': getSubdomain()
        }
      });
      const body = await res.json();
      if (!res.ok || !body.success || !body.data) {
        throw new Error(body.error?.message || 'Could not resolve teacher profile.');
      }
      
      setTeacher(body.data);

      // Load branch lists
      const resBranches = await branchService.findAll('', 'active', 1, 100);
      setBranches(resBranches.branches || []);
    } catch (err: any) {
      console.error('Failed to load teacher profile:', err);
      const storedUserStr = typeof window !== 'undefined' ? localStorage.getItem('auth-user') : null;
      let storedUser: any = null;
      try {
        if (storedUserStr) storedUser = JSON.parse(storedUserStr);
      } catch (e) {}

      setTeacher({
        id: storedUser?.id || '',
        employeeNumber: storedUser?.id ? `TCH-${storedUser.id.substring(0, 6).toUpperCase()}` : 'TCH-001',
        designation: 'Faculty',
        qualification: 'Not specified',
        joiningDate: null,
        status: 'active',
        user: {
          firstName: storedUser?.firstName || 'Faculty',
          lastName: storedUser?.lastName || 'Member',
          email: storedUser?.email || '',
          phone: storedUser?.phone || '',
        },
        teacherSubjects: [],
        schedules: [],
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchMaterials = React.useCallback(async () => {
    try {
      const res = await lmsService.findAllMaterials({ limit: 100 });
      setMaterials(res.materials);
    } catch (err) {
      console.error('Failed to load study materials:', err);
    }
  }, []);

  React.useEffect(() => {
    fetchTeacherProfile();
    fetchMaterials();
  }, [fetchTeacherProfile, fetchMaterials]);

  // Handle flow cascade selections: Branch -> Course -> Subject -> Batch -> Date -> Mark Attendance
  const handleSelectBranch = async (branch: Branch) => {
    setSelectedBranch(branch);
    setSelectedCourse(null);
    setSelectedSubject(null);
    setSelectedBatch(null);
    setSubjects([]);
    setBatches([]);
    setStudents([]);
    try {
      const res = await courseService.findAll('', branch.id, 'active', 1, 100);
      setCourses(res.courses);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectCourse = async (course: Course) => {
    if (!selectedBranch) return;
    setSelectedCourse(course);
    setSelectedSubject(null);
    setSelectedBatch(null);
    setBatches([]);
    setStudents([]);
    try {
      const subs = await subjectService.findAll(course.id);
      setSubjects(subs);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectSubject = async (subject: Subject) => {
    if (!selectedBranch || !selectedCourse) return;
    setSelectedSubject(subject);
    setSelectedBatch(null);
    setStudents([]);
    try {
      const res = await batchService.findAll('', selectedBranch.id, selectedCourse.id, 'active', 1, 100);
      setBatches(res.batches);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectBatch = async (batch: Batch) => {
    setSelectedBatch(batch);
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('mock-auth-token='))?.split('=')[1] || localStorage.getItem('auth-token') || '';
      const res = await fetch(`${API_BASE_URL}/students?batchId=${batch.id}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'X-Academy-Subdomain': getSubdomain() }
      });
      const body = await res.json();
      if (body.success) {
        const studentList = body.data.students || [];
        setStudents(studentList);
        
        // Initialize attendance sheet
        const sheet: Record<string, 'present' | 'absent'> = {};
        studentList.forEach((s: any) => {
          sheet[s.id] = 'present';
        });
        setAttendanceSheet(sheet);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleAttendanceStatus = (studentId: string, status: 'present' | 'absent') => {
    setAttendanceSheet(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const handleMarkAllPresent = () => {
    const sheet: Record<string, 'present' | 'absent'> = {};
    students.forEach((s: any) => {
      sheet[s.id] = 'present';
    });
    setAttendanceSheet(sheet);
    toast('Batch marked', 'All students initialized to present.', 'success');
  };

  const handleSubmitAttendance = async () => {
    if (!selectedBatch || !selectedSubject) {
      toast('Validation Error', 'Subject and Batch must be selected.', 'error');
      return;
    }
    setIsSubmittingAttendance(true);
    try {
      const recordsArray = Object.entries(attendanceSheet).map(([studentId, status]) => ({
        studentId,
        status
      }));

      await attendanceService.submitStudentAttendance({
        batchId: selectedBatch.id,
        subjectId: selectedSubject.id,
        date: selectedDate,
        records: recordsArray,
      });

      toast('Rollcall Completed', `Successfully logged attendance for ${selectedSubject.name} (${recordsArray.length} students).`, 'success');
    } catch (err: any) {
      toast('Submission failed', err.message || 'Server error', 'error');
    } finally {
      setIsSubmittingAttendance(false);
    }
  };

  const handleFileSelect = (file: File | null) => {
    if (!file) {
      setSelectedFile(null);
      setFileError(null);
      return;
    }

    const maxMB = 50;
    if (file.size > maxMB * 1024 * 1024) {
      const err = `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum limit of ${maxMB}MB.`;
      setFileError(err);
      toast('File Too Large', err, 'error');
      return;
    }

    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const allowed = ['.pdf', '.ppt', '.pptx', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.png', '.jpg', '.jpeg'];
    if (!allowed.includes(ext)) {
      const err = `File type "${ext}" is not supported. Supported formats: PDF, PPT, PPTX, DOC, DOCX, XLS, XLSX, TXT, PNG, JPG.`;
      setFileError(err);
      toast('Unsupported File', err, 'error');
      return;
    }

    setFileError(null);
    setSelectedFile(file);

    // Auto-derive title if empty
    if (!matTitle.trim()) {
      const baseName = file.name.substring(0, file.name.lastIndexOf('.'));
      const formattedTitle = baseName
        .replace(/[-_]/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
      setMatTitle(formattedTitle);
    }

    // Infer material type
    if (['.ppt', '.pptx', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.png', '.jpg', '.jpeg'].includes(ext)) {
      setMatType('notes');
    } else if (ext === '.pdf') {
      setMatType('pdf');
    }
  };

  const handleCreateMaterialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (uploadSource === 'file') {
      if (!selectedFile) {
        toast('Validation Error', 'Please select a file from your computer.', 'error');
        return;
      }
      if (!matTitle.trim()) {
        toast('Validation Error', 'Title is required.', 'error');
        return;
      }

      setIsSubmittingMaterial(true);
      try {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('title', matTitle.trim());
        if (matDescription) formData.append('description', matDescription.trim());
        if (matSubjectId) formData.append('subjectId', matSubjectId);
        formData.append('materialType', matType);
        formData.append('accessLevel', (matBatchIds && matBatchIds.length > 0) ? 'batch_only' : 'registered');
        if (matBatchIds && matBatchIds.length > 0) {
          formData.append('batchIds', JSON.stringify(matBatchIds));
        }

        await lmsService.uploadMaterialFile(formData);
        toast('Success', 'Study Material file uploaded to storage and published successfully!', 'success');
        setIsUploadModalOpen(false);
        setMatTitle('');
        setMatDescription('');
        setMatUrl('');
        setSelectedFile(null);
        setFileError(null);
        fetchMaterials();
      } catch (err: any) {
        toast('Upload Failed', err.message || 'Could not upload study material file.', 'error');
      } finally {
        setIsSubmittingMaterial(false);
      }
    } else {
      if (!matTitle.trim()) {
        toast('Validation Error', 'Title is required.', 'error');
        return;
      }
      if (!matUrl.trim()) {
        toast('Validation Error', 'Resource URL is required for external link mode.', 'error');
        return;
      }

      setIsSubmittingMaterial(true);
      try {
        await lmsService.createMaterial({
          title: matTitle.trim(),
          description: matDescription || undefined,
          subjectId: matSubjectId || undefined,
          materialType: matType,
          url: matUrl.trim(),
          accessLevel: (matBatchIds && matBatchIds.length > 0) ? 'batch_only' : 'registered',
          batchIds: matBatchIds,
        });
        toast('Success', 'Study Material link published.', 'success');
        setIsUploadModalOpen(false);
        setMatTitle('');
        setMatDescription('');
        setMatUrl('');
        setSelectedFile(null);
        fetchMaterials();
      } catch (err: any) {
        toast('Publish Failed', err.message || 'Could not save study material.', 'error');
      } finally {
        setIsSubmittingMaterial(false);
      }
    }
  };

  const handleOpenUploadModal = async () => {
    setIsUploadModalOpen(true);
    setUploadSource('file');
    setSelectedFile(null);
    setFileError(null);
    try {
      const resCourses = await courseService.findAll('', '', 'active', 1, 100);
      if (resCourses.courses.length > 0) {
        const allSubs = await Promise.all(resCourses.courses.map(c => subjectService.findAll(c.id)));
        setSubjects(allSubs.flat());
      }
    } catch (err) {
      console.error('Failed to load subjects list:', err);
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    try {
      await lmsService.removeMaterial(id);
      toast('Deleted', 'Study Material removed.', 'success');
      fetchMaterials();
    } catch (err: any) {
      toast('Delete Failed', err.message || 'Server error', 'error');
    }
  };

  const fetchAssignments = React.useCallback(async () => {
    setIsLoadingAssignments(true);
    try {
      const res = await assignmentService.findAllAssignments({ 
        batchId: selectedBatch?.id, 
        subjectId: selectedSubject?.id 
      });
      setAssignments(res);
    } catch (err) {
      console.error('Error fetching assignments:', err);
    } finally {
      setIsLoadingAssignments(false);
    }
  }, [selectedBatch, selectedSubject]);

  React.useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const handleOpenAssignmentModal = async () => {
    setIsAssignmentModalOpen(true);
    try {
      const resCourses = await courseService.findAll('', '', 'active', 1, 100);
      if (resCourses.courses.length > 0) {
        const allSubs = await Promise.all(resCourses.courses.map(c => subjectService.findAll(c.id)));
        setSubjects(allSubs.flat());
      }
      if (selectedBranch) {
        const resBatches = await batchService.findAll('', selectedBranch.id, '', 'active', 1, 100);
        setBatches(resBatches.batches);
      }
    } catch (err) {
      console.error('Failed to load modal details:', err);
    }
  };

  const handleCreateAssignmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asgTitle.trim() || !asgSubjectId || !asgBatchId) {
      toast('Validation Error', 'Title, Subject, and Batch are required.', 'error');
      return;
    }
    setIsSubmittingAssignment(true);
    try {
      await assignmentService.createAssignment({
        title: asgTitle,
        description: asgDescription || undefined,
        subjectId: asgSubjectId,
        batchId: asgBatchId,
        maxMarks: parseFloat(asgMaxMarks) || 100,
        dueDate: asgDueDate,
      });
      toast('Success', 'Assignment task created and published.', 'success');
      setIsAssignmentModalOpen(false);
      setAsgTitle('');
      setAsgDescription('');
      fetchAssignments();
    } catch (err: any) {
      toast('Creation Failed', err.message || 'Could not save assignment.', 'error');
    } finally {
      setIsSubmittingAssignment(false);
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    try {
      await assignmentService.removeAssignment(id);
      toast('Deleted', 'Assignment task removed.', 'success');
      fetchAssignments();
    } catch (err: any) {
      toast('Delete Failed', err.message || 'Server error', 'error');
    }
  };

  const filteredBranches = branches.filter(b => b.name.toLowerCase().includes(branchSearch.toLowerCase()));
  const filteredCourses = courses.filter(c => c.name.toLowerCase().includes(courseSearch.toLowerCase()));
  const filteredSubjects = subjects.filter(s => s.name.toLowerCase().includes(subjectSearch.toLowerCase()));
  const filteredBatches = batches.filter(b => b.name.toLowerCase().includes(batchSearch.toLowerCase()));

  if (isLoading) {
    return (
      <div className="p-16 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <p className="text-sm font-semibold text-zinc-500 animate-pulse">Loading Teacher Portal...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in select-none">
      
      {/* Header welcome banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Welcome back, {teacher?.user?.firstName || 'Faculty Member'}!
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 font-semibold mt-0.5">
            Employee Code: {teacher?.employeeNumber || 'TCH-001'} • Designation: {teacher?.designation || 'Lecturer'}
          </p>
        </div>
        <Button variant="secondary" onClick={fetchTeacherProfile} className="h-10 gap-1.5 shrink-0 cursor-pointer">
          <RefreshCw className="w-4 h-4" /> Refresh Portal
        </Button>
      </div>

      {/* Tabs navigation bar */}
      <div className="flex flex-nowrap sm:flex-wrap gap-2 border-b border-border pb-2 overflow-x-auto scrollbar-none">
        {[
          { id: 'DASHBOARD', label: 'Overview', icon: <ClipboardList className="w-4 h-4" /> },
          { id: 'STUDENTS', label: 'Students Roster', icon: <Users className="w-4 h-4" /> },
          { id: 'ATTENDANCE', label: 'Mark Attendance', icon: <Calendar className="w-4 h-4" /> },
          { id: 'ASSIGNMENTS', label: 'Assignments', icon: <FileSpreadsheet className="w-4 h-4" /> },
          { id: 'MATERIALS', label: 'Study Notes', icon: <FileText className="w-4 h-4" /> },
          { id: 'VIDEOS', label: 'Video Classes', icon: <Video className="w-4 h-4" /> },
          { id: 'EXAMS', label: 'Exams & Grading', icon: <Award className="w-4 h-4" /> },
          { id: 'PROFILE', label: 'My Profile', icon: <User className="w-4 h-4" /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TeacherTab)}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl border transition-all cursor-pointer shrink-0 whitespace-nowrap ${
              activeTab === tab.id 
                ? 'border-primary bg-primary/5 text-primary' 
                : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
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
              title="Assigned Batches"
              value={`${teacher?.schedules?.length || 0} Schedules`}
              description="Active academic class cohorts"
              icon={<Layers className="w-5 h-5 text-primary" />}
            />
            <StatsCard
              title="Operational Branch"
              value={teacher?.branch?.name || 'Not assigned'}
              description={teacher?.branch?.code || 'N/A'}
              icon={<Clock className="w-5 h-5 text-primary" />}
            />
            <StatsCard
              title="Qualification"
              value={teacher?.qualification || 'Not specified'}
              description="Verified Profile"
              icon={<Award className="w-5 h-5 text-primary" />}
            />
            <StatsCard
              title="Status"
              value={teacher?.status === 'active' ? 'Active' : 'Inactive'}
              description="Operational Status"
              icon={<Users className="w-5 h-5 text-primary" />}
            />
          </div>

          {/* Assigned Subjects & Batches */}
          <Card className="space-y-4 border border-slate-200 bg-white">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-black text-slate-950">Assigned Subjects & Batches</h3>
              </div>
              <Badge variant="neutral">
                {teacher?.teacherSubjects?.length || 0} Mapped Subject(s)
              </Badge>
            </div>

            {(!teacher?.teacherSubjects || teacher.teacherSubjects.length === 0) ? (
              <div className="p-4 text-center border border-slate-200 rounded-xl bg-slate-50 text-xs font-bold text-slate-400 italic">
                No active subjects or batches mapped to your profile.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {teacher.teacherSubjects.map((ts: any) => (
                  <div key={ts.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-1">
                    <span className="text-xs font-black text-slate-950 block">{ts.subject?.name} ({ts.subject?.code})</span>
                    <span className="text-[11px] text-slate-600 font-bold block">Course: {ts.course?.name}</span>
                    <span className="text-[11px] text-indigo-700 font-extrabold block">Batch: {ts.batch?.name}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border/80">
                <Bell className="w-4 h-4 text-zinc-400" />
                <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Academy Timetable & Schedules</h3>
              </div>
              <div className="space-y-3">
                {teacher.schedules?.map((sched: any) => (
                  <div key={sched.id} className="p-4 rounded-xl border border-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 text-primary rounded-lg">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col text-xs font-semibold">
                        <span>{sched.subject?.name}</span>
                        <span className="text-zinc-400">Batch: {sched.batch?.name}</span>
                      </div>
                    </div>
                    <Badge variant="neutral" className="font-mono">
                      {sched.dayOfWeek} {sched.startTime.substring(0, 5)} - {sched.endTime.substring(0, 5)}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border/80">
                <Bell className="w-4 h-4 text-zinc-400" />
                <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">System Bulletins</h3>
              </div>
              <div className="space-y-3 text-xs text-zinc-500 font-semibold">
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100 block mb-1">Subject-wise Attendance Enforcement</span>
                  Ensure exact Subject is selected during rollcall logging to populate student subject percentages.
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* SECTION 2: PROFILE */}
      {activeTab === 'PROFILE' && teacher && (
        <Card className="space-y-6">
          <div className="flex gap-4 items-center p-4 bg-zinc-50 dark:bg-zinc-900/60 rounded-2xl border border-border">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-xl font-bold uppercase shrink-0">
              {(teacher.user?.firstName || 'F')[0]}{(teacher.user?.lastName || 'M')[0]}
            </div>
            <div>
              <span className="text-base font-bold text-zinc-950 dark:text-zinc-50 block">
                {teacher.user?.firstName || 'Faculty'} {teacher.user?.lastName || 'Member'}
              </span>
              <span className="text-xs text-zinc-400 block mt-0.5">{teacher.user?.email || 'N/A'}</span>
            </div>
          </div>

          <div className="space-y-3">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Employment Record
            </span>
            <div className="grid grid-cols-2 gap-4 text-xs font-semibold bg-card p-4 rounded-xl border border-border">
              <div className="text-zinc-500">Designation: <span className="text-zinc-900 dark:text-zinc-100 block mt-0.5">{teacher.designation || 'Lecturer'}</span></div>
              <div className="text-zinc-500">Qualification: <span className="text-zinc-900 dark:text-zinc-100 block mt-0.5">{teacher.qualification || 'M.Tech'}</span></div>
              <div className="text-zinc-500">Employee Number: <span className="text-zinc-900 dark:text-zinc-100 block mt-0.5">{teacher.employeeNumber || 'TCH-2026-001'}</span></div>
              <div className="text-zinc-500">Joining Date: <span className="text-zinc-900 dark:text-zinc-100 block mt-0.5">{teacher.joiningDate ? new Date(teacher.joiningDate).toLocaleDateString() : 'N/A'}</span></div>
            </div>
          </div>
        </Card>
      )}

      {/* SECTION 3: MARK ATTENDANCE FLOW (Branch -> Course -> Subject -> Batch -> Date -> Mark Attendance) */}
      {activeTab === 'ATTENDANCE' && (
        <div className="space-y-6">
          
          {/* STEP 1: Branch, Course, Subject, Batch & Date choices grid */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Branch select */}
            <div className="flex flex-col gap-1.5 w-full bg-card p-4 border border-border rounded-2xl">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">1. Branch</label>
              <input
                type="text"
                placeholder="Search..."
                value={branchSearch}
                onChange={(e) => setBranchSearch(e.target.value)}
                className="w-full h-8 px-2 border border-border rounded-lg text-xs bg-background"
                disabled={!!selectedBatch}
              />
              <div className="flex flex-col gap-1 max-h-36 overflow-y-auto mt-2">
                {filteredBranches.map(b => (
                  <button
                    key={b.id}
                    onClick={() => handleSelectBranch(b)}
                    className={`px-3 py-2 text-left text-xs font-semibold rounded-lg ${
                      selectedBranch?.id === b.id 
                        ? 'bg-primary/5 text-primary border border-primary/20' 
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/60'
                    }`}
                    disabled={!!selectedBatch}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Course select */}
            <div className="flex flex-col gap-1.5 w-full bg-card p-4 border border-border rounded-2xl">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">2. Course</label>
              <input
                type="text"
                placeholder="Search..."
                value={courseSearch}
                onChange={(e) => setCourseSearch(e.target.value)}
                className="w-full h-8 px-2 border border-border rounded-lg text-xs bg-background"
                disabled={!selectedBranch || !!selectedBatch}
              />
              <div className="flex flex-col gap-1 max-h-36 overflow-y-auto mt-2">
                {filteredCourses.map(c => (
                  <button
                    key={c.id}
                    onClick={() => handleSelectCourse(c)}
                    className={`px-3 py-2 text-left text-xs font-semibold rounded-lg ${
                      selectedCourse?.id === c.id 
                        ? 'bg-primary/5 text-primary border border-primary/20' 
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/60'
                    }`}
                    disabled={!!selectedBatch}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Subject select */}
            <div className="flex flex-col gap-1.5 w-full bg-card p-4 border border-border rounded-2xl">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">3. Subject</label>
              <input
                type="text"
                placeholder="Search..."
                value={subjectSearch}
                onChange={(e) => setSubjectSearch(e.target.value)}
                className="w-full h-8 px-2 border border-border rounded-lg text-xs bg-background"
                disabled={!selectedCourse || !!selectedBatch}
              />
              <div className="flex flex-col gap-1 max-h-36 overflow-y-auto mt-2">
                {filteredSubjects.map(s => (
                  <button
                    key={s.id}
                    onClick={() => handleSelectSubject(s)}
                    className={`px-3 py-2 text-left text-xs font-semibold rounded-lg ${
                      selectedSubject?.id === s.id 
                        ? 'bg-primary/5 text-primary border border-primary/20' 
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/60'
                    }`}
                    disabled={!!selectedBatch}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Batch select */}
            <div className="flex flex-col gap-1.5 w-full bg-card p-4 border border-border rounded-2xl">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">4. Batch</label>
              <input
                type="text"
                placeholder="Search..."
                value={batchSearch}
                onChange={(e) => setBatchSearch(e.target.value)}
                className="w-full h-8 px-2 border border-border rounded-lg text-xs bg-background"
                disabled={!selectedSubject || !!selectedBatch}
              />
              <div className="flex flex-col gap-1 max-h-36 overflow-y-auto mt-2">
                {filteredBatches.map(b => (
                  <button
                    key={b.id}
                    onClick={() => handleSelectBatch(b)}
                    className={`px-3 py-2 text-left text-xs font-semibold rounded-lg ${
                      selectedBatch?.id === b.id 
                        ? 'bg-primary/5 text-primary border border-primary/20' 
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/60'
                    }`}
                    disabled={!!selectedBatch}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Date select */}
            <div className="flex flex-col gap-1.5 w-full bg-card p-4 border border-border rounded-2xl justify-between">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">5. Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full h-10 px-3 border border-border rounded-xl text-xs bg-background focus:ring-2 focus:ring-primary font-semibold"
                  disabled={!!selectedBatch}
                />
              </div>
              {selectedBatch && (
                <Button variant="secondary" onClick={() => { setSelectedBatch(null); setStudents([]); }} className="h-9 w-full text-xs">
                  Reset Selection
                </Button>
              )}
            </div>
          </div>

          {/* STEP 2: Render attendance rollcall spreadsheet */}
          {selectedBatch && selectedSubject && students.length > 0 && (
            <Card className="overflow-hidden border border-border space-y-4">
              <div className="flex justify-between items-center p-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <Badge variant="success">Rollcall Active</Badge>
                  <span className="text-xs text-zinc-400 font-semibold">Subject: {selectedSubject.name} • Cohort: {selectedBatch.name} • Date: {selectedDate}</span>
                </div>
                <Button variant="secondary" onClick={handleMarkAllPresent} className="h-8 text-xs">
                  Mark All Present
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-zinc-50/50 dark:bg-zinc-900/50 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      <th className="px-6 py-4">Student</th>
                      <th className="px-6 py-4">Adm Code</th>
                      <th className="px-6 py-4 text-center">Status Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-medium text-zinc-700 dark:text-zinc-300">
                    {students.map((student) => (
                      <tr key={student.id} className="hover:bg-zinc-50/40 dark:hover:bg-zinc-900/10">
                        <td className="px-6 py-4">{student.firstName} {student.lastName}</td>
                        <td className="px-6 py-4 font-mono font-bold text-xs">{student.admissionNumber}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-4">
                            <button
                              type="button"
                              onClick={() => toggleAttendanceStatus(student.id, 'present')}
                              className={`p-2 rounded-xl border flex items-center gap-1 text-xs cursor-pointer ${
                                attendanceSheet[student.id] === 'present'
                                  ? 'border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 font-bold'
                                  : 'border-border text-zinc-400'
                              }`}
                            >
                              <CheckCircle className="w-4 h-4" /> Present
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleAttendanceStatus(student.id, 'absent')}
                              className={`p-2 rounded-xl border flex items-center gap-1 text-xs cursor-pointer ${
                                attendanceSheet[student.id] === 'absent'
                                  ? 'border-rose-500 bg-rose-50 text-rose-600 dark:bg-rose-950/20 font-bold'
                                  : 'border-border text-zinc-400'
                              }`}
                            >
                              <XCircle className="w-4 h-4" /> Absent
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="px-6 py-4 border-t border-border flex justify-end">
                <Button onClick={handleSubmitAttendance} disabled={isSubmittingAttendance}>
                  {isSubmittingAttendance ? 'Logging Rollcall...' : 'Submit Subject Attendance'}
                </Button>
              </div>
            </Card>
          )}

        </div>
      )}

      {/* SECTION 4: STUDENTS LIST */}
      {activeTab === 'STUDENTS' && (
        <Card className="space-y-4">
          <div>
            <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50">Students List Roster</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Filter cohort groups and browse student records.</p>
          </div>

          <div className="flex gap-4">
            <select
              value={selectedBatch?.id || ''}
              onChange={(e) => {
                const batch = batches.find(b => b.id === e.target.value);
                if (batch) handleSelectBatch(batch);
              }}
              className="h-10 rounded-xl border border-border bg-card px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer w-full max-w-xs"
            >
              <option value="">Choose Cohort...</option>
              {batches.map((b: any) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <table className="w-full border-collapse text-left text-sm mt-4">
            <thead>
              <tr className="border-b border-border bg-zinc-50/50 dark:bg-zinc-900/50 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Adm Code</th>
                <th className="px-6 py-4">Contact Phone</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-medium text-zinc-700 dark:text-zinc-300">
              {students.map((student) => (
                <tr key={student.id} className="hover:bg-zinc-50/40 dark:hover:bg-zinc-900/10">
                  <td className="px-6 py-4">{student.firstName} {student.lastName}</td>
                  <td className="px-6 py-4 font-mono font-bold text-xs">{student.admissionNumber}</td>
                  <td className="px-6 py-4 text-xs text-zinc-500">{student.phone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* SECTION 5: STUDY MATERIALS MANAGEMENT */}
      {activeTab === 'MATERIALS' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50">Subject Study Materials</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Upload PDFs, lecture notes, external resources, or YouTube links for assigned subjects.</p>
            </div>
            <Button onClick={handleOpenUploadModal} className="gap-2 h-10">
              <Plus className="w-4 h-4" /> Add Study Material
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {materials.map(mat => (
              <Card key={mat.id} className="p-4 border border-border space-y-3 relative hover:border-primary transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      {mat.materialType === 'youtube' ? <Video className="w-5 h-5 text-rose-500" /> :
                       mat.materialType === 'link' ? <Link className="w-5 h-5 text-blue-500" /> :
                       mat.materialType === 'notes' ? <Book className="w-5 h-5 text-amber-500" /> :
                       <FileText className="w-5 h-5" />}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block line-clamp-1">{mat.title}</span>
                      <span className="text-[10px] text-zinc-400 block font-semibold uppercase">{mat.subject?.name || 'General'}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteMaterial(mat.id)}
                    className="text-zinc-400 hover:text-rose-500 p-1 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {mat.description && <p className="text-xs text-zinc-500 line-clamp-2">{mat.description}</p>}
                
                {mat.mediaFile && (
                  <div className="p-2 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-border/60 text-[11px] font-medium space-y-0.5">
                    <div className="flex items-center justify-between text-zinc-700 dark:text-zinc-300 font-semibold truncate">
                      <span className="truncate">{mat.mediaFile.originalFilename}</span>
                    </div>
                    <div className="text-[10px] text-zinc-400 font-mono">
                      {(Number(mat.mediaFile.fileSize) / (1024 * 1024)).toFixed(2)} MB • Storage Object
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2 border-t border-border/80">
                  <Badge variant="neutral" className="text-[10px] uppercase font-mono">{mat.materialType}</Badge>
                  {mat.url && (
                    <a href={mat.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary font-bold hover:underline flex items-center gap-1">
                      Open Resource
                    </a>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* ADD MATERIAL MODAL */}
          {isUploadModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs">
              <Card className="w-full max-w-lg p-4 sm:p-6 relative border border-border shadow-xl space-y-4 sm:space-y-5 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center border-b border-border pb-3">
                  <div>
                    <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50">Upload Study Material</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">Publish PDF, PPT, DOC, XLS, images or external links for your cohort.</p>
                  </div>
                  <button 
                    onClick={() => setIsUploadModalOpen(false)}
                    className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Source Selection Toggle (Upload File vs External Link) */}
                <div className="grid grid-cols-2 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl gap-1 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setUploadSource('file')}
                    className={`py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      uploadSource === 'file'
                        ? 'bg-card text-primary shadow-xs border border-border'
                        : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    <UploadCloud className="w-4 h-4" /> Local File Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadSource('url')}
                    className={`py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      uploadSource === 'url'
                        ? 'bg-card text-primary shadow-xs border border-border'
                        : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    <Link className="w-4 h-4" /> External / Video Link
                  </button>
                </div>

                <form onSubmit={handleCreateMaterialSubmit} className="space-y-4">
                  {/* Mode 1: Local File Picker & Drag-and-Drop Dropzone */}
                  {uploadSource === 'file' && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block">
                        Select Local File <span className="text-rose-500">*</span>
                      </label>

                      {selectedFile ? (
                        /* Selected File Card Preview */
                        <div className="p-4 border-2 border-primary/40 bg-primary/5 rounded-2xl flex items-center justify-between relative group">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                              {selectedFile.name.endsWith('.pdf') ? <FileText className="w-5 h-5 text-rose-500" /> :
                               selectedFile.name.endsWith('.ppt') || selectedFile.name.endsWith('.pptx') ? <Presentation className="w-5 h-5 text-orange-500" /> :
                               selectedFile.name.endsWith('.xls') || selectedFile.name.endsWith('.xlsx') ? <FileSpreadsheet className="w-5 h-5 text-emerald-500" /> :
                               selectedFile.name.match(/\.(png|jpg|jpeg)$/i) ? <ImageIcon className="w-5 h-5 text-purple-500" /> :
                               <FileCode className="w-5 h-5 text-blue-500" />}
                            </div>
                            <div className="truncate">
                              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block truncate">
                                {selectedFile.name}
                              </span>
                              <span className="text-[10px] font-mono text-zinc-500 font-semibold block">
                                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {selectedFile.type || 'Document'}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleFileSelect(null)}
                            className="p-1.5 rounded-xl bg-card border border-border text-zinc-400 hover:text-rose-500 hover:border-rose-300 transition-colors shrink-0 cursor-pointer"
                            title="Remove selected file"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        /* Drag & Drop File Picker Zone */
                        <div
                          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                          onDragLeave={() => setIsDragging(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDragging(false);
                            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                              handleFileSelect(e.dataTransfer.files[0]);
                            }
                          }}
                          className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
                            isDragging
                              ? 'border-primary bg-primary/10 scale-[1.01]'
                              : 'border-border hover:border-primary/60 bg-zinc-50/50 dark:bg-zinc-900/40'
                          }`}
                          onClick={() => {
                            const fileInput = document.getElementById('study-material-file-input');
                            if (fileInput) fileInput.click();
                          }}
                        >
                          <input
                            id="study-material-file-input"
                            type="file"
                            className="hidden"
                            accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.txt,.png,.jpg,.jpeg"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleFileSelect(e.target.files[0]);
                              }
                            }}
                          />
                          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-1">
                            <UploadCloud className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                              Click to browse or drag & drop file from computer
                            </p>
                            <p className="text-[11px] text-zinc-400 mt-1">
                              Supports PDF, PPT, PPTX, DOC, DOCX, XLS, XLSX, TXT, PNG, JPG (Max 50MB)
                            </p>
                          </div>
                        </div>
                      )}

                      {fileError && (
                        <p className="text-xs text-rose-500 font-semibold">{fileError}</p>
                      )}
                    </div>
                  )}

                  {/* Mode 2: Resource URL Input */}
                  {uploadSource === 'url' && (
                    <Input
                      label="Resource URL / File Link"
                      value={matUrl}
                      onChange={(e) => setMatUrl(e.target.value)}
                      placeholder="https://..."
                      required
                    />
                  )}

                  <Input
                    label="Material Title"
                    value={matTitle}
                    onChange={(e) => setMatTitle(e.target.value)}
                    required
                    placeholder="e.g. Physics Motion Chapter 1 Notes"
                  />

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Description (Optional)</label>
                    <textarea
                      value={matDescription}
                      onChange={(e) => setMatDescription(e.target.value)}
                      rows={2}
                      placeholder="Brief notes or summary of the material..."
                      className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Subject</label>
                      <select
                        value={matSubjectId}
                        onChange={(e) => setMatSubjectId(e.target.value)}
                        className="h-10 rounded-xl border border-border bg-card px-3 text-xs font-semibold"
                      >
                        <option value="">Select Subject</option>
                        {Array.from(new Map([...subjects, ...(teacher?.teacherSubjects?.map((ts: any) => ts.subject).filter(Boolean) || [])].map((s: any) => [s.id, s])).values()).map((s: any) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Material Type</label>
                      <select
                        value={matType}
                        onChange={(e) => setMatType(e.target.value as any)}
                        className="h-10 rounded-xl border border-border bg-card px-3 text-xs font-semibold"
                      >
                        <option value="pdf">PDF Document</option>
                        <option value="notes">Notes / Slides / Doc</option>
                        <option value="link">External Resource</option>
                        <option value="youtube">YouTube Video</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t border-border">
                    <Button variant="secondary" type="button" onClick={() => setIsUploadModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmittingMaterial} className="gap-2">
                      {isSubmittingMaterial ? (
                        <>
                          <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                          Uploading & Publishing...
                        </>
                      ) : (
                        'Publish Material'
                      )}
                    </Button>
                  </div>
                </form>
              </Card>
            </div>
          )}
        </div>
      )}
      {/* SECTION 6: ASSIGNMENTS MANAGEMENT */}
      {activeTab === 'ASSIGNMENTS' && (
        <div className="space-y-6">
          <Card className="space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-border">
              <div>
                <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50">Class Assignments & Submissions</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Publish assignments, evaluate student submissions, and assign scores.</p>
              </div>
              <Button onClick={handleOpenAssignmentModal} className="gap-2 h-10 cursor-pointer">
                <Plus className="w-4 h-4" /> Create Assignment
              </Button>
            </div>

            {isLoadingAssignments ? (
              <div className="p-12 text-center text-xs font-semibold text-zinc-400 animate-pulse">Loading assignments...</div>
            ) : assignments.length === 0 ? (
              <div className="p-12 text-center text-xs font-semibold text-zinc-400 space-y-1">
                <Book className="w-8 h-8 mx-auto text-zinc-300 mb-2" />
                <p className="text-zinc-600 dark:text-zinc-300 font-bold">No Assignments Found</p>
                <p>Click "Create Assignment" above to publish a new task for your students.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {assignments.map(asg => (
                  <div key={asg.id} className="p-4 border border-border rounded-xl space-y-3 bg-zinc-50/50 dark:bg-zinc-900/40">
                    <div className="flex justify-between items-start">
                      <div>
                        <Badge variant="primary" className="mb-1">{asg.subject?.name || 'Subject'}</Badge>
                        <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{asg.title}</h4>
                        <p className="text-xs text-zinc-400">Due: {new Date(asg.dueDate).toLocaleDateString()} • Batch: {asg.batch?.name || 'Batch'}</p>
                      </div>
                      <span className="text-xs font-mono font-bold text-primary">{asg._count?.submissions || 0} Submissions</span>
                    </div>
                    {asg.description && (
                      <p className="text-xs text-zinc-500 line-clamp-2">{asg.description}</p>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t border-border/60">
                      <span className="text-[10px] text-zinc-400 font-mono">Max Marks: {asg.maxMarks}</span>
                      <Button size="sm" variant="outline" onClick={() => handleDeleteAssignment(asg.id)} className="h-7 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 gap-1">
                        <Trash2 className="w-3 h-3" /> Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Modal: Create Assignment */}
          {isAssignmentModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <Card className="w-full max-w-lg p-4 sm:p-6 space-y-4 sm:space-y-5 bg-card border border-border shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center border-b border-border pb-3">
                  <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50">Publish New Assignment</h3>
                  <button onClick={() => setIsAssignmentModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                    ✕
                  </button>
                </div>

                <form onSubmit={handleCreateAssignmentSubmit} className="space-y-4">
                  <Input
                    label="Assignment Title *"
                    placeholder="e.g. Organic Chemistry Problem Set #1"
                    value={asgTitle}
                    onChange={(e) => setAsgTitle(e.target.value)}
                    required
                  />

                  <div>
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">Description / Instructions</label>
                    <textarea
                      className="w-full h-24 p-3 text-xs rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-hidden"
                      placeholder="Enter detailed problem set instructions..."
                      value={asgDescription}
                      onChange={(e) => setAsgDescription(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">Target Subject *</label>
                      <select
                        className="w-full h-10 px-3 text-xs rounded-xl border border-border bg-background"
                        value={asgSubjectId}
                        onChange={(e) => setAsgSubjectId(e.target.value)}
                        required
                      >
                        <option value="">Select Subject</option>
                        {subjects.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">Target Batch *</label>
                      <select
                        className="w-full h-10 px-3 text-xs rounded-xl border border-border bg-background"
                        value={asgBatchId}
                        onChange={(e) => setAsgBatchId(e.target.value)}
                        required
                      >
                        <option value="">Select Batch</option>
                        {batches.map(b => (
                          <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Max Marks *"
                      type="number"
                      value={asgMaxMarks}
                      onChange={(e) => setAsgMaxMarks(e.target.value)}
                      required
                    />
                    <Input
                      label="Due Date *"
                      type="date"
                      value={asgDueDate}
                      onChange={(e) => setAsgDueDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t border-border">
                    <Button variant="secondary" type="button" onClick={() => setIsAssignmentModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmittingAssignment}>
                      {isSubmittingAssignment ? 'Publishing...' : 'Publish Assignment'}
                    </Button>
                  </div>
                </form>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* SECTION 7: VIDEO CLASSES */}
      {activeTab === 'VIDEOS' && (
        <Card className="space-y-6">
          <div className="flex justify-between items-center pb-3 border-b border-border">
            <div>
              <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50">Video Classes & Recorded Lectures</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Manage recorded class streams and video resource links.</p>
            </div>
            <Button className="gap-2 h-10">
              <Plus className="w-4 h-4" /> Add Video Lecture
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 border border-border rounded-xl space-y-3 bg-card">
              <div className="w-full h-36 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center text-rose-500">
                <Video className="w-10 h-10" />
              </div>
              <div>
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">Data Structures: Trees & Graph Traversal</span>
                <span className="text-[10px] text-zinc-400 font-semibold block">Section: CSE-2026-A • Duration: 45 mins</span>
              </div>
            </div>
            <div className="p-4 border border-border rounded-xl space-y-3 bg-card">
              <div className="w-full h-36 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center text-rose-500">
                <Video className="w-10 h-10" />
              </div>
              <div>
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">DBMS: SQL Normalization & Indexing Lab</span>
                <span className="text-[10px] text-zinc-400 font-semibold block">Section: CSE-2026-B • Duration: 60 mins</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* SECTION 8: EXAMS & GRADING */}
      {activeTab === 'EXAMS' && (
        <Card className="space-y-6">
          <div className="flex justify-between items-center pb-3 border-b border-border">
            <div>
              <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50">Exams & Marks Entry</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Enter internal assessment marks, practical labs, and semester evaluations.</p>
            </div>
            <Button className="gap-2 h-10">
              <Plus className="w-4 h-4" /> Schedule Test Exam
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border border-border rounded-xl space-y-2">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Total Exams Conducted</span>
              <span className="text-2xl font-black text-zinc-900 dark:text-zinc-50">12 Tests</span>
            </div>
            <div className="p-4 border border-border rounded-xl space-y-2">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Average Batch Score</span>
              <span className="text-2xl font-black text-emerald-600">84.5 %</span>
            </div>
            <div className="p-4 border border-border rounded-xl space-y-2">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Pending Marks Entry</span>
              <span className="text-2xl font-black text-amber-500">1 Paper</span>
            </div>
          </div>
        </Card>
      )}

      {/* SECTION 9: TEACHER COURSE RESULTS */}
      {activeTab === 'RESULTS' && (
        <Card className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
            <div>
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50">Course Student Results</h3>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">View examination results and scorecards for all students enrolled in your assigned course.</p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-zinc-400">Assigned Course:</span>
              <select className="h-10 px-3 rounded-xl border border-border bg-background text-xs font-bold text-zinc-900 dark:text-zinc-100 cursor-pointer">
                <option value="c1">Grade 10 - Advanced Mathematics</option>
                <option value="c2">Grade 11 - Classical Physics</option>
              </select>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 border border-border rounded-xl space-y-1 bg-slate-50/50 dark:bg-zinc-800/40">
              <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block">Course Enrolled Students</span>
              <span className="text-xl font-black text-zinc-900 dark:text-zinc-50">5 Students</span>
            </div>
            <div className="p-4 border border-border rounded-xl space-y-1 bg-emerald-50/30 dark:bg-emerald-950/20">
              <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider block">Pass Rate</span>
              <span className="text-xl font-black text-emerald-600">80.0 %</span>
            </div>
            <div className="p-4 border border-border rounded-xl space-y-1 bg-blue-50/30 dark:bg-blue-950/20">
              <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider block">Course Average Marks</span>
              <span className="text-xl font-black text-blue-600">77.7 / 100</span>
            </div>
          </div>

          {/* Results Table */}
          <div className="overflow-x-auto border border-border rounded-2xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 dark:bg-zinc-800/60 border-b border-border text-zinc-700 dark:text-zinc-300 font-extrabold uppercase tracking-wider">
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Admission No</th>
                  <th className="py-3 px-4">Roll No</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4 text-center">Marks</th>
                  <th className="py-3 px-4 text-center">Grade</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-medium">
                <tr className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40">
                  <td className="py-3.5 px-4 font-bold text-zinc-900 dark:text-zinc-100">Priya Nair</td>
                  <td className="py-3.5 px-4 font-mono">HYV-2026-0002</td>
                  <td className="py-3.5 px-4 font-mono">10A-02</td>
                  <td className="py-3.5 px-4 text-indigo-600 font-semibold">Advanced Mathematics</td>
                  <td className="py-3.5 px-4 text-center font-bold">95.0 / 100</td>
                  <td className="py-3.5 px-4 text-center"><span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black">A+</span></td>
                  <td className="py-3.5 px-4 text-center"><Badge variant="success">Passed</Badge></td>
                </tr>
                <tr className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40">
                  <td className="py-3.5 px-4 font-bold text-zinc-900 dark:text-zinc-100">Rohan Sharma</td>
                  <td className="py-3.5 px-4 font-mono">HYV-2026-0003</td>
                  <td className="py-3.5 px-4 font-mono">10A-03</td>
                  <td className="py-3.5 px-4 text-indigo-600 font-semibold">Advanced Mathematics</td>
                  <td className="py-3.5 px-4 text-center font-bold">84.5 / 100</td>
                  <td className="py-3.5 px-4 text-center"><span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black">A</span></td>
                  <td className="py-3.5 px-4 text-center"><Badge variant="success">Passed</Badge></td>
                </tr>
                <tr className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40">
                  <td className="py-3.5 px-4 font-bold text-zinc-900 dark:text-zinc-100">Sneha Patel</td>
                  <td className="py-3.5 px-4 font-mono">HYV-2026-0006</td>
                  <td className="py-3.5 px-4 font-mono">10A-06</td>
                  <td className="py-3.5 px-4 text-indigo-600 font-semibold">Advanced Mathematics</td>
                  <td className="py-3.5 px-4 text-center font-bold">89.0 / 100</td>
                  <td className="py-3.5 px-4 text-center"><span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black">A</span></td>
                  <td className="py-3.5 px-4 text-center"><Badge variant="success">Passed</Badge></td>
                </tr>
                <tr className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40">
                  <td className="py-3.5 px-4 font-bold text-zinc-900 dark:text-zinc-100">Devendra Verma</td>
                  <td className="py-3.5 px-4 font-mono">HYV-2026-0004</td>
                  <td className="py-3.5 px-4 font-mono">10A-04</td>
                  <td className="py-3.5 px-4 text-indigo-600 font-semibold">Advanced Mathematics</td>
                  <td className="py-3.5 px-4 text-center font-bold">78.0 / 100</td>
                  <td className="py-3.5 px-4 text-center"><span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black">B</span></td>
                  <td className="py-3.5 px-4 text-center"><Badge variant="success">Passed</Badge></td>
                </tr>
                <tr className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40">
                  <td className="py-3.5 px-4 font-bold text-zinc-900 dark:text-zinc-100">Kiran Reddy</td>
                  <td className="py-3.5 px-4 font-mono">HYV-2026-0005</td>
                  <td className="py-3.5 px-4 font-mono">10A-05</td>
                  <td className="py-3.5 px-4 text-indigo-600 font-semibold">Advanced Mathematics</td>
                  <td className="py-3.5 px-4 text-center font-bold">42.0 / 100</td>
                  <td className="py-3.5 px-4 text-center"><span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black">F</span></td>
                  <td className="py-3.5 px-4 text-center"><Badge variant="error">Failed</Badge></td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}

    </div>
  );
}
