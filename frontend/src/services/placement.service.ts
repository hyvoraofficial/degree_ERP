import { API_BASE_URL, getSubdomain } from '@/config/api.config';

export interface PlacementDrive {
  id: string;
  companyName: string;
  jobRole: string;
  packageLpa: number | string;
  eligibilityCriteria?: string;
  driveDate?: string;
  deadlineDate?: string;
  location?: string;
  jobType: string;
  status: string;
  _count?: { applications: number };
  applications?: any[];
  createdAt: string;
}

export const placementService = {
  async findAll(): Promise<PlacementDrive[]> {
    const token = document.cookie.split('; ').find(row => row.startsWith('mock-auth-token='))?.split('=')[1] || '';
    const res = await fetch(`${API_BASE_URL}/placements`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Academy-Subdomain': getSubdomain(),
      },
    });

    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  },

  async findOne(id: string): Promise<PlacementDrive> {
    const token = document.cookie.split('; ').find(row => row.startsWith('mock-auth-token='))?.split('=')[1] || '';
    const res = await fetch(`${API_BASE_URL}/placements/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Academy-Subdomain': getSubdomain(),
      },
    });

    if (!res.ok) throw new Error('Failed to fetch placement drive');
    const json = await res.json();
    return json.data;
  },

  async create(data: Partial<PlacementDrive>): Promise<PlacementDrive> {
    const token = document.cookie.split('; ').find(row => row.startsWith('mock-auth-token='))?.split('=')[1] || '';
    const res = await fetch(`${API_BASE_URL}/placements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Academy-Subdomain': getSubdomain(),
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Failed to create placement drive' }));
      throw new Error(err.message || 'Failed to create placement drive');
    }

    const json = await res.json();
    return json.data;
  },

  async apply(driveId: string, studentId: string, remarks?: string) {
    const token = document.cookie.split('; ').find(row => row.startsWith('mock-auth-token='))?.split('=')[1] || '';
    const res = await fetch(`${API_BASE_URL}/placements/${driveId}/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Academy-Subdomain': getSubdomain(),
      },
      body: JSON.stringify({ studentId, remarks }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Failed to apply' }));
      throw new Error(err.message || 'Failed to apply');
    }

    return res.json();
  },

  async updateStatus(appId: string, status: string, remarks?: string) {
    const token = document.cookie.split('; ').find(row => row.startsWith('mock-auth-token='))?.split('=')[1] || '';
    const res = await fetch(`${API_BASE_URL}/placements/applications/${appId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Academy-Subdomain': getSubdomain(),
      },
      body: JSON.stringify({ status, remarks }),
    });

    if (!res.ok) throw new Error('Failed to update status');
    return res.json();
  },
};
