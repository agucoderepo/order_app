"""add_finalize_count_to_shopping_lists

Revision ID: d4e7f2a1b8c3
Revises: c5d2e8f3b9a1
Create Date: 2026-05-07 00:00:00.000000

Tracks how many times a shopping list has been finalized so invoices
generated on re-finalization can carry a -UPDn suffix.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd4e7f2a1b8c3'
down_revision: Union[str, None] = 'c5d2e8f3b9a1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'shopping_lists',
        sa.Column('finalize_count', sa.Integer(), nullable=False, server_default='0'),
    )


def downgrade() -> None:
    op.drop_column('shopping_lists', 'finalize_count')
