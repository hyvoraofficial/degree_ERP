'use client';

import * as React from 'react';
import { 
  UserCheck, Plus, Search, RefreshCw, Calendar, IndianRupee, Building, X, ExternalLink, Award
} from 'lucide-react';
import { studentService, Student } from '@/services/student.service';
import { teacherService, Teacher } from '@/services/teacher.service';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/providers/ToastProvider';

interface Internship {
  id: string;
  studentName: string;
  studentRoll: string;
  companyName: string;
  role: string;
  stipend: string;
  startDate: string;
  endDate: string;
  mentorName: string;
  status: string;
}

export default function InternshipsPage() {
  const { toast } = useToast();

  const [internships, setInternships] = React.useState<Internship[]>([
    {
      id: 'int-1',
      studentName: 'Arjun Sharma',
      studentRoll: '1HY26CS001',
      companyName: 'Infosys Labs',
      role: 'Cloud Engineering Intern',
      stipend: '₹25,000 / month',
      startDate: '2026-06-01',
      endDate: '2026-08-31',
      mentorName: 'Dr. Anand Kulkarni',
      status: 'active',
    },
    {
      id: 'int-2',
      studentName: 'Rohit Reddy',
      studentRoll: '1HY25CS015',
      companyName: 'Bosch Engineering',
      role: 'Embedded Software Intern',
      stipend: '₹30,000 / month',
      startDate: '2026-05-15',
      endDate: '2026-07-31',
      mentorName: 'Dr. Sneha Nambiar',
      status: 'completed',
    },
  ]);

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [students, setStudents] = React.useState<Student[]>([]);
  const [faculty, setFaculty] = React.useState<Teacher[]>([]);

  // Form
  const [studentId, setStudentId] = React.useState('');
  const [companyName, setCompanyName] = React.useState('');
  const [role, setRole] = React.useState('');
  const [stipend, setStipend] = React.useState('25000');
  const [mentorId, setMentorId] = React.useState('');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');

  React.useEffect(() => {
    Promise.all([
      studentService.findAll(undefined, undefined, undefined, 1, 100),
      teacherService.findAll('', undefined, 1, 100),
    ]).then(([resSt, resFac]) => {
      setStudents(resSt.students || []);
      setFaculty(resFac.teachers || []);
    }).catch(console.error);
  }, []);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const st = students.find((s) => s.id === studentId);
    const fac = faculty.find((f) => f.id === mentorId);

    const newRecord: Internship = {
      id: `int-${Date.now()}`,
      studentName: st?.user ? `${st.user.firstName} ${st.user.lastName || ''}`.trim() : 'Enrolled Student',
      studentRoll: st?.rollNumber || '1HY26CS003',
      companyName,
      role,
      stipend: `₹${Number(stipend).toLocaleString()} / month`,
      startDate: startDate || new Date().toISOString().split('T')[0],
      endDate: endDate || '2026-08-31',
      mentorName: fac?.user ? `${fac.user.firstName} ${fac.user.lastName || ''}`.trim() : 'Faculty Mentor',
      status: 'active',
    };

    setInternships([newRecord, ...internships]);
    toast('Success', 'Student internship tracked.', 'success');
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Internship Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Industry student internships, faculty mentors, stipend tracking and completion status.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} size="sm" className="gap-2 bg-primary text-white">
          <Plus className="w-4 h-4" />
          Log Internship
        </Button>
      </div>

      {/* Internships Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {internships.map((int) => (
          <Card key={int.id} className="p-5 border-slate-200 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                  {int.studentRoll}
                </span>
                <Badge variant={int.status === 'active' ? 'success' : 'outline'} className="text-[10px] capitalize">
                  {int.status}
                </Badge>
              </div>

              <h3 className="font-extrabold text-sm text-slate-900">{int.studentName}</h3>
              <p className="text-xs font-bold text-primary mt-0.5">{int.role}</p>
              <p className="text-xs text-slate-500 font-semibold">{int.companyName}</p>

              <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[11px]">Stipend:</span>
                  <span className="font-bold text-slate-800">{int.stipend}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[11px]">Faculty Mentor:</span>
                  <span className="font-semibold text-slate-700">{int.mentorName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[11px]">Duration:</span>
                  <span className="font-semibold text-slate-700">{int.startDate} to {int.endDate}</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Log Internship Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-base text-slate-900">Log Student Internship</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Student *</label>
                <select
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white text-slate-800"
                  required
                >
                  <option value="">-- Select Student --</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.user?.firstName} {s.user?.lastName} ({s.rollNumber || s.admissionNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Host Company *</label>
                  <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required className="text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Internship Role *</label>
                  <Input value={role} onChange={(e) => setRole(e.target.value)} required className="text-xs" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Stipend (₹/month)</label>
                  <Input type="number" value={stipend} onChange={(e) => setStipend(e.target.value)} className="text-xs font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Faculty Mentor</label>
                  <select
                    value={mentorId}
                    onChange={(e) => setMentorId(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white text-slate-800"
                  >
                    <option value="">-- Faculty Mentor --</option>
                    {faculty.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.user?.firstName} {f.user?.lastName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Start Date</label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">End Date</label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="text-xs" />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-primary text-white">
                  Save Internship
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
