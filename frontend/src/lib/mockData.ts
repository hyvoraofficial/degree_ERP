import { StudentWithUser } from '@/types/student';
import { TeacherWithUser } from '@/types/teacher';
import { Course, Subject, Batch, ClassSchedule } from '@/types/course';
import { FeeStructure, FeeAllocation, PaymentTransaction, PaymentLedgerEntry } from '@/types/payment';
import { Notification, ActivityLog } from '@/types/notification';

// 1. Mock Academies
export const MOCK_ACADEMY = {
  id: 'a1111111-1111-1111-1111-111111111111',
  name: 'Hyvora Academy',
  subdomain: 'hyvora',
  domain: 'hyvora.edu',
  status: 'active' as const,
};

// 2. Mock Students
export const MOCK_STUDENTS: StudentWithUser[] = [
  {
    id: 's2222222-2222-2222-2222-222222222222',
    academyId: 'a1111111-1111-1111-1111-111111111111',
    userId: 'u5555555-5555-5555-5555-555555555555',
    admissionNumber: 'HYV-2026-0002',
    admissionDate: '2026-03-12',
    dateOfBirth: '2011-08-22',
    gender: 'female',
    bloodGroup: 'A-',
    parentName: 'Karan Nair',
    parentPhone: '+91-9876543212',
    parentEmail: 'karan.nair@yahoo.com',
    firstName: 'Priya',
    lastName: 'Nair',
    email: 'priya@hyvora.com',
    phone: '+91-9999999905',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80',
    status: 'active',
    createdAt: '2026-03-12T11:00:00Z',
    updatedAt: '2026-03-12T11:00:00Z'
  }
];

// 3. Mock Teachers
export const MOCK_TEACHERS: TeacherWithUser[] = [
  {
    id: 't1111111-1111-1111-1111-111111111111',
    academyId: 'a1111111-1111-1111-1111-111111111111',
    userId: 'u2222222-2222-2222-2222-222222222222',
    employeeId: 'EMP-HYV-101',
    specialization: ['Mathematics', 'Physics'],
    qualification: 'M.Sc. in Mathematics, B.Ed.',
    joiningDate: '2024-06-01',
    salary: 75000.00,
    firstName: 'Ramesh',
    lastName: 'Kumar',
    email: 'ramesh@hyvora.com',
    phone: '+91-9999999902',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=100&q=80',
    status: 'active',
    createdAt: '2024-06-01T09:00:00Z',
    updatedAt: '2024-06-01T09:00:00Z'
  }
];

// 4. Academic Data
export const MOCK_COURSES: Course[] = [
  { id: 'c1111111-1111-1111-1111-111111111111', academyId: 'a1111111-1111-1111-1111-111111111111', name: 'Grade 10', code: 'GRADE-10', description: 'High School Matriculation', durationMonths: 12, createdAt: '2025-01-01Z', updatedAt: '2025-01-01Z' },
  { id: 'c2222222-2222-2222-2222-222222222222', academyId: 'a1111111-1111-1111-1111-111111111111', name: 'Grade 11 - Science', code: 'GRADE-11-SCI', description: 'Intermediate STEM Stream', durationMonths: 12, createdAt: '2025-01-01Z', updatedAt: '2025-01-01Z' }
];

export const MOCK_SUBJECTS: Subject[] = [
  { id: 'sub11111-1111-1111-1111-111111111111', academyId: 'a1111111-1111-1111-1111-111111111111', name: 'Advanced Mathematics', code: 'MATH-10', description: 'Algebra, Trigonometry & Pre-Calculus', createdAt: '2025-01-01Z', updatedAt: '2025-01-01Z' },
  { id: 'sub22222-2222-2222-2222-222222222222', academyId: 'a1111111-1111-1111-1111-111111111111', name: 'Classical Physics', code: 'PHYS-10', description: 'Mechanics, Optics & Thermodynamics', createdAt: '2025-01-01Z', updatedAt: '2025-01-01Z' },
  { id: 'sub33333-3333-3333-3333-333333333333', academyId: 'a1111111-1111-1111-1111-111111111111', name: 'Intro to Programming', code: 'CS-11', description: 'Python algorithms & basic data structures', createdAt: '2025-01-01Z', updatedAt: '2025-01-01Z' }
];

