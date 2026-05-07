# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full-stack order/invoice management system. Backend: FastAPI + SQLAlchemy + SQLite (dev). Frontend: React 19 + TypeScript + Vite + TailwindCSS. Two user roles: `admin` and `operator`.

## Commands

### Backend (run from `backend/`)
```bash
uvicorn app.main:app --reload          # Dev server on port 8000
alembic upgrade head                    # Apply migrations
alembic revision --autogenerate -m ""  # Generate migration from model changes
pytest                                  # Run all tests
pytest tests/test_auth.py              # Run a single test file
pytest -k "test_name"                  # Run a single test by name
coverage run -m pytest && coverage report  # Tests with coverage
```

### Frontend (run from `frontend/`)
```bash
npm run dev      # Dev server on port 5173 (proxies /api → localhost:8000)
npm run build    # TypeScript check + production build
npm run lint     # ESLint
npm run preview  # Preview production build
```

### Environment setup
Copy `backend/.env.example` to `backend/.env` and fill in values. Required: `SECRET_KEY`, `DATABASE_URL`. Optional: `ANTHROPIC_API_KEY` (WhatsApp parsing), Google OAuth credentials.

## Architecture

### Backend (`backend/app/`)

- **`main.py`** — FastAPI app factory: CORS setup, all router registration
- **`config.py`** — Pydantic `Settings` class; reads from `.env`
- **`database.py`** — SQLAlchemy engine + `SessionLocal` + `get_db` dependency
- **`models/`** — SQLAlchemy ORM models (one file per domain entity)
- **`schemas/`** — Pydantic request/response schemas (one file per domain)
- **`routers/`** — FastAPI routers; each file is one resource group (auth, users, clients, providers, products, orders, shopping_lists, purchase_orders, invoices)
- **`services/`** — Business logic called by routers; keeps router functions thin
- **`dependencies.py`** — `get_current_user` and `require_admin` JWT-auth dependencies injected into protected routes

All tables use UUID PKs. Business entities (clients, providers, products, orders) are soft-deleted via `is_active`. Price and quantity values are snapshotted on order/invoice creation so historical records stay accurate.

### Frontend (`frontend/src/`)

- **`App.tsx`** — React Router root; auth state managed here, passed down via props
- **`api/client.ts`** — Axios instance: auto-injects Bearer token, handles 401 by redirecting to login
- **`hooks/useAuth.ts`** — Login/logout logic; persists tokens in `localStorage`
- **`pages/`** — One file per route (Dashboard, Login, Users, Clients, Providers, Products)
- **`components/`** — Shared UI: modals, tables, sidebar, toast notifications
- **`types/`** — TypeScript interfaces mirroring backend schemas

The Vite dev server proxies `/api` requests to `http://localhost:8000`, so frontend calls use relative `/api/...` paths.

### Authentication flow

1. `POST /auth/login` returns `access_token` (short-lived JWT) + `refresh_token` (long-lived, hashed in DB)
2. Frontend stores both in `localStorage`; Axios interceptor attaches `access_token` to every request
3. On 401, frontend calls `POST /auth/refresh` with the refresh token, then retries
4. Backend `get_current_user` dependency decodes the JWT and returns the user; `require_admin` additionally checks `user.role == "admin"`

### Key workflow: WhatsApp order parsing

`POST /orders/parse-whatsapp` sends raw WhatsApp text to the Anthropic Claude API (configured via `ANTHROPIC_API_KEY`). The service extracts client name, products, and quantities and returns a structured order draft for review before saving.

### Database migrations

Models live in `backend/app/models/`. After changing a model, run `alembic revision --autogenerate` and inspect the generated file before applying. Migration files are in `backend/alembic/versions/`.

## Branch conventions

- `main` — stable
- `admin_branch` — admin-facing UI features
- `operator_branch` — operator-facing UI features

## Docs

- `docs/db_schema.md` — full table/column reference
- `docs/db_schema_mermaid.md` — entity-relationship diagram
- `docs/todo.md` — feature completion tracker
