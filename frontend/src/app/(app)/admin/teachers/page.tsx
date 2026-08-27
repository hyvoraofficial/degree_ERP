'use client';

import * as React from 'react';
import { 
  Plus, Search, Edit2, Trash2, RefreshCw, X, ShieldAlert, Users, Layers, Book, MapPin, AlertTriangle, Key, Copy, CheckCircle, Check, Eye 
} from 'lucide-react';
import { teacherService, Teacher } from '@/services/teacher.service';
import { subjectService, TeacherAssignment, Subject } from '@/services/subject.service';
import { branchService, Branch } from '@/services/branch.service';
import { courseService, Course } from '@/services/course.service';
import { batchService, Batch } from '@/services/batch.service';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/providers/ToastProvider';
import { useBranchContext } from '@/providers/BranchProvider';

type TeachersTab = 'ROSTER' | 'ASSIGNMENTS';

export default function TeachersAdminPage() {
  const { toast } = useToast();
  const { selectedBranchId: globalBranchId } = useBranchContext();

  const [activeTab, setActiveTab] = React.useState<TeachersTab>('ROSTER');
  const [teachers, setTeachers] = React.useState<Teacher[]>([]);
  const [assignments, setAssignments] = React.useState<TeacherAssignment[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');

  // Dropdown lists for assignments
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [courses, setCourses] = React.useState<Course[]>([]);
  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [batches, setBatches] = React.useState<Batch[]>([]);

  // Selected assignment targets
  const [selectedTeacherId, setSelectedTeacherId] = React.useState('');
  const [selectedBranchId, setSelectedBranchId] = React.useState('');
  const [selectedCourseId, setSelectedCourseId] = React.useState('');
  const [selectedSubjectId, setSelectedSubjectId] = React.useState('');
  const [selectedBatchId, setSelectedBatchId] = React.useState('');

  // Modals state
  const [isAssignModalOpen, setIsAssignModalOpen] = React.useState(false);
  const [isDeleteAssignmentOpen, setIsDeleteAssignmentOpen] = React.useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = React.useState<TeacherAssignment | null>(null);

  // Teacher deletion modal
  const [isDeleteTeacherOpen, setIsDeleteTeacherOpen] = React.useState(false);
  const [teacherToDelete, setTeacherToDelete] = React.useState<Teacher | null>(null);

  // New Teacher Modal states
  const [isNewTeacherModalOpen, setIsNewTeacherModalOpen] = React.useState(false);
  const [newTeacherFirstName, setNewTeacherFirstName] = React.useState('');
  const [newTeacherLastName, setNewTeacherLastName] = React.useState('');
  const [newTeacherEmail, setNewTeacherEmail] = React.useState('');
  const [newTeacherPhone, setNewTeacherPhone] = React.useState('');
  const [newTeacherEmployeeNumber, setNewTeacherEmployeeNumber] = React.useState('');
  const [newTeacherDesignation, setNewTeacherDesignation] = React.useState('');
  const [newTeacherQualification, setNewTeacherQualification] = React.useState('');
  const [newTeacherJoiningDate, setNewTeacherJoiningDate] = React.useState('');
  const [newTeacherFieldErrors, setNewTeacherFieldErrors] = React.useState<Record<string, string>>({});

  // Multiple teaching assignments state during creation
  const [newTeacherAssignments, setNewTeacherAssignments] = React.useState<{
    branchId: string;
    courseId: string;
    subjectId: string;
    batchId: string;
    coursesList: Course[];
    subjectsList: Subject[];
    batchesList: Batch[];
  }[]>([]);

  // Generated Credentials Modal state
  const [createdCredentialsModal, setCreatedCredentialsModal] = React.useState<{
    name: string;
    email: string;
    employeeNumber: string;
    password: string;
    assignedCount: number;
  } | null>(null);

  // Edit Teacher modal state
  const [isEditTeacherModalOpen, setIsEditTeacherModalOpen] = React.useState(false);
  const [editTeacherId, setEditTeacherId] = React.useState('');
  const [editTeacherFirstName, setEditTeacherFirstName] = React.useState('');
  const [editTeacherLastName, setEditTeacherLastName] = React.useState('');
  const [editTeacherEmail, setEditTeacherEmail] = React.useState('');
  const [editTeacherPhone, setEditTeacherPhone] = React.useState('');
  const [editTeacherEmployeeNumber, setEditTeacherEmployeeNumber] = React.useState('');
  const [editTeacherDesignation, setEditTeacherDesignation] = React.useState('');
  const [editTeacherQualification, setEditTeacherQualification] = React.useState('');
  const [editTeacherFieldErrors, setEditTeacherFieldErrors] = React.useState<Record<string, string>>({});

  // View Teacher modal state
  const [isViewTeacherModalOpen, setIsViewTeacherModalOpen] = React.useState(false);
  const [selectedTeacherForView, setSelectedTeacherForView] = React.useState<Teacher | null>(null);

  const handleOpenViewTeacher = (teacher: Teacher) => {
    setSelectedTeacherForView(teacher);
    setIsViewTeacherModalOpen(true);
  };

  const [copiedTeacherId, setCopiedTeacherId] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleOpenNewTeacherModal = async () => {
    setNewTeacherFirstName('');
    setNewTeacherLastName('');
    setNewTeacherEmail('');
    setNewTeacherPhone('');
    setNewTeacherEmployeeNumber(`EMP-HYV-${Math.floor(100 + Math.random() * 900)}`);
    setNewTeacherDesignation('Lecturer');
    setNewTeacherQualification('M.Sc., B.Ed.');
    setNewTeacherJoiningDate(new Date().toISOString().split('T')[0]);
    setNewTeacherFieldErrors({});
    setIsNewTeacherModalOpen(true);

    try {
      const resBranches = await branchService.findAll('', 'active', 1, 100);
      setBranches(resBranches.branches);
      const defaultBranchId = globalBranchId || resBranches.branches[0]?.id || '';
      
      if (defaultBranchId) {
        const resCourses = await courseService.findAll('', defaultBranchId, 'active', 1, 100);
        const defaultCourseId = resCourses.courses[0]?.id || '';
        
        let resSubs: Subject[] = [];
        let resBatches: Batch[] = [];
        if (defaultCourseId) {
          const [sData, bData] = await Promise.all([
            subjectService.findAll(defaultCourseId),
            batchService.findAll('', defaultBranchId, defaultCourseId, 'active', 1, 100)
          ]);
          resSubs = sData;
          resBatches = bData.batches;
        }

        setNewTeacherAssignments([{
          branchId: defaultBranchId,
          courseId: defaultCourseId,
          subjectId: resSubs[0]?.id || '',
          batchId: resBatches[0]?.id || '',
          coursesList: resCourses.courses,
          subjectsList: resSubs,
          batchesList: resBatches,
        }]);
      } else {
        setNewTeacherAssignments([]);
      }
    } catch (err) {
      console.error('Failed to load initial assignment catalogs:', err);
    }
  };

  const handleAddAssignmentRow = async () => {
    const defaultBranchId = globalBranchId || branches[0]?.id || '';
    let cList: Course[] = [];
    let sList: Subject[] = [];
    let bList: Batch[] = [];
    let defaultCourseId = '';

    if (defaultBranchId) {
      try {
        const resC = await courseService.findAll('', defaultBranchId, 'active', 1, 100);
        cList = resC.courses;
        defaultCourseId = cList[0]?.id || '';
        if (defaultCourseId) {
          const [sData, bData] = await Promise.all([
            subjectService.findAll(defaultCourseId),
            batchService.findAll('', defaultBranchId, defaultCourseId, 'active', 1, 100)
          ]);
          sList = sData;
          bList = bData.batches;
        }
      } catch (e) {
        console.error(e);
      }
    }

    setNewTeacherAssignments(prev => [
      ...prev,
      {
        branchId: defaultBranchId,
        courseId: defaultCourseId,
        subjectId: sList[0]?.id || '',
        batchId: bList[0]?.id || '',
        coursesList: cList,
        subjectsList: sList,
        batchesList: bList,
      }
    ]);
  };

  const handleRemoveAssignmentRow = (index: number) => {
    setNewTeacherAssignments(prev => prev.filter((_, i) => i !== index));
  };

  const handleAssignmentRowChange = async (index: number, field: 'branchId' | 'courseId' | 'subjectId' | 'batchId', value: string) => {
    const updated = [...newTeacherAssignments];
    const row = { ...updated[index], [field]: value };

    if (field === 'branchId') {
      row.courseId = '';
      row.subjectId = '';
      row.batchId = '';
      row.subjectsList = [];
      row.batchesList = [];
      if (value) {
        try {
          const res = await courseService.findAll('', value, 'active', 1, 100);
          row.coursesList = res.courses;
          if (res.courses.length > 0) {
            row.courseId = res.courses[0].id;
            const [resSubs, resBatches] = await Promise.all([
              subjectService.findAll(res.courses[0].id),
              batchService.findAll('', value, res.courses[0].id, 'active', 1, 100)
            ]);
            row.subjectsList = resSubs;
            row.batchesList = resBatches.batches;
            row.subjectId = resSubs[0]?.id || '';
            row.batchId = resBatches.batches[0]?.id || '';
          }
        } catch (err) {
          console.error(err);
        }
      }
    } else if (field === 'courseId') {
      row.subjectId = '';
      row.batchId = '';
      if (value) {
        try {
          const [resSubs, resBatches] = await Promise.all([
            subjectService.findAll(value),
            batchService.findAll('', row.branchId, value, 'active', 1, 100)
          ]);
          row.subjectsList = resSubs;
          row.batchesList = resBatches.batches;
          row.subjectId = resSubs[0]?.id || '';
          row.batchId = resBatches.batches[0]?.id || '';
        } catch (err) {
          console.error(err);
        }
      }
    }

    updated[index] = row;
    setNewTeacherAssignments(updated);
  };

  const handleCreateTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!newTeacherFirstName.trim()) errors.firstName = 'First name is required';
    if (!newTeacherLastName.trim()) errors.lastName = 'Last name is required';
    if (!newTeacherEmail.trim()) errors.email = 'Email address is required';
    if (!newTeacherEmployeeNumber.trim()) errors.employeeNumber = 'Employee ID is required';

    if (Object.keys(errors).length > 0) {
      setNewTeacherFieldErrors(errors);
      return;
    }

    setNewTeacherFieldErrors({});
    setIsSubmitting(true);

    try {
      const createdTeacher = await teacherService.create({
        firstName: newTeacherFirstName,
        lastName: newTeacherLastName,
        email: newTeacherEmail,
        phone: newTeacherPhone,
        employeeNumber: newTeacherEmployeeNumber,
        designation: newTeacherDesignation,
        qualification: newTeacherQualification,
        joiningDate: newTeacherJoiningDate,
      });

      // Save all mapped course / batch / subject assignments
      let assignedCount = 0;
      const assignedSubjectBadges: Array<{ id: string; name: string; code?: string; courseName?: string }> = [];

      for (const assign of newTeacherAssignments) {
        const targetBranchId = assign.branchId || globalBranchId || branches[0]?.id;
        const targetCourseId = assign.courseId || assign.coursesList[0]?.id;
        const targetSubjectId = assign.subjectId || assign.subjectsList[0]?.id;
        const targetBatchId = assign.batchId || assign.batchesList[0]?.id;
        if (targetCourseId || targetSubjectId) {
          try {
            await subjectService.assignTeacher({
              branchId: targetBranchId || globalBranchId || branches[0]?.id || '',
              courseId: targetCourseId,
              subjectId: targetSubjectId,
              batchId: targetBatchId || '',
              teacherId: createdTeacher.id,
            });
            assignedCount++;

            const subObj = assign.subjectsList?.find((s) => s.id === targetSubjectId || s.name === targetSubjectId);
            const courseObj = assign.coursesList?.find((c) => c.id === targetCourseId || c.name === targetCourseId);
            assignedSubjectBadges.push({
              id: targetSubjectId || subObj?.id || '',
              name: subObj?.name || (targetSubjectId && targetSubjectId.length < 30 ? targetSubjectId : 'Subject'),
              code: subObj?.code,
              courseName: courseObj?.name || (targetCourseId && targetCourseId.length < 30 ? targetCourseId : ''),
            });
          } catch (e) {
            console.error('Failed to map assignment row:', e);
          }
        }
      }

      const empCodeClean = (newTeacherEmployeeNumber || 'TCH').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      const actualPassword = createdTeacher.temporaryPassword || (createdTeacher as any).initialPassword || (createdTeacher as any).password || `Tch#${empCodeClean}2026!`;

      const newlyAddedTeacher: Teacher = {
        id: createdTeacher.id,
        employeeNumber: newTeacherEmployeeNumber,
        designation: newTeacherDesignation,
        qualification: newTeacherQualification,
        status: 'active',
        temporaryPassword: actualPassword,
        subjects: assignedSubjectBadges,
        user: {
          firstName: newTeacherFirstName,
          lastName: newTeacherLastName,
          email: newTeacherEmail,
          phone: newTeacherPhone,
        },
      };

      setTeachers((prev) => [newlyAddedTeacher, ...prev.filter((t) => t.id !== createdTeacher.id)]);

      setCreatedCredentialsModal({
        name: `${newTeacherFirstName} ${newTeacherLastName}`,
        email: newTeacherEmail,
        employeeNumber: newTeacherEmployeeNumber,
        password: actualPassword,
        assignedCount,
      });

      toast(
        'Success', 
        `Teacher profile for ${newTeacherFirstName} ${newTeacherLastName} registered with ${assignedCount} teaching assignments.`, 
        'success'
      );
      setIsNewTeacherModalOpen(false);
      fetchRoster();
    } catch (err: any) {
      toast('Registration Failed', err.message || 'Could not register teacher profile.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchRoster = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [teachersData, assignData] = await Promise.all([
        teacherService.getTeachers(search || undefined),
        subjectService.getAssignments().catch(() => []),
      ]);

      const enrichedTeachers = (teachersData || []).map((t: any) => {
        const apiSubs = (t.subjects || []).filter((s: any) => s && (s.name || s.id));
        const empCode = t.employeeNumber;
        const email = t.user?.email || t.email;

        const matchedAssignments = (assignData || []).filter((a: any) => {
          return (
            (a.teacherId && a.teacherId === t.id) ||
            (a.teacher?.id && a.teacher.id === t.id) ||
            (empCode && a.teacher?.employeeNumber === empCode) ||
            (email && a.teacher?.user?.email === email)
          );
        });

        const extraSubs = matchedAssignments
          .filter((a: any) => a.subject && (a.subject.name || a.subject.id || a.subjectId))
          .map((a: any) => ({
            id: a.subject?.id || a.subjectId,
            name: a.subject?.name || 'Subject',
            code: a.subject?.code,
            courseName: a.course?.name || '',
            batchName: a.batch?.name || '',
            branchId: a.branchId || a.branch?.id || '',
          }));

        const combined = [...apiSubs];
        extraSubs.forEach((m: any) => {
          const exists = combined.some((c: any) => 
            (c.id && m.id && c.id === m.id) || 
            (c.name && m.name && c.name.toLowerCase() === m.name.toLowerCase() && (c.courseName === m.courseName || !c.courseName))
          );
          if (!exists) {
            combined.push(m);
          }
        });

        return {
          ...t,
          subjects: combined,
        };
      });

      const filteredTeachers = globalBranchId
        ? enrichedTeachers.filter((t: any) => {
            if (!t.branchId || t.branchId === globalBranchId) return true;
            return t.subjects?.some((s: any) => !s.branchId || s.branchId === globalBranchId);
          })
        : enrichedTeachers;

      const filteredAssignments = globalBranchId
        ? assignData.filter((a: any) => !a.branchId || a.branchId === globalBranchId)
        : assignData;

      setTeachers(filteredTeachers);
      setAssignments(filteredAssignments);
    } catch (err: any) {
      toast('Failed to load roster data', err.message || 'Server error', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, search, globalBranchId, toast]);

  React.useEffect(() => {
    fetchRoster();
  }, [fetchRoster]);

  // Load catalogs on assign modal trigger
  const handleOpenAssignModal = async () => {
    setIsAssignModalOpen(true);
    try {
      const [resBranches, resTeachers] = await Promise.all([
        branchService.findAll('', 'active', 1, 100),
        teacherService.getTeachers()
      ]);
      setBranches(resBranches.branches);
      setSelectedTeacherId(resTeachers[0]?.id || '');
      setSelectedBranchId(resBranches.branches[0]?.id || '');
    } catch (err) {
      console.error(err);
    }
  };

  // Cascades mappings
  React.useEffect(() => {
    if (!selectedBranchId) return;
    const loadCourses = async () => {
      try {
        const res = await courseService.findAll('', selectedBranchId, 'active', 1, 100);
        setCourses(res.courses);
        setSelectedCourseId(res.courses[0]?.id || '');
      } catch (err) {
        console.error(err);
      }
    };
    loadCourses();
  }, [selectedBranchId]);

  React.useEffect(() => {
    if (!selectedCourseId) return;
    const loadSubjectsAndBatches = async () => {
      try {
        const [resSubjects, resBatches] = await Promise.all([
          subjectService.findAll(selectedCourseId),
          batchService.findAll('', selectedBranchId, selectedCourseId, 'active', 1, 100)
        ]);
        setSubjects(resSubjects);
        setBatches(resBatches.batches);
        setSelectedSubjectId(resSubjects[0]?.id || '');
        setSelectedBatchId(resBatches.batches[0]?.id || '');
      } catch (err) {
        console.error(err);
      }
    };
    loadSubjectsAndBatches();
  }, [selectedCourseId, selectedBranchId]);

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacherId || !selectedBranchId || !selectedCourseId || !selectedSubjectId || !selectedBatchId) {
      toast('Validation Error', 'Please complete all hierarchy selection steps.', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      await subjectService.assignTeacher({
        teacherId: selectedTeacherId,
        branchId: selectedBranchId,
        courseId: selectedCourseId,
        subjectId: selectedSubjectId,
        batchId: selectedBatchId
      });
      toast('Success', 'Teacher mapped to subject cohort successfully.', 'success');
      setIsAssignModalOpen(false);
      fetchRoster();
    } catch (err: any) {
      toast('Assignment Failed', err.message || 'Could not assign teacher.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDeleteAssignment = (assignment: TeacherAssignment) => {
    setAssignmentToDelete(assignment);
    setIsDeleteAssignmentOpen(true);
  };

  const handleDeleteAssignmentConfirm = async () => {
    if (!assignmentToDelete) return;
    setIsSubmitting(true);
    try {
      await subjectService.removeAssignment(assignmentToDelete.id);
      toast('Removed', 'Teacher assignment removed successfully.', 'success');
      setIsDeleteAssignmentOpen(false);
      fetchRoster();
    } catch (err: any) {
      toast('Removal Failed', err.message || 'Could not delete mapping.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Teacher profile handler
  const handleOpenDeleteTeacher = (teacher: Teacher) => {
    setTeacherToDelete(teacher);
    setIsDeleteTeacherOpen(true);
  };

  const handleDeleteTeacherConfirm = async () => {
    if (!teacherToDelete) return;
    setIsSubmitting(true);
    try {
      await teacherService.remove(teacherToDelete.id);
      toast('Success', 'Teacher profile archived successfully.', 'success');
      setIsDeleteTeacherOpen(false);
      fetchRoster();
    } catch (err: any) {
      toast('Failed to archive teacher', err.message || 'Could not delete teacher profile.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit Teacher profile handler
  const handleOpenEditTeacher = (teacher: Teacher) => {
    setEditTeacherId(teacher.id);
    setEditTeacherFirstName(teacher.user?.firstName || (teacher as any).firstName || '');
    setEditTeacherLastName(teacher.user?.lastName || (teacher as any).lastName || '');
    setEditTeacherEmail(teacher.user?.email || (teacher as any).email || '');
    setEditTeacherPhone(teacher.user?.phone || (teacher as any).phone || '');
    setEditTeacherEmployeeNumber(teacher.employeeNumber || '');
    setEditTeacherDesignation(teacher.designation || 'Lecturer');
    setEditTeacherQualification(teacher.qualification || 'M.Tech');
    setEditTeacherFieldErrors({});
    setIsEditTeacherModalOpen(true);
  };

  const handleEditTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!editTeacherFirstName.trim()) errors.firstName = 'First name is required';
    if (!editTeacherLastName.trim()) errors.lastName = 'Last name is required';
    if (!editTeacherEmail.trim()) errors.email = 'Email address is required';
    if (!editTeacherEmployeeNumber.trim()) errors.employeeNumber = 'Employee ID is required';

    if (Object.keys(errors).length > 0) {
      setEditTeacherFieldErrors(errors);
      return;
    }

    setEditTeacherFieldErrors({});
    setIsSubmitting(true);
    try {
      await teacherService.update(editTeacherId, {
        firstName: editTeacherFirstName,
        lastName: editTeacherLastName,
        email: editTeacherEmail,
        phone: editTeacherPhone,
        employeeNumber: editTeacherEmployeeNumber,
        designation: editTeacherDesignation,
        qualification: editTeacherQualification,
      });
      toast('Success', `Teacher profile for ${editTeacherFirstName} ${editTeacherLastName} updated successfully.`, 'success');
      setIsEditTeacherModalOpen(false);
      fetchRoster();
    } catch (err: any) {
      toast('Update Failed', err.message || 'Could not update teacher profile.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 space-y-6 select-none">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950">
            Teacher & Staff Administration
          </h1>
          <p className="text-xs text-slate-600 font-extrabold mt-1">
            Browse faculty rosters, delete teacher profiles, and configure subject cohort assignments.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === 'ROSTER' && (
            <Button onClick={handleOpenNewTeacherModal} className="gap-2 h-10 shrink-0 font-bold bg-primary hover:bg-primary/90 text-white rounded-xl shadow-xs cursor-pointer">
              <Plus className="w-4 h-4" /> New Teacher
            </Button>
          )}
          {activeTab === 'ASSIGNMENTS' && (
            <Button onClick={handleOpenAssignModal} className="gap-2 h-10 shrink-0 font-bold bg-primary hover:bg-primary/90 text-white rounded-xl shadow-xs cursor-pointer">
              <Plus className="w-4 h-4" /> New Subject Assignment
            </Button>
          )}
        </div>
      </div>

      {/* Tabs selector */}
      <div className="flex gap-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => { setActiveTab('ROSTER'); setSearch(''); }}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl border transition-all cursor-pointer ${
            activeTab === 'ROSTER' 
              ? 'border-primary bg-primary/10 text-primary' 
              : 'border-transparent text-slate-600 hover:text-slate-950'
          }`}
        >
          <Users className="w-4 h-4" /> Teachers Roster
        </button>
        <button
          onClick={() => { setActiveTab('ASSIGNMENTS'); setSearch(''); }}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl border transition-all cursor-pointer ${
            activeTab === 'ASSIGNMENTS' 
              ? 'border-primary bg-primary/10 text-primary' 
              : 'border-transparent text-slate-600 hover:text-slate-950'
          }`}
        >
          <Layers className="w-4 h-4" /> Subject Assignments
        </button>
      </div>

      {/* Search Filter bar */}
      {activeTab === 'ROSTER' && (
        <Card className="p-4 flex gap-4 items-center border border-slate-200 bg-white shadow-xs">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search teachers by name or employee number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-950 shadow-xs"
            />
          </div>
          <Button variant="secondary" onClick={fetchRoster} className="h-10 gap-1.5 shrink-0 ml-auto font-bold">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
        </Card>
      )}

      {/* Main Table views */}
      <Card className="overflow-hidden border border-slate-200 bg-white shadow-xs">
        {isLoading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            <p className="text-xs font-extrabold text-slate-600 animate-pulse">Loading data...</p>
          </div>
        ) : activeTab === 'ROSTER' ? (
          teachers.length === 0 ? (
            <div className="p-16 text-center text-xs font-bold text-slate-600">No active teachers registered.</div>
          ) : (
            <div className="w-full overflow-x-auto scrollbar-thin">
              <table className="w-full min-w-[1000px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100 text-xs font-extrabold uppercase tracking-wider text-slate-900">
                    <th className="px-6 py-4">Teacher Name</th>
                    <th className="px-6 py-4">Employee Code</th>
                    <th className="px-6 py-4">Assigned Subjects</th>
                    <th className="px-6 py-4">Portal Credentials</th>
                    <th className="px-6 py-4">Designation</th>
                    <th className="px-6 py-4">Qualification</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-bold text-slate-900">
                  {teachers.map((t) => {
                    const firstName = t.user?.firstName || (t as any).firstName || 'Faculty';
                    const lastName = t.user?.lastName || (t as any).lastName || 'Member';
                    const empCode = (t.employeeNumber || 'TCH').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                    const rawPass = t.temporaryPassword || (t as any).temporaryPassword || `Tch#${empCode}2026!`;
                    const teacherEmail = t.user?.email || (t as any).email || `${firstName.toLowerCase()}@hyvora.com`;

                    return (
                      <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-black text-slate-950">
                          <div className="flex flex-col">
                            <span className="font-extrabold text-slate-950 text-sm">
                              {firstName} {lastName}
                            </span>
                            {t.user?.phone && (
                              <span className="text-xs text-slate-600 font-semibold">{t.user.phone}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-xs rounded font-bold font-mono">{t.employeeNumber}</span>
                        </td>
                        <td className="px-6 py-4">
                          {t.subjects && t.subjects.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 max-w-xs">
                              {t.subjects.map((sub: any, idx: number) => {
                                const sName = sub?.name || sub?.subject?.name || 'Subject';
                                const cName = sub?.courseName || sub?.course?.name || '';
                                return (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 border border-indigo-200 text-indigo-800"
                                  >
                                    {sName} {cName ? `(${cName})` : ''}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-xs font-bold text-slate-400 italic">No subjects mapped</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1 text-xs">
                            <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                              <span className="text-slate-500 font-bold">User:</span>
                              <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-bold text-indigo-700">{teacherEmail}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                <span className="text-slate-500 font-bold">Pass:</span>
                                <span className="font-mono bg-slate-100 border border-slate-200 text-slate-900 px-1.5 py-0.5 rounded text-[11px] font-bold select-all">
                                  {rawPass}
                                </span>
                              </div>
                              <button
                                onClick={() => {
                                  const text = `User: ${teacherEmail}\nPass: ${rawPass}`;
                                  navigator.clipboard.writeText(text);
                                  setCopiedTeacherId(t.id);
                                  setTimeout(() => setCopiedTeacherId(null), 2000);
                                  toast('Copied', `Credentials copied for ${firstName}`, 'success');
                                }}
                                className="p-1 rounded hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                                title="Copy Portal Credentials"
                              >
                                {copiedTeacherId === t.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-700 font-bold">{t.designation || 'Lecturer'}</td>
                        <td className="px-6 py-4 text-xs text-slate-600 font-bold">{t.qualification || 'M.Tech'}</td>
                        <td className="px-6 py-4">
                          <Badge variant={t.status === 'active' ? 'success' : 'neutral'}>
                            {t.status || 'active'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenViewTeacher(t)}
                              className="p-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:text-indigo-600 hover:border-indigo-400 transition-colors cursor-pointer shadow-xs"
                              title="View Teacher Profile"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenEditTeacher(t)}
                              className="p-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:text-indigo-600 hover:border-indigo-400 transition-colors cursor-pointer shadow-xs"
                              title="Edit Teacher Profile"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenDeleteTeacher(t)}
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
          )
        ) : (
          assignments.length === 0 ? (
            <div className="p-16 text-center text-xs font-bold text-slate-600">No teacher assignments configured.</div>
          ) : (
            <div className="w-full overflow-x-auto scrollbar-thin">
              <table className="w-full min-w-[800px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100 text-xs font-extrabold uppercase tracking-wider text-slate-900">
                    <th className="px-6 py-4">Teacher</th>
                    <th className="px-6 py-4">Subject</th>
                    <th className="px-6 py-4">Batch</th>
                    <th className="px-6 py-4">Course</th>
                    <th className="px-6 py-4">Branch</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-bold text-slate-900">
                  {assignments.map((a) => {
                    const teacherName = a.teacher?.user ? `${a.teacher.user.firstName} ${a.teacher.user.lastName}` : 'Unmapped';
                    return (
                      <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-black text-slate-950">{teacherName}</td>
                        <td className="px-6 py-4">
                          <span className="flex items-center gap-1.5 text-xs font-extrabold text-primary">
                            <Book className="w-3.5 h-3.5" />
                            {a.subject?.name}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-xs rounded font-bold font-mono">{a.batch?.name}</span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-700 font-bold">{a.course?.name}</td>
                        <td className="px-6 py-4">
                          <span className="flex items-center gap-1 text-xs text-slate-600 font-bold">
                            <MapPin className="w-3 h-3" />
                            {a.branch?.name}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleOpenDeleteAssignment(a)}
                            className="p-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:text-rose-600 hover:border-rose-400 transition-colors cursor-pointer shadow-xs"
                            title="Remove assignment mapping"
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
          )
        )}
      </Card>

      {/* ASSIGN MODAL */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto">
          <Card className="w-full max-w-md p-6 relative border border-slate-200 bg-white shadow-xl">
            <button
              onClick={() => setIsAssignModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-lg font-black text-slate-950 mb-1">
              New Subject Assignment
            </h3>
            <p className="text-xs text-slate-600 mb-6 font-extrabold uppercase tracking-wider">
              map teacher to academic cohort subject
            </p>

            <form onSubmit={handleAssignSubmit} className="space-y-4">
              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-xs font-bold text-slate-700">Select Teacher</label>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="flex h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm focus:outline-none font-bold text-slate-900 shadow-xs"
                >
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.user?.firstName || (t as any).firstName} {t.user?.lastName || (t as any).lastName} ({t.employeeNumber})</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-xs font-bold text-slate-700">Select Branch</label>
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="flex h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm focus:outline-none font-bold text-slate-900 shadow-xs"
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-xs font-bold text-slate-700">Select Course</label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="flex h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm focus:outline-none font-bold text-slate-900 shadow-xs"
                  disabled={courses.length === 0}
                >
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 w-full">
                  <label className="text-xs font-bold text-slate-700">Select Subject</label>
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    className="flex h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm focus:outline-none font-bold text-slate-900 shadow-xs"
                    disabled={subjects.length === 0}
                  >
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5 w-full">
                  <label className="text-xs font-bold text-slate-700">Select Batch</label>
                  <select
                    value={selectedBatchId}
                    onChange={(e) => setSelectedBatchId(e.target.value)}
                    className="flex h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm focus:outline-none font-bold text-slate-900 shadow-xs"
                    disabled={batches.length === 0}
                  >
                    {batches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <Button variant="secondary" type="button" onClick={() => setIsAssignModalOpen(false)} className="font-bold">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="font-bold">
                  {isSubmitting ? 'Mapping...' : 'Assign Teacher'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* CONFIRM DELETE ASSIGNMENT DIALOG */}
      {isDeleteAssignmentOpen && assignmentToDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <Card className="w-full max-w-md p-6 border border-slate-200 bg-white shadow-xl space-y-4">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 shrink-0 border border-rose-200">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-950">
                  Remove Teacher Assignment mapping?
                </h3>
                <p className="text-xs text-slate-600 font-bold">
                  This will detach mapping from subject cohort. Active timetables schedules will preserve historical data.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setIsDeleteAssignmentOpen(false)} className="font-bold">
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDeleteAssignmentConfirm} disabled={isSubmitting} className="font-bold">
                {isSubmitting ? 'Detaching...' : 'Confirm Remove'}
              </Button>
            </div>
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
                  Delete Teacher Profile Permanently?
                </h3>
                <p className="text-xs text-slate-600 font-bold">
                  Are you sure you want to permanently delete teacher <span className="font-black text-slate-950">"{teacherToDelete.user?.firstName || (teacherToDelete as any).firstName} {teacherToDelete.user?.lastName || (teacherToDelete as any).lastName}"</span>?
                  This action cannot be undone and will permanently remove this teacher and their records from the database.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setIsDeleteTeacherOpen(false)} className="font-bold">
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDeleteTeacherConfirm} disabled={isSubmitting} className="font-bold">
                {isSubmitting ? 'Deleting...' : 'Delete Permanently'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* REGISTER NEW TEACHER MODAL */}
      {isNewTeacherModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto">
          <Card className="w-full max-w-2xl p-6 relative border border-slate-200 bg-white shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto scrollbar-thin">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-slate-950">Register New Teacher</h3>
              </div>
              <button
                onClick={() => setIsNewTeacherModalOpen(false)}
                className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTeacherSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="First Name *"
                  placeholder="e.g. Ramesh"
                  value={newTeacherFirstName}
                  onChange={(e) => setNewTeacherFirstName(e.target.value)}
                  error={newTeacherFieldErrors.firstName}
                  required
                />
                <Input
                  label="Last Name *"
                  placeholder="e.g. Kumar"
                  value={newTeacherLastName}
                  onChange={(e) => setNewTeacherLastName(e.target.value)}
                  error={newTeacherFieldErrors.lastName}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Email Address *"
                  type="email"
                  placeholder="e.g. ramesh@hyvora.com"
                  value={newTeacherEmail}
                  onChange={(e) => setNewTeacherEmail(e.target.value)}
                  error={newTeacherFieldErrors.email}
                  required
                />
                <Input
                  label="Phone Number"
                  placeholder="e.g. +91-9876543210"
                  value={newTeacherPhone}
                  onChange={(e) => setNewTeacherPhone(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Employee Number *"
                  placeholder="e.g. EMP-HYV-103"
                  value={newTeacherEmployeeNumber}
                  onChange={(e) => setNewTeacherEmployeeNumber(e.target.value)}
                  error={newTeacherFieldErrors.employeeNumber}
                  required
                />
                <Input
                  label="Joining Date"
                  type="date"
                  value={newTeacherJoiningDate}
                  onChange={(e) => setNewTeacherJoiningDate(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Designation"
                  placeholder="e.g. Senior Lecturer"
                  value={newTeacherDesignation}
                  onChange={(e) => setNewTeacherDesignation(e.target.value)}
                />
                <Input
                  label="Qualification"
                  placeholder="e.g. M.Sc. Physics, B.Ed."
                  value={newTeacherQualification}
                  onChange={(e) => setNewTeacherQualification(e.target.value)}
                />
              </div>

              {/* Teaching Assignments Section */}
              <div className="pt-4 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between bg-primary/5 p-3 rounded-xl border border-primary/20">
                  <div>
                    <span className="text-xs font-black text-primary uppercase tracking-wider block">Teaching Assignments (Multiple Courses, Batches & Subjects)</span>
                    <span className="text-[11px] font-bold text-slate-500">Map which courses, batches, and subjects this faculty member will teach.</span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={handleAddAssignmentRow}
                    className="text-xs h-8 gap-1.5 font-bold cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Assignment
                  </Button>
                </div>

                <div className="space-y-3 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
                  {newTeacherAssignments.map((row, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3 relative">
                      <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                        <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                          Assignment #{idx + 1}
                        </span>
                        {newTeacherAssignments.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveAssignmentRow(idx)}
                            className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Branch */}
                        <div>
                          <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block mb-1">Branch</label>
                          <select
                            value={row.branchId}
                            onChange={(e) => handleAssignmentRowChange(idx, 'branchId', e.target.value)}
                            className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:ring-2 focus:ring-primary cursor-pointer"
                          >
                            {branches.map(b => (
                              <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Course */}
                        <div>
                          <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block mb-1">Course</label>
                          <select
                            value={row.courseId}
                            onChange={(e) => handleAssignmentRowChange(idx, 'courseId', e.target.value)}
                            className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:ring-2 focus:ring-primary cursor-pointer"
                          >
                            {row.coursesList.map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Subject */}
                        <div>
                          <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block mb-1">Subject</label>
                          <select
                            value={row.subjectId}
                            onChange={(e) => handleAssignmentRowChange(idx, 'subjectId', e.target.value)}
                            className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:ring-2 focus:ring-primary cursor-pointer"
                          >
                            {row.subjectsList.map(s => (
                              <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                            ))}
                          </select>
                        </div>

                        {/* Batch */}
                        <div>
                          <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block mb-1">Batch</label>
                          <select
                            value={row.batchId}
                            onChange={(e) => handleAssignmentRowChange(idx, 'batchId', e.target.value)}
                            className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:ring-2 focus:ring-primary cursor-pointer"
                          >
                            {row.batchesList.map(b => (
                              <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}

                  {newTeacherAssignments.length === 0 && (
                    <div className="text-center py-3 text-xs font-bold text-slate-400">
                      No teaching assignments added. Click "Add Assignment" to map courses, batches and subjects.
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsNewTeacherModalOpen(false)}
                  className="font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="font-bold bg-primary hover:bg-primary/90 text-white min-w-[120px]"
                >
                  {isSubmitting ? 'Registering...' : 'Register Teacher'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* CREATED TEACHER CREDENTIALS MODAL */}
      {createdCredentialsModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs select-none">
          <Card className="w-full max-w-md p-6 border border-slate-200 bg-white shadow-2xl space-y-4 relative">
            <button
              onClick={() => setCreatedCredentialsModal(null)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-950">Teacher Credentials Generated</h3>
                <p className="text-xs text-slate-600 font-bold">Profile registered with {createdCredentialsModal.assignedCount} teaching assignments.</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-500">Teacher Name:</span>
                <span className="font-black text-slate-950">{createdCredentialsModal.name}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-500">Employee ID:</span>
                <span className="font-mono font-bold text-slate-900">{createdCredentialsModal.employeeNumber}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-500">Portal Email:</span>
                <span className="font-mono font-bold text-slate-900">{createdCredentialsModal.email}</span>
              </div>
              <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-200">
                <span className="font-bold text-slate-500">Portal Password:</span>
                <span className="inline-flex items-center gap-1 font-mono font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded">
                  <Key className="w-3.5 h-3.5 text-indigo-600" />
                  {createdCredentialsModal.password}
                </span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-900">
              Share these login credentials with the teacher. They can log into the Teacher Portal using their email or employee ID with this password.
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={() => {
                  const text = `HYVORA ERP Teacher Credentials:\nName: ${createdCredentialsModal.name}\nEmail: ${createdCredentialsModal.email}\nEmployee ID: ${createdCredentialsModal.employeeNumber}\nPassword: ${createdCredentialsModal.password}`;
                  navigator.clipboard.writeText(text);
                  toast('Copied', 'Teacher credentials copied to clipboard.', 'success');
                }}
                className="gap-1.5 font-bold"
              >
                <Copy className="w-3.5 h-3.5" /> Copy Credentials
              </Button>
              <Button
                onClick={() => setCreatedCredentialsModal(null)}
                className="font-bold bg-primary text-white hover:bg-primary/90"
              >
                Done
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* EDIT TEACHER MODAL */}
      {isEditTeacherModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs select-none overflow-y-auto">
          <Card className="w-full max-w-lg p-6 border border-slate-200 bg-white shadow-2xl space-y-4 my-8 relative">
            <button
              onClick={() => setIsEditTeacherModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h3 className="text-lg font-black text-slate-950">Edit Teacher Profile</h3>
              <p className="text-xs text-slate-600 font-extrabold mt-0.5">
                Update faculty member details, employee code, and contact information.
              </p>
            </div>

            <form onSubmit={handleEditTeacherSubmit} className="space-y-4" noValidate>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="First Name *"
                  value={editTeacherFirstName}
                  onChange={(e) => {
                    setEditTeacherFirstName(e.target.value);
                    setEditTeacherFieldErrors(prev => ({ ...prev, firstName: '' }));
                  }}
                  error={editTeacherFieldErrors.firstName}
                />
                <Input
                  label="Last Name *"
                  value={editTeacherLastName}
                  onChange={(e) => {
                    setEditTeacherLastName(e.target.value);
                    setEditTeacherFieldErrors(prev => ({ ...prev, lastName: '' }));
                  }}
                  error={editTeacherFieldErrors.lastName}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Email Address *"
                  type="email"
                  value={editTeacherEmail}
                  onChange={(e) => {
                    setEditTeacherEmail(e.target.value);
                    setEditTeacherFieldErrors(prev => ({ ...prev, email: '' }));
                  }}
                  error={editTeacherFieldErrors.email}
                />
                <Input
                  label="Phone Number"
                  value={editTeacherPhone}
                  onChange={(e) => setEditTeacherPhone(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Employee ID / Code *"
                  value={editTeacherEmployeeNumber}
                  onChange={(e) => {
                    setEditTeacherEmployeeNumber(e.target.value);
                    setEditTeacherFieldErrors(prev => ({ ...prev, employeeNumber: '' }));
                  }}
                  error={editTeacherFieldErrors.employeeNumber}
                />
                <Input
                  label="Designation"
                  value={editTeacherDesignation}
                  onChange={(e) => setEditTeacherDesignation(e.target.value)}
                />
              </div>

              <Input
                label="Qualification"
                value={editTeacherQualification}
                onChange={(e) => setEditTeacherQualification(e.target.value)}
              />

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsEditTeacherModalOpen(false)}
                  className="font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="font-bold bg-primary hover:bg-primary/90 text-white"
                >
                  {isSubmitting ? 'Saving...' : 'Save Profile Changes'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* DETAIL DRAWER / SLIDE-OUT OVERLAY FOR TEACHER */}
      {isViewTeacherModalOpen && selectedTeacherForView && (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-end backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white border-l border-slate-200 h-full flex flex-col shadow-2xl p-6 overflow-y-auto animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
              <div>
                <h3 className="text-lg font-black text-slate-950">
                  Teacher Profile Sheet
                </h3>
                <p className="text-xs text-slate-600 font-extrabold uppercase tracking-wider mt-0.5">
                  emp code: {selectedTeacherForView.employeeNumber}
                </p>
              </div>
              <button
                onClick={() => setIsViewTeacherModalOpen(false)}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Profile Header Card */}
              <div className="flex gap-4 items-center p-4 bg-slate-50 rounded-2xl border border-slate-200 shadow-xs">
                <div className="w-14 h-14 rounded-2xl bg-primary/20 text-primary flex items-center justify-center text-xl font-black shrink-0 uppercase border border-primary/30">
                  {(selectedTeacherForView.user?.firstName || (selectedTeacherForView as any).firstName || 'F')[0]}
                  {(selectedTeacherForView.user?.lastName || (selectedTeacherForView as any).lastName || 'M')[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-base font-black text-slate-950 block">
                    {selectedTeacherForView.user?.firstName || (selectedTeacherForView as any).firstName}{' '}
                    {selectedTeacherForView.user?.lastName || (selectedTeacherForView as any).lastName}
                  </span>
                  <span className="text-xs text-slate-600 font-bold block mt-0.5">
                    {selectedTeacherForView.user?.email || (selectedTeacherForView as any).email}
                  </span>
                </div>
                <Badge variant={selectedTeacherForView.status === 'active' ? 'success' : 'neutral'}>
                  {selectedTeacherForView.status || 'active'}
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
                      const email = selectedTeacherForView.user?.email || (selectedTeacherForView as any).email;
                      const pass = selectedTeacherForView.temporaryPassword || `Tch#${(selectedTeacherForView.employeeNumber || 'TCH').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}2026!`;
                      navigator.clipboard.writeText(`User: ${email}\nPass: ${pass}`);
                      toast('Credentials Copied', `Portal login info for ${selectedTeacherForView.user?.firstName || (selectedTeacherForView as any).firstName} copied to clipboard.`, 'success');
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
                      {selectedTeacherForView.user?.email || (selectedTeacherForView as any).email}
                    </span>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-amber-200">
                    <span className="text-slate-500 block text-[10px] uppercase mb-0.5">Portal Password</span>
                    <span className="text-amber-800 font-mono font-black select-all">
                      {selectedTeacherForView.temporaryPassword || `Tch#${(selectedTeacherForView.employeeNumber || 'TCH').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}2026!`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Personal & Academic Info Section */}
              <div className="space-y-3">
                <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-slate-600" /> Personal Information
                </span>
                <div className="grid grid-cols-2 gap-4 text-xs font-bold bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="text-slate-600">Designation: <span className="text-slate-950 block mt-0.5 font-black">{selectedTeacherForView.designation || 'Lecturer'}</span></div>
                  <div className="text-slate-600">Qualification: <span className="text-slate-950 block mt-0.5 font-black">{selectedTeacherForView.qualification || 'N/A'}</span></div>
                  <div className="text-slate-600">Contact Phone: <span className="text-slate-950 block mt-0.5 font-black">{selectedTeacherForView.user?.phone || (selectedTeacherForView as any).phone || 'N/A'}</span></div>
                  <div className="text-slate-600">Joining Date: <span className="text-slate-950 block mt-0.5 font-black">{selectedTeacherForView.joiningDate ? new Date(selectedTeacherForView.joiningDate).toLocaleDateString() : 'N/A'}</span></div>
                </div>
              </div>

              {/* Mapped Subjects & Cohorts Section */}
              <div className="space-y-3">
                <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Book className="w-4 h-4 text-indigo-600" /> Mapped Subjects & Academic Cohorts ({selectedTeacherForView.subjects?.length || 0})
                </span>
                {selectedTeacherForView.subjects && selectedTeacherForView.subjects.length > 0 ? (
                  <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2.5 shadow-xs">
                    {selectedTeacherForView.subjects.map((sub: any, idx: number) => {
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
