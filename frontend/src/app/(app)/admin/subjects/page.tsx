'use client';

import * as React from 'react';
import { 
  Plus, Search, Edit2, Trash2, RefreshCw, X, AlertTriangle, Book, Layers, ShieldAlert, Users, UserCheck, CheckCircle, Eye, GraduationCap
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
  const [isViewSubjectOpen, setIsViewSubjectOpen] = React.useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = React.useState(false);

  // Target item state
  const [selectedSubject, setSelectedSubject] = React.useState<Subject | null>(null);

  // Form states - Create / Edit
  const [formName, setFormName] = React.useState('');
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
          s.name.toLowerCase().includes(query)
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

  const handleOpenViewSubject = (subject: Subject) => {
    setSelectedSubject(subject);
    setIsViewSubjectOpen(true);
  };

  const handleOpenCreate = () => {
    setFormName('');
    setFormDescription('');
    setFormCourseId(selectedCourseId || courses[0]?.id || '');
    setFormType('theory');
    setFormStatus('active');
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (subject: Subject) => {
    setSelectedSubject(subject);
    setFormName(subject.name);
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
        description: formDescription || undefined,
        subjectType: formType,
        courseId: formCourseId,
        status: formStatus,
      });
      toast('Success', 'Subject updated successfully.', 'success');
      setIsEditOpen(false);
      fetchSubjects();
    } catch (err: any) {
      toast('Update Failed', err.message || 'Could not update subject.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!selectedSubject) return;
    setIsSubmitting(true);
    try {
      await subjectService.remove(selectedSubject.id);
      toast('Deleted', `Subject "${selectedSubject.name}" deleted permanently.`, 'success');
      setIsDeleteConfirmOpen(false);
      fetchSubjects();
    } catch (err: any) {
      toast('Deletion Failed', err.message || 'Server error', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 select-none">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950">
            Subject Catalog & Teacher Assignments
          </h1>
          <p className="text-xs font-extrabold text-slate-600 mt-1">
            Manage academic subjects, track course curriculum mappings, and assign faculty teachers to subject cohorts.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200 shadow-2xs">
            <button
              onClick={() => setActiveTab('CATALOG')}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs font-black rounded-lg transition-all cursor-pointer text-center ${
                activeTab === 'CATALOG'
                  ? 'bg-white text-slate-950 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              Subject Catalog
            </button>
            <button
              onClick={() => setActiveTab('ASSIGNMENTS')}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs font-black rounded-lg transition-all cursor-pointer text-center ${
                activeTab === 'ASSIGNMENTS'
                  ? 'bg-white text-slate-950 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              Teacher Assignments
            </button>
          </div>
          {activeTab === 'CATALOG' && (
            <Button onClick={handleOpenCreate} className="gap-2 h-10 shrink-0 font-bold bg-primary hover:bg-primary/90 text-white rounded-xl shadow-xs cursor-pointer" disabled={courses.length === 0}>
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
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search by subject name or code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-950 focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
              />
            </div>
            
            <div className="flex flex-wrap w-full md:w-auto gap-3 items-center justify-end">
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="h-10 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer shadow-xs"
              >
                <option value="">All Courses</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="h-10 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer shadow-xs"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="archived">Archived</option>
              </select>

              <Button variant="secondary" onClick={fetchSubjects} className="h-10 gap-1.5 shrink-0 font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300">
                <RefreshCw className="w-4 h-4 text-slate-700" /> Refresh
              </Button>
            </div>
          </div>

          {/* Main Table view */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            {isLoading ? (
              <div className="p-16 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                <p className="text-xs font-extrabold text-slate-600 animate-pulse">Loading Subject Catalog...</p>
              </div>
            ) : subjects.length === 0 ? (
              <div className="p-16 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500">
                  <Book className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-black text-slate-950">No Subjects Found</h3>
                  <p className="text-xs text-slate-600 font-bold max-w-sm">
                    No active subjects are configured. Create new ones or refine search filters.
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100 text-xs font-extrabold uppercase tracking-wider text-slate-900">
                      <th className="px-6 py-4">Subject</th>
                      <th className="px-6 py-4">Course Track</th>
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-bold text-slate-900">
                    {subjects.map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <button
                            type="button"
                            onClick={() => handleOpenViewSubject(sub)}
                            className="flex flex-col text-left group cursor-pointer focus:outline-none"
                          >
                            <span className="font-extrabold text-slate-950 text-sm group-hover:text-indigo-600 group-hover:underline transition-colors flex items-center gap-1.5 capitalize">
                              <Book className="w-4 h-4 text-indigo-600 shrink-0" />
                              {sub.name}
                            </span>
                            {sub.description && <span className="text-xs text-slate-600 font-semibold line-clamp-1 mt-0.5">{sub.description}</span>}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-extrabold text-slate-900 text-xs">
                            {sub.course?.name || 'Unmapped Course'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className="capitalize font-bold text-xs bg-slate-50 text-slate-800 border-slate-300">
                            {sub.subjectType || 'theory'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={sub.status === 'active' ? 'success' : 'neutral'}>
                            {sub.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleOpenViewSubject(sub)}
                              className="p-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:text-indigo-600 hover:border-indigo-400 transition-colors cursor-pointer shadow-xs"
                              title="View Subject Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenEdit(sub)}
                              className="p-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:text-indigo-600 hover:border-indigo-400 transition-colors cursor-pointer shadow-xs"
                              title="Edit Subject"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenDelete(sub)}
                              className="p-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:text-rose-600 hover:border-rose-400 transition-colors cursor-pointer shadow-xs"
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
            <h3 className="text-base font-black text-slate-950">Assign Teacher to Subject Cohort</h3>
            <p className="text-xs font-extrabold text-slate-600">Select Campus Branch, Course Track, Subject, Batch, and Faculty Teacher to provision teaching authority.</p>

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
                    <option key={s.id} value={s.id}>{s.name}</option>
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
                <Button type="submit" disabled={isAssigning} className="gap-2 font-bold cursor-pointer">
                  <UserCheck className="w-4 h-4" /> {isAssigning ? 'Assigning...' : 'Assign Teacher'}
                </Button>
              </div>
            </form>
          </div>

          {/* Assignments List */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-100 flex justify-between items-center">
              <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Active Faculty Cohort Mappings</h4>
              <Button size="sm" variant="secondary" onClick={fetchAssignments} className="gap-1.5 text-xs font-bold cursor-pointer border-slate-300 bg-white hover:bg-slate-50 text-slate-800">
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </Button>
            </div>

            {assignments.length === 0 ? (
              <div className="p-12 text-center text-xs font-bold text-slate-500">
                No active teacher-subject assignments mapped.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm font-bold">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-900 uppercase tracking-wider text-xs bg-slate-100">
                      <th className="px-6 py-4">Teacher</th>
                      <th className="px-6 py-4">Subject</th>
                      <th className="px-6 py-4">Course</th>
                      <th className="px-6 py-4">Batch</th>
                      <th className="px-6 py-4">Branch</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-900">
                    {assignments.map(a => (
                      <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-black text-slate-950">
                          {a.teacher?.user?.firstName} {a.teacher?.user?.lastName}
                          <span className="text-xs font-mono font-bold text-slate-500 block">{a.teacher?.employeeNumber}</span>
                        </td>
                        <td className="px-6 py-4 text-primary font-black">{a.subject?.name}</td>
                        <td className="px-6 py-4 font-bold text-slate-900">{a.course?.name}</td>
                        <td className="px-6 py-4 text-slate-700">{a.batch?.name}</td>
                        <td className="px-6 py-4 text-slate-700">{a.branch?.name}</td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleRemoveAssignment(a.id)}
                            className="p-2 rounded-lg border border-slate-300 bg-white text-slate-600 hover:text-rose-600 hover:border-rose-400 transition-colors cursor-pointer shadow-xs"
                            title="Remove Assignment"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* VIEW SUBJECT DETAILS DRAWER */}
      {isViewSubjectOpen && selectedSubject && (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-end backdrop-blur-xs">
          <div className="w-full max-w-full sm:max-w-xl md:max-w-2xl bg-white border-l border-slate-200 h-full flex flex-col shadow-2xl p-4 sm:p-6 overflow-y-auto animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
              <div>
                <h3 className="text-lg font-black text-slate-950">
                  Subject Profile & Curriculum Sheet
                </h3>
                <p className="text-xs text-slate-600 font-extrabold uppercase tracking-wider mt-0.5">
                  {selectedSubject.course?.name || 'Academic Course'}
                </p>
              </div>
              <button
                onClick={() => setIsViewSubjectOpen(false)}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Subject Overview Card */}
              <div className="flex gap-4 items-center p-4 bg-slate-50 rounded-2xl border border-slate-200 shadow-xs">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center text-xl font-black shrink-0 border border-indigo-200">
                  <Book className="w-7 h-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-base font-black text-slate-950 block capitalize">
                    {selectedSubject.name}
                  </span>
                  <span className="text-xs text-slate-600 font-bold block mt-0.5">
                    {selectedSubject.description || 'Structured academic subject curriculum module'}
                  </span>
                </div>
                <Badge variant={selectedSubject.status === 'active' ? 'success' : 'neutral'}>
                  {selectedSubject.status}
                </Badge>
              </div>

              {/* Subject Metadata */}
              <div className="grid grid-cols-2 gap-3 text-xs font-bold bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-center">
                <div className="p-2.5 bg-indigo-50 rounded-xl border border-indigo-200">
                  <span className="text-indigo-700 block text-[10px] uppercase font-black">Subject Type</span>
                  <span className="text-sm font-black text-indigo-950 capitalize">{selectedSubject.subjectType || 'Theory'}</span>
                </div>
                <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
                  <span className="text-emerald-700 block text-[10px] uppercase font-extrabold">Course Track</span>
                  <span className="text-xs font-black text-emerald-950 truncate block mt-0.5">
                    {selectedSubject.course?.name || 'General Course'}
                  </span>
                </div>
              </div>

              {/* Quick Actions Card */}
              <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl shadow-xs">
                <div>
                  <span className="text-xs font-black text-slate-900 block">Edit or Modify Subject</span>
                  <span className="text-[11px] font-bold text-slate-500">Update naming, subject type, or track alignment.</span>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setIsViewSubjectOpen(false);
                    handleOpenEdit(selectedSubject);
                  }}
                  className="h-8 text-xs gap-1.5 font-bold cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit Subject
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE SUBJECT MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto">
          <Card className="w-full max-w-md p-4 sm:p-6 relative border border-slate-200 bg-white shadow-2xl rounded-3xl space-y-4 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsCreateOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-lg font-black text-slate-950 mb-1">
              Create New Subject
            </h3>
            <p className="text-xs text-slate-600 font-extrabold uppercase tracking-wider mb-4">
              Map academic subject to course curriculum
            </p>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <Input
                label="Subject Name *"
                id="subName"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
                placeholder="e.g. Inorganic Chemistry"
              />

              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-xs font-bold text-slate-700">Course Track *</label>
                <select
                  value={formCourseId}
                  onChange={(e) => setFormCourseId(e.target.value)}
                  className="flex h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer shadow-xs"
                  required
                >
                  <option value="" disabled>Select a course track...</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-xs font-bold text-slate-700">Subject Type</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as any)}
                  className="flex h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer shadow-xs"
                >
                  <option value="theory">Theory</option>
                  <option value="practical">Practical</option>
                  <option value="lab">Lab</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-xs font-bold text-slate-700">Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                  placeholder="Subject syllabus goals and chapter coverage..."
                  className="flex w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <Button variant="secondary" type="button" onClick={() => setIsCreateOpen(false)} className="font-bold">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="font-bold">
                  {isSubmitting ? 'Creating...' : 'Create Subject'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* EDIT SUBJECT MODAL */}
      {isEditOpen && selectedSubject && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto">
          <Card className="w-full max-w-md p-4 sm:p-6 relative border border-slate-200 bg-white shadow-2xl rounded-3xl space-y-4 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsEditOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-lg font-black text-slate-950 mb-1">
              Edit Subject Details
            </h3>
            <p className="text-xs text-slate-600 font-extrabold uppercase tracking-wider mb-4">
              Subject Name: {selectedSubject.name}
            </p>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <Input
                label="Subject Name *"
                id="subEditName"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
              />

              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-xs font-bold text-slate-700">Subject Type</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as any)}
                  className="flex h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer shadow-xs"
                >
                  <option value="theory">Theory</option>
                  <option value="practical">Practical</option>
                  <option value="lab">Lab</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-xs font-bold text-slate-700">Status</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  className="flex h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer shadow-xs"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-xs font-bold text-slate-700">Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                  className="flex w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <Button variant="secondary" type="button" onClick={() => setIsEditOpen(false)} className="font-bold">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="font-bold">
                  {isSubmitting ? 'Saving...' : 'Save Subject'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* DELETE DIALOG MODAL */}
      {isDeleteConfirmOpen && selectedSubject && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <Card className="w-full max-w-md p-6 relative border border-slate-200 bg-white shadow-xl flex flex-col gap-4 rounded-3xl">
            <div className="flex gap-3 items-start">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-950">
                  Delete Subject: {selectedSubject.name}?
                </h3>
                <p className="text-xs font-bold text-slate-600">
                  Are you sure you want to permanently delete subject <span className="font-black text-slate-950">"{selectedSubject.name}"</span>?
                  This action cannot be undone and will permanently remove this subject record.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <Button variant="secondary" onClick={() => setIsDeleteConfirmOpen(false)} className="font-bold">
                Cancel
              </Button>
              <Button onClick={handleDeleteSubmit} disabled={isSubmitting} className="bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer">
                {isSubmitting ? 'Deleting...' : 'Delete Permanently'}
              </Button>
            </div>
          </Card>
        </div>
      )}

    </div>
  );
}
