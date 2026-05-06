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

// ─── Summaries (shared nested types) ─────────────────────────────────────────

export interface ClientSummary {
  id: string;
  name: string;
  phone: string | null;
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

export interface ProductSummary {
  id: string;
  name: string;
  unit: string;
  price: string;
  provider: ProviderSummary;
}

export interface ProductSearchResult {
  id: string;
  name: string;
  unit: string;
  price: string;
  provider_name: string;
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export type OrderStatus = 'draft' | 'confirmed' | 'delivered';
export type OrderSource = 'manual' | 'whatsapp';

export interface OrderItemCreate {
  product_id: string;
  quantity: number;
  /** Percentage 0–100. Line total = unit_price × qty × (1 − discount/100) */
  discount?: number;
  notes?: string | null;
}

export interface OrderItemRead {
  id: string;
  product_id: string;
  quantity: string;
  unit_price: string;
  /** Percentage 0–100. Line total = unit_price × qty × (1 − discount/100) */
  discount: string;
  notes: string | null;
  product: ProductSummary;
}

export interface OrderCreate {
  client_id: string;
  order_date: string;
  items: OrderItemCreate[];
  source: OrderSource;
  notes?: string | null;
}

export interface OrderUpdate {
  status?: OrderStatus;
  notes?: string | null;
  items?: OrderItemCreate[];
}

export interface OrderRead {
  id: string;
  client_id: string;
  order_date: string;
  status: OrderStatus;
  source: OrderSource;
  created_by: string;
  notes: string | null;
  client: ClientSummary;
  items: OrderItemRead[];
  created_at: string;
  updated_at: string;
}

// ─── Shopping Lists ──────────────────────────────────────────────────────────

export type ShoppingListStatus = 'open' | 'finalized';

export interface ShoppingListItemRead {
  id: string;
  product: ProductSummary;
  provider: ProviderSummary;
  total_quantity: string;
  adjusted_quantity: string | null;
  final_quantity: string;
  notes: string | null;
}

export interface ProviderGroup {
  provider: ProviderSummary;
  items: ShoppingListItemRead[];
  subtotal: string;
}

export interface ShoppingListRead {
  id: string;
  list_date: string;
  status: ShoppingListStatus;
  created_by: string;
  finalized_at: string | null;
  created_at: string;
  by_provider: ProviderGroup[];
}

export interface ShoppingListItemAdjust {
  adjusted_quantity?: number | null;
  notes?: string | null;
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