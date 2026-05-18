import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import engine, SessionLocal
from app.models import Base
from app.routers import auth, users, clients, providers, products, orders
from app.routers import shopping_lists, purchase_orders, invoices, audit_logs, permissions


def _seed_permissions() -> None:
    """Idempotently insert all permission rows and default role-permission mappings."""
    from app.models import Permission, RolePermission
    from app.permissions import ALL_PERMISSIONS, ROLE_PERMISSIONS

    db = SessionLocal()
    try:
        for name, description in ALL_PERMISSIONS.items():
            if not db.query(Permission).filter(Permission.name == name).first():
                db.add(Permission(name=name, description=description))
        db.flush()

        for role, perm_names in ROLE_PERMISSIONS.items():
            for perm in perm_names:
                if not db.query(RolePermission).filter(
                    RolePermission.role_name == role,
                    RolePermission.permission_name == perm,
                ).first():
                    db.add(RolePermission(role_name=role, permission_name=perm))

        db.commit()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    _seed_permissions()
    yield


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — allow dev server locally and any Railway/production origin via env var.
# Set ALLOWED_ORIGINS=https://your-frontend.up.railway.app in the Railway backend service.
_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")
_allowed_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files only if the directory exists (dev PDF serving).
_static_dir = "static"
if os.path.isdir(_static_dir):
    app.mount("/static", StaticFiles(directory=_static_dir), name="static")

# Routers
app.include_router(auth.router,            prefix="/auth",            tags=["auth"])
app.include_router(users.router,           prefix="/users",           tags=["users"])
app.include_router(clients.router,         prefix="/clients",         tags=["clients"])
app.include_router(providers.router,       prefix="/providers",       tags=["providers"])
app.include_router(products.router,        prefix="/products",        tags=["products"])
app.include_router(orders.router,          prefix="/orders",          tags=["orders"])
app.include_router(shopping_lists.router,  prefix="/shopping-lists",  tags=["shopping-lists"])
app.include_router(purchase_orders.router, prefix="/purchase-orders", tags=["purchase-orders"])
app.include_router(invoices.router,        prefix="/invoices",        tags=["invoices"])
app.include_router(audit_logs.router,      prefix="/audit-logs",      tags=["audit-logs"])
app.include_router(permissions.router,     prefix="/permissions",     tags=["permissions"])
