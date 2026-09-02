'use client';

import * as React from 'react';
import { 
  CalendarDays, Filter, CheckCircle2, XCircle, Clock, AlertCircle, RefreshCw, Save, Check, UserCheck, Users, BookOpen, Layers, MapPin 
} from 'lucide-react';
import { useBranchContext } from '@/providers/BranchProvider';
import { branchService, Branch } from '@/services/branch.service';
import { courseService, Course } from '@/services/course.service';
import { batchService, Batch } from '@/services/batch.service';
import { subjectService, Subject } from '@/services/subject.service';
import { studentService, Student } from '@/services/student.service';
import { attendanceService, AttendanceRecordItem } from '@/services/attendance.service';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/providers/ToastProvider';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export default function AttendanceLogsPage() {
  const { toast } = useToast();
  const { selectedBranchId, branches: globalBranches } = useBranchContext();

  // Filters State
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [courses, setCourses] = React.useState<Course[]>([]);
  const [batches, setBatches] = React.useState<Batch[]>([]);
  const [subjects, setSubjects] = React.useState<Subject[]>([]);

  const [branchId, setBranchId] = React.useState<string>('');
  const [courseId, setCourseId] = React.useState<string>('');
  const [batchId, setBatchId] = React.useState<string>('');
  const [subjectId, setSubjectId] = React.useState<string>('');
  const [selectedDate, setSelectedDate] = React.useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Data & Loading States
  const [students, setStudents] = React.useState<Student[]>([]);
  const [attendanceMap, setAttendanceMap] = React.useState<Record<string, AttendanceStatus>>({});
  const [remarksMap, setRemarksMap] = React.useState<Record<string, string>>({});
  
  const [isLoadingFilterData, setIsLoadingFilterData] = React.useState(false);
  const [isLoadingStudents, setIsLoadingStudents] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  // 1. Sync Branch selection with global BranchProvider active branch
  React.useEffect(() => {
    if (selectedBranchId) {
      setBranchId(selectedBranchId);
    } else if (globalBranches.length > 0 && !branchId) {
      setBranchId(globalBranches[0].id);
    }
  }, [selectedBranchId, globalBranches]);

  // 2. Load Branches list
  React.useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await branchService.findAll('', '', 1, 100);
        setBranches(res.branches.length > 0 ? res.branches : globalBranches);
      } catch (err) {
        setBranches(globalBranches);
      }
    };
    fetchBranches();
  }, [globalBranches]);

  // 3. When Branch changes, load Courses for that Branch
  React.useEffect(() => {
    if (!branchId) {
      setCourses([]);
      setCourseId('');
      return;
    }
    const fetchCourses = async () => {
      setIsLoadingFilterData(true);
      try {
        const res = await courseService.findAll('', branchId, 'active', 1, 100);
        const list = res.courses || [];
        setCourses(list);
        if (list.length > 0) {
          setCourseId(list[0].id);
        } else {
          setCourseId('');
          setBatches([]);
          setBatchId('');
          setSubjects([]);
          setSubjectId('');
        }
      } catch (err) {
        console.error('Failed to fetch courses for branch:', err);
      } finally {
        setIsLoadingFilterData(false);
      }
    };
    fetchCourses();
  }, [branchId]);

  // 4. When Course changes, load Batches & Subjects for that Course
  React.useEffect(() => {
    if (!branchId || !courseId) {
      setBatches([]);
      setBatchId('');
      setSubjects([]);
      setSubjectId('');
      return;
    }
    const fetchBatchesAndSubjects = async () => {
      setIsLoadingFilterData(true);
      try {
        const [batchRes, subjectList] = await Promise.all([
          batchService.findAll('', branchId, courseId, 'active', 1, 100),
          subjectService.findAll(courseId),
        ]);
        
        const bList = batchRes.batches || [];
        setBatches(bList);
        if (bList.length > 0) {
          setBatchId(bList[0].id);
        } else {
          setBatchId('');
        }

        setSubjects(subjectList || []);
        setSubjectId(''); // optional filter
      } catch (err) {
        console.error('Failed to fetch batches or subjects:', err);
      } finally {
        setIsLoadingFilterData(false);
      }
    };
    fetchBatchesAndSubjects();
  }, [branchId, courseId]);

  // 5. Load Students and existing Attendance Register when Branch, Course, Batch, or Date changes
  const fetchAttendanceRegister = React.useCallback(async () => {
    if (!branchId || !courseId || !batchId) {
      setStudents([]);
      setAttendanceMap({});
      return;
    }

    setIsLoadingStudents(true);
    try {
      // Fetch students in this batch
      const [stdRes, existingReport] = await Promise.all([
        studentService.findAll(branchId, courseId, batchId, 1, 100),
        attendanceService.getStudentAttendanceReport(batchId, selectedDate, subjectId || undefined),
      ]);

      const stdList = stdRes.students || [];
      setStudents(stdList);

      // Build existing attendance map
      const initialMap: Record<string, AttendanceStatus> = {};
      const initialRemarks: Record<string, string> = {};

      // Default all enrolled students to 'present'
      stdList.forEach(s => {
        initialMap[s.id] = 'present';
        initialRemarks[s.id] = '';
      });

      // Override with recorded logs from backend if present
      if (Array.isArray(existingReport)) {
        existingReport.forEach((rec: AttendanceRecordItem) => {
          if (rec.studentId) {
            initialMap[rec.studentId] = rec.status;
            if (rec.remarks) initialRemarks[rec.studentId] = rec.remarks;
          }
        });
      }

      setAttendanceMap(initialMap);
      setRemarksMap(initialRemarks);
    } catch (err: any) {
      toast('Failed to load attendance register', err.message || 'Error', 'error');
    } finally {
      setIsLoadingStudents(false);
    }
  }, [branchId, courseId, batchId, subjectId, selectedDate, toast]);

  React.useEffect(() => {
    fetchAttendanceRegister();
  }, [fetchAttendanceRegister]);

  // Attendance Toggle Handlers
  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceMap(prev => ({ ...prev, [studentId]: status }));
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    const nextMap: Record<string, AttendanceStatus> = {};
    students.forEach(s => {
      nextMap[s.id] = status;
    });
    setAttendanceMap(nextMap);
  };

  // Submit Register Handler
  const handleSaveRegister = async () => {
    if (!batchId) {
      toast('Validation Error', 'Please select a batch to save attendance.', 'error');
      return;
    }
    if (students.length === 0) {
      toast('Validation Error', 'No active students found in this batch.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const records = students.map(s => ({
        studentId: s.id,
        status: attendanceMap[s.id] || 'present',
        remarks: remarksMap[s.id] || undefined,
      }));

      await attendanceService.submitStudentAttendance({
        batchId,
        subjectId: subjectId || undefined,
        date: selectedDate,
        records,
      });

      toast('Register Saved', `Attendance for ${students.length} students recorded successfully.`, 'success');
      fetchAttendanceRegister();
    } catch (err: any) {
      toast('Save Failed', err.message || 'Could not record attendance.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Compute Statistics
  const totalStudents = students.length;
  const presentCount = Object.values(attendanceMap).filter(v => v === 'present').length;
  const absentCount = Object.values(attendanceMap).filter(v => v === 'absent').length;
  const lateCount = Object.values(attendanceMap).filter(v => v === 'late').length;
  const excusedCount = Object.values(attendanceMap).filter(v => v === 'excused').length;
  const attendancePercentage = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

  const currentBranch = branches.find(b => b.id === branchId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto select-none">
      
      {/* Page Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Attendance Logs & Register
            </h1>
            <Badge variant="info" className="bg-primary/10 text-primary border-primary/20 font-bold text-[10px] uppercase">
              {currentBranch ? `Branch: ${currentBranch.name}` : 'Campus Filtered'}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Track, mark, and inspect daily student rollcall records filtered by Branch, Course, Batch, and Subject.
          </p>
        </div>

        {/* Global Save Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <Button 
            variant="secondary" 
            onClick={fetchAttendanceRegister}
            disabled={isLoadingStudents}
            className="h-10 text-xs font-bold gap-1.5 bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStudents ? 'animate-spin' : ''}`} /> Refresh
          </Button>

          <Button 
            onClick={handleSaveRegister}
            disabled={isSaving || students.length === 0}
            className="h-10 text-xs font-bold gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Attendance Register'}
          </Button>
        </div>
      </div>

      {/* Filter Control Bar Card */}
      <Card className="p-5 border border-slate-200 bg-white shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Filter className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Hierarchical Filter Controls
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          
          {/* 1. Branch Selector */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-indigo-500" /> Operational Branch *
            </label>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary font-bold text-slate-900 cursor-pointer"
            >
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
              ))}
            </select>
          </div>

          {/* 2. Course Selector */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
              <BookOpen className="w-3 h-3 text-indigo-500" /> Course Track *
            </label>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              disabled={isLoadingFilterData || courses.length === 0}
              className="h-10 w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary font-bold text-slate-900 cursor-pointer disabled:opacity-50"
            >
              {courses.length === 0 ? (
                <option value="">No courses in branch</option>
              ) : (
                courses.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                ))
              )}
            </select>
          </div>

          {/* 3. Batch Selector */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
              <Layers className="w-3 h-3 text-indigo-500" /> Intake Batch *
            </label>
            <select
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              disabled={isLoadingFilterData || batches.length === 0}
              className="h-10 w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary font-bold text-slate-900 cursor-pointer disabled:opacity-50"
            >
              {batches.length === 0 ? (
                <option value="">No batches in course</option>
              ) : (
                batches.map(b => (
                  <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                ))
              )}
            </select>
          </div>

          {/* 4. Subject Selector */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
              <BookOpen className="w-3 h-3 text-indigo-500" /> Subject (Optional)
            </label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              disabled={isLoadingFilterData}
              className="h-10 w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary font-bold text-slate-900 cursor-pointer disabled:opacity-50"
            >
              <option value="">All Curriculum Subjects</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* 5. Date Picker */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
              <CalendarDays className="w-3 h-3 text-indigo-500" /> Attendance Date *
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary font-bold text-slate-900 cursor-pointer"
            />
          </div>

        </div>
      </Card>

      {/* Summary KPI Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 border border-slate-200 bg-white flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Enrolled</p>
            <p className="text-xl font-extrabold text-slate-900 mt-0.5">{totalStudents}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 border border-emerald-200 bg-emerald-50/30 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Present Count</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <p className="text-xl font-extrabold text-emerald-700">{presentCount}</p>
              <span className="text-xs font-bold text-emerald-600">({attendancePercentage}%)</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 border border-rose-200 bg-rose-50/30 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Absent Count</p>
            <p className="text-xl font-extrabold text-rose-700 mt-0.5">{absentCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
            <XCircle className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 border border-amber-200 bg-amber-50/30 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Late / Excused</p>
            <p className="text-xl font-extrabold text-amber-700 mt-0.5">{lateCount + excusedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* Attendance Register Matrix Table */}
      <Card className="border border-slate-200 bg-white overflow-hidden shadow-xs">
        
        {/* Table Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-primary" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Student Register Rollcall Matrix
            </h4>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 mr-1">Quick Mark:</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleMarkAll('present')}
              className="text-[11px] h-7 px-2.5 bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 font-bold"
            >
              Mark All Present
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleMarkAll('absent')}
              className="text-[11px] h-7 px-2.5 bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 font-bold"
            >
              Mark All Absent
            </Button>
          </div>
        </div>

        {/* Table List Content */}
        {isLoadingStudents ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            <p className="text-xs font-extrabold text-slate-600 animate-pulse">
              Loading student register records...
            </p>
          </div>
        ) : students.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">No Enrolled Students Found</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No students are currently enrolled in the selected Branch, Course, and Batch combination. Select a different filter above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/70 text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Student Profile</th>
                  <th className="py-3 px-4">ADM / Roll Number</th>
                  <th className="py-3 px-4">Branch / Course / Batch</th>
                  <th className="py-3 px-4 text-center">Attendance Status</th>
                  <th className="py-3 px-4">Remarks (Optional)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {students.map((std, idx) => {
                  const currentStatus = attendanceMap[std.id] || 'present';
                  return (
                    <tr key={std.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-400">{idx + 1}</td>
                      
                      {/* Student Profile Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-extrabold text-xs">
                            {std.firstName?.[0]}{std.lastName?.[0]}
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-900">{std.firstName} {std.lastName}</p>
                            <p className="text-[11px] text-slate-500">{std.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* ADM / Roll Number */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        {std.rollNumber || std.admissionNumber || 'N/A'}
                      </td>

                      {/* Branch / Course / Batch */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-800">{std.branch?.name || currentBranch?.name || 'Main Branch'}</p>
                          <p className="text-[11px] text-slate-500">{std.course?.name || 'Course'} • Batch {std.batch?.name || 'A'}</p>
                        </div>
                      </td>

                      {/* Attendance Status Buttons */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-1 bg-slate-100/80 p-1 rounded-xl w-fit mx-auto border border-slate-200">
                          <button
                            type="button"
                            onClick={() => handleStatusChange(std.id, 'present')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                              currentStatus === 'present' 
                                ? 'bg-emerald-600 text-white shadow-xs' 
                                : 'text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" /> Present
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStatusChange(std.id, 'absent')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                              currentStatus === 'absent' 
                                ? 'bg-rose-600 text-white shadow-xs' 
                                : 'text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            <XCircle className="w-3.5 h-3.5" /> Absent
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStatusChange(std.id, 'late')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                              currentStatus === 'late' 
                                ? 'bg-amber-500 text-white shadow-xs' 
                                : 'text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            <Clock className="w-3.5 h-3.5" /> Late
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStatusChange(std.id, 'excused')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                              currentStatus === 'excused' 
                                ? 'bg-blue-600 text-white shadow-xs' 
                                : 'text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            <AlertCircle className="w-3.5 h-3.5" /> Excused
                          </button>
                        </div>
                      </td>

                      {/* Remarks Input */}
                      <td className="py-3.5 px-4">
                        <input
                          type="text"
                          placeholder="Add optional notes..."
                          value={remarksMap[std.id] || ''}
                          onChange={(e) => setRemarksMap(prev => ({ ...prev, [std.id]: e.target.value }))}
                          className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                        />
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </Card>
    </div>
  );
}
