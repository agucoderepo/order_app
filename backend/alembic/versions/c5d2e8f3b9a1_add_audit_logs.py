"""add_audit_logs

Revision ID: c5d2e8f3b9a1
Revises: a3f2c8b1d4e5
Create Date: 2026-05-07 00:00:00.000000

Append-only audit log table that records who did what and when.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c5d2e8f3b9a1'
down_revision: Union[str, None] = 'a3f2c8b1d4e5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'audit_logs',
        sa.Column('id',          sa.CHAR(36),     nullable=False),
        sa.Column('user_id',     sa.CHAR(36),     nullable=False),
        sa.Column('user_email',  sa.String(255),  nullable=False),
        sa.Column('action',      sa.String(100),  nullable=False),
        sa.Column('entity_type', sa.String(50),   nullable=True),
        sa.Column('entity_id',   sa.String(36),   nullable=True),
        sa.Column('detail',      sa.Text(),        nullable=True),
        sa.Column('created_at',  sa.DateTime(),   nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_audit_logs_user_id',     'audit_logs', ['user_id'])
    op.create_index('idx_audit_logs_action',      'audit_logs', ['action'])
    op.create_index('idx_audit_logs_entity_type', 'audit_logs', ['entity_type'])
    op.create_index('idx_audit_logs_created_at',  'audit_logs', ['created_at'])


def downgrade() -> None:
    op.drop_index('idx_audit_logs_created_at',  'audit_logs')
    op.drop_index('idx_audit_logs_entity_type', 'audit_logs')
    op.drop_index('idx_audit_logs_action',      'audit_logs')
    op.drop_index('idx_audit_logs_user_id',     'audit_logs')
    op.drop_table('audit_logs')
