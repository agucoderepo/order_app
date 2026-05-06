"""
SQLAlchemy ORM models for the Order Management App.

Design notes:
- All PKs are UUIDs, generated in Python (compatible with SQLite + PostgreSQL)
- Timestamps use server_default=func.now() so Alembic generates correct DDL per dialect
- Soft deletes via is_active flag on entity tables (clients, providers, products)
- price snapshots on order_items and purchase_order_items preserve historical accuracy
- Relationships are defined bidirectionally for convenient ORM access in both directions
"""

import uuid
from decimal import Decimal
from datetime import datetime, date

from sqlalchemy import (
    Boolean, Column, Date, DateTime, ForeignKey,
    Index, Numeric, String, Text, UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import DeclarativeBase, relationship, Mapped, mapped_column
from sqlalchemy.types import TypeDecorator, CHAR
import sqlalchemy as sa


# ---------------------------------------------------------------------------
# UUID column type — works for both SQLite (stores as CHAR(36)) and PostgreSQL
# ---------------------------------------------------------------------------

class UUID(TypeDecorator):
    """Platform-independent UUID type.
    Uses PostgreSQL's native UUID type when available,
    CHAR(36) with string coercion on SQLite.
    """
    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PG_UUID())
        return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        if dialect.name == "postgresql":
            return str(value)
        if not isinstance(value, uuid.UUID):
            return str(uuid.UUID(value))
        return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        if not isinstance(value, uuid.UUID):
            return uuid.UUID(value)
        return value


def new_uuid() -> str:
    return str(uuid.uuid4())


# ---------------------------------------------------------------------------
# Base
# ---------------------------------------------------------------------------

class Base(DeclarativeBase):
    pass


# ---------------------------------------------------------------------------
# Auth & Users
# ---------------------------------------------------------------------------

class User(Base):
    """
    Core user account. Supports local password and/or OAuth login.
    password_hash is nullable — an OAuth-only user has no password.

    Roles:
      admin    — full access: manage users, products, providers, finalize lists
      operator — create/manage orders, view shopping lists and invoices
    """
    __tablename__ = "users"

    id            = Column(UUID, primary_key=True, default=new_uuid)
    name          = Column(String(255), nullable=False)
    email         = Column(String(255), nullable=False, unique=True)
    password_hash = Column(String(255), nullable=True)   # NULL for OAuth-only accounts
    role          = Column(String(50), nullable=False, default="operator")
    is_active     = Column(Boolean, nullable=False, default=True)
    created_at    = Column(DateTime, nullable=False, server_default=func.now())
    updated_at    = Column(DateTime, nullable=False, server_default=func.now(),
                           onupdate=func.now())

    # Relationships
    identities      = relationship("UserIdentity", back_populates="user",
                                   cascade="all, delete-orphan")
    refresh_tokens  = relationship("RefreshToken", back_populates="user",
                                   cascade="all, delete-orphan")
    clients         = relationship("Client", back_populates="created_by_user")
    providers       = relationship("Provider", back_populates="created_by_user")
    products        = relationship("Product", back_populates="created_by_user")
    orders          = relationship("Order", back_populates="created_by_user")
    shopping_lists  = relationship("ShoppingList", back_populates="created_by_user")
    purchase_orders = relationship("PurchaseOrder", back_populates="created_by_user")
    invoices        = relationship("Invoice", back_populates="created_by_user")

    __table_args__ = (
        Index("idx_users_email", "email"),
    )

    def __repr__(self):
        return f"<User id={self.id} email={self.email} role={self.role}>"


