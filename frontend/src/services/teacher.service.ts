import { API_BASE_URL, getAuthToken, getSubdomain } from '@/config/api.config';

export interface TeacherSubjectInfo {
  id?: string;
  name?: string;
  code?: string;
  courseName?: string;
  batchName?: string;
}

export interface Teacher {
  id: string;
  employeeNumber: string;
  designation?: string;
  qualification?: string;
  joiningDate?: string;
  branchId?: string;
  status: string;
  temporaryPassword?: string;
  subjects?: TeacherSubjectInfo[];
  user: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
}

export const teacherService = {
  getTeachers: async (search?: string): Promise<Teacher[]> => {
    const token = getAuthToken();
    let url = `${API_BASE_URL}/teachers?limit=100`;
    if (search) {
      url += `&search=${encodeURIComponent(search)}`;
    }
    const response = await fetch(url, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'X-Academy-Subdomain': getSubdomain(),
      },
    });
    const body = await response.json();
    if (!response.ok || !body.success) {
      return [];
    }
    const rawList = body.data?.teachers || body.data?.items || (Array.isArray(body.data) ? body.data : []);
    return rawList;
  },

  findAll: async (search?: string, branchId?: string, page = 1, limit = 100): Promise<{ teachers: Teacher[]; meta: { total: number } }> => {
    const teachers = await teacherService.getTeachers(search);
    return { teachers, meta: { total: teachers.length } };
  },

  getTeacherById: async (id: string): Promise<Teacher> => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/teachers/${id}`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'X-Academy-Subdomain': getSubdomain(),
      },
    });
    const body = await response.json();
    if (!response.ok || !body.success) {
      throw new Error(body.error?.message || 'Failed to load teacher detail.');
    }
    return body.data;
  },

  remove: async (id: string, permanent: boolean = true): Promise<void> => {
    const token = getAuthToken();
    const url = permanent 
      ? `${API_BASE_URL}/teachers/${id}?permanent=true` 
      : `${API_BASE_URL}/teachers/${id}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'X-Academy-Subdomain': getSubdomain(),
      },
    });
    const body = await response.json();
    if (!response.ok || !body.success) {
      throw new Error(body.error?.message || 'Failed to delete teacher.');
    }
  },

  create: async (data: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    employeeNumber: string;
    designation?: string;
    qualification?: string;
    joiningDate?: string;
  }): Promise<Teacher> => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/teachers`, {
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
      throw new Error(body.error?.message || (Array.isArray(body.message) ? body.message.join(', ') : body.message) || 'Failed to create teacher profile.');
    }
    return body.data;
  },

  update: async (id: string, data: {
    email?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    employeeNumber?: string;
    designation?: string;
    qualification?: string;
    joiningDate?: string;
  }): Promise<Teacher> => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/teachers/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        'X-Academy-Subdomain': getSubdomain(),
      },
      body: JSON.stringify(data),
    });
    const body = await response.json();
    if (!response.ok || !body.success) {
      throw new Error(body.error?.message || (Array.isArray(body.message) ? body.message.join(', ') : body.message) || 'Failed to update teacher profile.');
    }
    return body.data;
  },
};
