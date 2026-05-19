import apiClient from './client';
import type { Permission, RolePermissions, UserPermissionOverride } from '../types';

export const permissionsApi = {
  listAll: async (): Promise<Permission[]> => {
    const res = await apiClient.get<Permission[]>('/permissions/');
    return res.data;
  },

  getRolePermissions: async (role: string): Promise<RolePermissions> => {
    const res = await apiClient.get<RolePermissions>(`/permissions/roles/${role}`);
    return res.data;
  },

  updateRolePermissions: async (role: string, permissions: string[]): Promise<RolePermissions> => {
    const res = await apiClient.put<RolePermissions>(`/permissions/roles/${role}`, { permissions });
    return res.data;
  },

  getUserOverrides: async (userId: string): Promise<UserPermissionOverride[]> => {
    const res = await apiClient.get<UserPermissionOverride[]>(`/permissions/users/${userId}`);
    return res.data;
  },

  setUserOverride: async (userId: string, permissionName: string, granted: boolean): Promise<UserPermissionOverride> => {
    const res = await apiClient.post<UserPermissionOverride>(`/permissions/users/${userId}`, {
      permission_name: permissionName,
      granted,
    });
    return res.data;
  },

  deleteUserOverride: async (userId: string, permissionName: string): Promise<void> => {
    await apiClient.delete(`/permissions/users/${userId}/${permissionName}`);
  },
};
