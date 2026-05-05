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
- [ ] Clients management UI (list/create/edit)
- [ ] Providers management UI (list/create/edit)
- [ ] Products management UI (list/create/edit + search UX)
- [ ] Orders module UI (create/list/update + WhatsApp parse flow)
- [ ] Shopping lists UI (aggregate, adjust items, finalize)
- [ ] Purchase orders UI (list/detail/status update + PDF access)
- [ ] Invoices UI (list/detail/status update + PDF access)

### To complete (Operator)
- [ ] Operator-focused dashboard widgets (today orders, pending actions)
- [ ] Order capture/creation flow
- [ ] Client quick search/creation from order flow
- [ ] Product search and item entry flow
- [ ] Restricted views for shopping/purchase/invoice modules (as required by business rules)

## Backend

### Completed
- [x] App and router wiring in `main.py` for:
  - [x] `/auth`
  - [x] `/users`
  - [x] `/clients`
  - [x] `/providers`
  - [x] `/products`
  - [x] `/orders`
  - [x] `/shopping-lists`
  - [x] `/purchase-orders`
  - [x] `/invoices`
- [x] JWT auth flow: register, login, refresh, current user
- [x] Role guard available: `require_admin`
- [x] Users CRUD (list/create/update + `/me`)
- [x] Clients CRUD (list/create/get/update)
- [x] Providers CRUD (list/create/get/update)
- [x] Products CRUD + `/products/search`
- [x] Orders list/create/update + WhatsApp parse endpoint
- [x] Shopping list aggregate/get/adjust/finalize flow
- [x] Purchase orders list/get/update status
- [x] Invoices list/get/update status

### To complete (Backend hardening and scope)
- [ ] Add missing delete/archive endpoints where needed (if required by business rules)
- [ ] Enforce role permissions per module (Admin vs Operator) beyond users-only admin checks
- [ ] Add consistent pagination/filters/sorting for all list endpoints
- [ ] Add domain validations (state transitions, constraints, clearer error details)
- [ ] Add audit logging (who changed status/quantities/prices and when)
- [ ] Add integration + unit tests for all routers/services
- [ ] Add Alembic migrations for production-safe schema evolution
- [ ] Improve CORS/env configuration for all frontend dev origins in use
- [ ] Add API docs examples and endpoint-level response error schemas

## Suggested next implementation order
1. Frontend Clients/Providers/Products modules (Admin)
2. Frontend Orders flow (Operator/Admin)
3. Frontend Shopping Lists + Purchase Orders + Invoices
4. Backend permission matrix + tests + migrations
