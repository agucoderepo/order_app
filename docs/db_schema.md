# Database Schema — Order Management App

## Overview

- **Database:** SQLite (development) → PostgreSQL (production)
- **Primary keys:** UUID on all tables
- **Soft deletes:** `is_active` flag on entity tables (clients, providers, products)
- **Audit trail:** `created_by` FK to `users` on all business tables
- **Timestamps:** `created_at` / `updated_at` on all tables where relevant

---

## Auth & Users

### `users`

Core user account. Supports both local (password) and OAuth login via `user_identities`.

`permissions_version` is a counter incremented whenever a user's effective permissions change (role change, role-permission update, or user-level override). It is embedded in the JWT so the auth layer can detect stale permission caches without an extra DB join.

```sql
CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(255) NOT NULL,
    email               VARCHAR(255) NOT NULL UNIQUE,
    password_hash       VARCHAR(255),                        -- NULL if OAuth-only account
    role                VARCHAR(50) NOT NULL DEFAULT 'operator',
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    permissions_version INTEGER NOT NULL DEFAULT 0,          -- JWT permission cache key
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
```

**Roles** are named bundles of permissions stored in `role_permissions`. The role column is just a label; what a user can do is determined entirely by that table (plus any `user_permissions` overrides).

---

### `permissions`

Catalogue of all named capabilities in the system. Seeded at startup; not created by users.

```sql
CREATE TABLE permissions (
    name        VARCHAR(100) PRIMARY KEY,   -- e.g. 'orders:read:all'
    description TEXT
);
```

Permission naming convention: `<resource>:<action>` or `<resource>:<action>:all`.
The `:all` suffix grants cross-user data scope (see all records, not just own).

---

### `role_permissions`

Many-to-many mapping of role names to permissions. Updating this table and calling `bump_permissions_version_for_role` invalidates JWT caches for all affected users.

```sql
CREATE TABLE role_permissions (
    role_name       VARCHAR(50) NOT NULL,
    permission_name VARCHAR(100) NOT NULL REFERENCES permissions(name) ON DELETE CASCADE,
    PRIMARY KEY (role_name, permission_name)
);

CREATE INDEX idx_role_permissions_role ON role_permissions(role_name);
```

**Default seeding:**

| Permission | admin | operator |
|---|:---:|:---:|
| `users:read` | ✓ | |
| `users:write` | ✓ | |
| `clients:read` | ✓ | ✓ |
| `clients:write` | ✓ | ✓ |
| `providers:read` | ✓ | ✓ |
| `providers:write` | ✓ | |
| `products:read` | ✓ | ✓ |
| `products:write` | ✓ | |
| `orders:read` | ✓ | ✓ |
| `orders:read:all` | ✓ | |
| `orders:write` | ✓ | ✓ |
| `orders:write:all` | ✓ | |
| `orders:parse` | ✓ | ✓ |
| `shopping_lists:read` | ✓ | ✓ |
| `shopping_lists:read:all` | ✓ | |
| `shopping_lists:write` | ✓ | ✓ |
| `shopping_lists:aggregate` | ✓ | ✓ |
| `shopping_lists:finalize` | ✓ | ✓ |
| `shopping_lists:reopen` | ✓ | ✓ |
| `purchase_orders:read` | ✓ | ✓ |
| `purchase_orders:read:all` | ✓ | |
| `purchase_orders:write` | ✓ | ✓ |
| `purchase_orders:write:all` | ✓ | |
| `invoices:read` | ✓ | ✓ |
| `invoices:write` | ✓ | ✓ |
| `audit_logs:read` | ✓ | |

---

### `user_permissions`

Per-user permission overrides layered on top of role defaults.
`granted = TRUE` adds a permission the role doesn't have; `granted = FALSE` removes one it does.

```sql
CREATE TABLE user_permissions (
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_name VARCHAR(100) NOT NULL REFERENCES permissions(name) ON DELETE CASCADE,
    granted         BOOLEAN NOT NULL,
    PRIMARY KEY (user_id, permission_name)
);

CREATE INDEX idx_user_permissions_user_id ON user_permissions(user_id);
```

---

### `user_identities`

One row per login method per user. Allows a user to log in via Google OAuth and/or a local password from the same account.

```sql
CREATE TABLE user_identities (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider            VARCHAR(50) NOT NULL,   -- 'local' | 'google'
    provider_user_id    VARCHAR(255) NOT NULL,  -- Google sub ID, or email for local
    access_token        TEXT,                   -- OAuth access token (encrypted at rest)
    linked_at           TIMESTAMP NOT NULL DEFAULT NOW(),

    UNIQUE (provider, provider_user_id)
);

CREATE INDEX idx_user_identities_user_id ON user_identities(user_id);
CREATE INDEX idx_user_identities_provider ON user_identities(provider, provider_user_id);
```

**How it works:**
- Local login → `provider = 'local'`, `provider_user_id = email`
- Google login → `provider = 'google'`, `provider_user_id = Google sub claim`
- A user can have one row per provider, enabling fallback between methods