class UserIdentity(Base):
    """
    One row per login method per user.
    provider: 'local' | 'google'
    provider_user_id: Google sub claim for OAuth, or email for local auth.

    A user can link multiple providers to the same account, enabling
    fallback between login methods (e.g. forgot password → use Google).
    """
    __tablename__ = "user_identities"

    id                 = Column(UUID, primary_key=True, default=new_uuid)
    user_id            = Column(UUID, ForeignKey("users.id", ondelete="CASCADE"),
                                nullable=False)
    provider           = Column(String(50), nullable=False)   # 'local' | 'google'
    provider_user_id   = Column(String(255), nullable=False)
    access_token       = Column(Text, nullable=True)          # OAuth token, encrypted at rest
    linked_at          = Column(DateTime, nullable=False, server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="identities")

    __table_args__ = (
        UniqueConstraint("provider", "provider_user_id",
                         name="uq_user_identities_provider"),
        Index("idx_user_identities_user_id", "user_id"),
        Index("idx_user_identities_provider", "provider", "provider_user_id"),
    )

    def __repr__(self):
        return f"<UserIdentity user_id={self.user_id} provider={self.provider}>"


class RefreshToken(Base):
    """
    Persistent login sessions. Raw tokens are never stored — only SHA-256 hashes.
    Supports per-device revocation without a full logout.
    """
    __tablename__ = "refresh_tokens"

    id          = Column(UUID, primary_key=True, default=new_uuid)
    user_id     = Column(UUID, ForeignKey("users.id", ondelete="CASCADE"),
                         nullable=False)
    token_hash  = Column(String(255), nullable=False, unique=True)
    expires_at  = Column(DateTime, nullable=False)
    revoked     = Column(Boolean, nullable=False, default=False)
    created_at  = Column(DateTime, nullable=False, server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="refresh_tokens")

    __table_args__ = (
        Index("idx_refresh_tokens_user_id", "user_id"),
        Index("idx_refresh_tokens_token_hash", "token_hash"),
    )

    def __repr__(self):
        return f"<RefreshToken user_id={self.user_id} revoked={self.revoked}>"


# ---------------------------------------------------------------------------
# Business Entities
# ---------------------------------------------------------------------------

