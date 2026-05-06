import apiClient from './client';
import type { Product, ProductCreate, ProductUpdate, ProductSearchResult } from '../types';

export const productsApi = {
  list: async (): Promise<Product[]> => {
    const res = await apiClient.get<Product[]>('/products/', { params: { limit: 500 } });
    return res.data;
  },

  search: async (q: string, limit = 25): Promise<ProductSearchResult[]> => {
    const res = await apiClient.get<ProductSearchResult[]>('/products/search', { params: { q, limit } });
    return res.data;
  },

  create: async (data: ProductCreate): Promise<Product> => {
    const res = await apiClient.post<Product>('/products/', data);
    return res.data;
  },

  update: async (id: string, data: ProductUpdate): Promise<Product> => {
    const res = await apiClient.patch<Product>(`/products/${id}`, data);
    return res.data;
  },
};
