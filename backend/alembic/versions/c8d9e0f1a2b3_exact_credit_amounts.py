"""use exact numeric types for balances and prices

Revision ID: c8d9e0f1a2b3
Revises: b7c8d9e0f1a2
Create Date: 2026-10-24 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c8d9e0f1a2b3"
down_revision: Union[str, Sequence[str], None] = "b7c8d9e0f1a2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _alter(table: str, column: str, precision: int, scale: int) -> None:
    numeric_type = sa.Numeric(precision, scale)
    kwargs = {"existing_type": sa.Float(), "type_": numeric_type}
    if op.get_bind().dialect.name == "postgresql":
        kwargs["postgresql_using"] = f"{column}::numeric({precision},{scale})"
    with op.batch_alter_table(table, schema=None) as batch_op:
        batch_op.alter_column(column, **kwargs)


def upgrade() -> None:
    _alter("users", "balance", 12, 4)
    _alter("tasks", "cost", 12, 4)
    _alter("model_pricing", "cost", 12, 4)
    _alter("pricing_plans", "price", 12, 2)
    _alter("promo_codes", "discount_percent", 7, 4)
    _alter("payment_records", "original_amount", 12, 2)
    _alter("payment_records", "amount", 12, 2)
    _alter("payment_records", "discount_amount", 12, 2)
    _alter("payment_records", "discount_percent", 7, 4)
    _alter("payment_records", "credits_rate_per_100_snapshot", 12, 4)
    _alter("subscriptions", "amount", 12, 2)


def downgrade() -> None:
    for table, column in (
        ("users", "balance"),
        ("tasks", "cost"),
        ("model_pricing", "cost"),
        ("pricing_plans", "price"),
        ("promo_codes", "discount_percent"),
        ("payment_records", "original_amount"),
        ("payment_records", "amount"),
        ("payment_records", "discount_amount"),
        ("payment_records", "discount_percent"),
        ("payment_records", "credits_rate_per_100_snapshot"),
        ("subscriptions", "amount"),
    ):
        with op.batch_alter_table(table, schema=None) as batch_op:
            batch_op.alter_column(column, existing_type=sa.Numeric(), type_=sa.Float())
