# Order App TODO (Current Status)

Based on current code in `frontend/src` and `backend/app`.

## Frontend

### Completed
- [x] Login page UI with API call and inline error handling (`/auth/login`)
- [x] Session handling (`useAuth`) with token persistence and profile fetch (`/users/me`)
- [x] Role-aware sidebar (Admin vs Operator visibility)
- [x] Dashboard page (shared base view for Admin/Operator)
- [x] Admin Users module: list, search, create, edit, deactivate
- [x] Toast system and modal components

### To complete (Admin)
- [x] Clients management UI (list/create/edit)
- [x] Providers management UI (list/create/edit)
- [x] Products management UI (list/create/edit + search UX)
- [x] Orders module UI (create/list/update)
- [x] Shopping lists UI (aggregate, adjust items, finalize, re-open)
- [x] Purchase orders UI (list/detail/status update + PDF access)
- [x] Audit log UI (filterable table, admin-only)
- [x] Invoices UI (list/detail/status update + browser print)
- [x] Auto-create invoices on shopping list finalize (one per confirmed order, with timestamp in invoice number; re-finalize appends -UPDn suffix)
- [x] Provider purchase order browser print view

### To complete (Operator)
- [x] Operator-focused dashboard widgets (today orders, pending actions)
- [x] Order capture/creation flow
- [x] Client quick search/creation from order flow
- [x] Product search and item entry flow
- [x] Restricted views for shopping/purchase/invoice modules (shopping lists open to operators; purchase orders + invoices remain admin-only)

### To complete (Permissions UI — new)
- [ ] Permission management page: view/edit permissions per role (`GET/PUT /permissions/roles/{role}`)
- [ ] Per-user permission overrides UI (`GET/POST/DELETE /permissions/users/{id}/{perm}`)
- [ ] Update sidebar visibility logic to use resolved permissions instead of hard-coded role checks

## Backend

### Completed
- [x] App and router wiring in `main.py` for all resource groups including `/permissions`
- [x] JWT auth flow: register, login, refresh, current user
- [x] **Permission-based access control (PBAC)** — replaces role-only checks
  - [x] `app/permissions.py` — 26 named permissions with `resource:action[:all]` convention
  - [x] `permissions`, `role_permissions`, `user_permissions` DB tables
  - [x] `users.permissions_version` column for JWT cache invalidation
  - [x] `require_permission(perm)` FastAPI dependency factory
  - [x] `has_permission(user, perm)` helper for inline data-scope checks
  - [x] JWT embeds `perms` list + `perms_v` version on every token issue
  - [x] Two-path permission resolution: JWT fast path (no extra query) vs DB cache miss
  - [x] `bump_permissions_version` / `bump_permissions_version_for_role` helpers
  - [x] All 9 routers migrated from role checks to permission checks
  - [x] `GET/PUT /permissions/roles/{role}` — manage role permission sets
  - [x] `GET/POST/DELETE /permissions/users/{id}` — per-user overrides
- [x] Users CRUD (list/create/update + `/me`)
- [x] Clients CRUD (list/create/get/update)
- [x] Providers CRUD (list/create/get/update)
- [x] Products CRUD + `/products/search`
- [x] Orders list/create/update + WhatsApp parse endpoint
- [x] Shopping list aggregate/get/adjust/finalize flow
- [x] Purchase orders list/get/update status
- [x] Invoices list/get/update status
- [x] Audit logging (who changed status/quantities/prices and when)
- [x] Alembic migration `0001_add_permissions` — adds column + seeds tables (SQLite + PostgreSQL compatible)

### To complete (Backend hardening and scope)
- [ ] Server-side PDF generation for invoices and purchase orders (WeasyPrint or ReportLab) — replace browser-print with actual PDF files stored at pdf_path
- [ ] Add missing delete/archive endpoints where needed (if required by business rules)
- [ ] Add consistent pagination/filters/sorting for all list endpoints
- [ ] Add domain validations (state transitions, constraints, clearer error details)
- [ ] Add integration + unit tests for all routers/services
- [ ] Improve CORS/env configuration for all frontend dev origins in use
- [ ] Add API docs examples and endpoint-level response error schemas

## Suggested next implementation order
1. Frontend: Permission management UI (roles + user overrides)
2. Frontend: Migrate sidebar/visibility from `user.role` to resolved permissions
3. Backend: Integration tests for permission enforcement
4. Backend: PDF generation
