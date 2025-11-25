import axios from 'axios';
import { ApiResponse } from '../types';

class ApiClient {
  private client: any;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config: any) => {
        const token = localStorage.getItem('token');
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error: any) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: any) => {
        return response;
      },
      (error: any) => {
        const status = error?.response?.status;
        const url = (error?.config?.url || '') as string;
        const isAuthFlow = url.includes('/auth/login') || url.includes('/users/register');
        if (status === 401 && !isAuthFlow && window.location.pathname !== '/login') {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Generic methods
  async get<T>(url: string): Promise<ApiResponse<T>> {
    const response = await this.client.get(url);
    return response.data;
  }

  async post<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    const response = await this.client.post(url, data);
    return response.data;
  }

  async put<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    const response = await this.client.put(url, data);
    return response.data;
  }

  async delete<T>(url: string, config?: any): Promise<ApiResponse<T>> {
    const response = await this.client.delete(url, config);
    return response.data;
  }
}

export const apiClient = new ApiClient();
export default apiClient;

// Auth helpers (simple wrapper around apiClient)
export const authApi = {
  async login(payload: { email: string; password: string }): Promise<any> {
    return await apiClient.post('/auth/login', payload);
  },
  async me(): Promise<any> {
    return apiClient.get('/auth/me');
  },
  async updateProfile(payload: { name: string; email: string }): Promise<any> {
    return apiClient.put('/auth/profile', payload);
  },
  async changePassword(payload: { currentPassword: string; newPassword: string }): Promise<any> {
    return apiClient.put('/auth/password', payload);
  },
  async register(payload: { name: string; email: string; password: string }): Promise<any> {
    return apiClient.post('/users/register', payload);
  },
  async forgotPassword(email: string): Promise<any> {
    return apiClient.post('/auth/forgot-password', { email });
  },
  async resetPassword(payload: { token: string; newPassword: string }): Promise<any> {
    return apiClient.post('/auth/reset-password', payload);
  },
  async resendVerification(email: string): Promise<any> {
    return apiClient.post('/auth/resend-verification', { email });
  }
};

// Registration helpers
export const registrationsApi = {
  async getById(id: number): Promise<any> {
    return apiClient.get(`/registrations/${id}`);
  },
  async resendConfirmation(id: number): Promise<any> {
    return apiClient.post(`/registrations/${id}/resend-confirmation`, {});
  },
  async delete(id: number): Promise<any> {
    return apiClient.delete(`/registrations/${id}`);
  },
  async bulkDelete(ids: number[]): Promise<any> {
    return apiClient.post('/registrations/bulk-delete', { ids });
  }
};

// Users helpers (admin actions)
export const usersApi = {
  async createByAdmin(payload: { firstName: string; lastName: string; email: string; role: 'admin' | 'user' }): Promise<any> {
    return apiClient.post('/users/admin-create', payload);
  },
};

// Cancellation helpers
export const cancelApi = {
  async request(registrationId: number, reason: string): Promise<any> {
    return apiClient.post(`/registrations/${registrationId}/cancel-request`, { reason });
  },
  async list(status: 'pending' | 'approved' | 'rejected' = 'pending'): Promise<any> {
    return apiClient.get(`/cancel-requests?status=${status}`);
  },
  async approve(id: number, adminNote?: string): Promise<any> {
    return apiClient.put(`/cancel-requests/${id}/approve`, { adminNote });
  },
  async reject(id: number, adminNote?: string): Promise<any> {
    return apiClient.put(`/cancel-requests/${id}/reject`, { adminNote });
  },
  async restore(id: number): Promise<any> {
    return apiClient.put(`/cancel-requests/${id}/restore`, {});
  },
  async listMinePending(): Promise<any> {
    return apiClient.get('/my-cancel-requests');
  }
};

// Groups helpers
export const groupsApi = {
  async list(params?: { eventId?: number; category?: string; page?: number; limit?: number }): Promise<any> {
    const searchParams = new URLSearchParams();
    if (params?.eventId) searchParams.append('eventId', String(params.eventId));
    if (params?.category) searchParams.append('category', params.category);
    searchParams.append('page', String(params?.page ?? 1));
    searchParams.append('limit', String(params?.limit ?? 500));
    const qs = searchParams.toString();
    return apiClient.get(`/groups${qs ? `?${qs}` : ''}`);
  },
  async create(payload: { eventId: number; category: string; name: string; members?: number[] }): Promise<any> {
    return apiClient.post('/groups', payload);
  },
  async remove(id: number): Promise<any> {
    return apiClient.delete(`/groups/${id}`);
  },
  async update(id: number, payload: { eventId?: number; category?: string; name?: string; members?: number[] }): Promise<any> {
    return apiClient.put(`/groups/${id}`, payload);
  },
};