export const MOCK_BATCHES: Batch[] = [
  { id: 'b1111111-1111-1111-1111-111111111111', academyId: 'a1111111-1111-1111-1111-111111111111', courseId: 'c1111111-1111-1111-1111-111111111111', name: 'Grade 10 - Batch A (2026)', startDate: '2026-04-01', endDate: '2027-03-31', maxStrength: 40, status: 'active', createdAt: '2026-01-01Z', updatedAt: '2026-01-01Z' }
];

export const MOCK_SCHEDULES: ClassSchedule[] = [
  { id: 'cs1', academyId: 'a1111111-1111-1111-1111-111111111111', batchId: 'b1111111-1111-1111-1111-111111111111', subjectId: 'sub11111-1111-1111-1111-111111111111', teacherId: 't1111111-1111-1111-1111-111111111111', dayOfWeek: 1, startTime: '09:00:00', endTime: '10:00:00', classroomNo: 'Room 101', createdAt: '2026-01-01Z', updatedAt: '2026-01-01Z' },
  { id: 'cs2', academyId: 'a1111111-1111-1111-1111-111111111111', batchId: 'b1111111-1111-1111-1111-111111111111', subjectId: 'sub22222-2222-2222-2222-222222222222', teacherId: 't1111111-1111-1111-1111-111111111111', dayOfWeek: 2, startTime: '10:00:00', endTime: '11:00:00', classroomNo: 'Room 102', createdAt: '2026-01-01Z', updatedAt: '2026-01-01Z' }
];

// 5. Financial Data
export const MOCK_FEE_STRUCTURES: FeeStructure[] = [
  { id: 'fee11111-1111-1111-1111-111111111111', academyId: 'a1111111-1111-1111-1111-111111111111', name: 'Annual Tuition Fee Grade 10', description: 'Primary academic program fees.', amount: 120000.00, frequency: 'annual', createdAt: '2026-01-01Z', updatedAt: '2026-01-01Z' },
  { id: 'fee22222-2222-2222-2222-222222222222', academyId: 'a1111111-1111-1111-1111-111111111111', name: 'Lab Facilities Charge', description: 'Science lab maintenance.', amount: 10000.00, frequency: 'one_time', createdAt: '2026-01-01Z', updatedAt: '2026-01-01Z' }
];

export const MOCK_FEE_ALLOCATIONS: FeeAllocation[] = [
  { id: 'fa111111-1111-1111-1111-111111111111', academyId: 'a1111111-1111-1111-1111-111111111111', feeStructureId: 'fee11111-1111-1111-1111-111111111111', studentId: 's1111111-1111-1111-1111-111111111111', dueDate: '2026-06-30', status: 'partially_paid', totalAmount: 120000.00, paidAmount: 60000.00, discountAmount: 0.00, createdAt: '2026-04-01Z', updatedAt: '2026-06-25Z' },
  { id: 'fa222222-2222-2222-2222-222222222222', academyId: 'a1111111-1111-1111-1111-111111111111', feeStructureId: 'fee11111-1111-1111-1111-111111111111', studentId: 's2222222-2222-2222-2222-222222222222', dueDate: '2026-06-30', status: 'paid', totalAmount: 120000.00, paidAmount: 120000.00, discountAmount: 0.00, createdAt: '2026-04-01Z', updatedAt: '2026-06-28Z' }
];