---

### `refresh_tokens`

Persistent login sessions. Stored as hashes — raw tokens are never persisted.

```sql
CREATE TABLE refresh_tokens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash      VARCHAR(255) NOT NULL UNIQUE,  -- SHA-256 hash of the raw token
    expires_at      TIMESTAMP NOT NULL,
    revoked         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
```

---

## Business Entities

### `clients`

People or businesses that place orders.

```sql
CREATE TABLE clients (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    phone           VARCHAR(50),
    notes           TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clients_name ON clients(name);
CREATE INDEX idx_clients_is_active ON clients(is_active);
```

---

### `providers`

Suppliers that fulfil product purchases.

```sql
CREATE TABLE providers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    contact_name    VARCHAR(255),
    phone           VARCHAR(50),
    notes           TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_providers_name ON providers(name);
CREATE INDEX idx_providers_is_active ON providers(is_active);
```

---

### `products`

Catalogue of purchasable items, each linked to exactly one provider.

```sql
CREATE TABLE products (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id     UUID NOT NULL REFERENCES providers(id),
    name            VARCHAR(255) NOT NULL,
    unit            VARCHAR(50) NOT NULL,   -- e.g. 'kg', 'unit', 'box', 'dozen'
    price           DECIMAL(10, 2) NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_provider_id ON products(provider_id);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_is_active ON products(is_active);
```

---

## Orders

### `orders`

One order per client per intake event. Can be created manually or parsed from a WhatsApp message.

```sql
CREATE TABLE orders (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id           UUID NOT NULL REFERENCES clients(id),
    created_by          UUID NOT NULL REFERENCES users(id),
    order_date          DATE NOT NULL DEFAULT CURRENT_DATE,
    status              VARCHAR(50) NOT NULL DEFAULT 'draft',
                        -- 'draft' | 'confirmed' | 'delivered'
    source              VARCHAR(50) NOT NULL DEFAULT 'manual',
                        -- 'manual' | 'whatsapp'
    raw_whatsapp_text   TEXT,       -- Original paste for audit trail (source='whatsapp' only)
    notes               TEXT,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_client_id ON orders(client_id);
CREATE INDEX idx_orders_order_date ON orders(order_date);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_by ON orders(created_by);
```

**Status flow:**
```
draft → confirmed → delivered
```
- `draft` — being entered or parsed, not yet committed
- `confirmed` — locked in, included in shopping list aggregation
- `delivered` — goods handed to the client

---

### `order_items`

Line items within an order. `unit_price` is snapshotted at time of order creation so historical records are accurate even if the product price changes later.

```sql
CREATE TABLE order_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id      UUID NOT NULL REFERENCES products(id),
    quantity        DECIMAL(10, 3) NOT NULL,
    unit_price      DECIMAL(10, 2) NOT NULL,  -- Snapshot of products.price at order time
    notes           TEXT,

    UNIQUE (order_id, product_id)
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
```

---

## Shopping Lists

### `shopping_lists`

One list per working day (or per batch). Groups all confirmed orders into a single procurement view.

```sql
CREATE TABLE shopping_lists (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_date       DATE NOT NULL UNIQUE,   -- One list per day
    status          VARCHAR(50) NOT NULL DEFAULT 'open',
                    -- 'open' | 'finalized'
    created_by      UUID NOT NULL REFERENCES users(id),
    finalized_at    TIMESTAMP,              -- Set when status → 'finalized'
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shopping_lists_list_date ON shopping_lists(list_date);
CREATE INDEX idx_shopping_lists_status ON shopping_lists(status);
```

---

### `shopping_list_items`

Aggregated product quantities per provider. `total_quantity` is system-calculated; `adjusted_quantity` is the operator's final decision (rounding up to full boxes, adding buffer stock, etc.).

```sql
CREATE TABLE shopping_list_items (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shopping_list_id    UUID NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
    product_id          UUID NOT NULL REFERENCES products(id),
    provider_id         UUID NOT NULL REFERENCES providers(id),  -- Denormalised for fast grouping
    total_quantity      DECIMAL(10, 3) NOT NULL,   -- Calculated from confirmed order_items
    adjusted_quantity   DECIMAL(10, 3),            -- Operator override; NULL = use total_quantity
    notes               TEXT,

    UNIQUE (shopping_list_id, product_id)
);

CREATE INDEX idx_shopping_list_items_list_id ON shopping_list_items(shopping_list_id);
CREATE INDEX idx_shopping_list_items_provider_id ON shopping_list_items(provider_id);
```

---

## Purchase Orders

### `purchase_orders`

One purchase order per provider per shopping list. Generated when the shopping list is finalized.

```sql
CREATE TABLE purchase_orders (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shopping_list_id    UUID NOT NULL REFERENCES shopping_lists(id),
    provider_id         UUID NOT NULL REFERENCES providers(id),
    status              VARCHAR(50) NOT NULL DEFAULT 'pending',
                        -- 'pending' | 'sent' | 'received'
    pdf_path            TEXT,           -- File path or cloud URL of generated PDF
    created_by          UUID NOT NULL REFERENCES users(id),
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),

    UNIQUE (shopping_list_id, provider_id)  -- One PO per provider per day
);

CREATE INDEX idx_purchase_orders_shopping_list_id ON purchase_orders(shopping_list_id);
CREATE INDEX idx_purchase_orders_provider_id ON purchase_orders(provider_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
```

