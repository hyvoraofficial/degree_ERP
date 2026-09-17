import { API_BASE_URL, getSubdomain } from '@/config/api.config';

export interface TimetableEntry {
  id: string;
  branchId: string;
  departmentId?: string;
  courseId: string;
  batchId: string;
  subjectId: string;
  teacherId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  roomNumber?: string;
  isLab?: boolean;
  status: string;
  subject?: { id: string; name: string; code: string; subjectType: string; credits: number };
  teacher?: {
    id: string;
    employeeNumber: string;
    designation: string;
    user: { firstName: string; lastName: string };
  };
  course?: { id: string; name: string; code: string };
  batch?: { id: string; name: string; sectionName?: string; currentSemester?: number };
}

export const timetableService = {
  async findByBatch(batchId: string): Promise<TimetableEntry[]> {
    const token = document.cookie.split('; ').find(row => row.startsWith('mock-auth-token='))?.split('=')[1] || '';
    const res = await fetch(`${API_BASE_URL}/timetable/batch/${batchId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Academy-Subdomain': getSubdomain(),
      },
    });

    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  },

  async findByTeacher(teacherId: string): Promise<TimetableEntry[]> {
    const token = document.cookie.split('; ').find(row => row.startsWith('mock-auth-token='))?.split('=')[1] || '';
    const res = await fetch(`${API_BASE_URL}/timetable/faculty/${teacherId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Academy-Subdomain': getSubdomain(),
      },
    });

    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  },

  async create(data: Partial<TimetableEntry>): Promise<TimetableEntry> {
    const token = document.cookie.split('; ').find(row => row.startsWith('mock-auth-token='))?.split('=')[1] || '';
    const res = await fetch(`${API_BASE_URL}/timetable`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Academy-Subdomain': getSubdomain(),
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Failed to create timetable slot' }));
      throw new Error(err.message || 'Failed to create timetable slot');
    }

    const json = await res.json();
    return json.data;
  },

  async delete(id: string): Promise<void> {
    const token = document.cookie.split('; ').find(row => row.startsWith('mock-auth-token='))?.split('=')[1] || '';
    const res = await fetch(`${API_BASE_URL}/timetable/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Academy-Subdomain': getSubdomain(),
      },
    });

    if (!res.ok) throw new Error('Failed to delete timetable entry');
  },
};
