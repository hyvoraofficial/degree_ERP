import { API_BASE_URL, getAuthToken, getSubdomain } from '@/config/api.config';

export const cmsService = {
  getTestimonials: async () => {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE_URL}/cms/testimonials`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'X-Academy-Subdomain': getSubdomain(),
      },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  },

  getEnquiries: async () => {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE_URL}/cms/enquiries`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'X-Academy-Subdomain': getSubdomain(),
      },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  },

  createContactEnquiry: async (enquiry: { name: string; email: string; phone: string; subject: string; message: string }) => {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE_URL}/cms/enquiries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        'X-Academy-Subdomain': getSubdomain(),
      },
      body: JSON.stringify(enquiry),
    });
    const json = await res.json();
    return json;
  },
};
