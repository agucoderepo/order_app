import apiClient from './client';
import type { PurchaseOrderSummary, PurchaseOrderRead, PurchaseOrderUpdate } from '../types';

export const purchaseOrdersApi = {
  list: async (): Promise<PurchaseOrderSummary[]> => {
    const res = await apiClient.get<PurchaseOrderSummary[]>('/purchase-orders/', { params: { limit: 200 } });
    return res.data;
  },

  get: async (id: string): Promise<PurchaseOrderRead> => {
    const res = await apiClient.get<PurchaseOrderRead>(`/purchase-orders/${id}`);
    return res.data;
  },

  update: async (id: string, data: PurchaseOrderUpdate): Promise<PurchaseOrderRead> => {
    const res = await apiClient.patch<PurchaseOrderRead>(`/purchase-orders/${id}`, data);
    return res.data;
  },
};
