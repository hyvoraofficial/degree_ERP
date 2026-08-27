import { 
  UserRole 
} from './roles';

export interface NavigationItem {
  title: string;
  href: string;
  icon: string; // Lucide icon name as a string to allow serialize/config ease
  badge?: string;
}

export const NAVIGATION_ITEMS: Record<UserRole, NavigationItem[]> = {
  SUPER_ADMIN: [
    { title: 'Dashboard', href: '/super-admin', icon: 'LayoutDashboard' },
    { title: 'Academies', href: '/super-admin/academies', icon: 'School' },
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
    { title: 'Teachers', href: '/admin/teachers', icon: 'Users' },
    { title: 'Courses & Syllabus', href: '/admin/courses', icon: 'BookOpen' },
    { title: 'Subjects', href: '/admin/subjects', icon: 'Book' },
    { title: 'Result', href: '/admin/results', icon: 'Award' },
    { title: 'Batches', href: '/admin/batches', icon: 'Layers' },
    { title: 'Attendance logs', href: '/admin/attendance', icon: 'CalendarDays' },
    { title: 'Fee Structures', href: '/admin/fees', icon: 'Receipt' },
    { title: 'Payments Ledger', href: '/admin/payments', icon: 'CreditCard' },
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
    { title: 'Assignments', href: '/teacher/assignments', icon: 'ClipboardList' },
    { title: 'Study Notes', href: '/teacher/materials', icon: 'FileUp' },
    { title: 'Video Classes', href: '/teacher/videos', icon: 'Video' },
    { title: 'Result', href: '/teacher/results', icon: 'Award' },
    { title: 'Exams & Grading', href: '/teacher/exams', icon: 'BookOpen' },
    { title: 'My Profile', href: '/teacher/profile', icon: 'User' },
  ],
  STUDENT: [
    { title: 'Dashboard', href: '/student', icon: 'LayoutDashboard' },
    { title: 'My Classes', href: '/student/courses', icon: 'BookOpen' },
    { title: 'Result', href: '/student/results', icon: 'Award' },
    { title: 'My Attendance', href: '/student/attendance', icon: 'CalendarDays' },
    { title: 'Study Notes', href: '/student/materials', icon: 'FileText' },
    { title: 'Video Lectures', href: '/student/videos', icon: 'PlayCircle' },
    { title: 'Assignments', href: '/student/assignments', icon: 'ClipboardCheck', badge: '3' },
    { title: 'Report Card', href: '/student/results', icon: 'FileSpreadsheet' },
    { title: 'Fee Statements', href: '/student/fees', icon: 'Receipt' },
    { title: 'Make Payment', href: '/student/payments', icon: 'CreditCard' },
    { title: 'Academy Feed', href: '/student/notifications', icon: 'Bell' },
    { title: 'My Profile', href: '/student/profile', icon: 'User' },
    { title: 'Portal Settings', href: '/student/settings', icon: 'Settings' },
  ],
};
