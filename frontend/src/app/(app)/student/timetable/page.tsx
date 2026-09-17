'use client';

import * as React from 'react';
import { Clock, Calendar, BookOpen, MapPin, User, RefreshCw } from 'lucide-react';
import { timetableService, TimetableEntry } from '@/services/timetable.service';
import { useAuthStore } from '@/store/useAuthStore';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function StudentTimetablePage() {
  const { user } = useAuthStore();
  const [timetable, setTimetable] = React.useState<TimetableEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchStudentTimetable = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const batchId = (user as any)?.student?.batchId || '';
      if (batchId) {
        const data = await timetableService.findByBatch(batchId);
        setTimetable(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    fetchStudentTimetable();
  }, [fetchStudentTimetable]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">My Class Timetable</h1>
          <p className="text-xs text-slate-500 mt-1">
            Weekly class schedule, lecture rooms, and instructor sessions for your semester.
          </p>
        </div>
        <Button onClick={fetchStudentTimetable} variant="outline" size="sm" className="gap-2">
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {DAYS.map((day) => {
          const slots = timetable.filter((t) => t.dayOfWeek === day);

          return (
            <Card key={day} className="p-4 border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="font-black text-sm text-slate-900">{day}</span>
                <Badge variant={slots.length > 0 ? 'primary' : 'outline'} className="text-[10px]">
                  {slots.length} Classes
                </Badge>
              </div>

              <div className="space-y-3 mt-3">
                {slots.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-xs italic">
                    No classes scheduled
                  </div>
                ) : (
                  slots.map((s) => (
                    <div key={s.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between text-[10px] font-black text-primary">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {s.startTime} – {s.endTime}
                        </span>
                        <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-bold text-slate-700">
                          {s.roomNumber || 'Room LH-1'}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-xs text-slate-900 mt-1">{s.subject?.name}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1 font-semibold">
                        <User className="w-3 h-3 text-slate-400" />
                        {s.teacher?.user ? `${s.teacher.user.firstName} ${s.teacher.user.lastName || ''}`.trim() : 'Faculty'}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
