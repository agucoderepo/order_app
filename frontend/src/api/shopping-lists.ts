import apiClient from './client';
import type { ShoppingListRead, ShoppingListItemAdjust } from '../types';

export const shoppingListsApi = {
  get: async (date: string): Promise<ShoppingListRead> => {
    const res = await apiClient.get<ShoppingListRead>(`/shopping-lists/${date}`);
    return res.data;
  },

  aggregate: async (date: string): Promise<ShoppingListRead> => {
    const res = await apiClient.post<ShoppingListRead>(`/shopping-lists/${date}/aggregate`);
    return res.data;
  },

  adjustItem: async (date: string, itemId: string, data: ShoppingListItemAdjust): Promise<ShoppingListRead> => {
    const res = await apiClient.patch<ShoppingListRead>(`/shopping-lists/${date}/items/${itemId}`, data);
    return res.data;
  },

  finalize: async (date: string): Promise<ShoppingListRead> => {
    const res = await apiClient.patch<ShoppingListRead>(`/shopping-lists/${date}/finalize`);
    return res.data;
  },

  reopen: async (date: string): Promise<ShoppingListRead> => {
    const res = await apiClient.patch<ShoppingListRead>(`/shopping-lists/${date}/reopen`);
    return res.data;
  },
};
