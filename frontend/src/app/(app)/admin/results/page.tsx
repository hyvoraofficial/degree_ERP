'use client';

import * as React from 'react';
import { 
  Award, Search, Filter, RefreshCw, MapPin, BookOpen, Layers, 
  CheckCircle2, XCircle, AlertCircle, FileText, Download, Printer, User, TrendingUp 
} from 'lucide-react';
import { branchService, Branch } from '@/services/branch.service';
import { courseService, Course } from '@/services/course.service';
import { useBranchContext } from '@/providers/BranchProvider';
import { useToast } from '@/providers/ToastProvider';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export interface ExamResultRow {
  id: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  rollNumber: string;
  courseName: string;
  batchName: string;
  examTitle: string;
  subjectName: string;
  marksObtained: number;
  maxMarks: number;
  percentage: number;
  grade: string;
  status: 'pass' | 'fail';
  remarks?: string;
}

export default function AdminResultsPage() {
  const { toast } = useToast();
  const { selectedBranchId: globalBranchId } = useBranchContext();

  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [courses, setCourses] = React.useState<Course[]>([]);
  
  const [selectedBranchId, setSelectedBranchId] = React.useState<string>('');
  const [selectedCourseId, setSelectedCourseId] = React.useState<string>('');
  
  const [results, setResults] = React.useState<ExamResultRow[]>([]);
  const [isLoadingBranches, setIsLoadingBranches] = React.useState(true);
  const [isLoadingCourses, setIsLoadingCourses] = React.useState(false);
  const [isLoadingResults, setIsLoadingResults] = React.useState(false);

  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'ALL' | 'PASS' | 'FAIL'>('ALL');
  const [selectedResult, setSelectedResult] = React.useState<ExamResultRow | null>(null);

  // 1. Initial Load Branches
  React.useEffect(() => {
    async function loadBranches() {
      setIsLoadingBranches(true);
      try {
        const res = await branchService.findAll('', 'active', 1, 100);
        setBranches(res.branches);
      } catch (err: any) {
        toast('Failed to load branches', err.message || 'Error fetching branches list', 'error');
      } finally {
        setIsLoadingBranches(false);
      }
    }
    loadBranches();
  }, [toast]);

  // 2. Handle Sync with Header Global Branch
  React.useEffect(() => {
    if (globalBranchId && globalBranchId !== 'all') {
      setSelectedBranchId(globalBranchId);
    } else if (globalBranchId === 'all') {
      setSelectedBranchId('');
      setSelectedCourseId('');
      setResults([]);
    }
  }, [globalBranchId]);

  // 3. Load Courses whenever selectedBranchId changes
  React.useEffect(() => {
    async function loadCourses() {
      if (!selectedBranchId) {
        setCourses([]);
        setSelectedCourseId('');
        setResults([]);
        return;
      }
      setIsLoadingCourses(true);
      try {
        const res = await courseService.findAll('', selectedBranchId, 'active', 1, 100);
        setCourses(res.courses);
        if (res.courses.length > 0) {
          setSelectedCourseId(res.courses[0].id);
        } else {
          setSelectedCourseId('');
          setResults([]);
        }
      } catch (err: any) {
        toast('Failed to load courses', err.message || 'Error loading courses for branch', 'error');
      } finally {
        setIsLoadingCourses(false);
      }
    }
    loadCourses();
  }, [selectedBranchId, toast]);

  // 4. Load Results whenever selectedCourseId changes
  const fetchResults = React.useCallback(async () => {
    if (!selectedBranchId || !selectedCourseId) {
      setResults([]);
      return;
    }
    setIsLoadingResults(true);

    try {
      // Mock / Seeded live result dataset for selected course & branch
      const activeBranch = branches.find(b => b.id === selectedBranchId);
      const activeCourse = courses.find(c => c.id === selectedCourseId);

      const mockData: ExamResultRow[] = [
        {
          id: 'res-1',
          studentId: 's1',
          studentName: 'Priya Nair',
          admissionNumber: 'HYV-2026-0002',
          rollNumber: '10A-02',
          courseName: activeCourse?.name || 'Grade 10',
          batchName: 'Batch A - 2026',
          examTitle: 'Mid-Term STEM Assessment',
          subjectName: 'Advanced Mathematics',
          marksObtained: 95.0,
          maxMarks: 100.0,
          percentage: 95.0,
          grade: 'A+',
          status: 'pass',
          remarks: 'Outstanding layout and problem solving steps.'
        },
        {
          id: 'res-2',
          studentId: 's2',
          studentName: 'Rohan Sharma',
          admissionNumber: 'HYV-2026-0003',
          rollNumber: '10A-03',
          courseName: activeCourse?.name || 'Grade 10',
          batchName: 'Batch A - 2026',
          examTitle: 'Mid-Term STEM Assessment',
          subjectName: 'Advanced Mathematics',
          marksObtained: 84.5,
          maxMarks: 100.0,
          percentage: 84.5,
          grade: 'A',
          status: 'pass',
          remarks: 'Excellent concept comprehension in trigonometry.'
        },
        {
          id: 'res-3',
          studentId: 's3',
          studentName: 'Devendra Verma',
          admissionNumber: 'HYV-2026-0004',
          rollNumber: '10A-04',
          courseName: activeCourse?.name || 'Grade 10',
          batchName: 'Batch A - 2026',
          examTitle: 'Mid-Term STEM Assessment',
          subjectName: 'Classical Physics',
          marksObtained: 76.0,
          maxMarks: 100.0,
          percentage: 76.0,
          grade: 'B',
          status: 'pass',
          remarks: 'Good grasp of Newtonian mechanics.'
        },
        {
          id: 'res-4',
          studentId: 's4',
          studentName: 'Kiran Reddy',
          admissionNumber: 'HYV-2026-0005',
          rollNumber: '10A-05',
          courseName: activeCourse?.name || 'Grade 10',
          batchName: 'Batch B - 2026',
          examTitle: 'Mid-Term STEM Assessment',
          subjectName: 'Intro to Programming',
          marksObtained: 42.0,
          maxMarks: 100.0,
          percentage: 42.0,
          grade: 'F',
          status: 'fail',
          remarks: 'Requires additional practice in loop conditions.'
        },
        {
          id: 'res-5',
          studentId: 's5',
          studentName: 'Sneha Patel',
          admissionNumber: 'HYV-2026-0006',
          rollNumber: '10A-06',
          courseName: activeCourse?.name || 'Grade 10',
          batchName: 'Batch B - 2026',
          examTitle: 'Mid-Term STEM Assessment',
          subjectName: 'Advanced Mathematics',
          marksObtained: 89.0,
          maxMarks: 100.0,
          percentage: 89.0,
          grade: 'A',
          status: 'pass',
          remarks: 'Very neat presentation and logic.'
        }
      ];

      setResults(mockData);
    } catch (err: any) {
      toast('Failed to fetch results', err.message || 'Error retrieving results', 'error');
    } finally {
      setIsLoadingResults(false);
    }
  }, [selectedBranchId, selectedCourseId, branches, courses, toast]);

  React.useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  // Filters
  const filteredResults = results.filter((r) => {
    const matchesSearch = 
      r.studentName.toLowerCase().includes(search.toLowerCase()) ||
      r.admissionNumber.toLowerCase().includes(search.toLowerCase()) ||
      r.subjectName.toLowerCase().includes(search.toLowerCase());
    
    if (statusFilter === 'PASS') return matchesSearch && r.status === 'pass';
    if (statusFilter === 'FAIL') return matchesSearch && r.status === 'fail';
    return matchesSearch;
  });

  // Calculate Metrics
  const totalStudents = filteredResults.length;
  const passedStudents = filteredResults.filter(r => r.status === 'pass').length;
  const passRate = totalStudents > 0 ? ((passedStudents / totalStudents) * 100).toFixed(1) : '0';
  const averagePercentage = totalStudents > 0 
    ? (filteredResults.reduce((acc, curr) => acc + curr.percentage, 0) / totalStudents).toFixed(1)
    : '0';
  const highestMark = totalStudents > 0 
    ? Math.max(...filteredResults.map(r => r.marksObtained))
    : 0;

  const isAllBranchesSelected = !globalBranchId || globalBranchId === 'all';

  return (
    <div className="space-y-6 select-none pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-6 rounded-3xl shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
              Examination & Course Results
            </h1>
            <p className="text-xs font-medium text-slate-600 dark:text-zinc-400 mt-0.5">
              Review student academic performance, grade transcripts, and pass rates by branch & course.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => fetchResults()} className="gap-2 cursor-pointer">
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingResults ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2 cursor-pointer">
            <Printer className="w-3.5 h-3.5" />
            Print Report
          </Button>
        </div>
      </div>

      {/* Selection Control Panel (Branch & Course Stepper) */}
      <Card className="p-6 space-y-4 bg-slate-50/60 dark:bg-zinc-900/50 border-slate-200 dark:border-zinc-800">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100">
              Selection Controls
            </h2>
          </div>
          {isAllBranchesSelected && (
            <Badge variant="outline" className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900">
              Header Set to All Branches — Select Branch First
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Step 1: Branch Selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-indigo-500" />
              1. Select Branch *
            </label>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-xs"
              disabled={isLoadingBranches}
            >
              <option value="">-- Choose Branch --</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
            {!selectedBranchId && (
              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1 mt-0.5">
                <AlertCircle className="w-3 h-3" /> Please select a Branch to view its registered courses.
              </span>
            )}
          </div>

          {/* Step 2: Course Selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
              2. Select Course *
            </label>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!selectedBranchId || isLoadingCourses}
            >
              <option value="">
                {!selectedBranchId 
                  ? '-- Select Branch First --' 
                  : courses.length === 0 
                  ? '-- No Courses Registered --' 
                  : '-- Choose Course --'}
              </option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
            {selectedBranchId && !selectedCourseId && (
              <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1 mt-0.5">
                <AlertCircle className="w-3 h-3" /> Select a Course from the dropdown above to load results.
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Main Results Table and Stats */}
      {selectedBranchId && selectedCourseId ? (
        <>
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 flex items-center gap-3 border-slate-200 dark:border-zinc-800">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase text-slate-500 dark:text-zinc-400">Total Enrolled</p>
                <p className="text-lg font-black text-slate-900 dark:text-slate-50">{totalStudents}</p>
              </div>
            </Card>

            <Card className="p-4 flex items-center gap-3 border-slate-200 dark:border-zinc-800">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase text-slate-500 dark:text-zinc-400">Pass Rate</p>
                <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{passRate}%</p>
              </div>
            </Card>

            <Card className="p-4 flex items-center gap-3 border-slate-200 dark:border-zinc-800">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase text-slate-500 dark:text-zinc-400">Class Average</p>
                <p className="text-lg font-black text-slate-900 dark:text-slate-50">{averagePercentage}%</p>
              </div>
            </Card>

            <Card className="p-4 flex items-center gap-3 border-slate-200 dark:border-zinc-800">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase text-slate-500 dark:text-zinc-400">Top Score</p>
                <p className="text-lg font-black text-purple-600 dark:text-purple-400">{highestMark} / 100</p>
              </div>
            </Card>
          </div>

          {/* Table Filters & Toolbar */}
          <Card className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-slate-200 dark:border-zinc-800">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search student or subject..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold text-slate-500">Filter Status:</span>
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-300'
                }`}
              >
                All ({results.length})
              </button>
              <button
                onClick={() => setStatusFilter('PASS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'PASS'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-300'
                }`}
              >
                Passed ({results.filter(r => r.status === 'pass').length})
              </button>
              <button
                onClick={() => setStatusFilter('FAIL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'FAIL'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-300'
                }`}
              >
                Failed ({results.filter(r => r.status === 'fail').length})
              </button>
            </div>
          </Card>

          {/* Results Table */}
          <Card className="overflow-hidden border-slate-200 dark:border-zinc-800 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 dark:bg-zinc-800/60 border-b border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 font-extrabold uppercase tracking-wider">
                    <th className="py-3.5 px-4">Student</th>
                    <th className="py-3.5 px-4">Admission / Roll</th>
                    <th className="py-3.5 px-4">Exam & Subject</th>
                    <th className="py-3.5 px-4">Batch</th>
                    <th className="py-3.5 px-4 text-center">Score</th>
                    <th className="py-3.5 px-4 text-center">Grade</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-zinc-800 font-medium">
                  {filteredResults.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500 dark:text-zinc-400">
                        <div className="flex flex-col items-center gap-2">
                          <Award className="w-8 h-8 text-slate-300 dark:text-zinc-600" />
                          <p className="font-bold text-sm">No exam result records found.</p>
                          <p className="text-xs text-slate-400">Try adjusting your search query or status filter.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredResults.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-xs shrink-0 border border-indigo-200 dark:border-indigo-800">
                              {r.studentName.charAt(0)}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900 dark:text-slate-100">{r.studentName}</span>
                              <span className="text-[10px] text-slate-500">{r.courseName}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col font-mono text-[11px]">
                            <span className="font-bold text-slate-800 dark:text-slate-200">{r.admissionNumber}</span>
                            <span className="text-[10px] text-slate-500">Roll: {r.rollNumber}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 dark:text-slate-100">{r.subjectName}</span>
                            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">{r.examTitle}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-600 dark:text-zinc-400">
                          {r.batchName}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold">
                          <span className="text-slate-900 dark:text-slate-100">{r.marksObtained}</span>
                          <span className="text-slate-400 text-[10px]"> / {r.maxMarks}</span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black ${
                            r.grade === 'A+' || r.grade === 'A'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                              : r.grade === 'B' || r.grade === 'C'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                          }`}>
                            {r.grade}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {r.status === 'pass' ? (
                            <Badge variant="success" className="gap-1 px-2.5 py-0.5">
                              <CheckCircle2 className="w-3 h-3" /> Passed
                            </Badge>
                          ) : (
                            <Badge variant="error" className="gap-1 px-2.5 py-0.5">
                              <XCircle className="w-3 h-3" /> Failed
                            </Badge>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedResult(r)}
                            className="h-8 text-[11px] gap-1 cursor-pointer"
                          >
                            <FileText className="w-3 h-3" /> View Transcript
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : (
        /* Prompt when Branch or Course not selected */
        <Card className="p-12 text-center flex flex-col items-center justify-center gap-4 bg-slate-50/50 border-dashed border-2 border-slate-300 dark:border-zinc-800">
          <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Layers className="w-8 h-8" />
          </div>
          <div className="max-w-md space-y-1">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
              {!selectedBranchId ? 'Select a Branch to Begin' : 'Select a Course'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              {!selectedBranchId
                ? 'Please select a Branch from the control panel above to view courses offered at that campus.'
                : 'Choose a Course from the dropdown menu to inspect student examination scorecards and grades.'}
            </p>
          </div>
        </Card>
      )}

      {/* Result Details Modal */}
      {selectedResult && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">Official Academic Transcript</h3>
                  <p className="text-[11px] text-slate-500">{selectedResult.examTitle}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedResult(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 dark:bg-zinc-800/50 p-4 rounded-2xl space-y-2 border border-slate-200 dark:border-zinc-800">
                <div className="flex justify-between">
                  <span className="text-slate-500">Student Name:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{selectedResult.studentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Admission Number:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedResult.admissionNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Course & Batch:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedResult.courseName} ({selectedResult.batchName})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Subject:</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{selectedResult.subjectName}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-slate-100 dark:bg-zinc-800 rounded-xl">
                  <span className="text-[10px] text-slate-500 font-bold block">Marks</span>
                  <span className="text-sm font-black text-slate-900 dark:text-slate-100">{selectedResult.marksObtained} / {selectedResult.maxMarks}</span>
                </div>
                <div className="p-3 bg-slate-100 dark:bg-zinc-800 rounded-xl">
                  <span className="text-[10px] text-slate-500 font-bold block">Grade</span>
                  <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{selectedResult.grade}</span>
                </div>
                <div className="p-3 bg-slate-100 dark:bg-zinc-800 rounded-xl">
                  <span className="text-[10px] text-slate-500 font-bold block">Status</span>
                  <span className={`text-xs font-black uppercase ${selectedResult.status === 'pass' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {selectedResult.status}
                  </span>
                </div>
              </div>

              {selectedResult.remarks && (
                <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900 rounded-xl">
                  <span className="text-[10px] font-extrabold uppercase text-indigo-600 block mb-1">Faculty Remarks</span>
                  <p className="text-slate-700 dark:text-zinc-300 italic">{selectedResult.remarks}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedResult(null)} className="cursor-pointer">
                Close
              </Button>
              <Button size="sm" onClick={() => window.print()} className="gap-2 cursor-pointer">
                <Download className="w-3.5 h-3.5" /> Download PDF Transcript
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
