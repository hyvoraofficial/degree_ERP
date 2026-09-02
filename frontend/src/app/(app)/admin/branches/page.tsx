'use client';

import * as React from 'react';
import Link from 'next/link';
import { 
  Plus, Search, Edit2, Trash2, MapPin, Eye, RefreshCw, X, AlertTriangle 
} from 'lucide-react';
import { branchService, Branch } from '@/services/branch.service';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/providers/ToastProvider';

export default function BranchesPage() {
  const { toast } = useToast();
  
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [limit] = React.useState(10);
  
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [selectedBranch, setSelectedBranch] = React.useState<Branch | null>(null);
  
  // Confirmation state
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = React.useState(false);
  const [branchToDelete, setBranchToDelete] = React.useState<Branch | null>(null);

  // Form states
  const [formName, setFormName] = React.useState('');
  const [formCode, setFormCode] = React.useState('');
  const [formAddress, setFormAddress] = React.useState('');
  const [formCity, setFormCity] = React.useState('');
  const [formState, setFormState] = React.useState('');
  const [formPincode, setFormPincode] = React.useState('');
  const [formContactNumber, setFormContactNumber] = React.useState('');
  const [formEmail, setFormEmail] = React.useState('');
  const [formManager, setFormManager] = React.useState('');
  const [formStatus, setFormStatus] = React.useState('active');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const fetchBranches = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await branchService.findAll(search, statusFilter, page, limit);
      setBranches(data.branches);
      setTotal(data.meta.total);
    } catch (err: any) {
      toast('Failed to load branches', err.message || 'Server error', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, page, limit, toast]);

  React.useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const handleOpenCreateModal = () => {
    setFormName('');
    setFormCode('');
    setFormAddress('');
    setFormCity('');
    setFormState('');
    setFormPincode('');
    setFormContactNumber('');
    setFormEmail('');
    setFormManager('');
    setFormStatus('active');
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (branch: Branch) => {
    setSelectedBranch(branch);
    setFormName(branch.name);
    setFormCode(branch.code);
    setFormAddress(branch.address);
    setFormCity(branch.city);
    setFormState(branch.state);
    setFormPincode(branch.pincode);
    setFormContactNumber(branch.contactNumber);
    setFormEmail(branch.email);
    setFormManager(branch.manager || '');
    setFormStatus(branch.status);
    setIsEditModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await branchService.create({
        name: formName,
        code: formCode,
        address: formAddress,
        city: formCity,
        state: formState,
        pincode: formPincode,
        contactNumber: formContactNumber,
        email: formEmail,
        manager: formManager || undefined,
        status: formStatus,
      });
      toast('Success', 'Branch created successfully.', 'success');
      setIsCreateModalOpen(false);
      fetchBranches();
    } catch (err: any) {
      toast('Creation Failed', err.message || 'Could not provision branch.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch) return;
    setIsSubmitting(true);
    try {
      await branchService.update(selectedBranch.id, {
        name: formName,
        code: formCode,
        address: formAddress,
        city: formCity,
        state: formState,
        pincode: formPincode,
        contactNumber: formContactNumber,
        email: formEmail,
        manager: formManager || undefined,
        status: formStatus,
      });
      toast('Success', 'Branch updated successfully.', 'success');
      setIsEditModalOpen(false);
      fetchBranches();
    } catch (err: any) {
      toast('Update Failed', err.message || 'Could not update branch details.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDelete = (branch: Branch) => {
    setBranchToDelete(branch);
    setIsConfirmDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!branchToDelete) return;
    try {
      await branchService.remove(branchToDelete.id);
      toast('Success', 'Branch archived successfully.', 'success');
      setIsConfirmDeleteOpen(false);
      fetchBranches();
    } catch (err: any) {
      toast('Archiving Failed', err.message || 'Ensure no active dependencies exist before deletion.', 'error');
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            Branch Directory
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            Manage multi-location branch facilities, managers, and activation logs.
          </p>
        </div>
        <Button onClick={handleOpenCreateModal} className="h-10 shrink-0 gap-2">
          <Plus className="w-4 h-4" /> Create Branch
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search branch name, code, or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background font-medium text-zinc-700 dark:text-zinc-300"
          />
        </div>
        <div className="flex w-full md:w-auto gap-4 items-center justify-end">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-xl border border-border bg-card px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <Button variant="secondary" onClick={fetchBranches} className="h-10 gap-1.5 shrink-0">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
        </div>
      </Card>

      {/* Main Table view */}
      <Card className="overflow-hidden border border-border">
        {isLoading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            <p className="text-sm font-semibold text-zinc-500 animate-pulse">Loading Branch Entries...</p>
          </div>
        ) : branches.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-400">
              <MapPin className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">No Branches Registered</h3>
              <p className="text-sm text-zinc-500 max-w-sm">
                No matching branch records found in this academy tenant subdomain.
              </p>
            </div>
            <Button onClick={handleOpenCreateModal} className="h-9 gap-2">
              <Plus className="w-4 h-4" /> Provision First Branch
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-zinc-50/50 dark:bg-zinc-900/50 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  <th className="px-6 py-4">Branch Detail</th>
                  <th className="px-6 py-4">Code</th>
                  <th className="px-6 py-4">City / State</th>
                  <th className="px-6 py-4">Manager</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-medium text-zinc-700 dark:text-zinc-300">
                {branches.map((branch) => (
                  <tr key={branch.id} className="hover:bg-zinc-50/40 dark:hover:bg-zinc-900/10">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                          {branch.name}
                        </span>
                        <span className="text-xs text-zinc-400 truncate max-w-xs">
                          {branch.email}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs rounded font-bold">
                        {branch.code}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span>{branch.city}</span>
                        <span className="text-xs text-zinc-400">{branch.state}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-zinc-600 dark:text-zinc-400">
                        {branch.manager || 'Not Assigned'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={branch.status === 'active' ? 'success' : 'neutral'}>
                        {branch.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/admin/branches/${branch.id}`}>
                          <button className="p-2 rounded-lg border border-border text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors" title="View Details">
                            <Eye className="w-4 h-4" />
                          </button>
                        </Link>
                        <button
                          onClick={() => handleOpenEditModal(branch)}
                          className="p-2 rounded-lg border border-border text-zinc-400 hover:text-primary transition-colors"
                          title="Edit Branch"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenDelete(branch)}
                          className="p-2 rounded-lg border border-border text-zinc-400 hover:text-rose-600 transition-colors"
                          title="Archive / Delete"
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
              <div className="px-6 py-4 border-t border-border flex items-center justify-between">
                <span className="text-xs text-zinc-500 font-semibold uppercase">
                  Showing {branches.length} of {total} entries
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="h-8 text-xs px-3"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                    className="h-8 text-xs px-3"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* CREATE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <Card className="w-full max-w-xl p-6 relative border border-border shadow-xl">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-lg font-bold text-zinc-950 dark:text-zinc-50 mb-1">
              Create New Branch
            </h3>
            <p className="text-xs text-zinc-400 mb-6 font-semibold uppercase tracking-wider">
              academy operational facility
            </p>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Branch Name"
                  id="name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
                <Input
                  label="Branch Code"
                  id="code"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  required
                  placeholder="e.g. ECITY"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="City"
                  id="city"
                  value={formCity}
                  onChange={(e) => setFormCity(e.target.value)}
                  required
                />
                <Input
                  label="State"
                  id="state"
                  value={formState}
                  onChange={(e) => setFormState(e.target.value)}
                  required
                />
                <Input
                  label="Pincode"
                  id="pincode"
                  value={formPincode}
                  onChange={(e) => setFormPincode(e.target.value)}
                  required
                />
              </div>

              <Input
                label="Street Address"
                id="address"
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Contact Phone"
                  id="phone"
                  value={formContactNumber}
                  onChange={(e) => setFormContactNumber(e.target.value)}
                  required
                />
                <Input
                  label="Contact Email"
                  id="email"
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Manager Name (Optional)"
                  id="manager"
                  value={formManager}
                  onChange={(e) => setFormManager(e.target.value)}
                />
                <div className="flex flex-col gap-1.5 w-full">
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                    Activation Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="flex h-11 w-full rounded-xl border border-border bg-card px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border/80">
                <Button variant="secondary" type="button" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Provisioning...' : 'Provision Branch'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <Card className="w-full max-w-xl p-6 relative border border-border shadow-xl">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-lg font-bold text-zinc-950 dark:text-zinc-50 mb-1">
              Edit Branch Parameters
            </h3>
            <p className="text-xs text-zinc-400 mb-6 font-semibold uppercase tracking-wider">
              {selectedBranch?.name} directory item
            </p>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Branch Name"
                  id="name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
                <Input
                  label="Branch Code"
                  id="code"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  required
                  placeholder="e.g. ECITY"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="City"
                  id="city"
                  value={formCity}
                  onChange={(e) => setFormCity(e.target.value)}
                  required
                />
                <Input
                  label="State"
                  id="state"
                  value={formState}
                  onChange={(e) => setFormState(e.target.value)}
                  required
                />
                <Input
                  label="Pincode"
                  id="pincode"
                  value={formPincode}
                  onChange={(e) => setFormPincode(e.target.value)}
                  required
                />
              </div>

              <Input
                label="Street Address"
                id="address"
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Contact Phone"
                  id="phone"
                  value={formContactNumber}
                  onChange={(e) => setFormContactNumber(e.target.value)}
                  required
                />
                <Input
                  label="Contact Email"
                  id="email"
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Manager Name (Optional)"
                  id="manager"
                  value={formManager}
                  onChange={(e) => setFormManager(e.target.value)}
                />
                <div className="flex flex-col gap-1.5 w-full">
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                    Activation Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="flex h-11 w-full rounded-xl border border-border bg-card px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border/80">
                <Button variant="secondary" type="button" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
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
          <Card className="w-full max-w-md p-6 border border-border shadow-xl space-y-4">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center text-rose-500 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50">
                  Delete Branch Permanently?
                </h3>
                <p className="text-sm text-zinc-500">
                  Are you sure you want to permanently delete branch <span className="font-semibold text-zinc-700 dark:text-zinc-300">"{branchToDelete?.name}"</span>?
                  This action cannot be undone and will permanently remove this branch record from the database.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setIsConfirmDeleteOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDeleteConfirm}>
                Delete Permanently
              </Button>
            </div>
          </Card>
        </div>
      )}

    </div>
  );
}
