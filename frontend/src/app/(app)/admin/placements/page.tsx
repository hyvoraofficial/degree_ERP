'use client';

import * as React from 'react';
import { 
  Briefcase, Plus, Search, RefreshCw, Calendar, MapPin, IndianRupee, Users, CheckCircle2, Clock, X, ExternalLink
} from 'lucide-react';
import { placementService, PlacementDrive } from '@/services/placement.service';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/providers/ToastProvider';

export default function PlacementsPage() {
  const { toast } = useToast();

  const [drives, setDrives] = React.useState<PlacementDrive[]>([]);
  const [selectedDrive, setSelectedDrive] = React.useState<PlacementDrive | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Form Fields
  const [companyName, setCompanyName] = React.useState('');
  const [jobRole, setJobRole] = React.useState('');
  const [packageLpa, setPackageLpa] = React.useState<number | string>(12.0);
  const [eligibilityCriteria, setEligibilityCriteria] = React.useState('');
  const [location, setLocation] = React.useState('Bangalore');
  const [driveDate, setDriveDate] = React.useState('');
  const [deadlineDate, setDeadlineDate] = React.useState('');

  const fetchDrives = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await placementService.findAll();
      setDrives(data);
    } catch (err: any) {
      toast('Failed to load placement drives', err.message || 'Error', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchDrives();
  }, [fetchDrives]);

  const handleOpenDetail = async (drive: PlacementDrive) => {
    try {
      const full = await placementService.findOne(drive.id);
      setSelectedDrive(full);
      setIsDetailDrawerOpen(true);
    } catch (e) {
      toast('Error', 'Failed to load drive details', 'error');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !jobRole || !packageLpa) {
      toast('Required', 'Please fill in Company, Role and CTC Package.', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      await placementService.create({
        companyName,
        jobRole,
        packageLpa: Number(packageLpa),
        eligibilityCriteria,
        location,
        driveDate: driveDate || undefined,
        deadlineDate: deadlineDate || undefined,
      });
      toast('Success', 'Campus recruitment drive registered.', 'success');
      setIsCreateModalOpen(false);
      fetchDrives();
    } catch (err: any) {
      toast('Creation Failed', err.message || 'Error', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (appId: string, newStatus: string) => {
    try {
      await placementService.updateStatus(appId, newStatus);
      toast('Updated', `Applicant status changed to ${newStatus}.`, 'success');
      if (selectedDrive) {
        handleOpenDetail(selectedDrive);
      }
    } catch (err: any) {
      toast('Status Update Failed', err.message || 'Error', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Campus Placement Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Recruitment drives, company CTC packages, student eligibility and selection pipeline.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={fetchDrives} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
          <Button 
            onClick={() => setIsCreateModalOpen(true)} 
            size="sm" 
            className="gap-2 bg-primary text-white"
          >
            <Plus className="w-4 h-4" />
            Post Placement Drive
          </Button>
        </div>
      </div>

      {/* Drives Grid */}
      {isLoading ? (
        <div className="py-20 text-center text-xs text-slate-500 font-semibold">
          <RefreshCw className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
          Loading recruitment drives...
        </div>
      ) : drives.length === 0 ? (
        <Card className="p-12 text-center bg-slate-50/50 border-dashed">
          <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700">No Active Placement Drives</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Create upcoming campus recruitment drives from visiting tech companies and corporate recruiters.
          </p>
          <Button onClick={() => setIsCreateModalOpen(true)} size="sm" className="mt-4 gap-2">
            <Plus className="w-4 h-4" />
            Post First Drive
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {drives.map((d) => (
            <Card key={d.id} className="p-5 border-slate-200 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-sm shrink-0 border border-emerald-100">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <Badge variant={d.status === 'open' ? 'success' : 'outline'} className="text-[10px] uppercase">
                    {d.status}
                  </Badge>
                </div>

                <h3 className="font-extrabold text-base text-slate-900 leading-snug">{d.companyName}</h3>
                <span className="inline-block text-xs font-bold text-primary mt-0.5">{d.jobRole}</span>

                <div className="mt-4 space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2 font-black text-slate-900 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <IndianRupee className="w-4 h-4 text-emerald-600" />
                    <span>₹{Number(d.packageLpa).toFixed(2)} LPA CTC</span>
                  </div>

                  {d.location && (
                    <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{d.location}</span>
                    </div>
                  )}

                  {d.driveDate && (
                    <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Drive Date: {new Date(d.driveDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500">
                  <Users className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                  {d._count?.applications || 0} Applied
                </span>
                <Button onClick={() => handleOpenDetail(d)} variant="outline" size="sm" className="text-xs font-bold">
                  View Applicants
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Post Drive Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-base text-slate-900">Post Campus Placement Drive</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Hiring Company *</label>
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Google Cloud, Microsoft, Infosys"
                  className="text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Job Role Title *</label>
                <Input
                  value={jobRole}
                  onChange={(e) => setJobRole(e.target.value)}
                  placeholder="e.g. Associate Software Engineer, Cloud Specialist"
                  className="text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Package (CTC in LPA) *</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={packageLpa}
                    onChange={(e) => setPackageLpa(e.target.value)}
                    className="text-xs font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Location</label>
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Bangalore / Hybrid"
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Drive Date</label>
                  <Input
                    type="date"
                    value={driveDate}
                    onChange={(e) => setDriveDate(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Application Deadline</label>
                  <Input
                    type="date"
                    value={deadlineDate}
                    onChange={(e) => setDeadlineDate(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Eligibility Criteria</label>
                <textarea
                  rows={2}
                  value={eligibilityCriteria}
                  onChange={(e) => setEligibilityCriteria(e.target.value)}
                  placeholder="e.g. B.Tech CSE/ISE with CGPA >= 7.0 and no active backlogs."
                  className="w-full text-xs rounded-xl border border-slate-200 p-2.5 text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSubmitting} className="bg-primary text-white">
                  {isSubmitting ? 'Posting...' : 'Publish Drive'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Applicants Drawer */}
      {isDetailDrawerOpen && selectedDrive && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="font-black text-lg text-slate-900">{selectedDrive.companyName}</h3>
                  <p className="text-xs font-bold text-primary">{selectedDrive.jobRole} – ₹{Number(selectedDrive.packageLpa).toFixed(2)} LPA</p>
                </div>
                <button onClick={() => setIsDetailDrawerOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-5 space-y-4">
                <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-400">
                  Registered Applicants ({selectedDrive.applications?.length || 0})
                </h4>

                {(!selectedDrive.applications || selectedDrive.applications.length === 0) ? (
                  <div className="text-center py-10 bg-slate-50 rounded-xl text-slate-400 text-xs font-semibold">
                    No student applications yet for this drive.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedDrive.applications.map((app: any) => (
                      <div key={app.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3">
                        <div>
                          <span className="font-extrabold text-xs text-slate-900 block">
                            {app.student?.user?.firstName} {app.student?.user?.lastName}
                          </span>
                          <span className="text-[11px] text-slate-500 font-semibold block">
                            {app.student?.admissionNumber} • {app.student?.course?.code}
                          </span>
                        </div>

                        <select
                          value={app.status}
                          onChange={(e) => handleUpdateStatus(app.id, e.target.value)}
                          className="text-xs font-bold rounded-lg border border-slate-200 p-1.5 bg-white text-slate-800"
                        >
                          <option value="applied">Applied</option>
                          <option value="shortlisted">Shortlisted</option>
                          <option value="interviewed">Interviewed</option>
                          <option value="selected">Selected / Offer</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <Button onClick={() => setIsDetailDrawerOpen(false)} variant="outline" size="sm" className="w-full">
                Close Drawer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
