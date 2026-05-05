import apiClient from './client';
import type { User, UserCreate, UserUpdate } from '../types';

export const usersApi = {
  list: async (): Promise<User[]> => {
    const res = await apiClient.get<User[]>('/users');
    return res.data;
  },

  create: async (data: UserCreate): Promise<User> => {
    const res = await apiClient.post<User>('/users', data);
    return res.data;
  },

  update: async (id: string, data: UserUpdate): Promise<User> => {
    const res = await apiClient.put<User>(`/users/${id}`, data);
    return res.data;
  },

  deactivate: async (id: string): Promise<User> => {
    const res = await apiClient.patch<User>(`/users/${id}/deactivate`);
    return res.data;
  },
};