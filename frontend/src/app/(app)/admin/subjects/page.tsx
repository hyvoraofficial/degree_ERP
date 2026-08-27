'use client';

import * as React from 'react';
import { 
  Plus, Search, Edit2, Trash2, RefreshCw, X, AlertTriangle, Book, Layers, ShieldAlert, Users, UserCheck, CheckCircle
} from 'lucide-react';
import { subjectService, Subject, TeacherAssignment } from '@/services/subject.service';
import { courseService, Course } from '@/services/course.service';
import { branchService, Branch } from '@/services/branch.service';
import { batchService, Batch } from '@/services/batch.service';
import { teacherService, Teacher } from '@/services/teacher.service';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/providers/ToastProvider';
import { useBranchContext } from '@/providers/BranchProvider';

export default function SubjectsPage() {
  const { toast } = useToast();
  const { selectedBranchId: globalBranchId } = useBranchContext();

  const [activeTab, setActiveTab] = React.useState<'CATALOG' | 'ASSIGNMENTS'>('CATALOG');

  // Catalog state
  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [courses, setCourses] = React.useState<Course[]>([]);
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [search, setSearch] = React.useState('');
  const [selectedCourseId, setSelectedCourseId] = React.useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);

  // Modal control states
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = React.useState(false);

  // Target item state
  const [selectedSubject, setSelectedSubject] = React.useState<Subject | null>(null);

  // Form states - Create / Edit
  const [formName, setFormName] = React.useState('');
  const [formCode, setFormCode] = React.useState('');
  const [formDescription, setFormDescription] = React.useState('');
  const [formCourseId, setFormCourseId] = React.useState('');
  const [formType, setFormType] = React.useState<'theory' | 'practical' | 'lab'>('theory');
  const [formStatus, setFormStatus] = React.useState('active');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Teacher Assignment states
  const [assignments, setAssignments] = React.useState<TeacherAssignment[]>([]);
  const [assignBranchId, setAssignBranchId] = React.useState('');
  const [assignCourseId, setAssignCourseId] = React.useState('');
  const [assignSubjectId, setAssignSubjectId] = React.useState('');
  const [assignBatchId, setAssignBatchId] = React.useState('');
  const [assignTeacherId, setAssignTeacherId] = React.useState('');

  const [assignCourses, setAssignCourses] = React.useState<Course[]>([]);
  const [assignSubjects, setAssignSubjects] = React.useState<Subject[]>([]);
  const [assignBatches, setAssignBatches] = React.useState<Batch[]>([]);
  const [teachersList, setTeachersList] = React.useState<Teacher[]>([]);
  const [isAssigning, setIsAssigning] = React.useState(false);

  const fetchCatalogData = React.useCallback(async () => {
    try {
      const [resCourses, resBranches, resTeachers] = await Promise.all([
        courseService.findAll('', globalBranchId || undefined, 'active', 1, 100),
        branchService.findAll('', 'active', 1, 100),
        teacherService.getTeachers(''),
      ]);
      setCourses(resCourses.courses);
      setBranches(resBranches.branches);
      setTeachersList(resTeachers || []);
    } catch (err) {
      console.error('Failed to load metadata:', err);
    }
  }, [globalBranchId]);

  React.useEffect(() => {
    fetchCatalogData();
  }, [fetchCatalogData]);

  const fetchSubjects = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await subjectService.findAll(selectedCourseId || undefined);
      let items = data;
      if (selectedStatusFilter) {
        items = items.filter(s => s.status === selectedStatusFilter);
      }
      if (search) {
        const query = search.toLowerCase();
        items = items.filter(s => 
          s.name.toLowerCase().includes(query) || 
          s.code.toLowerCase().includes(query)
        );
      }
      setSubjects(items);
    } catch (err: any) {
      toast('Failed to load subjects', err.message || 'Server error', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [selectedCourseId, selectedStatusFilter, search, toast]);

  const fetchAssignments = React.useCallback(async () => {
    try {
      const data = await subjectService.getAssignments();
      setAssignments(data);
    } catch (err: any) {
      console.error(err);
    }
  }, []);

  React.useEffect(() => {
    if (activeTab === 'CATALOG') {
      fetchSubjects();
    } else {
      fetchAssignments();
    }
  }, [activeTab, fetchSubjects, fetchAssignments]);

  // Cascade handler for Teacher Assignments
  const handleAssignBranchChange = async (branchId: string) => {
    setAssignBranchId(branchId);
    setAssignCourseId('');
    setAssignSubjectId('');
    setAssignBatchId('');
    setAssignCourses([]);
    setAssignSubjects([]);
    setAssignBatches([]);
    if (branchId) {
      try {
        const res = await courseService.findAll('', branchId, 'active', 1, 100);
        setAssignCourses(res.courses);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleAssignCourseChange = async (courseId: string) => {
    setAssignCourseId(courseId);
    setAssignSubjectId('');
    setAssignBatchId('');
    setAssignSubjects([]);
    setAssignBatches([]);
    if (courseId) {
      try {
        const [subs, resBatches] = await Promise.all([
          subjectService.findAll(courseId),
          batchService.findAll('', assignBranchId, courseId, 'active', 1, 100),
        ]);
        setAssignSubjects(subs);
        setAssignBatches(resBatches.batches);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignBranchId || !assignCourseId || !assignSubjectId || !assignBatchId || !assignTeacherId) {
      toast('Validation Error', 'Please select Branch, Course, Subject, Batch, and Teacher.', 'error');
      return;
    }
    setIsAssigning(true);
    try {
      await subjectService.assignTeacher({
        branchId: assignBranchId,
        courseId: assignCourseId,
        subjectId: assignSubjectId,
        batchId: assignBatchId,
        teacherId: assignTeacherId,
      });
      toast('Teacher Assigned', 'Successfully linked teacher to subject cohort.', 'success');
      fetchAssignments();
    } catch (err: any) {
      toast('Assignment Failed', err.message || 'Could not map teacher to subject.', 'error');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemoveAssignment = async (id: string) => {
    try {
      await subjectService.removeAssignment(id);
      toast('Assignment Removed', 'Teacher assignment deleted successfully.', 'success');
      fetchAssignments();
    } catch (err: any) {
      toast('Action Failed', err.message || 'Could not remove assignment.', 'error');
    }
  };

  const handleOpenCreate = () => {
    setFormName('');
    setFormCode('');
    setFormDescription('');
    setFormCourseId(courses[0]?.id || '');
    setFormType('theory');
    setFormStatus('active');
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (subject: Subject) => {
    setSelectedSubject(subject);
    setFormName(subject.name);
    setFormCode(subject.code);
    setFormDescription(subject.description || '');
    setFormCourseId(subject.courseId);
    setFormType(subject.subjectType);
    setFormStatus(subject.status);
    setIsEditOpen(true);
  };

  const handleOpenDelete = (subject: Subject) => {
    setSelectedSubject(subject);
    setIsDeleteConfirmOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCourseId) {
      toast('Validation Error', 'Please select a Course.', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      await subjectService.create({
        name: formName,
        code: formCode,
        description: formDescription || undefined,
        subjectType: formType,
        courseId: formCourseId,
      });
      toast('Success', 'Subject created and mapped successfully.', 'success');
      setIsCreateOpen(false);
      fetchSubjects();
    } catch (err: any) {
      toast('Creation Failed', err.message || 'Could not register subject.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubject) return;
    setIsSubmitting(true);
    try {
      await subjectService.update(selectedSubject.id, {
        name: formName,
        code: formCode,
        description: formDescription || undefined,
        subjectType: formType,
        status: formStatus,
      });
      toast('Success', 'Subject parameters updated successfully.', 'success');
      setIsEditOpen(false);
      fetchSubjects();
    } catch (err: any) {
      toast('Update Failed', err.message || 'Could not update subject details.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!selectedSubject) return;
    setIsSubmitting(true);
    try {
      await subjectService.remove(selectedSubject.id);
      toast('Deleted', 'Subject record deleted successfully.', 'success');
      setIsDeleteConfirmOpen(false);
      fetchSubjects();
    } catch (err: any) {
      toast('Deletion Blocked', err.message || 'Attendance or dependent records exist. Archive instead.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchiveInstead = async () => {
    if (!selectedSubject) return;
    setIsSubmitting(true);
    try {
      await subjectService.update(selectedSubject.id, { status: 'archived' });
      toast('Archived', `Subject "${selectedSubject.name}" set to Archived.`, 'success');
      setIsDeleteConfirmOpen(false);
      fetchSubjects();
    } catch (err: any) {
      toast('Archiving Failed', err.message || 'Server error', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Subject & Teacher Management
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Manage academic subjects, track course mappings, and assign faculty teachers to subject cohorts.
          </p>
        </div>
        
        <div className="flex gap-2">
          <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('CATALOG')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'CATALOG'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Subject Catalog
            </button>
            <button
              onClick={() => setActiveTab('ASSIGNMENTS')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'ASSIGNMENTS'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Teacher Assignments
            </button>
          </div>
          {activeTab === 'CATALOG' && (
            <Button onClick={handleOpenCreate} className="gap-2 h-10 shrink-0 cursor-pointer" disabled={courses.length === 0}>
              <Plus className="w-4 h-4" /> Create Subject
            </Button>
          )}
        </div>
      </div>

      {activeTab === 'CATALOG' && (
        <>
          {/* Filter and Search Bar */}
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by subject name or code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-300 bg-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary text-slate-900"
              />
            </div>
            
            <div className="flex flex-wrap w-full md:w-auto gap-4 items-center justify-end">
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="h-10 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer shadow-xs"
              >
                <option value="">All Courses</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="h-10 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer shadow-xs"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="archived">Archived</option>
              </select>

              <Button variant="outline" onClick={fetchSubjects} className="h-10 gap-1.5 shrink-0 border-slate-200 text-slate-700 bg-white hover:bg-slate-50">
                <RefreshCw className="w-4 h-4" /> Refresh
              </Button>
            </div>
          </div>

          {/* Main Table view */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            {isLoading ? (
              <div className="p-16 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                <p className="text-xs font-semibold text-slate-500 animate-pulse">Loading Subject Catalog...</p>
              </div>
            ) : subjects.length === 0 ? (
              <div className="p-16 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                  <Book className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900">No Subjects Found</h3>
                  <p className="text-xs text-slate-500 max-w-sm">
                    No active subjects are configured. Create new ones or refine search filters.
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-extrabold uppercase tracking-wider text-[11px]">
                      <th className="px-6 py-4">Subject</th>
                      <th className="px-6 py-4">Course</th>
                      <th className="px-6 py-4">Subject Code</th>
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {subjects.map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 text-sm block capitalize">{sub.name}</span>
                            {sub.description && <span className="text-xs text-slate-500 font-semibold line-clamp-1">{sub.description}</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-slate-800 uppercase text-xs">{sub.course?.name || 'Unmapped Course'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 bg-slate-900 text-white font-mono font-bold text-[11px] rounded-lg tracking-wider">{sub.code}</span>
                        </td>
                        <td className="px-6 py-4 capitalize font-semibold text-slate-700">{sub.subjectType}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            sub.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : sub.status === 'archived'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {sub.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleOpenEdit(sub)}
                              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:text-primary hover:bg-slate-50 transition-colors cursor-pointer"
                              title="Edit Subject"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenDelete(sub)}
                              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete Subject"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'ASSIGNMENTS' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs space-y-4">
            <h3 className="text-base font-extrabold text-slate-900">Assign Teacher to Subject Cohort</h3>
            <p className="text-xs font-semibold text-slate-500">Select Branch, Course, Subject, Batch, and Faculty Teacher to provision teaching authority.</p>

            <form onSubmit={handleCreateAssignment} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 pt-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-800">Branch</label>
                <select
                  value={assignBranchId}
                  onChange={(e) => handleAssignBranchChange(e.target.value)}
                  className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer shadow-xs"
                >
                  <option value="">Select Branch</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-800">Course</label>
                <select
                  value={assignCourseId}
                  disabled={!assignBranchId}
                  onChange={(e) => handleAssignCourseChange(e.target.value)}
                  className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <option value="">Select Course</option>
                  {assignCourses.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-800">Subject</label>
                <select
                  value={assignSubjectId}
                  disabled={!assignCourseId}
                  onChange={(e) => setAssignSubjectId(e.target.value)}
                  className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <option value="">Select Subject</option>
                  {assignSubjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-800">Batch</label>
                <select
                  value={assignBatchId}
                  disabled={!assignCourseId}
                  onChange={(e) => setAssignBatchId(e.target.value)}
                  className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <option value="">Select Batch</option>
                  {assignBatches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-800">Teacher</label>
                <select
                  value={assignTeacherId}
                  onChange={(e) => setAssignTeacherId(e.target.value)}
                  className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer shadow-xs"
                >
                  <option value="">Select Teacher</option>
                  {teachersList.map(t => (
                    <option key={t.id} value={t.id}>{t.user?.firstName} {t.user?.lastName} ({t.employeeNumber})</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2 md:col-span-5 flex justify-end pt-2">
                <Button type="submit" disabled={isAssigning} className="gap-2 cursor-pointer">
                  <UserCheck className="w-4 h-4" /> {isAssigning ? 'Assigning...' : 'Assign Teacher'}
                </Button>
              </div>
            </form>
          </div>

          {/* Assignments List */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Active Faculty Cohort Mappings</h4>
              <Button size="sm" variant="outline" onClick={fetchAssignments} className="gap-1.5 text-xs cursor-pointer border-slate-200 text-slate-700 bg-white hover:bg-slate-50">
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </Button>
            </div>

            {assignments.length === 0 ? (
              <div className="p-12 text-center text-xs font-semibold text-slate-500">
                No active teacher-subject assignments mapped.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-semibold">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-700 uppercase tracking-wider text-[11px] bg-slate-50">
                      <th className="px-6 py-3.5">Teacher</th>
                      <th className="px-6 py-3.5">Subject</th>
                      <th className="px-6 py-3.5">Course</th>
                      <th className="px-6 py-3.5">Batch</th>
                      <th className="px-6 py-3.5">Branch</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {assignments.map(a => (
                      <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-3.5 font-bold text-slate-900">
                          {a.teacher?.user?.firstName} {a.teacher?.user?.lastName}
                          <span className="text-[10px] font-semibold text-slate-500 block">{a.teacher?.employeeNumber}</span>
                        </td>
                        <td className="px-6 py-3.5 text-primary font-extrabold">{a.subject?.name}</td>
                        <td className="px-6 py-3.5 font-bold text-slate-800">{a.course?.name}</td>
                        <td className="px-6 py-3.5 text-slate-700">{a.batch?.name}</td>
                        <td className="px-6 py-3.5 text-slate-700">{a.branch?.name}</td>
                        <td className="px-6 py-3.5 text-right">
                          <button
                            onClick={() => handleRemoveAssignment(a.id)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Remove Assignment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE SUBJECT MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <Card className="w-full max-w-md p-6 relative border border-border shadow-xl">
            <button
              onClick={() => setIsCreateOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-lg font-bold text-zinc-950 dark:text-zinc-50 mb-1">
              Create Subject
            </h3>
            <p className="text-xs text-zinc-400 mb-6 font-semibold uppercase tracking-wider">
              map academic subject to course
            </p>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <Input
                label="Subject Name"
                id="subName"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
                placeholder="e.g. Inorganic Chemistry"
              />
              <Input
                label="Subject Code"
                id="subCode"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                required
                placeholder="e.g. CHEM-INORG"
              />

              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                  className="flex w-full rounded-xl border border-border bg-card px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-medium text-zinc-700 dark:text-zinc-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 w-full">
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Mapping Course</label>
                  <select
                    value={formCourseId}
                    onChange={(e) => setFormCourseId(e.target.value)}
                    className="flex h-11 w-full rounded-xl border border-border bg-card px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer"
                  >
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5 w-full">
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Subject Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="flex h-11 w-full rounded-xl border border-border bg-card px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer"
                  >
                    <option value="theory">Theory</option>
                    <option value="practical">Practical</option>
                    <option value="lab">Lab</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button variant="secondary" type="button" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Subject'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* EDIT SUBJECT MODAL */}
      {isEditOpen && selectedSubject && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <Card className="w-full max-w-md p-6 relative border border-border shadow-xl">
            <button
              onClick={() => setIsEditOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-lg font-bold text-zinc-950 dark:text-zinc-50 mb-1">
              Edit Subject Details
            </h3>
            <p className="text-xs text-zinc-400 mb-6 font-semibold uppercase tracking-wider">
              Subject Name: {selectedSubject.name}
            </p>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <Input
                label="Subject Name"
                id="subEditName"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
              />
              <Input
                label="Subject Code"
                id="subEditCode"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                required
              />

              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                  className="flex w-full rounded-xl border border-border bg-card px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-medium text-zinc-700 dark:text-zinc-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 w-full">
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Subject Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="flex h-11 w-full rounded-xl border border-border bg-card px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer"
                  >
                    <option value="theory">Theory</option>
                    <option value="practical">Practical</option>
                    <option value="lab">Lab</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5 w-full">
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="flex h-11 w-full rounded-xl border border-border bg-card px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button variant="secondary" type="button" onClick={() => setIsEditOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Subject'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* DELETE DIALOG MODAL WITH ARCHIVE OPTION */}
      {isDeleteConfirmOpen && selectedSubject && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <Card className="w-full max-w-md p-6 relative border border-border shadow-xl flex flex-col gap-4">
            <div className="flex gap-3 items-start">
              <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-950/20 text-rose-500 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                  Delete Subject Permanently: {selectedSubject.name}?
                </h3>
                <p className="text-xs text-zinc-500">
                  Are you sure you want to permanently delete subject <span className="font-semibold text-zinc-700 dark:text-zinc-300">"{selectedSubject.name}"</span>?
                  This action cannot be undone and will permanently remove this subject record from the database.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="secondary" onClick={() => setIsDeleteConfirmOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleDeleteSubmit} disabled={isSubmitting} className="bg-rose-600 hover:bg-rose-700 text-white font-bold">
                {isSubmitting ? 'Deleting...' : 'Delete Permanently'}
              </Button>
            </div>
          </Card>
        </div>
      )}

    </div>
  );
}
