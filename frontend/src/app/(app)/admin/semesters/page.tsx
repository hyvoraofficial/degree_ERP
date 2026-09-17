'use client';

import * as React from 'react';
import { 
  Layers3, BookOpen, Users, Plus, Search, RefreshCw, CheckCircle2, ChevronRight, Award, FileText
} from 'lucide-react';
import { courseService, Course } from '@/services/course.service';
import { subjectService, Subject } from '@/services/subject.service';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/providers/ToastProvider';
import { useBranchContext } from '@/providers/BranchProvider';

export default function SemestersPage() {
  const { toast } = useToast();
  const { selectedBranchId, selectedBranch } = useBranchContext();

  const [programs, setPrograms] = React.useState<Course[]>([]);
  const [selectedProgram, setSelectedProgram] = React.useState<Course | null>(null);
  const [activeSemester, setActiveSemester] = React.useState<number>(1);
  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Load Degree Programs
  const fetchPrograms = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await courseService.findAll('', selectedBranchId || undefined, '', 1, 100);
      const progs = res.courses || [];
      setPrograms(progs);
      if (progs.length > 0 && !selectedProgram) {
        setSelectedProgram(progs[0]);
      }
    } catch (err: any) {
      toast('Failed to load programs', err.message || 'Error', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [selectedBranchId, selectedProgram, toast]);

  // Load Subjects for active program & semester
  const fetchSubjects = React.useCallback(async () => {
    if (!selectedProgram) return;
    try {
      const allSubjs = await subjectService.findAll(selectedProgram.id);
      // Filter by semester if semester property exists or show all
      const semSubjs = allSubjs.filter((s: any) => (s.semester ? s.semester === activeSemester : true));
      setSubjects(semSubjs.length > 0 ? semSubjs : allSubjs);
    } catch (e) {
      console.error('Failed to load semester subjects:', e);
    }
  }, [selectedProgram, activeSemester]);

  React.useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);

  React.useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  const totalSemesters = (selectedProgram as any)?.totalSemesters || 8;
  const semestersArray = Array.from({ length: totalSemesters }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Semester & Curriculum Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure semesters, credits, theory vs practical course distributions, and regulation schemes.
          </p>
        </div>
        <Button onClick={fetchPrograms} variant="outline" size="sm" className="gap-2">
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Program Selector Bar */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin">
        {programs.map((prog) => (
          <button
            key={prog.id}
            onClick={() => {
              setSelectedProgram(prog);
              setActiveSemester(1);
            }}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer border ${
              selectedProgram?.id === prog.id
                ? 'bg-primary text-white border-primary shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            {prog.name}
            <Badge variant="outline" className={`text-[10px] ml-1 ${selectedProgram?.id === prog.id ? 'bg-white/20 text-white border-transparent' : 'bg-slate-100 text-slate-600'}`}>
              {(prog as any).degreeType || 'B.Tech'}
            </Badge>
          </button>
        ))}
      </div>

      {selectedProgram && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Semesters Sidebar Tabs */}
          <Card className="p-4 space-y-2 border-slate-200 lg:col-span-1 h-fit">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3">
              Academic Semesters
            </span>
            <div className="flex flex-col gap-1 mt-1">
              {semestersArray.map((semNum) => (
                <button
                  key={semNum}
                  onClick={() => setActiveSemester(semNum)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                    activeSemester === semNum
                      ? 'bg-primary/10 text-primary border border-primary/20 shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black ${
                      activeSemester === semNum ? 'bg-primary text-white' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {semNum}
                    </span>
                    <span>Semester {semNum}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-60" />
                </button>
              ))}
            </div>
          </Card>

          {/* Semester Details & Course Units */}
          <div className="lg:col-span-3 space-y-4">
            <Card className="p-6 border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-extrabold text-slate-900">
                      {selectedProgram.name} – Semester {activeSemester}
                    </h2>
                    <Badge variant="success" className="text-[10px]">
                      Scheme {(selectedProgram as any).schemeYear || '2026'}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Course units, lab modules, and evaluation credits distribution.
                  </p>
                </div>
              </div>

              {/* Subject units list */}
              <div className="mt-5 space-y-3">
                {subjects.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50 rounded-xl">
                    <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-600">No subjects configured for Semester {activeSemester}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Use the Subjects module to allocate courses to this semester.</p>
                  </div>
                ) : (
                  subjects.map((sub, idx) => (
                    <div
                      key={sub.id || idx}
                      className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-mono font-bold text-xs shrink-0 border border-indigo-100">
                          {sub.code || `CS${activeSemester}0${idx + 1}`}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs text-slate-900 truncate">{sub.name}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 capitalize">
                              {(sub as any).subjectType || 'Theory'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{sub.description || 'Core semester curriculum subject.'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                        <div className="text-center">
                          <span className="block text-xs font-black text-slate-900">{(sub as any).credits || 4}</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Credits</span>
                        </div>
                        <div className="w-px h-6 bg-slate-200" />
                        <div className="text-center">
                          <span className="block text-xs font-black text-slate-900">{(sub as any).internalMarks || 40} / {(sub as any).externalMarks || 60}</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase">IA / End Sem</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
