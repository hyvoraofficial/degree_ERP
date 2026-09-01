import { API_BASE_URL, getAuthToken, getSubdomain } from '@/config/api.config';

export interface FeeStructure {
  id: string;
  name: string;
  description?: string;
  amount: number | string;
  frequency: string;
}

export interface FeeAllocation {
  id: string;
  feeStructureId: string;
  feeStructure?: FeeStructure;
  studentId: string;
  student?: {
    id: string;
    admissionNumber: string;
    firstName: string;
    lastName: string;
    user?: { firstName: string; lastName: string; email: string };
  };
  dueDate: string;
  status: string; // unpaid, partially_paid, paid
  totalAmount: number | string;
  paidAmount: number | string;
  discountAmount: number | string;
  createdAt: string;
}

export interface PaymentHistoryItem {
  id: string;
  feeAllocationId: string;
  feeAllocation?: FeeAllocation;
  amountPaid: number | string;
  paymentDate: string;
  receiptNumber: string;
  paymentMode: string;
  referenceNo?: string;
  remarks?: string;
}

export const financeService = {
  createStructure: async (data: { name: string; description?: string; amount: number; frequency?: string }): Promise<FeeStructure> => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/finance/structures`, {
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
      throw new Error(body.error?.message || 'Failed to create fee structure.');
    }
    return body.data;
  },

  findAllStructures: async (): Promise<FeeStructure[]> => {
    const token = getAuthToken();
    try {
      const response = await fetch(`${API_BASE_URL}/finance/structures`, {
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'X-Academy-Subdomain': getSubdomain(),
        },
      });
      const body = await response.json();
      if (!response.ok || !body.success) {
        console.warn('Failed to load fee structures:', body);
        return [];
      }
      return body.data || [];
    } catch (err) {
      console.warn('Failed to fetch fee structures:', err);
      return [];
    }
  },

  createAllocation: async (data: { feeStructureId: string; studentId: string; dueDate: string; discountAmount?: number }): Promise<FeeAllocation> => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/finance/allocations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        'X-Academy-Subdomain': getSubdomain(),
      },
      body: JSON.stringify({
        feeStructureId: data.feeStructureId,
        studentId: data.studentId,
        dueDate: data.dueDate,
        discountAmount: data.discountAmount || 0,
      }),
    });
    const body = await response.json();
    if (!response.ok || !body.success) {
      throw new Error(body.error?.message || 'Failed to allocate fee.');
    }
    return body.data;
  },

  findAllAllocations: async (studentId?: string): Promise<FeeAllocation[]> => {
    const token = getAuthToken();
    const url = studentId 
      ? `${API_BASE_URL}/finance/allocations?studentId=${studentId}` 
      : `${API_BASE_URL}/finance/allocations`;
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'X-Academy-Subdomain': getSubdomain(),
        },
      });
      const body = await response.json();
      if (!response.ok || !body.success) {
        console.warn('Failed to load fee allocations:', body);
        return [];
      }
      return body.data || [];
    } catch (err) {
      console.warn('Failed to fetch fee allocations:', err);
      return [];
    }
  },

  recordOfflinePayment: async (data: { feeAllocationId: string; amountPaid: number; paymentMode: string; referenceNo?: string; remarks?: string }): Promise<PaymentHistoryItem> => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/finance/payments/offline`, {
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
      throw new Error(body.error?.message || 'Failed to record manual payment.');
    }
    return body.data;
  },

  getPaymentHistory: async (studentId: string): Promise<PaymentHistoryItem[]> => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/finance/history/${studentId}`, {
      method: 'GET',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'X-Academy-Subdomain': getSubdomain(),
      },
    });
    const body = await response.json();
    if (!response.ok || !body.success) {
      throw new Error(body.error?.message || 'Failed to load payment history.');
    }
    return body.data || [];
  },
};