class Client(Base):
    """
    A person or business that places orders.
    Soft-deleted via is_active.
    """
    __tablename__ = "clients"

    id         = Column(UUID, primary_key=True, default=new_uuid)
    name       = Column(String(255), nullable=False)
    address    = Column(String(255), nullable=True)
    phone      = Column(String(50), nullable=True)
    notes      = Column(Text, nullable=True)
    is_active  = Column(Boolean, nullable=False, default=True)
    created_by = Column(UUID, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    # Relationships
    created_by_user = relationship("User", back_populates="clients")
    orders          = relationship("Order", back_populates="client")
    invoices        = relationship("Invoice", back_populates="client")

    __table_args__ = (
        Index("idx_clients_name", "name"),
        Index("idx_clients_is_active", "is_active"),
    )

    def __repr__(self):
        return f"<Client id={self.id} name={self.name}>"


class Provider(Base):
    """
    A supplier that fulfils product purchases.
    Soft-deleted via is_active.
    """
    __tablename__ = "providers"

    id           = Column(UUID, primary_key=True, default=new_uuid)
    name         = Column(String(255), nullable=False)
    address      = Column(String(255), nullable=True)
    contact_name = Column(String(255), nullable=True)
    phone        = Column(String(50), nullable=True)
    notes        = Column(Text, nullable=True)
    is_active    = Column(Boolean, nullable=False, default=True)
    created_by   = Column(UUID, ForeignKey("users.id"), nullable=False)
    created_at   = Column(DateTime, nullable=False, server_default=func.now())

    # Relationships
    created_by_user     = relationship("User", back_populates="providers")
    products            = relationship("Product", back_populates="provider")
    purchase_orders     = relationship("PurchaseOrder", back_populates="provider")
    shopping_list_items = relationship("ShoppingListItem", back_populates="provider")

    __table_args__ = (
        Index("idx_providers_name", "name"),
        Index("idx_providers_is_active", "is_active"),
    )

    def __repr__(self):
        return f"<Provider id={self.id} name={self.name}>"


class Product(Base):
    """
    A purchasable item, linked to exactly one provider.
    price reflects the current catalogue price.
    order_items and purchase_order_items snapshot this price at creation time
    so historical records remain accurate after price changes.
    Soft-deleted via is_active.
    """
    __tablename__ = "products"

    id          = Column(UUID, primary_key=True, default=new_uuid)
    provider_id = Column(UUID, ForeignKey("providers.id"), nullable=False)
    name        = Column(String(255), nullable=False)
    unit        = Column(String(50), nullable=False)    # 'kg', 'unit', 'box', 'dozen'
    price       = Column(Numeric(10, 2), nullable=False)
    is_active   = Column(Boolean, nullable=False, default=True)
    created_by  = Column(UUID, ForeignKey("users.id"), nullable=False)
    created_at  = Column(DateTime, nullable=False, server_default=func.now())
    updated_at  = Column(DateTime, nullable=False, server_default=func.now(),
                         onupdate=func.now())

    # Relationships
    created_by_user     = relationship("User", back_populates="products")
    provider            = relationship("Provider", back_populates="products")
    order_items         = relationship("OrderItem", back_populates="product")
    shopping_list_items = relationship("ShoppingListItem", back_populates="product")
    purchase_order_items = relationship("PurchaseOrderItem", back_populates="product")

    __table_args__ = (
        Index("idx_products_provider_id", "provider_id"),
        Index("idx_products_name", "name"),
        Index("idx_products_is_active", "is_active"),
    )

    def __repr__(self):
        return f"<Product id={self.id} name={self.name} price={self.price}>"


# ---------------------------------------------------------------------------
# Orders
# ---------------------------------------------------------------------------

class Order(Base):
    """
    One order per client per intake event.

    source:
      'manual'    — entered via the browser item search
      'whatsapp'  — parsed from a pasted WhatsApp message

    status flow: draft → confirmed → delivered

    raw_whatsapp_text stores the original paste for audit purposes
    when source='whatsapp', so errors in LLM extraction can be reviewed.
    """
    __tablename__ = "orders"

    id                 = Column(UUID, primary_key=True, default=new_uuid)
    client_id          = Column(UUID, ForeignKey("clients.id"), nullable=False)
    created_by         = Column(UUID, ForeignKey("users.id"), nullable=False)
    order_date         = Column(Date, nullable=False, default=date.today)
    status             = Column(String(50), nullable=False, default="draft")
    source             = Column(String(50), nullable=False, default="manual")
    raw_whatsapp_text  = Column(Text, nullable=True)
    notes              = Column(Text, nullable=True)
    created_at         = Column(DateTime, nullable=False, server_default=func.now())
    updated_at         = Column(DateTime, nullable=False, server_default=func.now(),
                                onupdate=func.now())

    # Relationships
    client          = relationship("Client", back_populates="orders")
    created_by_user = relationship("User", back_populates="orders")
    items           = relationship("OrderItem", back_populates="order",
                                   cascade="all, delete-orphan")
    invoice         = relationship("Invoice", back_populates="order", uselist=False)

    __table_args__ = (
        Index("idx_orders_client_id", "client_id"),
        Index("idx_orders_order_date", "order_date"),
        Index("idx_orders_status", "status"),
        Index("idx_orders_created_by", "created_by"),
    )

    def __repr__(self):
        return f"<Order id={self.id} client_id={self.client_id} status={self.status}>"


class OrderItem(Base):
    """
    A single product line within an order.
    unit_price is snapshotted from products.price at creation time.
    A product can appear only once per order (enforced by unique constraint).
    """
    __tablename__ = "order_items"

    id         = Column(UUID, primary_key=True, default=new_uuid)
    order_id   = Column(UUID, ForeignKey("orders.id", ondelete="CASCADE"),
                        nullable=False)
    product_id = Column(UUID, ForeignKey("products.id"), nullable=False)
    quantity   = Column(Numeric(10, 3), nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)   # Snapshot at order time
    notes      = Column(Text, nullable=True)

    # Relationships
    order   = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")

    __table_args__ = (
        UniqueConstraint("order_id", "product_id", name="uq_order_items_order_product"),
        Index("idx_order_items_order_id", "order_id"),
        Index("idx_order_items_product_id", "product_id"),
    )

    def __repr__(self):
        return (f"<OrderItem order_id={self.order_id} "
                f"product_id={self.product_id} qty={self.quantity}>")


# ---------------------------------------------------------------------------
# Shopping Lists
# ---------------------------------------------------------------------------

class ShoppingList(Base):
    """
    One shopping list per working day. Aggregates all confirmed orders
    into a single procurement view grouped by provider.

    status flow: open → finalized
    finalized_at is set when status transitions to 'finalized'.
    """
    __tablename__ = "shopping_lists"

    id           = Column(UUID, primary_key=True, default=new_uuid)
    list_date    = Column(Date, nullable=False, unique=True)
    status       = Column(String(50), nullable=False, default="open")
    created_by   = Column(UUID, ForeignKey("users.id"), nullable=False)
    finalized_at = Column(DateTime, nullable=True)
    created_at   = Column(DateTime, nullable=False, server_default=func.now())

    # Relationships
    created_by_user = relationship("User", back_populates="shopping_lists")
    items           = relationship("ShoppingListItem", back_populates="shopping_list",
                                   cascade="all, delete-orphan")
    purchase_orders = relationship("PurchaseOrder", back_populates="shopping_list")

    __table_args__ = (
        Index("idx_shopping_lists_list_date", "list_date"),
        Index("idx_shopping_lists_status", "status"),
    )

    def __repr__(self):
        return f"<ShoppingList date={self.list_date} status={self.status}>"


class ShoppingListItem(Base):
    """
    Aggregated product quantity per provider within a shopping list.

    total_quantity   — system-calculated sum from confirmed order_items
    adjusted_quantity — operator override (e.g. round up to full box,
                        add buffer). NULL means use total_quantity.

    provider_id is denormalised here (also accessible via product.provider_id)
    for fast GROUP BY provider queries without an extra join.
    """
    __tablename__ = "shopping_list_items"

    id                 = Column(UUID, primary_key=True, default=new_uuid)
    shopping_list_id   = Column(UUID, ForeignKey("shopping_lists.id",
                                                  ondelete="CASCADE"), nullable=False)
    product_id         = Column(UUID, ForeignKey("products.id"), nullable=False)
    provider_id        = Column(UUID, ForeignKey("providers.id"), nullable=False)
    total_quantity     = Column(Numeric(10, 3), nullable=False)
    adjusted_quantity  = Column(Numeric(10, 3), nullable=True)
    notes              = Column(Text, nullable=True)

    # Relationships
    shopping_list = relationship("ShoppingList", back_populates="items")
    product       = relationship("Product", back_populates="shopping_list_items")
    provider      = relationship("Provider", back_populates="shopping_list_items")

    __table_args__ = (
        UniqueConstraint("shopping_list_id", "product_id",
                         name="uq_shopping_list_items_list_product"),
        Index("idx_shopping_list_items_list_id", "shopping_list_id"),
        Index("idx_shopping_list_items_provider_id", "provider_id"),
    )

    @property
    def final_quantity(self) -> Decimal:
        """Returns adjusted_quantity if set, otherwise total_quantity."""
        return self.adjusted_quantity if self.adjusted_quantity is not None \
            else self.total_quantity

    def __repr__(self):
        return (f"<ShoppingListItem list_id={self.shopping_list_id} "
                f"product_id={self.product_id} total={self.total_quantity}>")


# ---------------------------------------------------------------------------
# Purchase Orders
# ---------------------------------------------------------------------------

class PurchaseOrder(Base):
    """
    One purchase order per provider per shopping list.
    Generated when the shopping list is finalized.

    status flow: pending → sent → received
    pdf_path stores a file path (dev) or cloud URL (prod) to the generated PDF.

    Unique constraint ensures one PO per provider per day.
    """
    __tablename__ = "purchase_orders"

    id               = Column(UUID, primary_key=True, default=new_uuid)
    shopping_list_id = Column(UUID, ForeignKey("shopping_lists.id"), nullable=False)
    provider_id      = Column(UUID, ForeignKey("providers.id"), nullable=False)
    status           = Column(String(50), nullable=False, default="pending")
    pdf_path         = Column(Text, nullable=True)
    created_by       = Column(UUID, ForeignKey("users.id"), nullable=False)
    created_at       = Column(DateTime, nullable=False, server_default=func.now())

    # Relationships
    shopping_list   = relationship("ShoppingList", back_populates="purchase_orders")
    provider        = relationship("Provider", back_populates="purchase_orders")
    created_by_user = relationship("User", back_populates="purchase_orders")
    items           = relationship("PurchaseOrderItem", back_populates="purchase_order",
                                   cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("shopping_list_id", "provider_id",
                         name="uq_purchase_orders_list_provider"),
        Index("idx_purchase_orders_shopping_list_id", "shopping_list_id"),
        Index("idx_purchase_orders_provider_id", "provider_id"),
        Index("idx_purchase_orders_status", "status"),
    )

    def __repr__(self):
        return (f"<PurchaseOrder id={self.id} "
                f"provider_id={self.provider_id} status={self.status}>")


class PurchaseOrderItem(Base):
    """
    Line items on a purchase order.
    Quantities are copied from ShoppingListItem.final_quantity at finalization time.
    unit_price is snapshotted from products.price at that moment.
    """
    __tablename__ = "purchase_order_items"

    id                = Column(UUID, primary_key=True, default=new_uuid)
    purchase_order_id = Column(UUID, ForeignKey("purchase_orders.id",
                                                 ondelete="CASCADE"), nullable=False)
    product_id        = Column(UUID, ForeignKey("products.id"), nullable=False)
    quantity          = Column(Numeric(10, 3), nullable=False)
    unit_price        = Column(Numeric(10, 2), nullable=False)  # Snapshot at finalization

    # Relationships
    purchase_order = relationship("PurchaseOrder", back_populates="items")
    product        = relationship("Product", back_populates="purchase_order_items")

    __table_args__ = (
        UniqueConstraint("purchase_order_id", "product_id",
                         name="uq_po_items_order_product"),
        Index("idx_po_items_purchase_order_id", "purchase_order_id"),
    )

    def __repr__(self):
        return (f"<PurchaseOrderItem po_id={self.purchase_order_id} "
                f"product_id={self.product_id} qty={self.quantity}>")


# ---------------------------------------------------------------------------
# Invoices
# ---------------------------------------------------------------------------

class Invoice(Base):
    """
    One invoice per confirmed order.

    invoice_number is a human-readable sequential ID (e.g. 'INV-2024-0042')
    generated in the service layer — this is what appears on the PDF document.

    status flow: draft → sent → paid
    pdf_path stores a file path (dev) or cloud URL (prod) to the generated PDF.

    client_id is denormalised here for fast lookup without joining through orders.
    """
    __tablename__ = "invoices"

    id             = Column(UUID, primary_key=True, default=new_uuid)
    order_id       = Column(UUID, ForeignKey("orders.id"), nullable=False, unique=True)
    client_id      = Column(UUID, ForeignKey("clients.id"), nullable=False)
    invoice_number = Column(String(50), nullable=False, unique=True)
    total_amount   = Column(Numeric(10, 2), nullable=False)
    status         = Column(String(50), nullable=False, default="draft")
    pdf_path       = Column(Text, nullable=True)
    created_by     = Column(UUID, ForeignKey("users.id"), nullable=False)
    created_at     = Column(DateTime, nullable=False, server_default=func.now())

    # Relationships
    order           = relationship("Order", back_populates="invoice")
    client          = relationship("Client", back_populates="invoices")
    created_by_user = relationship("User", back_populates="invoices")

    __table_args__ = (
        Index("idx_invoices_order_id", "order_id"),
        Index("idx_invoices_client_id", "client_id"),
        Index("idx_invoices_invoice_number", "invoice_number"),
        Index("idx_invoices_status", "status"),
    )

    def __repr__(self):
        return (f"<Invoice id={self.id} number={self.invoice_number} "
                f"status={self.status} total={self.total_amount}>")