export const MOCK_PAYMENT_TRANSACTIONS: PaymentTransaction[] = [
  { id: 'pt1', academyId: 'a1111111-1111-1111-1111-111111111111', feeAllocationId: 'fa111111-1111-1111-1111-111111111111', amount: 60000.00, currency: 'INR', paymentMethod: 'bank_transfer', gatewayTransactionRef: 'TXN-HYV-BT987', status: 'completed', retryCount: 0, createdAt: '2026-06-25T10:30:00Z', updatedAt: '2026-06-25T10:30:00Z' },
  { id: 'pt2', academyId: 'a1111111-1111-1111-1111-111111111111', feeAllocationId: 'fa222222-2222-2222-2222-222222222222', amount: 120000.00, currency: 'INR', paymentMethod: 'gateway', gatewayProvider: 'razorpay', gatewayOrderId: 'order_rp_priya123', gatewayTransactionRef: 'pay_rp_priya_txn1', status: 'completed', retryCount: 0, createdAt: '2026-06-28T15:45:00Z', updatedAt: '2026-06-28T15:45:00Z' }
];

export const MOCK_PAYMENTS: PaymentLedgerEntry[] = [
  { id: 'pay1', academyId: 'a1111111-1111-1111-1111-111111111111', feeAllocationId: 'fa111111-1111-1111-1111-111111111111', paymentTransactionId: 'pt1', amountPaid: 60000.00, paymentDate: '2026-06-25T10:30:00Z', receiptNumber: 'REC-HYV-2026-0001', paymentMode: 'bank_transfer', referenceNo: 'TXN-HYV-BT987', remarks: 'Tuition installment 1', recordedBy: 'u1111111-1111-1111-1111-111111111111', createdAt: '2026-06-25T10:30:00Z', updatedAt: '2026-06-25T10:30:00Z' },
  { id: 'pay2', academyId: 'a1111111-1111-1111-1111-111111111111', feeAllocationId: 'fa222222-2222-2222-2222-222222222222', paymentTransactionId: 'pt2', amountPaid: 120000.00, paymentDate: '2026-06-28T15:45:00Z', receiptNumber: 'REC-HYV-2026-0002', paymentMode: 'online_gateway', referenceNo: 'pay_rp_priya_txn1', remarks: 'Tuition Paid Full', recordedBy: 'u1111111-1111-1111-1111-111111111111', createdAt: '2026-06-28T15:45:00Z', updatedAt: '2026-06-28T15:45:00Z' }
];

// 6. E-Learning Files
export const MOCK_MEDIA_FILES = [
  { id: 'f1', academyId: 'a1111111-1111-1111-1111-111111111111', filename: 'demo_syllabus_math.pdf', mimeType: 'application/pdf', fileSize: 1048576, storagePath: 'demo/syllabus/demo_syllabus_math.pdf' },
  { id: 'f2', academyId: 'a1111111-1111-1111-1111-111111111111', filename: 'demo_assignment1_math.pdf', mimeType: 'application/pdf', fileSize: 512000, storagePath: 'demo/assignments/demo_assignment1_math.pdf' }
];

export const MOCK_STUDY_MATERIALS = [
  { id: 'm1', academyId: 'a1111111-1111-1111-1111-111111111111', title: 'Grade 10 Math Syllabus', description: 'Syllabus guidelines.', subjectId: 'sub11111-1111-1111-1111-111111111111', teacherId: 't1111111-1111-1111-1111-111111111111', mediaFileId: 'f1', accessLevel: 'batch_only' }
];

