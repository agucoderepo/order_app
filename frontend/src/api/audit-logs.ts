import api from './client';
import type { AuditLog, AuditLogFilters } from '../types';

export const auditLogsApi = {
  list(filters: AuditLogFilters = {}): Promise<AuditLog[]> {
    const params: Record<string, string | number> = {};
    if (filters.entity_type) params.entity_type = filters.entity_type;
    if (filters.action) params.action = filters.action;
    if (filters.user_id) params.user_id = filters.user_id;
    if (filters.date_from) params.date_from = filters.date_from;
    if (filters.date_to) params.date_to = filters.date_to;
    if (filters.limit) params.limit = filters.limit;
    return api.get<AuditLog[]>('/audit-logs/', { params }).then((r) => r.data);
  },
};
