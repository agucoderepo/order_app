"""add_address_to_clients_providers

Revision ID: 2c8f1a3d7e90
Revises: f1edba3d559c
Create Date: 2026-05-06 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2c8f1a3d7e90'
down_revision: Union[str, None] = 'f1edba3d559c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('clients', sa.Column('address', sa.String(length=255), nullable=True))
    op.add_column('providers', sa.Column('address', sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column('providers', 'address')
    op.drop_column('clients', 'address')
