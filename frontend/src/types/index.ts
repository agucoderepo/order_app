// ─── Auth ────────────────────────────────────────────────────────────────────

export interface TokenResponse {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
  }
  
  export interface LoginRequest {
    email: string;
    password: string;
  }
  
  // ─── Users ───────────────────────────────────────────────────────────────────
  
  export type UserRole = 'admin' | 'operator';
  
  export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  }
  
  export interface UserCreate {
    name: string;
    email: string;
    role: UserRole;
    password: string;
    is_active?: boolean;
  }
  
  export interface UserUpdate {
    name?: string;
    email?: string;
    role?: UserRole;
    password?: string;
    is_active?: boolean;
  }

// ─── Clients ─────────────────────────────────────────────────────────────────

export interface Client {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  notes: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ClientCreate {
  name: string;
  address?: string | null;
  phone?: string | null;
  notes?: string | null;
}

export interface ClientUpdate {
  name?: string;
  address?: string | null;
  phone?: string | null;
  notes?: string | null;
  is_active?: boolean;
}
  
  // ─── Providers ───────────────────────────────────────────────────────────────

export interface Provider {
  id: string;
  name: string;
  address: string | null;
  contact_name: string | null;
  phone: string | null;
  notes: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProviderCreate {
  name: string;
  address?: string | null;
  contact_name?: string | null;
  phone?: string | null;
  notes?: string | null;
}

export interface ProviderUpdate {
  name?: string;
  address?: string | null;
  contact_name?: string | null;
  phone?: string | null;
  notes?: string | null;
  is_active?: boolean;
}

// ─── Products ────────────────────────────────────────────────────────────────

export interface ProviderSummary {
  id: string;
  name: string;
  phone: string | null;
}

export interface Product {
  id: string;
  name: string;
  unit: string;
  price: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  provider: ProviderSummary;
}

export interface ProductCreate {
  name: string;
  unit: string;
  price: number;
  provider_id: string;
}

export interface ProductUpdate {
  name?: string;
  unit?: string;
  price?: number;
  provider_id?: string;
  is_active?: boolean;
}

export interface ProductSearchResult {
  id: string;
  name: string;
  unit: string;
  price: string;
  provider_name: string;
}

// ─── API errors ──────────────────────────────────────────────────────────────
  
  export interface ApiError {
    detail: string;
  }
  
  // ─── Toast ───────────────────────────────────────────────────────────────────
  
  export type ToastType = 'success' | 'error';
  
  export interface ToastItem {
    id: number;
    msg: string;
    type: ToastType;
  }