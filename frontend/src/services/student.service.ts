import { API_BASE_URL, getAuthToken, getSubdomain } from '@/config/api.config';

export interface Student {
  id: string;
  admissionNumber: string;
  admissionDate: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup?: string;
  rollNumber?: string;
  parentName: string;
  parentPhone: string;
  parentEmail?: string;
  fatherName: string;
  motherName: string;
  branch?: { id: string; name: string };
  course?: { id: string; name: string };
  batch?: { id: string; name: string };
  status: string;
  temporaryPassword?: string;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
}

export interface PaginatedStudents {
  students: Student[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages?: number;
  };
}

export const studentService = {
  create: async (data: any): Promise<{ student: Student; temporaryPassword?: string }> => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        'X-Academy-Subdomain': getSubdomain(),
      },
      body: JSON.stringify(data),
    });
    const body = await response.json();
    if (!response.ok || !body.success) {
      const rawMsg = body.message;
      let errorMsg = 'Failed to admit student.';
      if (Array.isArray(rawMsg)) {
        errorMsg = rawMsg.join('; ');
      } else if (typeof rawMsg === 'string' && rawMsg.trim()) {
        errorMsg = rawMsg;
      } else if (body.error?.message) {
        errorMsg = body.error.message;
      }
      throw new Error(errorMsg);
    }
    return {
      student: body.data,
      temporaryPassword: body.data.temporaryPassword, // returned by create endpoint once
    };
  },

  findAll: async (branchId?: string, courseId?: string, batchId?: string, page = 1, limit = 10): Promise<PaginatedStudents> => {
    const token = getAuthToken();
    const query = new URLSearchParams();
    if (branchId) query.append('branchId', branchId);
    if (courseId) query.append('courseId', courseId);
    if (batchId) query.append('batchId', batchId);
    query.append('page', String(page));
    query.append('limit', String(limit));

    const response = await fetch(`${API_BASE_URL}/students?${query.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'X-Academy-Subdomain': getSubdomain(),
      },
    });
    const body = await response.json();
    if (!response.ok || !body.success) {
      return { students: [], meta: { total: 0, page: 1, limit: 10, totalPages: 1 } };
    }
    const rawList = body.data?.students || body.data?.items || (Array.isArray(body.data) ? body.data : []);
    return {
      students: rawList,
      meta: body.data?.meta || { total: rawList.length, page: 1, limit: 10, totalPages: Math.ceil(rawList.length / 10) || 1 },
    };
  },

  findOne: async (id: string): Promise<Student> => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/students/${id}`, {
      method: 'GET',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'X-Academy-Subdomain': getSubdomain(),
      },
    });
    const body = await response.json();
    if (!response.ok || !body.success) {
      throw new Error(body.error?.message || 'Failed to load student details.');
    }
    return body.data;
  },

  remove: async (id: string, permanent: boolean = true): Promise<void> => {
    const token = getAuthToken();
    const url = permanent 
      ? `${API_BASE_URL}/students/${id}?permanent=true` 
      : `${API_BASE_URL}/students/${id}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'X-Academy-Subdomain': getSubdomain(),
      },
    });
    const body = await response.json();
    if (!response.ok || !body.success) {
      throw new Error(body.error?.message || 'Failed to delete student.');
    }
  },
};
