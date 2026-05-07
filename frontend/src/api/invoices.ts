import api from './client';
import type { InvoiceRead, InvoiceSummary, InvoiceUpdate } from '../types';

export const invoicesApi = {
  list(): Promise<InvoiceSummary[]> {
    return api.get<InvoiceSummary[]>('/invoices/').then((r) => r.data);
  },
  get(id: string): Promise<InvoiceRead> {
    return api.get<InvoiceRead>(`/invoices/${id}`).then((r) => r.data);
  },
  update(id: string, payload: InvoiceUpdate): Promise<InvoiceRead> {
    return api.patch<InvoiceRead>(`/invoices/${id}`, payload).then((r) => r.data);
  },
};
