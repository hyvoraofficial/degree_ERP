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
import { API_BASE_URL, getAuthToken, getSubdomain } from '@/config/api.config';

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

  // 4. Fetch Results when course selected
  const fetchResults = React.useCallback(async () => {
    setIsLoadingResults(true);

    try {
      const token = getAuthToken();
      const params = new URLSearchParams();
      if (selectedCourseId) params.append('courseId', selectedCourseId);

      const res = await fetch(`${API_BASE_URL}/exams/results/all?${params.toString()}`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'X-Academy-Subdomain': getSubdomain(),
        },
      });

      if (!res.ok) {
        throw new Error('Failed to retrieve exam results from database');
      }

      const json = await res.json();
      const rawData = json.data || [];

      const rows: ExamResultRow[] = rawData.map((item: any) => {
        const marks = Number(item.marksObtained) || 0;
        const maxMarks = Number(item.examPaper?.maxMarks) || 100;
        const percentage = Math.round((marks / maxMarks) * 100);
        let grade = 'F';
        if (percentage >= 90) grade = 'O';
        else if (percentage >= 80) grade = 'A+';
        else if (percentage >= 70) grade = 'A';
        else if (percentage >= 60) grade = 'B+';
        else if (percentage >= 50) grade = 'B';
        else if (percentage >= 40) grade = 'P';

        return {
          id: item.id,
          studentId: item.studentId,
          studentName: item.student?.user ? `${item.student.user.firstName} ${item.student.user.lastName}` : 'Unknown Student',
          admissionNumber: item.student?.admissionNumber || item.student?.universityRegNumber || 'N/A',
          rollNumber: item.student?.rollNumber || 'N/A',
          courseName: item.student?.course?.name || 'Degree Program',
          batchName: item.student?.batch?.name || 'Section A',
          examTitle: item.examPaper?.exam?.name || 'Semester Assessment',
          subjectName: item.examPaper?.subject?.name || 'Core Subject',
          marksObtained: marks,
          maxMarks: maxMarks,
          percentage: percentage,
          grade: grade,
          status: item.status === 'pass' ? 'pass' : 'fail',
          remarks: item.remarks || '',
        };
      });

      setResults(rows);
    } catch (err: any) {
      toast('Failed to fetch results', err.message || 'Error retrieving results', 'error');
    } finally {
      setIsLoadingResults(false);
    }
  }, [selectedCourseId, toast]);

  React.useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  // Filtered dataset
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
      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Examination & Course Results
            </h1>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              Review student academic performance, grade transcripts, and pass rates by branch & course.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => fetchResults()} 
            className="gap-2 cursor-pointer border-slate-200 text-slate-700 bg-white hover:bg-slate-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingResults ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.print()} 
            className="gap-2 cursor-pointer border-slate-200 text-slate-700 bg-white hover:bg-slate-50"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Report
          </Button>
        </div>
      </div>

      {/* Selection Control Panel (Branch & Course Stepper) */}
      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-primary" />
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
              Selection Controls
            </h2>
          </div>
          {isAllBranchesSelected && (
            <Badge variant="outline" className="text-[10px] font-bold text-amber-700 bg-amber-50 border-amber-200 px-2.5 py-0.5">
              Header Set to All Branches — Select Branch Below First
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Step 1: Branch Selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              1. Select Branch *
            </label>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary cursor-pointer shadow-xs"
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
              <span className="text-[11px] text-amber-700 font-semibold flex items-center gap-1 mt-0.5">
                <AlertCircle className="w-3 h-3" /> Please select a Branch to view its registered courses.
              </span>
            )}
          </div>

          {/* Step 2: Course Selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-primary" />
              2. Select Course *
            </label>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
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
              <span className="text-[11px] text-primary font-semibold flex items-center gap-1 mt-0.5">
                <AlertCircle className="w-3 h-3" /> Select a Course from the dropdown above to load results.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Results Table and Stats */}
      {selectedBranchId && selectedCourseId ? (
        <>
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase text-slate-500">Total Enrolled</p>
                <p className="text-xl font-black text-slate-900">{totalStudents}</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase text-slate-500">Pass Rate</p>
                <p className="text-xl font-black text-emerald-600">{passRate}%</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase text-slate-500">Class Average</p>
                <p className="text-xl font-black text-slate-900">{averagePercentage}%</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase text-slate-500">Top Score</p>
                <p className="text-xl font-black text-purple-600">{highestMark} / 100</p>
              </div>
            </div>
          </div>

          {/* Table Filters & Toolbar */}
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search student or subject..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold text-slate-500">Filter Status:</span>
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All ({results.length})
              </button>
              <button
                onClick={() => setStatusFilter('PASS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'PASS'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Passed ({results.filter(r => r.status === 'pass').length})
              </button>
              <button
                onClick={() => setStatusFilter('FAIL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'FAIL'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Failed ({results.filter(r => r.status === 'fail').length})
              </button>
            </div>
          </div>

          {/* Results Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-extrabold uppercase tracking-wider text-[11px]">
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
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredResults.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center gap-2">
                          <Award className="w-8 h-8 text-slate-300" />
                          <p className="font-bold text-sm text-slate-700">No exam result records found.</p>
                          <p className="text-xs text-slate-500">Try adjusting your search query or status filter.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredResults.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-xs shrink-0 border border-primary/20">
                              {r.studentName.charAt(0)}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900">{r.studentName}</span>
                              <span className="text-[10px] text-slate-500">{r.courseName}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col font-mono text-[11px]">
                            <span className="font-bold text-slate-800">{r.admissionNumber}</span>
                            <span className="text-[10px] text-slate-500">Roll: {r.rollNumber}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900">{r.subjectName}</span>
                            <span className="text-[10px] text-primary font-semibold">{r.examTitle}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-700">
                          {r.batchName}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold">
                          <span className="text-slate-900">{r.marksObtained}</span>
                          <span className="text-slate-400 text-[10px]"> / {r.maxMarks}</span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black ${
                            r.grade === 'A+' || r.grade === 'A'
                              ? 'bg-emerald-100 text-emerald-800'
                              : r.grade === 'B' || r.grade === 'C'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {r.grade}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {r.status === 'pass' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Passed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <XCircle className="w-3 h-3" /> Failed
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedResult(r)}
                            className="h-8 text-[11px] gap-1 cursor-pointer border-slate-200 text-slate-700 bg-white hover:bg-slate-50"
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
          </div>
        </>
      ) : (
        /* Prompt when Branch or Course not selected */
        <div className="bg-white border-2 border-dashed border-slate-200 p-12 rounded-2xl text-center flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <Layers className="w-8 h-8" />
          </div>
          <div className="max-w-md space-y-1">
            <h3 className="text-base font-extrabold text-slate-900">
              {!selectedBranchId ? 'Select a Branch to Begin' : 'Select a Course'}
            </h3>
            <p className="text-xs text-slate-500">
              {!selectedBranchId
                ? 'Please select a Branch from the control panel above to view courses offered at that campus.'
                : 'Choose a Course from the dropdown menu to inspect student examination scorecards and grades.'}
            </p>
          </div>
        </div>
      )}

      {/* Result Details Modal */}
      {selectedResult && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Official Academic Transcript</h3>
                  <p className="text-[11px] text-slate-500">{selectedResult.examTitle}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedResult(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-500">Student Name:</span>
                  <span className="font-bold text-slate-900">{selectedResult.studentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Admission Number:</span>
                  <span className="font-mono font-bold text-slate-800">{selectedResult.admissionNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Course & Batch:</span>
                  <span className="font-semibold text-slate-800">{selectedResult.courseName} ({selectedResult.batchName})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Subject:</span>
                  <span className="font-bold text-primary">{selectedResult.subjectName}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-slate-100 rounded-xl">
                  <span className="text-[10px] text-slate-500 font-bold block">Marks</span>
                  <span className="text-sm font-black text-slate-900">{selectedResult.marksObtained} / {selectedResult.maxMarks}</span>
                </div>
                <div className="p-3 bg-slate-100 rounded-xl">
                  <span className="text-[10px] text-slate-500 font-bold block">Grade</span>
                  <span className="text-sm font-black text-primary">{selectedResult.grade}</span>
                </div>
                <div className="p-3 bg-slate-100 rounded-xl">
                  <span className="text-[10px] text-slate-500 font-bold block">Status</span>
                  <span className={`text-xs font-black uppercase ${selectedResult.status === 'pass' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {selectedResult.status}
                  </span>
                </div>
              </div>

              {selectedResult.remarks && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-extrabold uppercase text-slate-600 block mb-1">Faculty Remarks</span>
                  <p className="text-slate-700 italic">{selectedResult.remarks}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setSelectedResult(null)} className="cursor-pointer border-slate-200 text-slate-700">
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
