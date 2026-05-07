import apiClient from './client';
import type { Client, ClientCreate, ClientUpdate } from '../types';

export const clientsApi = {
  list: async (): Promise<Client[]> => {
    const res = await apiClient.get<Client[]>('/clients/');
    return res.data;
  },

  create: async (data: ClientCreate): Promise<Client> => {
    const res = await apiClient.post<Client>('/clients/', data);
    return res.data;
  },

  update: async (id: string, data: ClientUpdate): Promise<Client> => {
    const res = await apiClient.patch<Client>(`/clients/${id}`, data);
    return res.data;
  },
};
