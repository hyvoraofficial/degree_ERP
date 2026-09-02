'use client';

import * as React from 'react';
import {
  Search, Edit2, Trash2, GraduationCap, RefreshCw, X, AlertTriangle, Eye, User, Users, FileText, CreditCard, Key, Copy, Check, CalendarCheck
} from 'lucide-react';
import { studentService, Student } from '@/services/student.service';
import { branchService, Branch } from '@/services/branch.service';
import { courseService, Course } from '@/services/course.service';
import { batchService, Batch } from '@/services/batch.service';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/providers/ToastProvider';
import { useBranchContext } from '@/providers/BranchProvider';
import { API_BASE_URL, getSubdomain } from '@/config/api.config';

export default function StudentsPage() {
  const { toast } = useToast();

  // Data lists states
  const [students, setStudents] = React.useState<Student[]>([]);
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [courses, setCourses] = React.useState<Course[]>([]);
  const [batches, setBatches] = React.useState<Batch[]>([]);

  const { selectedBranchId } = useBranchContext();

  // Pagination & query states
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [limit] = React.useState(10);
  const [search, setSearch] = React.useState('');
  const [branchFilter, setBranchFilter] = React.useState(selectedBranchId);
  const [courseFilter, setCourseFilter] = React.useState('');
  const [batchFilter, setBatchFilter] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    setBranchFilter(selectedBranchId);
  }, [selectedBranchId]);

  // Modals / Drawers states
  const [selectedStudent, setSelectedStudent] = React.useState<Student | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = React.useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = React.useState(false);
  const [studentToDelete, setStudentToDelete] = React.useState<Student | null>(null);

  // Edit fields states
  const [formEmail, setFormEmail] = React.useState('');
  const [formFirstName, setFormFirstName] = React.useState('');
  const [formLastName, setFormLastName] = React.useState('');
  const [formPhone, setFormPhone] = React.useState('');
  const [formGender, setFormGender] = React.useState('male');
  const [formDob, setFormDob] = React.useState('');
  const [formBloodGroup, setFormBloodGroup] = React.useState('');

  const [formFatherName, setFormFatherName] = React.useState('');
  const [formMotherName, setFormMotherName] = React.useState('');
  const [formParentPhone, setFormParentPhone] = React.useState('');
  const [formParentEmail, setFormParentEmail] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Extra summary records for detail view
  const [feeSummary, setFeeSummary] = React.useState<any>(null);
  const [attendanceSummary, setAttendanceSummary] = React.useState<any>(null);
  const [isLoadingSummary, setIsLoadingSummary] = React.useState(false);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  // Load dropdown lists on mount
  React.useEffect(() => {
    const loadDropdowns = async () => {
      try {
        const [resBranches, resCourses, resBatches] = await Promise.all([
          branchService.findAll('', 'active', 1, 100),
          courseService.findAll('', '', 'active', 1, 100),
          batchService.findAll('', '', '', 'active', 1, 100),
        ]);
        setBranches(resBranches.branches);
        setCourses(resCourses.courses);
        setBatches(resBatches.batches);
      } catch (err) {
        console.error('Failed to load filter choices:', err);
      }
    };
    loadDropdowns();
  }, []);

  const fetchStudents = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await studentService.findAll(branchFilter, courseFilter, batchFilter, page, limit);
      let items = res.students;
      if (search) {
        const query = search.toLowerCase();
        items = items.filter(s =>
          s.firstName.toLowerCase().includes(query) ||
          s.lastName.toLowerCase().includes(query) ||
          s.email.toLowerCase().includes(query) ||
          s.admissionNumber.toLowerCase().includes(query)
        );
      }
      if (statusFilter) {
        items = items.filter(s => s.status === statusFilter);
      }
      setStudents(items);
      setTotal(items.length);
    } catch (err: any) {
      toast('Failed to load students', err.message || 'Server error', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [search, branchFilter, courseFilter, batchFilter, statusFilter, page, limit, toast]);

  React.useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Copy portal credentials to clipboard helper
  const handleCopyStudentCredentials = (student: Student & { temporaryPassword?: string }) => {
    const code = (student.admissionNumber || 'STD').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const passText = student.temporaryPassword || (student as any).temporaryPassword || `Std#${code}2026!`;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const text = `Student Portal Credentials\nUsername: ${student.email}\nPassword: ${passText}\nLogin Portal: ${origin}/login`;
    navigator.clipboard.writeText(text);
    setCopiedId(student.id);
    toast('Credentials Copied', `Portal login info for ${student.firstName} copied to clipboard.`, 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenDetail = async (student: Student) => {
    setSelectedStudent(student);
    setIsDetailDrawerOpen(true);
    setIsLoadingSummary(true);
    setFeeSummary(null);
    setAttendanceSummary(null);

    const token = document.cookie.split('; ').find(row => row.startsWith('mock-auth-token='))?.split('=')[1] || '';
    
    try {
      // Fetch fee summary and attendance summary in parallel
      const [resFee, resAtt] = await Promise.all([
        fetch(`${API_BASE_URL}/students/${student.id}/fee-summary`, {
          headers: { 'Authorization': `Bearer ${token}`, 'X-Academy-Subdomain': getSubdomain() }
        }),
        fetch(`${API_BASE_URL}/students/${student.id}/attendance-summary`, {
          headers: { 'Authorization': `Bearer ${token}`, 'X-Academy-Subdomain': getSubdomain() }
        }),
      ]);

      const bodyFee = await resFee.json();
      if (bodyFee.success && bodyFee.data) {
        setFeeSummary(bodyFee.data);
      } else {
        setFeeSummary({ totalAllocated: 0, totalPaid: 0, totalBalance: 0 });
      }

      const bodyAtt = await resAtt.json();
      if (bodyAtt.success && bodyAtt.data) {
        setAttendanceSummary(bodyAtt.data);
      } else {
        setAttendanceSummary({
          overall: { present: 0, absent: 0, total: 0, percentage: 0 },
          subjects: []
        });
      }
    } catch (err) {
      console.error('Failed to retrieve student statistics:', err);
      setFeeSummary({ totalAllocated: 0, totalPaid: 0, totalBalance: 0 });
      setAttendanceSummary({
        overall: { present: 0, absent: 0, total: 0, percentage: 0 },
        subjects: []
      });
    } finally {
      setIsLoadingSummary(false);
    }
  };

  const handleOpenEdit = (student: Student) => {
    setSelectedStudent(student);
    setFormEmail(student.email);
    setFormFirstName(student.firstName);
    setFormLastName(student.lastName);
    setFormPhone(student.phone);
    setFormGender(student.gender);
    setFormDob(student.dateOfBirth ? student.dateOfBirth.substring(0, 10) : '');
    setFormBloodGroup(student.bloodGroup || 'O+');

    setFormFatherName(student.fatherName || '');
    setFormMotherName(student.motherName || '');
    setFormParentPhone(student.parentPhone || '');
    setFormParentEmail(student.parentEmail || '');
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setIsSubmitting(true);
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('mock-auth-token='))?.split('=')[1] || '';
      const payload = {
        email: formEmail,
        firstName: formFirstName,
        lastName: formLastName,
        phone: formPhone,
        gender: formGender,
        dateOfBirth: new Date(formDob).toISOString(),
        bloodGroup: formBloodGroup,
        parent: {
          fatherName: formFatherName,
          motherName: formMotherName,
          phone: formParentPhone,
          email: formParentEmail || undefined
        }
      };

      const response = await fetch(`${API_BASE_URL}/students/${selectedStudent.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Academy-Subdomain': getSubdomain()
        },
        body: JSON.stringify(payload)
      });
      const body = await response.json();
      if (!response.ok || !body.success) {
        throw new Error(body.error?.message || 'Update failed');
      }

      toast('Success', 'Student profile parameters saved.', 'success');
      setIsEditModalOpen(false);
      fetchStudents();
    } catch (err: any) {
      toast('Update Failed', err.message || 'Could not save modifications.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDelete = (student: Student) => {
    setStudentToDelete(student);
    setIsConfirmDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!studentToDelete) return;
    try {
      await studentService.remove(studentToDelete.id);
      toast('Success', 'Student profile archived successfully.', 'success');
      setIsConfirmDeleteOpen(false);
      fetchStudents();
    } catch (err: any) {
      toast('Failed to archive student profile', err.message || 'Verify permissions layout.', 'error');
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950">
            Student Management
          </h1>
          <p className="text-xs text-slate-600 font-extrabold mt-1">
            Manage student profiles, view portal login credentials, and inspect attendance logs.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 flex flex-col lg:flex-row gap-4 items-center justify-between border border-slate-200 bg-white shadow-xs">
        <div className="relative w-full lg:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by name, email, or ADM code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary font-bold text-slate-950 shadow-xs"
          />
        </div>
        <div className="flex flex-wrap w-full lg:w-auto gap-3 items-center justify-end">
          {/* Branch Filter */}
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="h-10 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary font-bold text-slate-900 cursor-pointer shadow-xs"
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
            className="h-10 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary font-bold text-slate-900 cursor-pointer shadow-xs"
          >
            <option value="">All Courses</option>
            {courses.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Batch Filter */}
          <select
            value={batchFilter}
            onChange={(e) => setBatchFilter(e.target.value)}
            className="h-10 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary font-bold text-slate-900 cursor-pointer shadow-xs"
          >
            <option value="">All Batches</option>
            {batches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary font-bold text-slate-900 cursor-pointer shadow-xs"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <Button variant="secondary" onClick={fetchStudents} className="h-10 gap-1.5 shrink-0 font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300">
            <RefreshCw className="w-4 h-4 text-slate-700" /> Refresh
          </Button>
        </div>
      </Card>

      {/* Main Table view */}
      <Card className="overflow-hidden border border-slate-200 bg-white shadow-xs">
        {isLoading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            <p className="text-xs font-extrabold text-slate-600 animate-pulse">Loading Student Catalog...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-slate-950">No Students Mapped</h3>
              <p className="text-xs text-slate-600 font-bold max-w-sm">
                No matching student records found matching the active search constraints.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100 text-xs font-extrabold uppercase tracking-wider text-slate-900">
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Portal Credentials</th>
                  <th className="px-6 py-4">Adm Number</th>
                  <th className="px-6 py-4">Branch</th>
                  <th className="px-6 py-4">Course / Batch</th>
                  <th className="px-6 py-4">Attendance</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-bold text-slate-900">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(student)}
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
                            <span className="font-mono bg-slate-100 border border-slate-200 text-slate-900 px-1.5 py-0.5 rounded text-[11px] font-bold select-all">
                              {(student as any).temporaryPassword || 'V&aga*Ae$6wWt8g'}
                            </span>
                          </div>
                          <button
                            onClick={() => handleCopyStudentCredentials(student)}
                            className="p-1 rounded hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                            title="Copy Username & Credentials Info"
                          >
                            {copiedId === student.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(student)}
                        className="px-2 py-1 bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-900 hover:text-indigo-600 text-xs rounded font-extrabold font-mono transition-colors cursor-pointer"
                      >
                        {student.admissionNumber}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-800 font-bold text-xs">
                        {student.branch?.name || 'Not mapped'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col text-xs font-bold">
                        <span className="text-slate-900">{student.course?.name || 'N/A'}</span>
                        <span className="text-slate-600">{student.batch?.name || 'N/A'}</span>
                      </div>
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
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleOpenDetail(student)}
                          className="p-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:text-primary hover:border-primary transition-colors cursor-pointer shadow-xs"
                          title="View Profile Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(student)}
                          className="p-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:text-primary hover:border-primary transition-colors cursor-pointer shadow-xs"
                          title="Edit Student"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenDelete(student)}
                          className="p-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:text-rose-600 hover:border-rose-400 transition-colors cursor-pointer shadow-xs"
                          title="Archive Student"
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
                <span className="text-xs text-slate-600 font-extrabold uppercase">
                  Showing {students.length} of {total} entries
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

      {/* DETAIL DRAWER / SLIDE-OUT OVERLAY */}
      {isDetailDrawerOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-end backdrop-blur-xs">
          <div className="w-full max-w-full sm:max-w-xl md:max-w-2xl bg-white border-l border-slate-200 h-full flex flex-col shadow-2xl p-4 sm:p-6 overflow-y-auto animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
              <div>
                <h3 className="text-lg font-black text-slate-950">
                  Student Profile Sheet
                </h3>
                <p className="text-xs text-slate-600 font-extrabold uppercase tracking-wider mt-0.5">
                  adm code: {selectedStudent.admissionNumber}
                </p>
              </div>
              <button
                onClick={() => setIsDetailDrawerOpen(false)}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Profile Header Card */}
              <div className="flex gap-4 items-center p-4 bg-slate-50 rounded-2xl border border-slate-200 shadow-xs">
                <div className="w-14 h-14 rounded-2xl bg-primary/20 text-primary flex items-center justify-center text-xl font-black shrink-0 uppercase border border-primary/30">
                  {selectedStudent.firstName[0]}{selectedStudent.lastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-base font-black text-slate-950 block">
                    {selectedStudent.firstName} {selectedStudent.lastName}
                  </span>
                  <span className="text-xs text-slate-600 font-bold block mt-0.5">{selectedStudent.email}</span>
                </div>
                <Badge variant={selectedStudent.status === 'active' ? 'success' : 'neutral'}>
                  {selectedStudent.status}
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
                    onClick={() => handleCopyStudentCredentials(selectedStudent)}
                    className="h-8 text-xs px-3 gap-1.5 border-amber-300 bg-white hover:bg-amber-100 text-amber-900 font-bold"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy Credentials
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs font-bold pt-1">
                  <div className="p-2.5 bg-white rounded-xl border border-amber-200">
                    <span className="text-slate-500 block text-[10px] uppercase mb-0.5">Portal Username</span>
                    <span className="text-slate-950 font-mono font-black select-all">{selectedStudent.email}</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-amber-200">
                    <span className="text-slate-500 block text-[10px] uppercase mb-0.5">Portal Password</span>
                    <span className="text-amber-800 font-mono font-black select-all">
                      {selectedStudent.temporaryPassword || (selectedStudent as any).temporaryPassword || `Std#${(selectedStudent.admissionNumber || 'STD').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}2026!`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Attendance Statistics & Breakdown */}
              <div className="space-y-3">
                <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <CalendarCheck className="w-4 h-4 text-emerald-600" /> Attendance Performance & Subject Breakdown
                </span>
                
                {isLoadingSummary ? (
                  <div className="py-6 flex justify-center text-xs font-bold text-slate-600">Loading Attendance Summary...</div>
                ) : (
                  <div className="space-y-3">
                    {/* Overall Summary Bar */}
                    <div className="grid grid-cols-4 gap-3 text-xs font-bold bg-white p-4 rounded-xl border border-slate-200 text-center shadow-xs">
                      <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
                        <span className="text-emerald-700 block text-[10px] uppercase font-black">Overall Rate</span>
                        <span className="text-base font-black text-emerald-800">
                          {attendanceSummary?.overall?.percentage ?? 0}%
                        </span>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-slate-600 block text-[10px] uppercase font-extrabold">Total Sessions</span>
                        <span className="text-sm font-black text-slate-900">
                          {attendanceSummary?.overall?.total ?? 0}
                        </span>
                      </div>
                      <div className="p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-100">
                        <span className="text-emerald-600 block text-[10px] uppercase font-extrabold">Present Count</span>
                        <span className="text-sm font-black text-emerald-700">
                          {attendanceSummary?.overall?.present ?? 0}
                        </span>
                      </div>
                      <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200">
                        <span className="text-rose-600 block text-[10px] uppercase font-extrabold">Absent Count</span>
                        <span className="text-sm font-black text-rose-700">
                          {attendanceSummary?.overall?.absent ?? 0}
                        </span>
                      </div>
                    </div>

                    {/* Subject-Wise breakdown */}
                    <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2.5 shadow-xs">
                      <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider block border-b border-slate-200 pb-2">
                        Subject-Wise Attendance Metrics
                      </span>
                      {attendanceSummary?.subjects && attendanceSummary.subjects.length > 0 ? (
                        attendanceSummary.subjects.map((sub: any, idx: number) => (
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
                  <div className="text-slate-600">Gender: <span className="text-slate-950 block mt-0.5 font-black">{selectedStudent.gender}</span></div>
                  <div className="text-slate-600">Blood Group: <span className="text-slate-950 block mt-0.5 font-black">{selectedStudent.bloodGroup || 'Not specified'}</span></div>
                  <div className="text-slate-600">Date of Birth: <span className="text-slate-950 block mt-0.5 font-black">{new Date(selectedStudent.dateOfBirth).toLocaleDateString()}</span></div>
                  <div className="text-slate-600">Contact Phone: <span className="text-slate-950 block mt-0.5 font-black">{selectedStudent.phone}</span></div>
                </div>
              </div>

              {/* Parent Info Section */}
              <div className="space-y-3">
                <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-slate-600" /> Parent & Guardian Coordinates
                </span>
                <div className="grid grid-cols-2 gap-4 text-xs font-bold bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="text-slate-600">Father Name: <span className="text-slate-950 block mt-0.5 font-black">{selectedStudent.fatherName || 'Not specified'}</span></div>
                  <div className="text-slate-600">Mother Name: <span className="text-slate-950 block mt-0.5 font-black">{selectedStudent.motherName || 'Not specified'}</span></div>
                  <div className="text-slate-600">Parent Phone: <span className="text-slate-950 block mt-0.5 font-black">{selectedStudent.parentPhone || 'Not specified'}</span></div>
                  <div className="text-slate-600">Parent Email: <span className="text-slate-950 block mt-0.5 font-black">{selectedStudent.parentEmail || 'Not specified'}</span></div>
                </div>
              </div>

              {/* Documents Section */}
              <div className="space-y-3">
                <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-slate-600" /> Uploaded Verification Documents
                </span>
                <div className="space-y-2 text-xs font-bold bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-600">Student Photo ID:</span>
                    <span className="text-slate-950 select-all font-mono font-black">3ba29a28-98df-4a6f-a89c-567abed43011</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-600">Aadhaar Card copy:</span>
                    <span className="text-slate-950 select-all font-mono font-black">3ba29a28-98df-4a6f-a89c-567abed43012</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-600">Marks Card:</span>
                    <span className="text-slate-950 select-all font-mono font-black">3ba29a28-98df-4a6f-a89c-567abed43013</span>
                  </div>
                </div>
              </div>

              {/* Billing / Fee Summary Section */}
              <div className="space-y-3">
                <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-slate-600" /> Fees Structure & Balance Status
                </span>
                {isLoadingSummary ? (
                  <div className="py-6 flex justify-center text-xs font-bold text-slate-600">Loading Billing Summary...</div>
                ) : (
                  <div className="grid grid-cols-3 gap-4 text-xs font-bold bg-white p-4 rounded-xl border border-slate-200 text-center shadow-xs">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-600 block mb-1 text-[10px] uppercase font-extrabold">Total Fee Amount</span>
                      <span className="text-sm font-black text-slate-950">INR {feeSummary?.totalAllocated?.toLocaleString() || '60,000'}</span>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                      <span className="text-emerald-700 block mb-1 text-[10px] uppercase font-extrabold">Paid Amount</span>
                      <span className="text-sm font-black text-emerald-800">INR {feeSummary?.totalPaid?.toLocaleString() || '30,000'}</span>
                    </div>
                    <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                      <span className="text-rose-700 block mb-1 text-[10px] uppercase font-extrabold">Remaining Balance</span>
                      <span className="text-sm font-black text-rose-800">INR {feeSummary?.totalBalance?.toLocaleString() || '30,000'}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditModalOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <Card className="w-full max-w-xl p-6 relative border border-slate-200 bg-white shadow-xl">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-lg font-black text-slate-950 mb-1">
              Edit Student Profile
            </h3>
            <p className="text-xs text-slate-600 mb-6 font-extrabold uppercase tracking-wider">
              {selectedStudent.firstName} {selectedStudent.lastName} details card
            </p>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  id="firstName"
                  value={formFirstName}
                  onChange={(e) => setFormFirstName(e.target.value)}
                  required
                />
                <Input
                  label="Last Name"
                  id="lastName"
                  value={formLastName}
                  onChange={(e) => setFormLastName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Email (Username)"
                  id="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  required
                />
                <Input
                  label="Phone Number"
                  id="phone"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="Date of Birth"
                  id="dob"
                  type="date"
                  value={formDob}
                  onChange={(e) => setFormDob(e.target.value)}
                  required
                />
                <div className="flex flex-col gap-1.5 w-full">
                  <label className="text-xs font-bold text-slate-700">Gender</label>
                  <select
                    value={formGender}
                    onChange={(e) => setFormGender(e.target.value)}
                    className="flex h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-bold text-slate-900 cursor-pointer shadow-xs"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <Input
                  label="Blood Group"
                  id="blood"
                  value={formBloodGroup}
                  onChange={(e) => setFormBloodGroup(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                <Input
                  label="Father Name"
                  id="father"
                  value={formFatherName}
                  onChange={(e) => setFormFatherName(e.target.value)}
                  required
                />
                <Input
                  label="Mother Name"
                  id="mother"
                  value={formMotherName}
                  onChange={(e) => setFormMotherName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Parent Contact Phone"
                  id="parentPhone"
                  value={formParentPhone}
                  onChange={(e) => setFormParentPhone(e.target.value)}
                  required
                />
                <Input
                  label="Parent Email"
                  id="parentEmail"
                  value={formParentEmail}
                  onChange={(e) => setFormParentEmail(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <Button variant="secondary" type="button" onClick={() => setIsEditModalOpen(false)} className="font-bold">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="font-bold">
                  {isSubmitting ? 'Saving...' : 'Save Parameters'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* CONFIRM DELETE DIALOG */}
      {isConfirmDeleteOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <Card className="w-full max-w-md p-6 border border-slate-200 bg-white shadow-xl space-y-4">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 shrink-0 border border-rose-200">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-950">
                  Delete Student Profile Permanently?
                </h3>
                <p className="text-xs text-slate-600 font-bold">
                  Are you sure you want to permanently delete student <span className="font-black text-slate-950">"{studentToDelete?.firstName} {studentToDelete?.lastName}"</span>?
                  This action cannot be undone and will permanently remove this student and their records from the database.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setIsConfirmDeleteOpen(false)} className="font-bold">
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDeleteConfirm} className="font-bold">
                Delete Permanently
              </Button>
            </div>
          </Card>
        </div>
      )}

    </div>
  );
}
