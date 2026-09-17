import { API_BASE_URL, getSubdomain } from '@/config/api.config';

export interface LibraryBook {
  id: string;
  title: string;
  isbn?: string;
  author: string;
  category?: string;
  publisher?: string;
  departmentId?: string;
  department?: { id: string; name: string; code: string };
  totalCopies: number;
  availableCopies: number;
  shelfLocation?: string;
  status: string;
  _count?: { issues: number };
}

export const libraryService = {
  async findAllBooks(search?: string, departmentId?: string): Promise<LibraryBook[]> {
    const token = document.cookie.split('; ').find(row => row.startsWith('mock-auth-token='))?.split('=')[1] || '';
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (departmentId) params.append('departmentId', departmentId);

    const res = await fetch(`${API_BASE_URL}/library/books?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Academy-Subdomain': getSubdomain(),
      },
    });

    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  },

  async createBook(data: Partial<LibraryBook>): Promise<LibraryBook> {
    const token = document.cookie.split('; ').find(row => row.startsWith('mock-auth-token='))?.split('=')[1] || '';
    const res = await fetch(`${API_BASE_URL}/library/books`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Academy-Subdomain': getSubdomain(),
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Failed to add book' }));
      throw new Error(err.message || 'Failed to add book');
    }

    const json = await res.json();
    return json.data;
  },

  async issueBook(bookId: string, studentId: string, dueDays = 14) {
    const token = document.cookie.split('; ').find(row => row.startsWith('mock-auth-token='))?.split('=')[1] || '';
    const res = await fetch(`${API_BASE_URL}/library/issue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Academy-Subdomain': getSubdomain(),
      },
      body: JSON.stringify({ bookId, studentId, dueDays }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Failed to issue book' }));
      throw new Error(err.message || 'Failed to issue book');
    }

    return res.json();
  },

  async returnBook(issueId: string) {
    const token = document.cookie.split('; ').find(row => row.startsWith('mock-auth-token='))?.split('=')[1] || '';
    const res = await fetch(`${API_BASE_URL}/library/return/${issueId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Academy-Subdomain': getSubdomain(),
      },
    });

    if (!res.ok) throw new Error('Failed to return book');
    return res.json();
  },

  async listIssuedBooks() {
    const token = document.cookie.split('; ').find(row => row.startsWith('mock-auth-token='))?.split('=')[1] || '';
    const res = await fetch(`${API_BASE_URL}/library/issued-logs`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Academy-Subdomain': getSubdomain(),
      },
    });

    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  },
};
