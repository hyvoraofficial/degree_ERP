import { API_BASE_URL, getSubdomain } from '@/config/api.config';

export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  branchId?: string;
  branch?: { id: string; name: string; code: string };
  hodId?: string;
  hod?: {
    id: string;
    name: string;
    employeeNumber: string;
    designation: string;
  } | null;
  status: string;
  stats?: {
    programsCount: number;
    subjectsCount: number;
    facultyCount: number;
    studentsCount: number;
  };
  createdAt: string;
}

export const departmentService = {
  async findAll(branchId?: string, search?: string): Promise<Department[]> {
    const token = document.cookie.split('; ').find(row => row.startsWith('mock-auth-token='))?.split('=')[1] || '';
    const params = new URLSearchParams();
    if (branchId) params.append('branchId', branchId);
    if (search) params.append('search', search);

    const res = await fetch(`${API_BASE_URL}/departments?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Academy-Subdomain': getSubdomain(),
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Failed to fetch departments' }));
      throw new Error(err.message || 'Failed to fetch departments');
    }

    const json = await res.json();
    return json.data || [];
  },

  async findOne(id: string): Promise<Department> {
    const token = document.cookie.split('; ').find(row => row.startsWith('mock-auth-token='))?.split('=')[1] || '';
    const res = await fetch(`${API_BASE_URL}/departments/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Academy-Subdomain': getSubdomain(),
      },
    });

    if (!res.ok) throw new Error('Failed to fetch department details');
    const json = await res.json();
    return json.data;
  },

  async create(data: { name: string; code: string; description?: string; branchId?: string; hodId?: string }): Promise<Department> {
    const token = document.cookie.split('; ').find(row => row.startsWith('mock-auth-token='))?.split('=')[1] || '';
    const res = await fetch(`${API_BASE_URL}/departments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Academy-Subdomain': getSubdomain(),
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Failed to create department' }));
      throw new Error(err.message || 'Failed to create department');
    }

    const json = await res.json();
    return json.data;
  },

  async update(id: string, data: Partial<{ name: string; code: string; description?: string; branchId?: string; hodId?: string }>): Promise<Department> {
    const token = document.cookie.split('; ').find(row => row.startsWith('mock-auth-token='))?.split('=')[1] || '';
    const res = await fetch(`${API_BASE_URL}/departments/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Academy-Subdomain': getSubdomain(),
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Failed to update department' }));
      throw new Error(err.message || 'Failed to update department');
    }

    const json = await res.json();
    return json.data;
  },

  async delete(id: string): Promise<void> {
    const token = document.cookie.split('; ').find(row => row.startsWith('mock-auth-token='))?.split('=')[1] || '';
    const res = await fetch(`${API_BASE_URL}/departments/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Academy-Subdomain': getSubdomain(),
      },
    });

    if (!res.ok) throw new Error('Failed to delete department');
  },
};
