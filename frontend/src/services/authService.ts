import api from './api';
import { AuthResponse, User } from '../types/auth';

export const authService = {
  async register(data: any): Promise<AuthResponse> {
    const response = await api.post('/auth/register', data);
    return response.data.data;
  },

  async login(data: any): Promise<AuthResponse> {
    const response = await api.post('/auth/login', data);
    return response.data.data;
  },

  async me(): Promise<{ user: User }> {
    const response = await api.get('/auth/me');
    return response.data.data;
  }
};
