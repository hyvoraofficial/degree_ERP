import { API_BASE_URL, getAuthToken, getSubdomain } from '@/config/api.config';
import { FeeStructure, FeeAllocation, PaymentLedgerEntry, PaymentTransaction } from '@/types/payment';

export const paymentService = {
  getFeeStructures: async (): Promise<FeeStructure[]> => {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE_URL}/finance/structures`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'X-Academy-Subdomain': getSubdomain(),
      },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  },

  getFeeAllocations: async (): Promise<FeeAllocation[]> => {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE_URL}/finance/allocations`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'X-Academy-Subdomain': getSubdomain(),
      },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  },

  getPaymentsLedger: async (): Promise<PaymentLedgerEntry[]> => {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE_URL}/finance/payments`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'X-Academy-Subdomain': getSubdomain(),
      },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  },

  getTransactions: async (): Promise<PaymentTransaction[]> => {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE_URL}/finance/payments`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'X-Academy-Subdomain': getSubdomain(),
      },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  },
};