export const MOCK_VIDEOS = [
  { id: 'v1', academyId: 'a1111111-1111-1111-1111-111111111111', title: 'Basics of Velocity & Speed', description: 'Intro to mechanics.', subjectId: 'sub22222-2222-2222-2222-222222222222', teacherId: 't1111111-1111-1111-1111-111111111111', externalVideoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', videoProvider: 'youtube', durationSeconds: 212 }
];

export const MOCK_ASSIGNMENTS = [
  { id: 'as1', academyId: 'a1111111-1111-1111-1111-111111111111', batchId: 'b1111111-1111-1111-1111-111111111111', subjectId: 'sub11111-1111-1111-1111-111111111111', teacherId: 't1111111-1111-1111-1111-111111111111', title: 'Trigonometry Homework sheet 1', description: 'Solve all problems.', maxMarks: 50, dueDate: '2026-08-10T23:59:59Z', mediaFileId: 'f2' }
];

export const MOCK_SUBMISSIONS = [
  { id: 'subm1', academyId: 'a1111111-1111-1111-1111-111111111111', assignmentId: 'as1', studentId: 's1111111-1111-1111-1111-111111111111', submissionDate: '2026-07-26T18:22:00Z', mediaFileId: 'f2', studentRemarks: 'Solved. Please check.', status: 'submitted' }
];

// 7. Telemetry & Caches
export const MOCK_NOTIFICATIONS: Notification[] = [
  { id: 'n1', academyId: 'a1111111-1111-1111-1111-111111111111', userId: 'u4444444-4444-4444-4444-444444444444', title: 'Fee Payment Received', message: 'INR 60,000 paid successfully.', type: 'in_app', status: 'sent', createdAt: '2026-06-25T10:31:00Z', updatedAt: '2026-06-25T10:31:00Z' },
  { id: 'n2', academyId: 'a1111111-1111-1111-1111-111111111111', userId: 'u4444444-4444-4444-4444-444444444444', title: 'New Physics Note uploaded', message: 'Teacher Ramesh posted Basics of Velocity notes.', type: 'in_app', status: 'sent', createdAt: '2026-07-27T08:00:00Z', updatedAt: '2026-07-27T08:00:00Z' }
];

export const MOCK_ACTIVITY_LOGS: ActivityLog[] = [
  { id: 'al1', academyId: 'a1111111-1111-1111-1111-111111111111', userId: 'u1111111-1111-1111-1111-111111111111', eventType: 'USER_LOGIN', description: 'Admin Hemanth signed in.', metadata: { device: 'Chrome on Mac' }, createdAt: '2026-07-27T09:00:00Z' },
  { id: 'al2', academyId: 'a1111111-1111-1111-1111-111111111111', userId: 'u2222222-2222-2222-2222-222222222222', eventType: 'ATTENDANCE_UPDATE', description: 'Teacher Ramesh updated Grade 10 Batch A attendance.', metadata: { batchId: 'b1111111-1111-1111-1111-111111111111' }, createdAt: '2026-07-27T10:15:00Z' }
];

export const MOCK_ANALYTICS = {
  totalStudents: 154,
  totalTeachers: 12,
  totalCourses: 4,
  monthlyRevenue: 345000,
  attendancePercentage: 92.4,
  revenueHistory: [
    { name: 'Feb', amount: 280000 },
    { name: 'Mar', amount: 310000 },
    { name: 'Apr', amount: 290000 },
    { name: 'May', amount: 330000 },
    { name: 'Jun', amount: 350000 },
    { name: 'Jul', amount: 345000 },
  ],
  attendanceTrends: [
    { name: 'Mon', rate: 94 },
    { name: 'Tue', rate: 92 },
    { name: 'Wed', rate: 89 },
    { name: 'Thu', rate: 95 },
    { name: 'Fri', rate: 92 },
  ]
};

// 8. CMS Website Content
export const MOCK_TESTIMONIALS = [
  { name: 'Rajesh Mehta', role: 'Parent of Arjun (Gr 10)', text: 'The teacher dedication and CS labs are absolute class. Highly recommended!', rating: 5, featured: true },
  { name: 'Karan Nair', role: 'Parent of Priya (Gr 10)', text: 'Amazing platform tracking parent alerts and billing invoices easily.', rating: 5, featured: true }
];

export const MOCK_ENQUIRIES = [
  { name: 'Kiran Verma', email: 'kiran@outlook.com', phone: '9876543210', subject: 'Grade 10 admission', message: 'Are admissions open for term 2?', status: 'pending' }
];
