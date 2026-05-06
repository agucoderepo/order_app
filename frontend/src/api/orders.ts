import apiClient from './client';
import type { OrderRead, OrderCreate, OrderUpdate } from '../types';

export const ordersApi = {
  list: async (): Promise<OrderRead[]> => {
    const res = await apiClient.get<OrderRead[]>('/orders/', { params: { limit: 200 } });
    return res.data;
  },

  create: async (data: OrderCreate): Promise<OrderRead> => {
    const res = await apiClient.post<OrderRead>('/orders/', data);
    return res.data;
  },

  update: async (id: string, data: OrderUpdate): Promise<OrderRead> => {
    const res = await apiClient.patch<OrderRead>(`/orders/${id}`, data);
    return res.data;
  },
};
