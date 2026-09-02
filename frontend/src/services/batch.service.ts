import { API_BASE_URL, getAuthToken, getSubdomain, getApiErrorMessage } from '@/config/api.config';

export interface Batch {
  id: string;
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  capacity?: number;
  status: string;
  branchId: string;
  branch?: {
    id: string;
    name: string;
  };
  courseId: string;
  course?: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
  _count?: {
    students: number;
  };
}

export interface PaginatedBatches {
  batches: Batch[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const batchService = {
  create: async (data: Omit<Batch, 'id' | 'createdAt' | 'updatedAt' | 'branch' | 'course'>): Promise<Batch> => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/academic/batches`, {
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
      throw new Error(getApiErrorMessage(body, 'Failed to create batch.'));
    }
    return body.data;
  },

  findAll: async (search?: string, branchId?: string, courseId?: string, status?: string, page = 1, limit = 10): Promise<PaginatedBatches> => {
    const token = getAuthToken();
    const query = new URLSearchParams();
    if (search) query.append('search', search);
    if (branchId) query.append('branchId', branchId);
    if (courseId) query.append('courseId', courseId);
    if (status) query.append('status', status);
    query.append('page', String(page));
    query.append('limit', String(limit));

    const response = await fetch(`${API_BASE_URL}/academic/batches?${query.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'X-Academy-Subdomain': getSubdomain(),
      },
    });
    const body = await response.json();
    if (!response.ok || !body.success) {
      return { batches: [], meta: { total: 0, page: 1, limit: 10, totalPages: 1 } };
    }
    const rawList = body.data?.items || body.data?.batches || (Array.isArray(body.data) ? body.data : []);
    return {
      batches: rawList,
      meta: body.data?.meta || { total: rawList.length, page: 1, limit: 10, totalPages: Math.ceil(rawList.length / 10) || 1 },
    };
  },

  findOne: async (id: string): Promise<Batch> => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/academic/batches/${id}`, {
      method: 'GET',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'X-Academy-Subdomain': getSubdomain(),
      },
    });
    const body = await response.json();
    if (!response.ok || !body.success) {
      throw new Error(getApiErrorMessage(body, 'Failed to load batch details.'));
    }
    return body.data;
  },

  update: async (id: string, data: Partial<Omit<Batch, 'id' | 'createdAt' | 'updatedAt' | 'branch' | 'course'>>): Promise<Batch> => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/academic/batches/${id}`, {
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
      throw new Error(getApiErrorMessage(body, 'Failed to update batch.'));
    }
    return body.data;
  },

  remove: async (id: string): Promise<void> => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/academic/batches/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'X-Academy-Subdomain': getSubdomain(),
      },
    });
    const body = await response.json();
    if (!response.ok || !body.success) {
      throw new Error(getApiErrorMessage(body, 'Failed to delete batch.'));
    }
  },
};

