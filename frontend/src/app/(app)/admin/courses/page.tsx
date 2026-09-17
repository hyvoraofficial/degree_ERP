'use client';

import * as React from 'react';
import { 
  Plus, Search, Edit2, Trash2, BookOpen, RefreshCw, X, AlertTriangle, ArrowUp, ArrowDown, Eye, Book, Check, Layers
} from 'lucide-react';
import { courseService, Course } from '@/services/course.service';
import { branchService, Branch } from '@/services/branch.service';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/providers/ToastProvider';
import { useBranchContext } from '@/providers/BranchProvider';

interface SubjectFormRow {
  id?: string;
  name: string;
  code: string;
  subjectType: string;
  description?: string;
  status?: string;
}

export default function CoursesPage() {
  const { toast } = useToast();
  const { selectedBranchId } = useBranchContext();
  
  // Data lists states
  const [courses, setCourses] = React.useState<Course[]>([]);
  const [branches, setBranches] = React.useState<Branch[]>([]);
  
  // Pagination & query states
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [limit] = React.useState(100);
  const [search, setSearch] = React.useState('');
  const [branchFilter, setBranchFilter] = React.useState(selectedBranchId);
  const [statusFilter, setStatusFilter] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    setBranchFilter(selectedBranchId);
  }, [selectedBranchId]);

  // Modals states
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [isViewSyllabusOpen, setIsViewSyllabusOpen] = React.useState(false);
  const [selectedCourse, setSelectedCourse] = React.useState<Course | null>(null);
  const [viewCourseDetail, setViewCourseDetail] = React.useState<Course | null>(null);
  const [isLoadingSyllabus, setIsLoadingSyllabus] = React.useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = React.useState(false);
  const [courseToDelete, setCourseToDelete] = React.useState<Course | null>(null);

  // Form states
  const [formName, setFormName] = React.useState('');
  const [formCode, setFormCode] = React.useState('');
  const [formDescription, setFormDescription] = React.useState('');
  const [formBranchId, setFormBranchId] = React.useState('');
  const [formStatus, setFormStatus] = React.useState('active');
  const [formSubjects, setFormSubjects] = React.useState<SubjectFormRow[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Load branches list once for filters/forms
  React.useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await branchService.findAll('', 'active', 1, 100);
        setBranches(res.branches);
      } catch (err: any) {
        console.error('Failed to load branches:', err);
      }
    };
    fetchBranches();
  }, []);

  const fetchCourses = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await courseService.findAll(search, branchFilter, statusFilter, page, limit);
      setCourses(res.courses);
      setTotal(res.meta.total);
    } catch (err: any) {
      toast('Failed to load courses', err.message || 'Server error', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [search, branchFilter, statusFilter, page, limit, toast]);

  React.useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleOpenViewSyllabus = async (course: Course) => {
    setViewCourseDetail(course);
    setIsViewSyllabusOpen(true);
    setIsLoadingSyllabus(true);
    try {
      const detail = await courseService.findOne(course.id);
      setViewCourseDetail(detail);
    } catch (err: any) {
      console.error('Failed to load syllabus details:', err);
    } finally {
      setIsLoadingSyllabus(false);
    }
  };

  const handleOpenCreateModal = () => {
    setFormName('');
    setFormCode('');
    setFormDescription('');
    setFormBranchId(branches[0]?.id || selectedBranchId || '');
    setFormStatus('active');
    setFormSubjects([
      { name: '', code: '', subjectType: 'theory', description: '', status: 'active' }
    ]);
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = async (course: Course) => {
    setSelectedCourse(course);
    setFormName(course.name);
    setFormCode(course.code);
    setFormDescription(course.description || '');
    setFormBranchId(course.branchId);
    setFormStatus(course.status);
    setFormSubjects([]);
    setIsEditModalOpen(true);
    
    try {
      const detail = await courseService.findOne(course.id);
      const subs = (detail.subjects && detail.subjects.length > 0) 
        ? detail.subjects 
        : [{ name: '', code: '', subjectType: 'theory', description: '', status: 'active' }];
      setFormSubjects(subs);
    } catch (err: any) {
      toast('Failed to load course subjects', err.message || 'Server error', 'error');
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formBranchId) {
      toast('Validation Error', 'Please select a valid branch.', 'error');
      return;
    }
    const filteredSubs = formSubjects.filter(s => s.name.trim());

    if (filteredSubs.length === 0) {
      toast('Validation Error', 'Please enter at least one subject for this course.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await courseService.create({
        name: formName,
        code: formCode,
        description: formDescription || undefined,
        branchId: formBranchId,
        status: formStatus,
        subjects: filteredSubs,
      });
      toast('Success', 'Course and subjects created successfully.', 'success');
      setIsCreateModalOpen(false);
      fetchCourses();
    } catch (err: any) {
      toast('Creation Failed', err.message || 'Failed to create course.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;
    
    const filteredSubs = formSubjects.filter(s => s.name.trim());

    if (filteredSubs.length === 0) {
      toast('Validation Error', 'A course must have at least one active subject.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await courseService.update(selectedCourse.id, {
        name: formName,
        code: formCode,
        description: formDescription || undefined,
        branchId: formBranchId,
        status: formStatus,
        subjects: filteredSubs,
      });
      toast('Success', 'Course and syllabus updated successfully.', 'success');
      setIsEditModalOpen(false);
      if (viewCourseDetail && viewCourseDetail.id === selectedCourse.id) {
        handleOpenViewSyllabus(selectedCourse);
      }
      fetchCourses();
    } catch (err: any) {
      toast('Update Failed', err.message || 'Failed to update course.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDelete = (course: Course) => {
    setCourseToDelete(course);
    setIsConfirmDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!courseToDelete) return;
    setIsSubmitting(true);
    try {
      await courseService.remove(courseToDelete.id);
      toast('Success', 'Course archived successfully.', 'success');
      setIsConfirmDeleteOpen(false);
      fetchCourses();
    } catch (err: any) {
      toast('Failed to delete course', err.message || 'Server error', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Inline subjects list helpers
  const addSubjectRow = () => {
    setFormSubjects(prev => [
      ...prev,
      { name: '', code: '', subjectType: 'theory', description: '', status: 'active' }
    ]);
  };

  const removeSubjectRow = (index: number) => {
    setFormSubjects(prev => {
      const target = prev[index];
      if (target.id) {
        const next = [...prev];
        next[index] = { ...next[index], status: 'deleted' };
        return next;
      } else {
        return prev.filter((_, i) => i !== index);
      }
    });
  };

  const updateSubjectField = (index: number, field: keyof SubjectFormRow, value: string) => {
    setFormSubjects(prev => {
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

  const moveSubjectRow = (index: number, direction: 'up' | 'down') => {
    setFormSubjects(prev => {
      const next = [...prev];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target >= 0 && target < next.length) {
        const temp = next[index];
        next[index] = next[target];
        next[target] = temp;
      }
      return next;
    });
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6 select-none">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950">
            Course Management & Curriculum Syllabus
          </h1>
          <p className="text-xs text-slate-600 font-extrabold mt-1">
            Provision academic courses, configure curriculum branches, and inspect mapped subject syllabuses.
          </p>
        </div>
        <Button onClick={handleOpenCreateModal} className="h-10 shrink-0 gap-2 font-bold bg-primary hover:bg-primary/90 text-white rounded-xl shadow-xs cursor-pointer" disabled={branches.length === 0}>
          <Plus className="w-4 h-4" /> Create Course
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between border border-slate-200 bg-white shadow-xs">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search course name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-950 focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
          />
        </div>
        <div className="flex flex-wrap w-full md:w-auto gap-3 items-center justify-end">
          {/* Branch Filter */}
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="h-10 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary shadow-xs cursor-pointer"
          >
            <option value="">All Branches</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary shadow-xs cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <Button variant="secondary" onClick={fetchCourses} className="h-10 gap-1.5 shrink-0 font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300">
            <RefreshCw className="w-4 h-4 text-slate-700" /> Refresh
          </Button>
        </div>
      </Card>

      {/* Main Table view */}
      <Card className="overflow-hidden border border-slate-200 bg-white shadow-xs">
        {isLoading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            <p className="text-xs font-extrabold text-slate-600 animate-pulse">Loading Course List...</p>
          </div>
        ) : courses.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500">
              <BookOpen className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-950">No Courses Provisioned</h3>
              <p className="text-xs text-slate-600 font-bold max-w-sm">
                No matching course records found in this academy branch layout.
              </p>
            </div>
            <Button onClick={handleOpenCreateModal} className="h-9 gap-2 font-bold" disabled={branches.length === 0}>
              <Plus className="w-4 h-4" /> Provision First Course
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100 text-xs font-extrabold uppercase tracking-wider text-slate-900">
                  <th className="px-6 py-4">Course Detail</th>
                  <th className="px-6 py-4">Code</th>
                  <th className="px-6 py-4">Mapped Branch</th>
                  <th className="px-6 py-4">Syllabus & Subjects</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-bold text-slate-900">
                {courses.map((course) => (
                  <tr key={course.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => handleOpenViewSyllabus(course)}
                        className="flex flex-col text-left group cursor-pointer focus:outline-none"
                      >
                        <span className="font-extrabold text-slate-950 text-sm group-hover:text-indigo-600 group-hover:underline transition-colors flex items-center gap-1.5">
                          <BookOpen className="w-4 h-4 text-indigo-600 shrink-0" />
                          {course.name}
                        </span>
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-slate-100 border border-slate-200 text-slate-900 text-xs rounded font-extrabold font-mono">
                        {course.code}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-900 font-bold text-xs">
                        {course.branch?.name || 'Not mapped'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => handleOpenViewSyllabus(course)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer"
                        title="Inspect Course Syllabus & Subjects"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        {course.subjects && course.subjects.length > 0
                          ? `${course.subjects.length} Subjects`
                          : 'View Syllabus'}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-slate-600 font-semibold truncate max-w-xs block">
                        {course.description || 'No description provided'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={course.status === 'active' ? 'success' : 'neutral'}>
                        {course.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleOpenViewSyllabus(course)}
                          className="p-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:text-indigo-600 hover:border-indigo-400 transition-colors cursor-pointer shadow-xs"
                          title="View Syllabus Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(course)}
                          className="p-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:text-indigo-600 hover:border-indigo-400 transition-colors cursor-pointer shadow-xs"
                          title="Edit Course & Syllabus"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenDelete(course)}
                          className="p-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:text-rose-600 hover:border-rose-400 transition-colors cursor-pointer shadow-xs"
                          title="Archive Course"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
                <span className="text-xs text-slate-600 font-bold uppercase">
                  Showing {courses.length} of {total} entries
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="h-8 text-xs px-3 font-bold"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                    className="h-8 text-xs px-3 font-bold"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* VIEW SYLLABUS & SUBJECTS DRAWER */}
      {isViewSyllabusOpen && viewCourseDetail && (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-end backdrop-blur-xs">
          <div className="w-full max-w-full sm:max-w-xl md:max-w-2xl bg-white border-l border-slate-200 h-full flex flex-col shadow-2xl p-4 sm:p-6 overflow-y-auto animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
              <div>
                <h3 className="text-lg font-black text-slate-950">
                  Course & Curriculum Syllabus
                </h3>
                <p className="text-xs text-slate-600 font-extrabold uppercase tracking-wider mt-0.5">
                  Code: {viewCourseDetail.code} &bull; {viewCourseDetail.branch?.name || 'Campus Track'}
                </p>
              </div>
              <button
                onClick={() => setIsViewSyllabusOpen(false)}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Course Overview Card */}
              <div className="flex gap-4 items-center p-4 bg-slate-50 rounded-2xl border border-slate-200 shadow-xs">
                <div className="w-14 h-14 rounded-2xl bg-primary/20 text-primary flex items-center justify-center text-xl font-black shrink-0 border border-primary/30">
                  <BookOpen className="w-7 h-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-base font-black text-slate-950 block">
                    {viewCourseDetail.name}
                  </span>
                  <span className="text-xs text-slate-600 font-bold block mt-0.5">
                    {viewCourseDetail.description || 'Structured academic curriculum track'}
                  </span>
                </div>
                <Badge variant={viewCourseDetail.status === 'active' ? 'success' : 'neutral'}>
                  {viewCourseDetail.status}
                </Badge>
              </div>

              {/* Course Metadata */}
              <div className="grid grid-cols-3 gap-3 text-xs font-bold bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-center">
                <div className="p-2.5 bg-indigo-50 rounded-xl border border-indigo-200">
                  <span className="text-indigo-700 block text-[10px] uppercase font-black">Course Code</span>
                  <span className="text-sm font-black text-indigo-950 font-mono">{viewCourseDetail.code}</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-600 block text-[10px] uppercase font-extrabold">Campus Branch</span>
                  <span className="text-xs font-black text-slate-900 truncate block mt-0.5">{viewCourseDetail.branch?.name || 'All Campuses'}</span>
                </div>
                <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
                  <span className="text-emerald-700 block text-[10px] uppercase font-extrabold">Total Subjects</span>
                  <span className="text-sm font-black text-emerald-800">
                    {viewCourseDetail.subjects?.length || 0} Subjects
                  </span>
                </div>
              </div>

              {/* Syllabus Subjects Breakdown */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Book className="w-4 h-4 text-primary" /> Mapped Subjects & Teaching Curriculum
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setIsViewSyllabusOpen(false);
                      handleOpenEditModal(viewCourseDetail);
                    }}
                    className="h-8 text-xs gap-1.5 font-bold cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit Syllabus
                  </Button>
                </div>

                {isLoadingSyllabus ? (
                  <div className="py-8 text-center text-xs font-bold text-slate-500">Loading syllabus modules...</div>
                ) : viewCourseDetail.subjects && viewCourseDetail.subjects.length > 0 ? (
                  <div className="space-y-2.5">
                    {viewCourseDetail.subjects.map((sub, idx) => (
                      <div key={sub.id || idx} className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                        <div className="space-y-0.5">
                          <span className="text-sm font-extrabold text-slate-950">
                            {sub.name}
                          </span>
                          {sub.description && (
                            <p className="text-xs text-slate-500 font-medium pl-0.5">
                              {sub.description}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className="capitalize font-bold text-xs bg-slate-50 text-slate-800 border-slate-300">
                          {sub.subjectType || 'Theory'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-500 italic">
                    No subjects defined for this course yet. Click "Edit Syllabus" to add subjects.
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto">
          <Card className="w-full max-w-2xl p-4 sm:p-6 relative border border-slate-200 bg-white shadow-2xl rounded-3xl space-y-4 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-lg font-black text-slate-950 mb-1">
              Create Degree Program
            </h3>
            <p className="text-xs text-slate-600 font-extrabold uppercase tracking-wider mb-4">
              Academic degree program and curriculum configuration
            </p>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Program Name *"
                  id="name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. B.Tech Computer Science & Engineering"
                  required
                />
                <Input
                  label="Program Code *"
                  id="code"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  required
                  placeholder="e.g. BTECH-CSE"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 w-full">
                  <label className="text-xs font-bold text-slate-700">
                    Target Campus Branch *
                  </label>
                  <select
                    value={formBranchId}
                    onChange={(e) => setFormBranchId(e.target.value)}
                    className="flex h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-bold text-slate-900 cursor-pointer shadow-xs"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5 w-full">
                  <label className="text-xs font-bold text-slate-700">
                    Activation Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="flex h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-bold text-slate-900 cursor-pointer shadow-xs"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-xs font-bold text-slate-700">
                  Description
                </label>
                <textarea
                  id="description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                  placeholder="Brief summary of curriculum syllabus and objectives..."
                  className="flex w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
                />
              </div>

              {/* Subjects Sub-Form */}
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <div className="flex justify-between items-center bg-primary/5 p-3 rounded-xl border border-primary/20">
                  <div>
                    <span className="text-xs font-black text-primary uppercase tracking-wider block">Course Subjects / Syllabus (Required)</span>
                    <span className="text-[11px] font-bold text-slate-500">Define the subject curriculum taught under this track.</span>
                  </div>
                  <Button type="button" size="sm" variant="secondary" onClick={addSubjectRow} className="text-xs h-8 gap-1.5 font-bold cursor-pointer">
                    <Plus className="w-3.5 h-3.5" /> Add Subject
                  </Button>
                </div>

                <div className="space-y-3">
                  {formSubjects.map((sub, i) => (
                    <div key={i} className="flex flex-col gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="grid grid-cols-12 gap-3 items-center">
                        <div className="col-span-7">
                          <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block mb-1">Subject Name *</label>
                          <input
                            type="text"
                            placeholder="e.g. Physics"
                            value={sub.name}
                            onChange={(e) => updateSubjectField(i, 'name', e.target.value)}
                            className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:ring-2 focus:ring-primary"
                            required
                          />
                        </div>
                        <div className="col-span-3">
                          <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block mb-1">Type</label>
                          <select
                            value={sub.subjectType}
                            onChange={(e) => updateSubjectField(i, 'subjectType', e.target.value)}
                            className="w-full h-9 px-2 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-900 cursor-pointer"
                          >
                            <option value="theory">Theory</option>
                            <option value="practical">Practical</option>
                            <option value="lab">Lab</option>
                          </select>
                        </div>
                        <div className="col-span-2 flex justify-end gap-1 pt-4">
                          <button
                            type="button"
                            onClick={() => moveSubjectRow(i, 'up')}
                            disabled={i === 0}
                            className="p-1.5 rounded bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveSubjectRow(i, 'down')}
                            disabled={i === formSubjects.length - 1}
                            className="p-1.5 rounded bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeSubjectRow(i)}
                            className="p-1.5 rounded bg-white border border-slate-200 hover:bg-rose-50 text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {formSubjects.length === 0 && (
                    <div className="text-center py-4 text-xs font-bold text-slate-500 italic">No subjects added. Click "Add Subject" above to define curriculum subjects.</div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <Button variant="secondary" type="button" onClick={() => setIsCreateModalOpen(false)} className="font-bold">
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

      {/* EDIT MODAL */}
      {isEditModalOpen && selectedCourse && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto">
          <Card className="w-full max-w-2xl p-4 sm:p-6 relative border border-slate-200 bg-white shadow-2xl rounded-3xl space-y-4 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-lg font-black text-slate-950 mb-1">
              Edit Course & Syllabus
            </h3>
            <p className="text-xs text-slate-600 font-extrabold uppercase tracking-wider mb-4">
              Modify course track details and curriculum subjects
            </p>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Course Name *"
                  id="editName"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
                <Input
                  label="Course Code *"
                  id="editCode"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 w-full">
                  <label className="text-xs font-bold text-slate-700">
                    Target Campus Branch *
                  </label>
                  <select
                    value={formBranchId}
                    onChange={(e) => setFormBranchId(e.target.value)}
                    className="flex h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-bold text-slate-900 cursor-pointer shadow-xs"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5 w-full">
                  <label className="text-xs font-bold text-slate-700">
                    Activation Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="flex h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-bold text-slate-900 cursor-pointer shadow-xs"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-xs font-bold text-slate-700">
                  Description
                </label>
                <textarea
                  id="editDescription"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                  className="flex w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
                />
              </div>

              {/* Subjects Sub-Form */}
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <div className="flex justify-between items-center bg-primary/5 p-3 rounded-xl border border-primary/20">
                  <div>
                    <span className="text-xs font-black text-primary uppercase tracking-wider block">Course Subjects / Syllabus (Required)</span>
                    <span className="text-[11px] font-bold text-slate-500">Add or edit subjects in this curriculum.</span>
                  </div>
                  <Button type="button" size="sm" variant="secondary" onClick={addSubjectRow} className="text-xs h-8 gap-1.5 font-bold cursor-pointer">
                    <Plus className="w-3.5 h-3.5" /> Add Subject
                  </Button>
                </div>

                <div className="space-y-3">
                  {formSubjects.filter(s => s.status !== 'deleted').map((sub, i) => (
                    <div key={i} className="flex flex-col gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="grid grid-cols-12 gap-3 items-center">
                        <div className="col-span-7">
                          <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block mb-1">Subject Name *</label>
                          <input
                            type="text"
                            placeholder="e.g. Physics"
                            value={sub.name}
                            onChange={(e) => updateSubjectField(i, 'name', e.target.value)}
                            className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:ring-2 focus:ring-primary"
                            required
                          />
                        </div>
                        <div className="col-span-3">
                          <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block mb-1">Type</label>
                          <select
                            value={sub.subjectType}
                            onChange={(e) => updateSubjectField(i, 'subjectType', e.target.value)}
                            className="w-full h-9 px-2 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-900 cursor-pointer"
                          >
                            <option value="theory">Theory</option>
                            <option value="practical">Practical</option>
                            <option value="lab">Lab</option>
                          </select>
                        </div>
                        <div className="col-span-2 flex justify-end gap-1 pt-4">
                          <button
                            type="button"
                            onClick={() => moveSubjectRow(i, 'up')}
                            disabled={i === 0}
                            className="p-1.5 rounded bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveSubjectRow(i, 'down')}
                            disabled={i === formSubjects.length - 1}
                            className="p-1.5 rounded bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeSubjectRow(i)}
                            className="p-1.5 rounded bg-white border border-slate-200 hover:bg-rose-50 text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {formSubjects.filter(s => s.status !== 'deleted').length === 0 && (
                    <div className="text-center py-4 text-xs font-bold text-slate-500 italic">No subjects active. Click "Add Subject" above to add subjects.</div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <Button variant="secondary" type="button" onClick={() => setIsEditModalOpen(false)} className="font-bold">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="font-bold">
                  {isSubmitting ? 'Saving...' : 'Update Course & Syllabus'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {isConfirmDeleteOpen && courseToDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <Card className="w-full max-w-md p-6 border border-slate-200 bg-white shadow-xl space-y-4 rounded-3xl">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 shrink-0 border border-rose-200">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-950">
                  Archive Course Track?
                </h3>
                <p className="text-xs text-slate-600 font-bold">
                  Are you sure you want to archive course <span className="font-black text-slate-950">"{courseToDelete.name}"</span> ({courseToDelete.code})?
                  This will soft-delete the course and deactivate student batch mappings.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setIsConfirmDeleteOpen(false)} className="font-bold">
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDeleteConfirm} disabled={isSubmitting} className="font-bold">
                {isSubmitting ? 'Archiving...' : 'Archive Course'}
              </Button>
            </div>
          </Card>
        </div>
      )}

    </div>
  );
}
