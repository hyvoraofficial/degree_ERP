'use client';

import * as React from 'react';
import { 
  Building2, Plus, Search, RefreshCw, Trash2, Edit2, Users, BookOpen, GraduationCap, X, Check, Eye
} from 'lucide-react';
import { departmentService, Department } from '@/services/department.service';
import { teacherService, Teacher } from '@/services/teacher.service';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/providers/ToastProvider';
import { useBranchContext } from '@/providers/BranchProvider';

export default function DepartmentsPage() {
  const { toast } = useToast();
  const { selectedBranchId, selectedBranch } = useBranchContext();

  const [departments, setDepartments] = React.useState<Department[]>([]);
  const [faculty, setFaculty] = React.useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const [selectedDept, setSelectedDept] = React.useState<Department | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Form Fields
  const [name, setName] = React.useState('');
  const [code, setCode] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [hodId, setHodId] = React.useState('');

  const fetchDepartments = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await departmentService.findAll(selectedBranchId || undefined, searchQuery);
      setDepartments(data);
    } catch (err: any) {
      toast('Failed to load departments', err.message || 'Error', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [selectedBranchId, searchQuery, toast]);

  const fetchFaculty = React.useCallback(async () => {
    try {
      const res = await teacherService.findAll('', selectedBranchId || undefined, 1, 100);
      setFaculty(res.teachers || []);
    } catch (e) {
      console.error('Failed to load faculty:', e);
    }
  }, [selectedBranchId]);

  React.useEffect(() => {
    fetchDepartments();
    fetchFaculty();
  }, [fetchDepartments, fetchFaculty]);

  const handleOpenCreate = () => {
    setName('');
    setCode('');
    setDescription('');
    setHodId('');
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (dept: Department) => {
    setSelectedDept(dept);
    setName(dept.name);
    setCode(dept.code);
    setDescription(dept.description || '');
    setHodId(dept.hodId || '');
    setIsEditModalOpen(true);
  };

  const handleOpenDelete = (dept: Department) => {
    setSelectedDept(dept);
    setIsDeleteModalOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code) {
      toast('Validation Error', 'Department name and code are required.', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      await departmentService.create({
        name,
        code: code.toUpperCase().trim(),
        description,
        branchId: selectedBranchId || undefined,
        hodId: hodId || undefined,
      });
      toast('Success', `Department "${name}" created successfully.`, 'success');
      setIsCreateModalOpen(false);
      fetchDepartments();
    } catch (err: any) {
      toast('Creation Failed', err.message || 'Error occurred', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDept || !name || !code) return;
    setIsSubmitting(true);
    try {
      await departmentService.update(selectedDept.id, {
        name,
        code: code.toUpperCase().trim(),
        description,
        hodId: hodId || undefined,
      });
      toast('Updated', `Department "${name}" updated successfully.`, 'success');
      setIsEditModalOpen(false);
      fetchDepartments();
    } catch (err: any) {
      toast('Update Failed', err.message || 'Error occurred', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDept) return;
    setIsSubmitting(true);
    try {
      await departmentService.delete(selectedDept.id);
      toast('Deleted', `Department "${selectedDept.name}" deactivated.`, 'success');
      setIsDeleteModalOpen(false);
      fetchDepartments();
    } catch (err: any) {
      toast('Delete Failed', err.message || 'Error occurred', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Department Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Academic departments, HOD assignments, and program affiliations for {selectedBranch?.name || 'All Campuses'}.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={fetchDepartments} 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            onClick={handleOpenCreate} 
            size="sm" 
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white"
          >
            <Plus className="w-4 h-4" />
            Add Department
          </Button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input 
            placeholder="Search departments by name or code (e.g., CSE, ECE, Mechanical)..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs border-slate-200"
          />
        </div>
      </div>

      {/* Departments Grid */}
      {isLoading ? (
        <div className="py-20 text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-500">Loading academic departments...</p>
        </div>
      ) : departments.length === 0 ? (
        <Card className="p-12 text-center bg-slate-50/50 border-dashed">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700">No Departments Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Get started by creating your college departments such as Computer Science, Electronics, Mechanical, or Business Administration.
          </p>
          <Button onClick={handleOpenCreate} size="sm" className="mt-4 gap-2">
            <Plus className="w-4 h-4" />
            Add First Department
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {departments.map((dept) => (
            <Card key={dept.id} className="p-5 flex flex-col justify-between hover:shadow-md transition-shadow border-slate-200">
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0 border border-blue-100">
                    {dept.code}
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => handleOpenEdit(dept)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      title="Edit Department"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => handleOpenDelete(dept)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete Department"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="font-extrabold text-slate-900 text-base leading-snug">{dept.name}</h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{dept.description || 'Undergraduate & postgraduate degree department.'}</p>

                {/* HOD Tag */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Head of Dept:</span>
                  <span className="text-xs font-bold text-slate-800 truncate">
                    {dept.hod ? dept.hod.name : <span className="text-amber-600 font-semibold">Not Assigned</span>}
                  </span>
                </div>
              </div>

              {/* Department Statistics */}
              <div className="mt-5 pt-3 border-t border-slate-100 grid grid-cols-4 gap-2 text-center bg-slate-50/70 p-2.5 rounded-lg">
                <div>
                  <span className="block text-xs font-black text-slate-900">{dept.stats?.programsCount || 0}</span>
                  <span className="text-[9px] font-bold text-slate-600">Programs</span>
                </div>
                <div>
                  <span className="block text-xs font-black text-slate-900">{dept.stats?.subjectsCount || 0}</span>
                  <span className="text-[9px] font-bold text-slate-600">Subjects</span>
                </div>
                <div>
                  <span className="block text-xs font-black text-slate-900">{dept.stats?.facultyCount || 0}</span>
                  <span className="text-[9px] font-bold text-slate-600">Faculty</span>
                </div>
                <div>
                  <span className="block text-xs font-black text-slate-900">{dept.stats?.studentsCount || 0}</span>
                  <span className="text-[9px] font-bold text-slate-600">Students</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Department Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-base text-slate-900">Add Academic Department</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Department Name *</label>
                <Input 
                  placeholder="e.g. Computer Science & Engineering"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Department Code *</label>
                <Input 
                  placeholder="e.g. CSE, ECE, MECH, BBA"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="text-xs font-mono uppercase"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Assign Head of Department (HOD)</label>
                <select 
                  value={hodId}
                  onChange={(e) => setHodId(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white text-slate-800"
                >
                  <option value="">-- Select Faculty HOD (Optional) --</option>
                  {faculty.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.user ? `${f.user.firstName} ${f.user.lastName || ''}`.trim() : f.employeeNumber} ({f.designation || 'Faculty'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea 
                  rows={3}
                  placeholder="Department focus, labs, and research areas..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 p-2.5 text-slate-800 focus:outline-hidden focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSubmitting} className="bg-primary text-white">
                  {isSubmitting ? 'Creating...' : 'Create Department'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Department Modal */}
      {isEditModalOpen && selectedDept && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-base text-slate-900">Edit Department</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Department Name *</label>
                <Input 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Department Code *</label>
                <Input 
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="text-xs font-mono uppercase"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Assign Head of Department (HOD)</label>
                <select 
                  value={hodId}
                  onChange={(e) => setHodId(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white text-slate-800"
                >
                  <option value="">-- Select Faculty HOD (Optional) --</option>
                  {faculty.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.user ? `${f.user.firstName} ${f.user.lastName || ''}`.trim() : f.employeeNumber} ({f.designation || 'Faculty'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea 
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 p-2.5 text-slate-800 focus:outline-hidden focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSubmitting} className="bg-primary text-white">
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedDept && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="font-extrabold text-base text-slate-900">Deactivate Department?</h3>
            <p className="text-xs text-slate-500 mt-2">
              Are you sure you want to deactivate <strong className="text-slate-800">{selectedDept.name}</strong>? Affiliated programs and subjects will remain in database records.
            </p>
            <div className="flex items-center justify-end gap-2 mt-6">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsDeleteModalOpen(false)}>
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={handleDelete} disabled={isSubmitting} className="bg-rose-600 text-white hover:bg-rose-700">
                {isSubmitting ? 'Deactivating...' : 'Confirm Deactivate'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
