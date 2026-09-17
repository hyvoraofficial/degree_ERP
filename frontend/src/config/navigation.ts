import { 
  UserRole 
} from './roles';

export interface NavigationItem {
  title: string;
  href: string;
  icon: string; // Lucide icon name matching LucideIcons
  badge?: string;
}

export const NAVIGATION_ITEMS: Record<UserRole, NavigationItem[]> = {
  SUPER_ADMIN: [
    { title: 'Dashboard', href: '/super-admin', icon: 'LayoutDashboard' },
    { title: 'Institutions', href: '/super-admin/academies', icon: 'School' },
    { title: 'Subscriptions', href: '/super-admin/subscriptions', icon: 'CreditCard' },
    { title: 'Revenue Tracking', href: '/super-admin/revenue', icon: 'IndianRupee' },
    { title: 'Global Users', href: '/super-admin/users', icon: 'Users' },
    { title: 'Analytics', href: '/super-admin/analytics', icon: 'BarChart3' },
    { title: 'System Logs', href: '/super-admin/logs', icon: 'Activity' },
    { title: 'Global Settings', href: '/super-admin/settings', icon: 'Settings' },
  ],
  ACADEMY_ADMIN: [
    { title: 'Dashboard', href: '/admin', icon: 'LayoutDashboard' },
    { title: 'Analytics', href: '/admin/analytics', icon: 'BarChart3' },
    { title: 'New Admission', href: '/admin/admissions', icon: 'UserPlus', badge: 'New' },
    { title: 'Students', href: '/admin/students', icon: 'GraduationCap' },
    { title: 'Faculty', href: '/admin/teachers', icon: 'Users' },
    { title: 'Departments', href: '/admin/departments', icon: 'Building2' },
    { title: 'Programs & Curriculum', href: '/admin/courses', icon: 'BookOpen' },
    { title: 'Semesters', href: '/admin/semesters', icon: 'Layers3' },
    { title: 'Subjects', href: '/admin/subjects', icon: 'Book' },
    { title: 'Timetable', href: '/admin/timetable', icon: 'Clock' },
    { title: 'Attendance', href: '/admin/attendance', icon: 'CalendarDays' },
    { title: 'Examinations & Results', href: '/admin/results', icon: 'Award' },
    { title: 'Batches & Sections', href: '/admin/batches', icon: 'Layers' },
    { title: 'Fee Structures', href: '/admin/fees', icon: 'Receipt' },
    { title: 'Payments Ledger', href: '/admin/payments', icon: 'CreditCard' },
    { title: 'Placements', href: '/admin/placements', icon: 'Briefcase' },
    { title: 'Internships', href: '/admin/internships', icon: 'UserCheck' },
    { title: 'Library', href: '/admin/library', icon: 'Library' },
    { title: 'Website CMS', href: '/admin/website', icon: 'Globe' },
    { title: 'Gallery Settings', href: '/admin/gallery', icon: 'Image' },
    { title: 'Testimonials', href: '/admin/testimonials', icon: 'MessageSquare' },
    { title: 'Reports & Export', href: '/admin/reports', icon: 'FileSpreadsheet' },
    { title: 'ERP Settings', href: '/admin/settings', icon: 'Settings' },
  ],
  TEACHER: [
    { title: 'Dashboard', href: '/teacher', icon: 'LayoutDashboard' },
    { title: 'My Students', href: '/teacher/students', icon: 'GraduationCap' },
    { title: 'Mark Attendance', href: '/teacher/attendance', icon: 'CheckSquare' },
    { title: 'Teaching Timetable', href: '/teacher/timetable', icon: 'Clock' },
    { title: 'Assignments', href: '/teacher/assignments', icon: 'ClipboardList' },
    { title: 'Course Materials', href: '/teacher/materials', icon: 'FileUp' },
    { title: 'Video Classes', href: '/teacher/videos', icon: 'Video' },
    { title: 'Internal Marks & Results', href: '/teacher/results', icon: 'Award' },
    { title: 'Exams & Grading', href: '/teacher/exams', icon: 'BookOpen' },
    { title: 'My Profile', href: '/teacher/profile', icon: 'User' },
  ],
  STUDENT: [
    { title: 'Dashboard', href: '/student', icon: 'LayoutDashboard' },
    { title: 'My Programs & Courses', href: '/student/courses', icon: 'BookOpen' },
    { title: 'SGPA / CGPA Results', href: '/student/results', icon: 'Award' },
    { title: 'My Attendance', href: '/student/attendance', icon: 'CalendarDays' },
    { title: 'Class Timetable', href: '/student/timetable', icon: 'Clock' },
    { title: 'Study Notes & Syllabus', href: '/student/materials', icon: 'FileText' },
    { title: 'Video Lectures', href: '/student/videos', icon: 'PlayCircle' },
    { title: 'Assignments', href: '/student/assignments', icon: 'ClipboardCheck' },
    { title: 'Fee Statements', href: '/student/fees', icon: 'Receipt' },
    { title: 'Make Payment', href: '/student/payments', icon: 'CreditCard' },
    { title: 'Placement Drives', href: '/student/placements', icon: 'Briefcase' },
    { title: 'College Notices', href: '/student/notifications', icon: 'Bell' },
    { title: 'My Profile', href: '/student/profile', icon: 'User' },
    { title: 'Portal Settings', href: '/student/settings', icon: 'Settings' },
  ],
};
