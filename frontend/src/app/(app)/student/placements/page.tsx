'use client';

import * as React from 'react';
import { 
  Briefcase, IndianRupee, MapPin, Calendar, CheckCircle2, Clock, Plus, X 
} from 'lucide-react';
import { placementService, PlacementDrive } from '@/services/placement.service';
import { useAuthStore } from '@/store/useAuthStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/providers/ToastProvider';

export default function StudentPlacementsPage() {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [drives, setDrives] = React.useState<PlacementDrive[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Apply Modal
  const [isApplyModalOpen, setIsApplyModalOpen] = React.useState(false);
  const [selectedDrive, setSelectedDrive] = React.useState<PlacementDrive | null>(null);
  const [remarks, setRemarks] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const fetchDrives = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await placementService.findAll();
      setDrives(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchDrives();
  }, [fetchDrives]);

  const handleOpenApply = (drive: PlacementDrive) => {
    setSelectedDrive(drive);
    setRemarks('');
    setIsApplyModalOpen(true);
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    const studentId = (user as any)?.student?.id || (user as any)?.id || '';
    if (!selectedDrive || !studentId) return;

    setIsSubmitting(true);
    try {
      await placementService.apply(selectedDrive.id, studentId, remarks);
      toast('Success', `Applied successfully to ${selectedDrive.companyName}!`, 'success');
      setIsApplyModalOpen(false);
    } catch (err: any) {
      toast('Application Failed', err.message || 'Error', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Campus Placement Drives</h1>
        <p className="text-xs text-slate-500 mt-1">
          Explore upcoming company recruitment drives, eligibility criteria, and track your applications.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {drives.map((d) => (
          <Card key={d.id} className="p-5 border-slate-200 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <Badge variant="success" className="text-[10px] uppercase">
                  {d.status}
                </Badge>
                <div className="text-emerald-600 font-black text-xs">
                  ₹{Number(d.packageLpa).toFixed(2)} LPA
                </div>
              </div>

              <h3 className="font-extrabold text-base text-slate-900">{d.companyName}</h3>
              <p className="text-xs font-bold text-primary mt-0.5">{d.jobRole}</p>

              <div className="mt-3 space-y-1.5 text-[11px] text-slate-500">
                {d.location && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{d.location}</span>
                  </div>
                )}
                {d.driveDate && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Drive: {new Date(d.driveDate).toLocaleDateString()}</span>
                  </div>
                )}
                {d.eligibilityCriteria && (
                  <div className="mt-2 p-2 bg-slate-50 rounded-lg text-slate-600 border border-slate-100">
                    <span className="font-bold block text-[10px] text-slate-400 uppercase">Eligibility:</span>
                    {d.eligibilityCriteria}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100">
              <Button
                onClick={() => handleOpenApply(d)}
                className="w-full bg-primary text-white text-xs font-bold"
                size="sm"
              >
                Apply Now
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {isApplyModalOpen && selectedDrive && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-base text-slate-900">Apply for Drive</h3>
              <button onClick={() => setIsApplyModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <h4 className="font-black text-xs text-slate-900">{selectedDrive.companyName}</h4>
              <p className="text-[11px] text-primary font-bold">{selectedDrive.jobRole} • ₹{Number(selectedDrive.packageLpa).toFixed(2)} LPA</p>
            </div>

            <form onSubmit={handleApply} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Cover Note / Remarks (Optional)</label>
                <textarea
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Share your GitHub profile, portfolio link, or relevant project experience..."
                  className="w-full text-xs rounded-xl border border-slate-200 p-2.5 text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsApplyModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSubmitting} className="bg-primary text-white">
                  {isSubmitting ? 'Submitting...' : 'Submit Application'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
