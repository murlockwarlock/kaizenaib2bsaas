"""consolidate_full_schema

Revision ID: a1b2c3d4e5f6
Revises: 0d14d3438b22
Create Date: 2026-03-10 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '0d14d3438b22'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_column(table_name: str, column_name: str) -> bool:
    # Offline Alembic runs use a mock connection with no inspection API. The
    # generated SQL is intended for a known target revision, so emit the
    # additive column operation in that mode.
    from alembic import context

    if context.is_offline_mode():
        return False
    inspector = sa.inspect(op.get_bind())
    return column_name in {column["name"] for column in inspector.get_columns(table_name)}


def upgrade() -> None:
    """Consolidate full schema: ensure all tables exist and add password_version."""

    # -- Tables that run_migrations() creates via raw SQL --
    # These use IF NOT EXISTS / batch_alter_table so they are safe to re-run.

    op.create_table(
        'featured_audio',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('source_task_id', sa.Integer(), nullable=True),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('subtitle', sa.String(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('prompt', sa.Text(), nullable=True),
        sa.Column('audio_url', sa.String(), nullable=False),
        sa.Column('cover_image_url', sa.String(), nullable=True),
        sa.Column('model', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='1'),
        sa.Column('sort_order', sa.Integer(), server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        if_not_exists=True,
    )

    op.create_table(
        'pricing_plans',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name_ru', sa.String(), nullable=False),
        sa.Column('name_en', sa.String(), nullable=False),
        sa.Column('description_ru', sa.Text(), nullable=True),
        sa.Column('description_en', sa.Text(), nullable=True),
        sa.Column('badge_ru', sa.String(), nullable=True),
        sa.Column('badge_en', sa.String(), nullable=True),
        sa.Column('billing_period_ru', sa.String(), nullable=True),
        sa.Column('billing_period_en', sa.String(), nullable=True),
        sa.Column('cta_label_ru', sa.String(), nullable=True),
        sa.Column('cta_label_en', sa.String(), nullable=True),
        sa.Column('cta_url', sa.String(), nullable=True),
        sa.Column('features_ru', sa.Text(), nullable=True),
        sa.Column('features_en', sa.Text(), nullable=True),
        sa.Column('currency_symbol', sa.String(), nullable=False, server_default='$'),
        sa.Column('price', sa.Float(), nullable=False, server_default='0'),
        sa.Column('credits', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_recurring', sa.Boolean(), server_default='0'),
        sa.Column('recurring_days', sa.Integer(), server_default='30'),
        sa.Column('is_featured', sa.Boolean(), server_default='0'),
        sa.Column('is_active', sa.Boolean(), server_default='1'),
        sa.Column('sort_order', sa.Integer(), server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        if_not_exists=True,
    )

    op.create_table(
        'admin_logs',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('level', sa.String(), nullable=False),
        sa.Column('scope', sa.String(), nullable=False),
        sa.Column('event', sa.String(), nullable=True),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('details', sa.Text(), nullable=True),
        sa.Column('path', sa.String(), nullable=True),
        sa.Column('method', sa.String(), nullable=True),
        sa.Column('task_id', sa.Integer(), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        if_not_exists=True,
    )

    op.create_table(
        'promo_codes',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('code', sa.String(), nullable=False, unique=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('discount_percent', sa.Float(), server_default='0'),
        sa.Column('max_total_uses', sa.Integer(), nullable=True),
        sa.Column('max_uses_per_user', sa.Integer(), server_default='1'),
        sa.Column('is_active', sa.Boolean(), server_default='1'),
        sa.Column('valid_from', sa.DateTime(timezone=True), nullable=True),
        sa.Column('valid_until', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        if_not_exists=True,
    )

    op.create_table(
        'payment_records',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('public_id', sa.String(), nullable=False, unique=True),
        sa.Column('provider', sa.String(), server_default='yookassa'),
        sa.Column('product_type', sa.String(), server_default='plan'),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('pricing_plan_id', sa.Integer(), sa.ForeignKey('pricing_plans.id'), nullable=False),
        sa.Column('promo_code_id', sa.Integer(), sa.ForeignKey('promo_codes.id'), nullable=True),
        sa.Column('promo_code_snapshot', sa.String(), nullable=True),
        sa.Column('provider_payment_id', sa.String(), unique=True, nullable=True),
        sa.Column('provider_status', sa.String(), nullable=True),
        sa.Column('status', sa.String(), server_default='pending'),
        sa.Column('original_amount', sa.Float(), server_default='0'),
        sa.Column('amount', sa.Float(), server_default='0'),
        sa.Column('discount_amount', sa.Float(), server_default='0'),
        sa.Column('discount_percent', sa.Float(), server_default='0'),
        sa.Column('credits_rate_per_100_snapshot', sa.Float(), server_default='0'),
        sa.Column('currency', sa.String(), server_default='RUB'),
        sa.Column('credits', sa.Integer(), server_default='0'),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('confirmation_url', sa.Text(), nullable=True),
        sa.Column('return_url', sa.Text(), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('paid_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('canceled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('credits_granted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('save_payment_method', sa.Boolean(), server_default='0'),
        sa.Column('recurring_opt_in', sa.Boolean(), server_default='0'),
        sa.Column('payment_method_id', sa.String(), nullable=True),
        sa.Column('payment_method_type', sa.String(), nullable=True),
        sa.Column('provider_payload_json', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        if_not_exists=True,
    )

    op.create_table(
        'subscriptions',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('public_id', sa.String(), nullable=False, unique=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('pricing_plan_id', sa.Integer(), sa.ForeignKey('pricing_plans.id'), nullable=False),
        sa.Column('status', sa.String(), server_default='active'),
        sa.Column('amount', sa.Float(), server_default='0'),
        sa.Column('currency', sa.String(), server_default='RUB'),
        sa.Column('credits', sa.Integer(), server_default='0'),
        sa.Column('interval_days', sa.Integer(), server_default='30'),
        sa.Column('payment_method_id', sa.String(), nullable=False),
        sa.Column('payment_method_type', sa.String(), nullable=True),
        sa.Column('cancel_at_period_end', sa.Boolean(), server_default='0'),
        sa.Column('next_charge_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('last_payment_id', sa.Integer(), sa.ForeignKey('payment_records.id'), nullable=True),
        sa.Column('last_error', sa.Text(), nullable=True),
        sa.Column('canceled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        if_not_exists=True,
    )

    # -- Add password_version to users --
    if not _has_column("users", "password_version"):
        with op.batch_alter_table('users', schema=None) as batch_op:
            batch_op.add_column(
                sa.Column('password_version', sa.Integer(), nullable=False, server_default='0')
            )

    # -- Indexes to match ORM models --
    op.create_index('ix_admin_logs_created_at', 'admin_logs', ['created_at'], if_not_exists=True)
    op.create_index('ix_admin_logs_scope', 'admin_logs', ['scope'], if_not_exists=True)
    op.create_index('ix_admin_logs_level', 'admin_logs', ['level'], if_not_exists=True)
    op.create_index('ix_admin_logs_task_id', 'admin_logs', ['task_id'], if_not_exists=True)
    op.create_index('ix_admin_logs_user_id', 'admin_logs', ['user_id'], if_not_exists=True)
    op.create_index('ix_admin_logs_event', 'admin_logs', ['event'], if_not_exists=True)
    op.create_index('ix_featured_audio_source_task_id', 'featured_audio', ['source_task_id'], if_not_exists=True)
    op.create_index('ix_featured_audio_title', 'featured_audio', ['title'], if_not_exists=True)
    op.create_index('ix_featured_audio_model', 'featured_audio', ['model'], if_not_exists=True)
    op.create_index('ix_payment_records_public_id', 'payment_records', ['public_id'], if_not_exists=True)
    op.create_index('ix_payment_records_user_id', 'payment_records', ['user_id'], if_not_exists=True)
    op.create_index('ix_payment_records_pricing_plan_id', 'payment_records', ['pricing_plan_id'], if_not_exists=True)
    op.create_index('ix_payment_records_promo_code_id', 'payment_records', ['promo_code_id'], if_not_exists=True)
    op.create_index('ix_payment_records_provider_payment_id', 'payment_records', ['provider_payment_id'], if_not_exists=True)
    op.create_index('ix_payment_records_status', 'payment_records', ['status'], if_not_exists=True)
    op.create_index('ix_subscriptions_public_id', 'subscriptions', ['public_id'], if_not_exists=True)
    op.create_index('ix_subscriptions_user_id', 'subscriptions', ['user_id'], if_not_exists=True)
    op.create_index('ix_subscriptions_pricing_plan_id', 'subscriptions', ['pricing_plan_id'], if_not_exists=True)
    op.create_index('ix_subscriptions_status', 'subscriptions', ['status'], if_not_exists=True)


def downgrade() -> None:
    """Remove consolidated tables and password_version column."""
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('password_version')

    op.drop_table('subscriptions')
    op.drop_table('payment_records')
    op.drop_table('promo_codes')
    op.drop_table('admin_logs')
    op.drop_table('pricing_plans')
    op.drop_table('featured_audio')
