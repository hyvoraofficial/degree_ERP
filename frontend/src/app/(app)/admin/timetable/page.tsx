'use client';

import * as React from 'react';
import { 
  Clock, Plus, Search, RefreshCw, Trash2, BookOpen, User, Building, X, Calendar
} from 'lucide-react';
import { timetableService, TimetableEntry } from '@/services/timetable.service';
import { batchService, Batch } from '@/services/batch.service';
import { subjectService, Subject } from '@/services/subject.service';
import { teacherService, Teacher } from '@/services/teacher.service';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/providers/ToastProvider';
import { useBranchContext } from '@/providers/BranchProvider';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function TimetablePage() {
  const { toast } = useToast();
  const { selectedBranchId, selectedBranch } = useBranchContext();

  const [batches, setBatches] = React.useState<Batch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = React.useState<string>('');
  const [timetable, setTimetable] = React.useState<TimetableEntry[]>([]);
  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [faculty, setFaculty] = React.useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Form Fields
  const [subjectId, setSubjectId] = React.useState('');
  const [teacherId, setTeacherId] = React.useState('');
  const [dayOfWeek, setDayOfWeek] = React.useState('Monday');
  const [startTime, setStartTime] = React.useState('09:00 AM');
  const [endTime, setEndTime] = React.useState('10:00 AM');
  const [roomNumber, setRoomNumber] = React.useState('LH-201');
  const [isLab, setIsLab] = React.useState(false);

  // Load Batches
  const fetchBatches = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await batchService.findAll('', selectedBranchId || undefined, undefined, undefined, 1, 100);
      const bList = res.batches || [];
      setBatches(bList);
      if (bList.length > 0 && !selectedBatchId) {
        setSelectedBatchId(bList[0].id);
      }
    } catch (err: any) {
      toast('Failed to load batches', err.message || 'Error', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [selectedBranchId, selectedBatchId, toast]);

  // Load Timetable for selected batch
  const fetchTimetable = React.useCallback(async () => {
    if (!selectedBatchId) return;
    try {
      const data = await timetableService.findByBatch(selectedBatchId);
      setTimetable(data);
    } catch (e) {
      console.error('Failed to load timetable:', e);
    }
  }, [selectedBatchId]);

  // Load auxiliary data for modal
  const fetchAuxiliary = React.useCallback(async () => {
    try {
      const [allSubjects, resFac] = await Promise.all([
        subjectService.findAll(),
        teacherService.findAll('', selectedBranchId || undefined, 1, 100),
      ]);
      setSubjects(allSubjects || []);
      setFaculty(resFac.teachers || []);
    } catch (e) {
      console.error('Failed to load aux data:', e);
    }
  }, [selectedBranchId]);

  React.useEffect(() => {
    fetchBatches();
    fetchAuxiliary();
  }, [fetchBatches, fetchAuxiliary]);

  React.useEffect(() => {
    fetchTimetable();
  }, [fetchTimetable]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchId || !subjectId || !teacherId) {
      toast('Required Fields', 'Please select Section, Subject and Faculty.', 'error');
      return;
    }
    const currentBatch = batches.find((b) => b.id === selectedBatchId);
    if (!currentBatch) return;

    setIsSubmitting(true);
    try {
      await timetableService.create({
        branchId: selectedBranchId || currentBatch.branchId,
        courseId: currentBatch.courseId,
        batchId: selectedBatchId,
        subjectId,
        teacherId,
        dayOfWeek,
        startTime,
        endTime,
        roomNumber,
        isLab,
      });
      toast('Success', 'Timetable class slot scheduled.', 'success');
      setIsCreateModalOpen(false);
      fetchTimetable();
    } catch (err: any) {
      toast('Schedule Error', err.message || 'Error occurred', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await timetableService.delete(id);
      toast('Deleted', 'Schedule slot removed.', 'success');
      fetchTimetable();
    } catch (err: any) {
      toast('Delete Failed', err.message || 'Error', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Timetable Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Weekly lecture sessions, laboratory hours, and classroom allocations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={fetchTimetable} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
          <Button 
            onClick={() => setIsCreateModalOpen(true)} 
            size="sm" 
            className="gap-2 bg-primary text-white"
          >
            <Plus className="w-4 h-4" />
            Add Time Slot
          </Button>
        </div>
      </div>

      {/* Section Selector */}
      <div className="flex items-center gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <span className="text-xs font-bold text-slate-600 shrink-0">Select Batch / Section:</span>
        <select
          value={selectedBatchId}
          onChange={(e) => setSelectedBatchId(e.target.value)}
          className="text-xs rounded-lg border border-slate-200 p-2 bg-slate-50 font-bold text-slate-800 focus:outline-hidden"
        >
          {batches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} ({b.code})
            </option>
          ))}
        </select>
      </div>

      {/* Weekly Schedule Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {DAYS_OF_WEEK.map((day) => {
          const daySlots = timetable.filter((t) => t.dayOfWeek === day);

          return (
            <Card key={day} className="p-4 border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="font-black text-sm text-slate-900">{day}</span>
                  <Badge variant={daySlots.length > 0 ? 'primary' : 'outline'} className="text-[10px]">
                    {daySlots.length} Slots
                  </Badge>
                </div>

                <div className="space-y-3 mt-3">
                  {daySlots.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs italic">
                      No lecture slots scheduled
                    </div>
                  ) : (
                    daySlots.map((slot) => (
                      <div
                        key={slot.id}
                        className={`p-3 rounded-xl border transition-all ${
                          slot.isLab
                            ? 'bg-purple-50/50 border-purple-200'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-primary uppercase tracking-wider">
                              <Clock className="w-3 h-3" />
                              {slot.startTime} – {slot.endTime}
                            </span>
                            <h4 className="font-extrabold text-xs text-slate-900 mt-1">
                              {slot.subject?.name || 'Academic Subject'}
                            </h4>
                          </div>
                          <button
                            onClick={() => handleDelete(slot.id)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded-md"
                            title="Remove Slot"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-600 font-semibold">
                          <span className="flex items-center gap-1 truncate max-w-[130px]">
                            <User className="w-3 h-3 text-slate-400" />
                            {slot.teacher?.user ? `${slot.teacher.user.firstName} ${slot.teacher.user.lastName || ''}`.trim() : 'Faculty'}
                          </span>
                          <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-bold">
                            {slot.roomNumber || 'LH-101'}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Add Time Slot Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-base text-slate-900">Add Class Schedule Slot</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Subject *</label>
                <select
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white text-slate-800"
                  required
                >
                  <option value="">-- Select Subject --</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Faculty Instructor *</label>
                <select
                  value={teacherId}
                  onChange={(e) => setTeacherId(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white text-slate-800"
                  required
                >
                  <option value="">-- Select Faculty --</option>
                  {faculty.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.user ? `${f.user.firstName} ${f.user.lastName || ''}`.trim() : f.employeeNumber} ({f.designation || 'Faculty'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Day of Week</label>
                  <select
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white text-slate-800"
                  >
                    {DAYS_OF_WEEK.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Room / Hall / Lab</label>
                  <Input
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    placeholder="e.g. LH-201 or Lab-3"
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Start Time</label>
                  <Input
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    placeholder="09:00 AM"
                    className="text-xs font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">End Time</label>
                  <Input
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    placeholder="10:00 AM"
                    className="text-xs font-mono"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isLab"
                  checked={isLab}
                  onChange={(e) => setIsLab(e.target.checked)}
                  className="rounded border-slate-300 text-primary focus:ring-primary"
                />
                <label htmlFor="isLab" className="text-xs font-bold text-slate-700">
                  This is a Practical / Laboratory session
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSubmitting} className="bg-primary text-white">
                  {isSubmitting ? 'Scheduling...' : 'Add Slot'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