**Status flow:**
```
pending → sent → received
```

---

### `purchase_order_items`

Line items on a purchase order. Quantities are copied from `shopping_list_items.adjusted_quantity` (falling back to `total_quantity`) at the time of finalization.

```sql
CREATE TABLE purchase_order_items (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id   UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id          UUID NOT NULL REFERENCES products(id),
    quantity            DECIMAL(10, 3) NOT NULL,
    unit_price          DECIMAL(10, 2) NOT NULL,   -- Snapshot of products.price

    UNIQUE (purchase_order_id, product_id)
);

CREATE INDEX idx_po_items_purchase_order_id ON purchase_order_items(purchase_order_id);
```

---

## Invoices

### `invoices`

One invoice per confirmed order. `invoice_number` is a human-readable sequential ID used on the PDF document.

```sql
CREATE TABLE invoices (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        UUID NOT NULL UNIQUE REFERENCES orders(id),
    client_id       UUID NOT NULL REFERENCES clients(id),  -- Denormalised for fast lookup
    invoice_number  VARCHAR(50) NOT NULL UNIQUE,            -- e.g. 'INV-2024-0042'
    total_amount    DECIMAL(10, 2) NOT NULL,
    status          VARCHAR(50) NOT NULL DEFAULT 'draft',
                    -- 'draft' | 'sent' | 'paid'
    pdf_path        TEXT,           -- File path or cloud URL of generated PDF
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoices_order_id ON invoices(order_id);
CREATE INDEX idx_invoices_client_id ON invoices(client_id);
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_status ON invoices(status);
```

**Status flow:**
```
draft → sent → paid
```

---

## Key Queries

### Aggregate confirmed orders into a shopping list for today

```sql
SELECT
    p.id                AS product_id,
    p.name              AS product_name,
    p.unit,
    p.provider_id,
    pr.name             AS provider_name,
    SUM(oi.quantity)    AS total_quantity,
    p.price             AS unit_price
FROM order_items oi
JOIN orders o        ON o.id = oi.order_id
JOIN products p      ON p.id = oi.product_id
JOIN providers pr    ON pr.id = p.provider_id
WHERE o.order_date = CURRENT_DATE
  AND o.status = 'confirmed'
GROUP BY p.id, p.name, p.unit, p.provider_id, pr.name, p.price
ORDER BY pr.name, p.name;
```

---

### Get all items for a specific provider's purchase order

```sql
SELECT
    p.name          AS product_name,
    p.unit,
    COALESCE(sli.adjusted_quantity, sli.total_quantity) AS final_quantity,
    sli.total_quantity                                  AS calculated_quantity,
    p.price         AS unit_price,
    COALESCE(sli.adjusted_quantity, sli.total_quantity) * p.price AS line_total
FROM shopping_list_items sli
JOIN products p          ON p.id = sli.product_id
JOIN shopping_lists sl   ON sl.id = sli.shopping_list_id
WHERE sli.provider_id = :provider_id
  AND sl.list_date = :list_date
ORDER BY p.name;
```

---

### Get invoice summary for a client order

```sql
SELECT
    i.invoice_number,
    c.name          AS client_name,
    i.total_amount,
    i.status,
    i.created_at,
    json_agg(json_build_object(
        'product',   p.name,
        'quantity',  oi.quantity,
        'unit',      p.unit,
        'unit_price', oi.unit_price,
        'subtotal',  oi.quantity * oi.unit_price
    )) AS line_items
FROM invoices i
JOIN orders o        ON o.id = i.order_id
JOIN clients c       ON c.id = i.client_id
JOIN order_items oi  ON oi.order_id = o.id
JOIN products p      ON p.id = oi.product_id
WHERE i.id = :invoice_id
GROUP BY i.invoice_number, c.name, i.total_amount, i.status, i.created_at;
```

---

## Notes for SQLite → PostgreSQL Migration

| Topic | SQLite (dev) | PostgreSQL (prod) |
|---|---|---|
| UUID generation | Use `uuid` Python lib, store as TEXT | `gen_random_uuid()` native |
| `gen_random_uuid()` | Not available — generate in app layer | Available natively |
| `DECIMAL` | Stored as REAL — use `NUMERIC` in SQLAlchemy | Full `NUMERIC(10,2)` support |
| `json_agg` | Not available — aggregate in Python | Available natively |
| `NOW()` | Use `CURRENT_TIMESTAMP` | `NOW()` works fine |
| Alembic | Same migration files work for both | Target dialect in `env.py` |

> **Recommendation:** Define all models in SQLAlchemy ORM with `server_default=func.now()` and let Alembic generate dialect-specific DDL. This keeps migration files database-agnostic.
