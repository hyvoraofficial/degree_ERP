import { API_BASE_URL, getAuthToken, getSubdomain } from '@/config/api.config';
import { Course, Subject, Batch } from '@/types/course';

export const academyService = {
  getAcademyDetails: async () => {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE_URL}/admin/settings`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'X-Academy-Subdomain': getSubdomain(),
      },
    });
    if (!res.ok) return { name: 'Hyvora Institute of Technology & Management', code: 'HITM' };
    const json = await res.json();
    return json.data || { name: 'Hyvora Institute of Technology & Management', code: 'HITM' };
  },

  getCourses: async (): Promise<Course[]> => {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE_URL}/academic/courses`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'X-Academy-Subdomain': getSubdomain(),
      },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data?.courses || json.data || [];
  },

  getSubjects: async (): Promise<Subject[]> => {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE_URL}/academic/subjects`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'X-Academy-Subdomain': getSubdomain(),
      },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data?.subjects || json.data || [];
  },

  getBatches: async (): Promise<Batch[]> => {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE_URL}/academic/batches`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'X-Academy-Subdomain': getSubdomain(),
      },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data?.batches || json.data || [];
  },
};
