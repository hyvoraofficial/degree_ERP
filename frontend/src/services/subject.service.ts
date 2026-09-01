import { API_BASE_URL, getAuthToken, getSubdomain } from '@/config/api.config';

export interface Subject {
  id: string;
  name: string;
  code: string;
  description?: string;
  subjectType: 'theory' | 'practical' | 'lab';
  status: string;
  courseId: string;
  course?: { id: string; name: string };
}

export interface TeacherAssignment {
  id: string;
  branchId: string;
  courseId: string;
  subjectId: string;
  batchId: string;
  teacherId: string;
  branch?: { name: string };
  course?: { name: string };
  subject?: { name: string };
  batch?: { name: string };
  teacher?: { employeeNumber: string; user?: { firstName: string; lastName: string } };
}

export const subjectService = {
  findAll: async (courseId?: string): Promise<Subject[]> => {
    const token = getAuthToken();
    const url = courseId 
      ? `${API_BASE_URL}/academic/subjects?courseId=${courseId}`
      : `${API_BASE_URL}/academic/subjects`;
    const response = await fetch(url, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'X-Academy-Subdomain': getSubdomain(),
      },
    });
    const body = await response.json();
    const list = Array.isArray(body.data) ? body.data : (body.data?.subjects || body.data?.items || []);
    return list;
  },

  create: async (data: { name: string; code: string; description?: string; subjectType: string; courseId: string }): Promise<Subject> => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/academic/subjects`, {
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
      throw new Error(body.error?.message || 'Failed to create subject.');
    }
    return body.data;
  },

  update: async (id: string, data: { name?: string; code?: string; description?: string; subjectType?: string; status?: string; courseId?: string }): Promise<Subject> => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/academic/subjects/${id}`, {
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
      throw new Error(body.error?.message || 'Failed to update subject.');
    }
    return body.data;
  },

  remove: async (id: string, permanent: boolean = true): Promise<any> => {
    const token = getAuthToken();
    const url = permanent 
      ? `${API_BASE_URL}/academic/subjects/${id}?permanent=true` 
      : `${API_BASE_URL}/academic/subjects/${id}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'X-Academy-Subdomain': getSubdomain(),
      },
    });
    const body = await response.json();
    if (!response.ok || !body.success) {
      throw new Error(body.error?.message || 'Failed to delete subject.');
    }
    return body.data;
  },

  assignTeacher: async (data: { branchId: string; courseId: string; subjectId: string; batchId: string; teacherId: string }): Promise<TeacherAssignment> => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/academic/subjects/assignments`, {
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
      throw new Error(body.error?.message || 'Failed to assign teacher to subject.');
    }
    return body.data;
  },

  getAssignments: async (filters: { teacherId?: string; subjectId?: string } = {}): Promise<TeacherAssignment[]> => {
    const token = getAuthToken();
    let url = `${API_BASE_URL}/academic/subjects/assignments`;
    const params = new URLSearchParams();
    if (filters.teacherId) params.append('teacherId', filters.teacherId);
    if (filters.subjectId) params.append('subjectId', filters.subjectId);
    if (params.toString()) url += `?${params.toString()}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'X-Academy-Subdomain': getSubdomain(),
      },
    });
    const body = await response.json();
    if (!response.ok || !body.success) {
      throw new Error(body.error?.message || 'Failed to load assignments.');
    }
    return body.data || [];
  },

  removeAssignment: async (id: string): Promise<any> => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/academic/subjects/assignments/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'X-Academy-Subdomain': getSubdomain(),
      },
    });
    const body = await response.json();
    if (!response.ok || !body.success) {
      throw new Error(body.error?.message || 'Failed to remove assignment.');
    }
    return body.data;
  },
};
