"""add per-user generation request idempotency

Revision ID: d9e0f1a2b3c4
Revises: c8d9e0f1a2b3
Create Date: 2026-10-24 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op, context
import sqlalchemy as sa


revision: str = "d9e0f1a2b3c4"
down_revision: Union[str, Sequence[str], None] = "c8d9e0f1a2b3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_column(table_name: str, column_name: str) -> bool:
    if context.is_offline_mode():
        return False
    inspector = sa.inspect(op.get_bind())
    return column_name in {column["name"] for column in inspector.get_columns(table_name)}


def upgrade() -> None:
    if not _has_column("tasks", "client_request_id"):
        with op.batch_alter_table("tasks", schema=None) as batch_op:
            batch_op.add_column(sa.Column("client_request_id", sa.String(length=128), nullable=True))

    kwargs = {"if_not_exists": True}
    predicate = sa.text("client_request_id IS NOT NULL AND client_request_id <> ''")
    if context.get_context().dialect.name == "postgresql":
        kwargs["postgresql_where"] = predicate
    elif context.get_context().dialect.name == "sqlite":
        kwargs["sqlite_where"] = predicate
    op.create_index(
        "uq_tasks_user_client_request_id",
        "tasks",
        ["user_id", "client_request_id"],
        unique=True,
        **kwargs,
    )


def downgrade() -> None:
    op.drop_index("uq_tasks_user_client_request_id", table_name="tasks")
    with op.batch_alter_table("tasks", schema=None) as batch_op:
        batch_op.drop_column("client_request_id")
