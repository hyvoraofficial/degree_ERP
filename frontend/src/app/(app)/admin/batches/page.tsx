'use client';

import * as React from 'react';
import { 
  Plus, Search, Edit2, Trash2, Layers, RefreshCw, X, AlertTriangle, Calendar, Users, Eye, BookOpen, UserCheck
} from 'lucide-react';
import { batchService, Batch } from '@/services/batch.service';
import { branchService, Branch } from '@/services/branch.service';
import { courseService, Course } from '@/services/course.service';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/providers/ToastProvider';
import { useBranchContext } from '@/providers/BranchProvider';

export default function BatchesPage() {
  const { toast } = useToast();
  const { selectedBranchId } = useBranchContext();
  
  // Data lists states
  const [batches, setBatches] = React.useState<Batch[]>([]);
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [courses, setCourses] = React.useState<Course[]>([]);
  
  // Pagination & query states
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [limit] = React.useState(100);
  const [search, setSearch] = React.useState('');
  const [branchFilter, setBranchFilter] = React.useState(selectedBranchId);
  const [courseFilter, setCourseFilter] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    setBranchFilter(selectedBranchId);
  }, [selectedBranchId]);

  // Modals states
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [isViewBatchOpen, setIsViewBatchOpen] = React.useState(false);
  const [selectedBatch, setSelectedBatch] = React.useState<Batch | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = React.useState(false);
  const [batchToDelete, setBatchToDelete] = React.useState<Batch | null>(null);

  // Form states
  const [formName, setFormName] = React.useState('');
  const [formCode, setFormCode] = React.useState('');
  const [formBranchId, setFormBranchId] = React.useState('');
  const [formCourseId, setFormCourseId] = React.useState('');
  const [formCapacity, setFormCapacity] = React.useState(30);
  const [formStartDate, setFormStartDate] = React.useState('');
  const [formEndDate, setFormEndDate] = React.useState('');
  const [formStatus, setFormStatus] = React.useState('active');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Load branches & courses lists for filters/forms
  React.useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [resBranches, resCourses] = await Promise.all([
          branchService.findAll('', 'active', 1, 100),
          courseService.findAll('', '', 'active', 1, 100),
        ]);
        setBranches(resBranches.branches);
        setCourses(resCourses.courses);
      } catch (err: any) {
        console.error('Failed to load filters dropdown data:', err);
      }
    };
    fetchDropdowns();
  }, []);

  const fetchBatches = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await batchService.findAll(search, branchFilter, courseFilter, statusFilter, page, limit);
      setBatches(res.batches);
      setTotal(res.meta.total);
    } catch (err: any) {
      toast('Failed to load batches', err.message || 'Server error', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [search, branchFilter, courseFilter, statusFilter, page, limit, toast]);

  React.useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  const handleOpenViewBatch = (batch: Batch) => {
    setSelectedBatch(batch);
    setIsViewBatchOpen(true);
  };

  const handleOpenCreateModal = () => {
    setFormName('');
    setFormCode('');
    setFormBranchId(branches[0]?.id || selectedBranchId || '');
    setFormCourseId(courses[0]?.id || '');
    setFormCapacity(30);
    setFormStartDate(new Date().toISOString().substring(0, 10));
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    setFormEndDate(nextYear.toISOString().substring(0, 10));
    setFormStatus('active');
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (batch: Batch) => {
    setSelectedBatch(batch);
    setFormName(batch.name);
    setFormCode(batch.code);
    setFormBranchId(batch.branchId);
    setFormCourseId(batch.courseId);
    setFormCapacity(batch.capacity || 30);
    setFormStartDate(batch.startDate ? batch.startDate.substring(0, 10) : '');
    setFormEndDate(batch.endDate ? batch.endDate.substring(0, 10) : '');
    setFormStatus(batch.status);
    setIsEditModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formBranchId || !formCourseId) {
      toast('Validation Error', 'Please select both a valid branch and course.', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      await batchService.create({
        name: formName,
        code: formCode,
        branchId: formBranchId,
        courseId: formCourseId,
        capacity: Number(formCapacity),
        startDate: formStartDate,
        endDate: formEndDate,
        status: formStatus,
      });
      toast('Success', 'Batch provisioned successfully.', 'success');
      setIsCreateModalOpen(false);
      fetchBatches();
    } catch (err: any) {
      toast('Creation Failed', err.message || 'Could not provision study batch.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch) return;
    setIsSubmitting(true);
    try {
      await batchService.update(selectedBatch.id, {
        name: formName,
        code: formCode,
        branchId: formBranchId,
        courseId: formCourseId,
        capacity: Number(formCapacity),
        startDate: formStartDate,
        endDate: formEndDate,
        status: formStatus,
      });
      toast('Success', 'Batch details updated successfully.', 'success');
      setIsEditModalOpen(false);
      fetchBatches();
    } catch (err: any) {
      toast('Update Failed', err.message || 'Could not update batch.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDelete = (batch: Batch) => {
    setBatchToDelete(batch);
    setIsConfirmDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!batchToDelete) return;
    try {
      await batchService.remove(batchToDelete.id);
      toast('Success', 'Batch archived successfully.', 'success');
      setIsConfirmDeleteOpen(false);
      fetchBatches();
    } catch (err: any) {
      toast('Archiving Failed', err.message || 'Ensure no active students exist before deletion.', 'error');
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6 select-none">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950">
            Batch & Cohort Management
          </h1>
          <p className="text-xs font-extrabold text-slate-600 mt-1">
            Provision academic class intakes, specify student limits, and schedule active semesters.
          </p>
        </div>
        <Button onClick={handleOpenCreateModal} className="h-10 shrink-0 gap-2 font-bold bg-primary hover:bg-primary/90 text-white rounded-xl shadow-xs cursor-pointer" disabled={branches.length === 0 || courses.length === 0}>
          <Plus className="w-4 h-4" /> Create Batch
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 flex flex-col lg:flex-row gap-4 items-center justify-between border border-slate-200 bg-white shadow-xs">
        <div className="relative w-full lg:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search batch name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-950 focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
          />
        </div>
        <div className="flex flex-wrap w-full lg:w-auto gap-3 items-center justify-end">
          {/* Branch Filter */}
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="h-10 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer shadow-xs"
          >
            <option value="">All Branches</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          {/* Course Filter */}
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="h-10 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer shadow-xs"
          >
            <option value="">All Courses</option>
            {courses.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer shadow-xs"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <Button variant="secondary" onClick={fetchBatches} className="h-10 gap-1.5 shrink-0 font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300">
            <RefreshCw className="w-4 h-4 text-slate-700" /> Refresh
          </Button>
        </div>
      </Card>

      {/* Main Table view */}
      <Card className="overflow-hidden border border-slate-200 bg-white shadow-xs">
        {isLoading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            <p className="text-xs font-extrabold text-slate-600 animate-pulse">Loading Batch Rosters...</p>
          </div>
        ) : batches.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500">
              <Layers className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-950">No Batches Configured</h3>
              <p className="text-xs text-slate-600 font-bold max-w-sm">
                No matching batch intakes found in this academy branch layout.
              </p>
            </div>
            <Button onClick={handleOpenCreateModal} className="h-9 gap-2 font-bold" disabled={branches.length === 0 || courses.length === 0}>
              <Plus className="w-4 h-4" /> Provision First Batch
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100 text-xs font-extrabold uppercase tracking-wider text-slate-900">
                  <th className="px-6 py-4">Batch Detail</th>
                  <th className="px-6 py-4">Code</th>
                  <th className="px-6 py-4">Campus / Course</th>
                  <th className="px-6 py-4">Dates / Semester</th>
                  <th className="px-6 py-4">Students Enrolled</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-bold text-slate-900">
                {batches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => handleOpenViewBatch(batch)}
                        className="flex flex-col text-left group cursor-pointer focus:outline-none"
                      >
                        <span className="font-extrabold text-slate-950 text-sm group-hover:text-indigo-600 group-hover:underline transition-colors flex items-center gap-1.5">
                          <Layers className="w-4 h-4 text-indigo-600 shrink-0" />
                          {batch.name}
                        </span>
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => handleOpenViewBatch(batch)}
                        className="px-2 py-1 bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-900 hover:text-indigo-600 text-xs rounded font-extrabold font-mono transition-colors cursor-pointer"
                      >
                        {batch.code}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-extrabold text-slate-950 text-xs">{batch.branch?.name}</span>
                        <span className="text-[11px] text-slate-600 font-bold mt-0.5">{batch.course?.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-slate-700 font-bold">
                        <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" /> 
                        <span>
                          {new Date(batch.startDate).toLocaleDateString(undefined, { dateStyle: 'short' })} – {new Date(batch.endDate).toLocaleDateString(undefined, { dateStyle: 'short' })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-600" />
                        <span className="text-slate-950 font-black text-xs">
                          {batch._count?.students || 0}
                        </span>
                        <span className="text-slate-400 font-bold">/</span>
                        <span className="text-xs text-slate-600 font-bold">
                          {batch.capacity} capacity
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={batch.status === 'active' ? 'success' : 'neutral'}>
                        {batch.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleOpenViewBatch(batch)}
                          className="p-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:text-indigo-600 hover:border-indigo-400 transition-colors cursor-pointer shadow-xs"
                          title="View Batch Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(batch)}
                          className="p-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:text-indigo-600 hover:border-indigo-400 transition-colors cursor-pointer shadow-xs"
                          title="Edit Batch"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenDelete(batch)}
                          className="p-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:text-rose-600 hover:border-rose-400 transition-colors cursor-pointer shadow-xs"
                          title="Archive Batch"
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
                  Showing {batches.length} of {total} entries
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

      {/* VIEW BATCH DETAILS DRAWER */}
      {isViewBatchOpen && selectedBatch && (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-end backdrop-blur-xs">
          <div className="w-full max-w-full sm:max-w-xl md:max-w-2xl bg-white border-l border-slate-200 h-full flex flex-col shadow-2xl p-4 sm:p-6 overflow-y-auto animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
              <div>
                <h3 className="text-lg font-black text-slate-950">
                  Batch Profile & Intake Sheet
                </h3>
                <p className="text-xs text-slate-600 font-extrabold uppercase tracking-wider mt-0.5">
                  Code: {selectedBatch.code} &bull; {selectedBatch.branch?.name || 'Campus Batch'}
                </p>
              </div>
              <button
                onClick={() => setIsViewBatchOpen(false)}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Batch Overview Card */}
              <div className="flex gap-4 items-center p-4 bg-slate-50 rounded-2xl border border-slate-200 shadow-xs">
                <div className="w-14 h-14 rounded-2xl bg-primary/20 text-primary flex items-center justify-center text-xl font-black shrink-0 border border-primary/30">
                  <Layers className="w-7 h-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-base font-black text-slate-950 block">
                    {selectedBatch.name}
                  </span>
                  <span className="text-xs text-slate-600 font-bold block mt-0.5">
                    Course: {selectedBatch.course?.name || 'Academic Course Track'}
                  </span>
                </div>
                <Badge variant={selectedBatch.status === 'active' ? 'success' : 'neutral'}>
                  {selectedBatch.status}
                </Badge>
              </div>

              {/* Batch Metrics */}
              <div className="grid grid-cols-3 gap-3 text-xs font-bold bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-center">
                <div className="p-2.5 bg-indigo-50 rounded-xl border border-indigo-200">
                  <span className="text-indigo-700 block text-[10px] uppercase font-black">Batch Code</span>
                  <span className="text-sm font-black text-indigo-950 font-mono">{selectedBatch.code}</span>
                </div>
                <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
                  <span className="text-emerald-700 block text-[10px] uppercase font-extrabold">Student Enrollment</span>
                  <span className="text-sm font-black text-emerald-800">
                    {selectedBatch._count?.students || 0} / {selectedBatch.capacity}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-600 block text-[10px] uppercase font-extrabold">Campus Branch</span>
                  <span className="text-xs font-black text-slate-900 truncate block mt-0.5">{selectedBatch.branch?.name || 'All Campuses'}</span>
                </div>
              </div>

              {/* Schedule Dates Card */}
              <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2">
                <span className="text-xs font-black text-slate-900 uppercase tracking-wider block border-b border-slate-200 pb-2 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-indigo-600" /> Academic Session Dates
                </span>
                <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-slate-500 font-bold block text-[10px] uppercase">Session Start Date</span>
                    <span className="text-slate-950 font-black">{new Date(selectedBatch.startDate).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block text-[10px] uppercase">Session End Date</span>
                    <span className="text-slate-950 font-black">{new Date(selectedBatch.endDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions Card */}
              <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl shadow-xs">
                <div>
                  <span className="text-xs font-black text-slate-900 block">Edit or Modify Batch</span>
                  <span className="text-[11px] font-bold text-slate-500">Update capacity, timing, or branch assignment.</span>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setIsViewBatchOpen(false);
                    handleOpenEditModal(selectedBatch);
                  }}
                  className="h-8 text-xs gap-1.5 font-bold cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit Batch
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto">
          <Card className="w-full max-w-xl p-6 relative border border-slate-200 bg-white shadow-2xl rounded-3xl space-y-4 my-8 max-h-[90vh] overflow-y-auto scrollbar-thin">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-lg font-black text-slate-950 mb-1">
              Create New Batch
            </h3>
            <p className="text-xs text-slate-600 font-extrabold uppercase tracking-wider mb-4">
              Academy operational intake & semester settings
            </p>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Batch Name *"
                  id="name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  placeholder="e.g. 2026 Batch A"
                />
                <Input
                  label="Batch Code *"
                  id="code"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  required
                  placeholder="e.g. NEET26A"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 w-full">
                  <label className="text-xs font-bold text-slate-700">
                    Target Branch *
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
                    Target Course *
                  </label>
                  <select
                    value={formCourseId}
                    onChange={(e) => setFormCourseId(e.target.value)}
                    className="flex h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-bold text-slate-900 cursor-pointer shadow-xs"
                  >
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Max Student Capacity"
                  id="capacity"
                  type="number"
                  value={String(formCapacity)}
                  onChange={(e) => setFormCapacity(Number(e.target.value))}
                  min={1}
                  max={500}
                  required
                />
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

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Session Start Date *"
                  id="startDate"
                  type="date"
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                  required
                />
                <Input
                  label="Session End Date *"
                  id="endDate"
                  type="date"
                  value={formEndDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <Button variant="secondary" type="button" onClick={() => setIsCreateModalOpen(false)} className="font-bold">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="font-bold">
                  {isSubmitting ? 'Provisioning...' : 'Provision Batch'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditModalOpen && selectedBatch && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto">
          <Card className="w-full max-w-xl p-6 relative border border-slate-200 bg-white shadow-2xl rounded-3xl space-y-4 my-8 max-h-[90vh] overflow-y-auto scrollbar-thin">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-lg font-black text-slate-950 mb-1">
              Edit Batch Intake
            </h3>
            <p className="text-xs text-slate-600 font-extrabold uppercase tracking-wider mb-4">
              Modify cohort schedule and capacity limits
            </p>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Batch Name *"
                  id="editName"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
                <Input
                  label="Batch Code *"
                  id="editCode"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 w-full">
                  <label className="text-xs font-bold text-slate-700">
                    Target Branch *
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
                    Target Course *
                  </label>
                  <select
                    value={formCourseId}
                    onChange={(e) => setFormCourseId(e.target.value)}
                    className="flex h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-bold text-slate-900 cursor-pointer shadow-xs"
                  >
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Max Student Capacity"
                  id="editCapacity"
                  type="number"
                  value={String(formCapacity)}
                  onChange={(e) => setFormCapacity(Number(e.target.value))}
                  min={1}
                  max={500}
                  required
                />
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

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Session Start Date *"
                  id="editStartDate"
                  type="date"
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                  required
                />
                <Input
                  label="Session End Date *"
                  id="editEndDate"
                  type="date"
                  value={formEndDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <Button variant="secondary" type="button" onClick={() => setIsEditModalOpen(false)} className="font-bold">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="font-bold">
                  {isSubmitting ? 'Saving...' : 'Update Batch'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {isConfirmDeleteOpen && batchToDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <Card className="w-full max-w-md p-6 border border-slate-200 bg-white shadow-xl space-y-4 rounded-3xl">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 shrink-0 border border-rose-200">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-950">
                  Archive Batch Intake?
                </h3>
                <p className="text-xs text-slate-600 font-bold">
                  Are you sure you want to archive batch <span className="font-black text-slate-950">"{batchToDelete.name}"</span> ({batchToDelete.code})?
                  This will archive the batch record and deactivate semester schedules.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setIsConfirmDeleteOpen(false)} className="font-bold">
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDeleteConfirm} className="font-bold">
                Archive Batch
              </Button>
            </div>
          </Card>
        </div>
      )}

    </div>
  );
}
