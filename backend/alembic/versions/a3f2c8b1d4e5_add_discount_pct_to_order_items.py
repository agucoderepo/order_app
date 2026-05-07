"""add_discount_pct_to_order_items

Revision ID: a3f2c8b1d4e5
Revises: 2c8f1a3d7e90
Create Date: 2026-05-06 00:00:00.000000

discount is stored as a percentage (0–100).
Line total = unit_price × quantity × (1 − discount / 100)
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a3f2c8b1d4e5'
down_revision: Union[str, None] = '2c8f1a3d7e90'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'order_items',
        sa.Column('discount', sa.Numeric(5, 2), nullable=False, server_default='0.00'),
    )


def downgrade() -> None:
    op.drop_column('order_items', 'discount')
