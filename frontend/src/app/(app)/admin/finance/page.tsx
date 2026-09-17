'use client';

import * as React from 'react';
import { 
  Plus, Search, Edit2, CreditCard, RefreshCw, X, AlertTriangle, Layers, IndianRupee, Calendar, Eye, FileText, CheckCircle 
} from 'lucide-react';
import { financeService, FeeStructure, FeeAllocation, PaymentHistoryItem } from '@/services/finance.service';
import { studentService, Student } from '@/services/student.service';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/providers/ToastProvider';

export default function FinancePage() {
  const { toast } = useToast();
  
  // Data lists states
  const [allocations, setAllocations] = React.useState<FeeAllocation[]>([]);
  const [structures, setStructures] = React.useState<FeeStructure[]>([]);
  const [students, setStudents] = React.useState<Student[]>([]);
  
  // Query & pagination states
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);

  // Modals states
  const [isCreatePlanOpen, setIsCreatePlanOpen] = React.useState(false);
  const [isAssignPlanOpen, setIsAssignPlanOpen] = React.useState(false);
  const [isCollectFeeOpen, setIsCollectFeeOpen] = React.useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = React.useState(false);
  
  const [selectedAllocation, setSelectedAllocation] = React.useState<FeeAllocation | null>(null);
  const [historyList, setHistoryList] = React.useState<PaymentHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = React.useState(false);

  // Form states - Create Structure
  const [planName, setPlanName] = React.useState('');
  const [planDescription, setPlanDescription] = React.useState('');
  const [planAmount, setPlanAmount] = React.useState(15000);
  const [planFrequency, setPlanFrequency] = React.useState('one_time');

  // Form states - Assign Structure
  const [assignStudentId, setAssignStudentId] = React.useState('');
  const [assignStructureId, setAssignStructureId] = React.useState('');
  const [assignDueDate, setAssignDueDate] = React.useState('');
  const [assignDiscount, setAssignDiscount] = React.useState(0);

  // Form states - Collect Fee Payment
  const [collectAmount, setCollectAmount] = React.useState(0);
  const [collectMode, setCollectMode] = React.useState('cash');
  const [collectRefNo, setCollectRefNo] = React.useState('');
  const [collectRemarks, setCollectRemarks] = React.useState('');

  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Load dropdown lists on mount
  const loadConfiguration = React.useCallback(async () => {
    try {
      const [resStructures, resStudents] = await Promise.all([
        financeService.findAllStructures(),
        studentService.findAll('', '', '', 1, 100),
      ]);
      setStructures(resStructures);
      setStudents(resStudents.students);
    } catch (err) {
      console.error('Failed to load catalog configurations:', err);
    }
  }, []);

  React.useEffect(() => {
    loadConfiguration();
  }, [loadConfiguration]);

  const fetchAllocations = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await financeService.findAllAllocations();
      let items = data;
      if (search) {
        const query = search.toLowerCase();
        items = items.filter(a => 
          a.student?.firstName.toLowerCase().includes(query) || 
          a.student?.lastName.toLowerCase().includes(query) || 
          a.student?.admissionNumber.toLowerCase().includes(query)
        );
      }
      if (statusFilter) {
        items = items.filter(a => a.status === statusFilter);
      }
      setAllocations(items);
    } catch (err: any) {
      toast('Failed to load fee ledger', err.message || 'Server error', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, toast]);

  React.useEffect(() => {
    fetchAllocations();
  }, [fetchAllocations]);

  const handleOpenAssignPlan = () => {
    setAssignStudentId(students[0]?.id || '');
    setAssignStructureId(structures[0]?.id || '');
    setAssignDueDate('');
    setAssignDiscount(0);
    setIsAssignPlanOpen(true);
  };

  const handleOpenCollectFee = (allocation: FeeAllocation) => {
    setSelectedAllocation(allocation);
    const remaining = Number(allocation.totalAmount) - Number(allocation.paidAmount);
    setCollectAmount(remaining);
    setCollectMode('cash');
    setCollectRefNo('');
    setCollectRemarks('');
    setIsCollectFeeOpen(true);
  };

  const handleOpenHistory = async (studentId: string) => {
    setIsHistoryOpen(true);
    setIsLoadingHistory(true);
    setHistoryList([]);
    try {
      const data = await financeService.getPaymentHistory(studentId);
      setHistoryList(data);
    } catch (err: any) {
      toast('Failed to load history', err.message || 'Could not fetch logs.', 'error');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Submit handlers
  const handleCreatePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await financeService.createStructure({
        name: planName,
        description: planDescription || undefined,
        amount: Number(planAmount),
        frequency: planFrequency,
      });
      toast('Success', 'Fee plan created successfully.', 'success');
      setIsCreatePlanOpen(false);
      setPlanName('');
      setPlanDescription('');
      loadConfiguration();
    } catch (err: any) {
      toast('Creation Failed', err.message || 'Could not create fee structure.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignPlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignStudentId || !assignStructureId || !assignDueDate) {
      toast('Validation Error', 'Please complete all required fields.', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      await financeService.createAllocation({
        studentId: assignStudentId,
        feeStructureId: assignStructureId,
        dueDate: assignDueDate,
        discountAmount: Number(assignDiscount),
      });
      toast('Fee Plan Allocated', 'Student ledger updated successfully.', 'success');
      setIsAssignPlanOpen(false);
      fetchAllocations();
    } catch (err: any) {
      toast('Allocation Failed', err.message || 'Could not assign fee plan.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCollectFeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAllocation) return;
    if (collectAmount <= 0) {
      toast('Validation Error', 'Payment amount must be greater than zero.', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      await financeService.recordOfflinePayment({
        feeAllocationId: selectedAllocation.id,
        amountPaid: Number(collectAmount),
        paymentMode: collectMode,
        referenceNo: collectRefNo || undefined,
        remarks: collectRemarks || undefined,
      });
      toast('Payment Collected', `Successfully recorded payment of INR ${collectAmount.toLocaleString()}.`, 'success');
      setIsCollectFeeOpen(false);
      fetchAllocations();
    } catch (err: any) {
      toast('Collection Failed', err.message || 'Could not record payment.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Stats aggregate values
  const totalOutstanding = allocations.reduce((sum, item) => sum + (Number(item.totalAmount) - Number(item.paidAmount)), 0);
  const totalPaid = allocations.reduce((sum, item) => sum + Number(item.paidAmount), 0);

  return (
    <div className="space-y-6 select-none">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950">
            Fee Structures & Ledger Management
          </h1>
          <p className="text-xs font-extrabold text-slate-600 mt-1">
            Configure installment billing structures, allocate fee plans, and log payments.
          </p>
        </div>
        <div className="flex gap-3 shrink-0">
          <Button onClick={handleOpenAssignPlan} className="gap-2 h-10 font-bold bg-primary hover:bg-primary/90 text-white rounded-xl shadow-xs cursor-pointer" disabled={structures.length === 0 || students.length === 0}>
            <CreditCard className="w-4 h-4" /> Assign Fee Plan
          </Button>
        </div>
      </div>

      {/* Aggregate metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="flex items-center gap-4 p-5 border border-slate-200 bg-white shadow-xs">
          <div className="w-13 h-13 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
            <IndianRupee className="w-7 h-7" />
          </div>
          <div>
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">Total Paid Fees</span>
            <span className="text-2xl font-black text-slate-950 block mt-0.5">INR {totalPaid.toLocaleString()}</span>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-5 border border-slate-200 bg-white shadow-xs">
          <div className="w-13 h-13 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div>
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">Outstanding Fees Balance</span>
            <span className="text-2xl font-black text-slate-950 block mt-0.5">INR {totalOutstanding.toLocaleString()}</span>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-5 border border-slate-200 bg-white shadow-xs">
          <div className="w-13 h-13 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0">
            <Layers className="w-7 h-7" />
          </div>
          <div>
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">Registered Fee Structures</span>
            <span className="text-2xl font-black text-slate-950 block mt-0.5">{structures.length} Plans</span>
          </div>
        </Card>
      </div>

      {/* Configured Fee Structures Catalog Section */}
      <Card className="p-6 border border-slate-200 bg-white shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <h3 className="text-base font-black text-slate-950 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              Configured Tuition Fee Structures & Plans
            </h3>
            <p className="text-xs font-extrabold text-slate-600 mt-0.5">
              Fee structures defined here will automatically reflect in the New Admission Registration form.
            </p>
          </div>
          <Button onClick={() => setIsCreatePlanOpen(true)} className="gap-2 h-9 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer rounded-xl">
            <Plus className="w-4 h-4" /> Add Fee Structure
          </Button>
        </div>

        {structures.length === 0 ? (
          <div className="p-8 text-center bg-slate-50/70 rounded-xl border border-dashed border-slate-200">
            <p className="text-xs font-bold text-slate-600">No custom fee structures defined yet.</p>
            <p className="text-[11px] text-slate-400 mt-1">Click "Add Fee Structure" above to define tuition payment plans for student admissions.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {structures.map(struct => (
              <div key={struct.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2 hover:border-indigo-300 hover:bg-slate-50 transition-colors shadow-2xs">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-black text-slate-950 text-sm">{struct.name}</h4>
                    <span className="text-[11px] font-extrabold text-indigo-700 uppercase tracking-wider block mt-0.5">
                      Frequency: {struct.frequency ? struct.frequency.replace('_', ' ') : 'Yearly'}
                    </span>
                  </div>
                  <Badge variant="info" className="font-black text-xs bg-indigo-50 text-indigo-800 border-indigo-200">
                    INR {Number(struct.amount).toLocaleString('en-IN')}
                  </Badge>
                </div>
                {struct.description && (
                  <p className="text-xs text-slate-600 font-medium line-clamp-2">{struct.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Filter and Search Bar */}
      <Card className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between border border-slate-200 bg-white shadow-xs">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by student name or ADM code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-950 focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
          />
        </div>
        <div className="flex flex-wrap w-full md:w-auto gap-3 items-center justify-end">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer shadow-xs"
          >
            <option value="">All Statuses</option>
            <option value="unpaid">Unpaid</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="paid">Paid</option>
          </select>

          <Button variant="secondary" onClick={fetchAllocations} className="h-10 gap-1.5 shrink-0 font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300">
            <RefreshCw className="w-4 h-4 text-slate-700" /> Refresh
          </Button>
        </div>
      </Card>

      {/* Main Table view */}
      <Card className="overflow-hidden border border-slate-200 bg-white shadow-xs">
        {isLoading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            <p className="text-xs font-extrabold text-slate-600 animate-pulse">Loading Financial Ledger...</p>
          </div>
        ) : allocations.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500">
              <CreditCard className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-950">No Fee Allocations Found</h3>
              <p className="text-xs text-slate-600 font-bold max-w-sm">
                No matching student billing records found matching the active filters.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100 text-xs font-extrabold uppercase tracking-wider text-slate-900">
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Fee Plan</th>
                  <th className="px-6 py-4">Total Amount</th>
                  <th className="px-6 py-4">Paid Installments</th>
                  <th className="px-6 py-4">Outstanding Balance</th>
                  <th className="px-6 py-4">Target Due Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-bold text-slate-900">
                {allocations.map((alloc) => {
                  const studentName = alloc.student ? `${alloc.student.firstName} ${alloc.student.lastName}` : 'Not mapped';
                  const remaining = Number(alloc.totalAmount) - Number(alloc.paidAmount);
                  return (
                    <tr key={alloc.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-extrabold text-slate-950 text-sm block">{studentName}</span>
                          <span className="text-xs text-slate-600 font-mono font-bold mt-0.5">{alloc.student?.admissionNumber}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-900 font-bold text-xs">{alloc.feeStructure?.name}</span>
                      </td>
                      <td className="px-6 py-4 font-black text-slate-950 text-xs">INR {Number(alloc.totalAmount).toLocaleString()}</td>
                      <td className="px-6 py-4 text-emerald-700 font-black text-xs">INR {Number(alloc.paidAmount).toLocaleString()}</td>
                      <td className="px-6 py-4 text-rose-700 font-black text-xs">INR {remaining.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 font-bold">
                          <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span>{new Date(alloc.dueDate).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={alloc.status === 'paid' ? 'success' : alloc.status === 'partially_paid' ? 'warning' : 'neutral'}>
                          {alloc.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleOpenCollectFee(alloc)}
                            className="p-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:text-emerald-600 hover:border-emerald-400 transition-colors cursor-pointer shadow-xs disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Collect Manual Payment"
                            disabled={alloc.status === 'paid'}
                          >
                            <IndianRupee className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenHistory(alloc.studentId)}
                            className="p-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:text-indigo-600 hover:border-indigo-400 transition-colors cursor-pointer shadow-xs"
                            title="View Payment Logs"
                          >
                            <Eye className="w-4 h-4" />
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

      {/* MODAL 1: CREATE FEE PLAN (STRUCTURE) */}
      {isCreatePlanOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto">
          <Card className="w-full max-w-md p-6 relative border border-slate-200 bg-white shadow-2xl rounded-3xl space-y-4">
            <button
              onClick={() => setIsCreatePlanOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-lg font-black text-slate-950 mb-1">
              Create New Fee Plan
            </h3>
            <p className="text-xs text-slate-600 font-extrabold uppercase tracking-wider mb-4">
              Tuition billing structure configuration
            </p>

            <form onSubmit={handleCreatePlanSubmit} className="space-y-4">
              <Input
                label="Fee Structure Name *"
                id="planName"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                required
                placeholder="e.g. Semester Tuition Fee (Engineering)"
              />
              
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Amount (INR) *"
                  id="planAmount"
                  type="number"
                  value={String(planAmount)}
                  onChange={(e) => setPlanAmount(Number(e.target.value))}
                  required
                />
                <div className="flex flex-col gap-1.5 w-full">
                  <label className="text-xs font-bold text-slate-700">Billing Frequency</label>
                  <select
                    value={planFrequency}
                    onChange={(e) => setPlanFrequency(e.target.value)}
                    className="flex h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer shadow-xs"
                  >
                    <option value="yearly">Yearly</option>
                    <option value="semi_annual">Semi-Annual</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="monthly">Monthly</option>
                    <option value="one_time">One Time</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-xs font-bold text-slate-700">Description</label>
                <textarea
                  value={planDescription}
                  onChange={(e) => setPlanDescription(e.target.value)}
                  rows={2}
                  placeholder="Installment terms and fee breakdown notes..."
                  className="flex w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <Button variant="secondary" type="button" onClick={() => setIsCreatePlanOpen(false)} className="font-bold">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="font-bold">
                  {isSubmitting ? 'Creating...' : 'Create Structure'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* MODAL 2: ASSIGN FEE PLAN */}
      {isAssignPlanOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto">
          <Card className="w-full max-w-lg p-6 relative border border-slate-200 bg-white shadow-2xl rounded-3xl space-y-4">
            <button
              onClick={() => setIsAssignPlanOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-lg font-black text-slate-950 mb-1">
              Assign Fee Plan to Student
            </h3>
            <p className="text-xs text-slate-600 font-extrabold uppercase tracking-wider mb-4">
              Allocate tuition structure parameters
            </p>

            <form onSubmit={handleAssignPlanSubmit} className="space-y-4">
              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-xs font-bold text-slate-700">Select Student *</label>
                <select
                  value={assignStudentId}
                  onChange={(e) => setAssignStudentId(e.target.value)}
                  className="flex h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer shadow-xs"
                >
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.admissionNumber})</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-xs font-bold text-slate-700">Select Fee Plan *</label>
                <select
                  value={assignStructureId}
                  onChange={(e) => setAssignStructureId(e.target.value)}
                  className="flex h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer shadow-xs"
                >
                  {structures.map(s => (
                    <option key={s.id} value={s.id}>{s.name} (INR {Number(s.amount).toLocaleString()})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Target Due Date *"
                  id="dueDate"
                  type="date"
                  value={assignDueDate}
                  onChange={(e) => setAssignDueDate(e.target.value)}
                  required
                />
                <Input
                  label="Discount Amount (INR)"
                  id="discount"
                  type="number"
                  value={String(assignDiscount)}
                  onChange={(e) => setAssignDiscount(Number(e.target.value))}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <Button variant="secondary" type="button" onClick={() => setIsAssignPlanOpen(false)} className="font-bold">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="font-bold">
                  {isSubmitting ? 'Allocating...' : 'Allocate Fee'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* MODAL 3: MANUAL FEE COLLECTION */}
      {isCollectFeeOpen && selectedAllocation && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto">
          <Card className="w-full max-w-md p-6 relative border border-slate-200 bg-white shadow-2xl rounded-3xl space-y-4">
            <button
              onClick={() => setIsCollectFeeOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-lg font-black text-slate-950 mb-1">
              Record Offline Payment Collection
            </h3>
            <p className="text-xs text-slate-600 font-extrabold uppercase tracking-wider mb-4">
              Student: {selectedAllocation.student?.firstName} {selectedAllocation.student?.lastName}
            </p>

            <form onSubmit={handleCollectFeeSubmit} className="space-y-4">
              <Input
                label="Amount Received (INR) *"
                id="collectAmount"
                type="number"
                value={String(collectAmount)}
                onChange={(e) => setCollectAmount(Number(e.target.value))}
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 w-full">
                  <label className="text-xs font-bold text-slate-700">Payment Mode</label>
                  <select
                    value={collectMode}
                    onChange={(e) => setCollectMode(e.target.value)}
                    className="flex h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer shadow-xs"
                  >
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="upi">UPI / Online</option>
                  </select>
                </div>
                <Input
                  label="Reference / Cheque No"
                  id="collectRef"
                  value={collectRefNo}
                  onChange={(e) => setCollectRefNo(e.target.value)}
                  placeholder="e.g. UPI-9872"
                />
              </div>

              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-xs font-bold text-slate-700">Remarks / Notes</label>
                <textarea
                  value={collectRemarks}
                  onChange={(e) => setCollectRemarks(e.target.value)}
                  rows={2}
                  placeholder="Payment remarks, receipt copy code..."
                  className="flex w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <Button variant="secondary" type="button" onClick={() => setIsCollectFeeOpen(false)} className="font-bold">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="font-bold">
                  {isSubmitting ? 'Logging...' : 'Record Payment'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* MODAL 4: PAYMENT HISTORY LOGS */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <Card className="w-full max-w-2xl p-6 relative border border-slate-200 bg-white shadow-2xl rounded-3xl flex flex-col max-h-[85vh] overflow-y-auto space-y-4">
            <button
              onClick={() => setIsHistoryOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-lg font-black text-slate-950 mb-1">
              Payment Invoices & Realized Receipts
            </h3>
            <p className="text-xs text-slate-600 font-extrabold uppercase tracking-wider mb-2">
              Realized offline billing receipt records
            </p>

            {isLoadingHistory ? (
              <div className="py-16 text-center text-xs font-bold text-slate-500">Loading History Sheet...</div>
            ) : historyList.length === 0 ? (
              <div className="py-16 text-center text-xs font-bold text-slate-500 italic">No payment records logged on the ledger.</div>
            ) : (
              <div className="space-y-3 overflow-y-auto">
                {historyList.map(h => (
                  <div key={h.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50 flex justify-between items-center text-xs shadow-2xs">
                    <div className="space-y-1 font-bold text-slate-700">
                      <div className="text-slate-950 font-black">Receipt Code: <span className="font-mono text-indigo-700">{h.receiptNumber}</span></div>
                      <div>Mode: <span className="capitalize">{h.paymentMode}</span></div>
                      <div>Date: <span>{new Date(h.paymentDate).toLocaleDateString()}</span></div>
                      {h.remarks && <div className="text-slate-500 italic">Notes: "{h.remarks}"</div>}
                    </div>
                    <span className="font-black text-emerald-700 text-base">INR {Number(h.amountPaid).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end pt-4 border-t border-slate-200">
              <Button onClick={() => setIsHistoryOpen(false)} className="font-bold">Close History</Button>
            </div>
          </Card>
        </div>
      )}

    </div>
  );
}
