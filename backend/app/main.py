from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import engine
from app.models import Base
from app.routers import auth, users, clients, providers, products, orders
from app.routers import shopping_lists, purchase_orders, invoices, audit_logs


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup (dev only — use Alembic in production)
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve generated PDFs as static files in development
app.mount("/static", StaticFiles(directory="static"), name="static")

# Routers
app.include_router(auth.router,           prefix="/auth",            tags=["auth"])
app.include_router(users.router,          prefix="/users",           tags=["users"])
app.include_router(clients.router,        prefix="/clients",         tags=["clients"])
app.include_router(providers.router,      prefix="/providers",       tags=["providers"])
app.include_router(products.router,       prefix="/products",        tags=["products"])
app.include_router(orders.router,         prefix="/orders",          tags=["orders"])
app.include_router(shopping_lists.router, prefix="/shopping-lists",  tags=["shopping-lists"])
app.include_router(purchase_orders.router,prefix="/purchase-orders", tags=["purchase-orders"])
app.include_router(invoices.router,       prefix="/invoices",        tags=["invoices"])
app.include_router(audit_logs.router,     prefix="/audit-logs",      tags=["audit-logs"])