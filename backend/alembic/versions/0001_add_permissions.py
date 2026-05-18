"""add permissions tables and permissions_version column

Revision ID: 0001
Revises:
Create Date: 2026-05-18

What this migration does
------------------------
1. Adds `permissions_version INTEGER DEFAULT 0` to the `users` table.
   This counter is embedded in JWTs so the auth layer can detect stale
   permission caches without a full DB join on every request.

2. Creates `permissions`, `role_permissions`, and `user_permissions` tables
   (skipped if they were already created by SQLAlchemy's create_all).

3. Seeds the default permission catalogue and role-permission mappings
   (idempotent — uses INSERT OR IGNORE / ON CONFLICT DO NOTHING).
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.engine.reflection import Inspector

# revision identifiers
revision = "0001"
down_revision = "db6026dae743"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    dialect = conn.dialect.name

    # ------------------------------------------------------------------
    # 1. Add permissions_version to users (if not already present)
    # ------------------------------------------------------------------
    existing_user_cols = {c["name"] for c in inspector.get_columns("users")}
    if "permissions_version" not in existing_user_cols:
        with op.batch_alter_table("users", recreate="auto") as batch_op:
            batch_op.add_column(
                sa.Column(
                    "permissions_version",
                    sa.Integer(),
                    nullable=False,
                    server_default="0",
                )
            )

    # ------------------------------------------------------------------
    # 2. Create new tables (skipped if create_all already made them)
    # ------------------------------------------------------------------
    existing_tables = set(inspector.get_table_names())

    if "permissions" not in existing_tables:
        op.create_table(
            "permissions",
            sa.Column("name", sa.String(100), primary_key=True),
            sa.Column("description", sa.Text(), nullable=True),
        )

    if "role_permissions" not in existing_tables:
        op.create_table(
            "role_permissions",
            sa.Column("role_name", sa.String(50), nullable=False),
            sa.Column(
                "permission_name",
                sa.String(100),
                sa.ForeignKey("permissions.name", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.PrimaryKeyConstraint("role_name", "permission_name"),
        )
        op.create_index("idx_role_permissions_role", "role_permissions", ["role_name"])

    if "user_permissions" not in existing_tables:
        op.create_table(
            "user_permissions",
            sa.Column("user_id", sa.CHAR(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column(
                "permission_name",
                sa.String(100),
                sa.ForeignKey("permissions.name", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("granted", sa.Boolean(), nullable=False),
            sa.PrimaryKeyConstraint("user_id", "permission_name"),
        )
        op.create_index("idx_user_permissions_user_id", "user_permissions", ["user_id"])

    # ------------------------------------------------------------------
    # 3. Seed permission catalogue and role mappings (idempotent)
    # ------------------------------------------------------------------
    from app.permissions import ALL_PERMISSIONS, ROLE_PERMISSIONS

    if dialect == "sqlite":
        perm_sql       = "INSERT OR IGNORE INTO permissions (name, description) VALUES (:name, :desc)"
        role_perm_sql  = "INSERT OR IGNORE INTO role_permissions (role_name, permission_name) VALUES (:role, :perm)"
    else:
        perm_sql       = "INSERT INTO permissions (name, description) VALUES (:name, :desc) ON CONFLICT (name) DO NOTHING"
        role_perm_sql  = "INSERT INTO role_permissions (role_name, permission_name) VALUES (:role, :perm) ON CONFLICT DO NOTHING"

    for name, desc in ALL_PERMISSIONS.items():
        conn.execute(sa.text(perm_sql), {"name": name, "desc": desc})

    for role, perms in ROLE_PERMISSIONS.items():
        for perm in perms:
            conn.execute(sa.text(role_perm_sql), {"role": role, "perm": perm})


def downgrade() -> None:
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)

    for tbl in ("user_permissions", "role_permissions", "permissions"):
        if tbl in inspector.get_table_names():
            op.drop_table(tbl)

    existing_user_cols = {c["name"] for c in inspector.get_columns("users")}
    if "permissions_version" in existing_user_cols:
        with op.batch_alter_table("users", recreate="auto") as batch_op:
            batch_op.drop_column("permissions_version")
