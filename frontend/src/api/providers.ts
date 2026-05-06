import apiClient from './client';
import type { Provider, ProviderCreate, ProviderUpdate } from '../types';

export const providersApi = {
  list: async (): Promise<Provider[]> => {
    const res = await apiClient.get<Provider[]>('/providers/');
    return res.data;
  },

  create: async (data: ProviderCreate): Promise<Provider> => {
    const res = await apiClient.post<Provider>('/providers/', data);
    return res.data;
  },

  update: async (id: string, data: ProviderUpdate): Promise<Provider> => {
    const res = await apiClient.patch<Provider>(`/providers/${id}`, data);
    return res.data;
  },
};
