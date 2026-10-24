"""add generation integrity constraints

Revision ID: b7c8d9e0f1a2
Revises: a1b2c3d4e5f6
Create Date: 2026-10-24 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op, context
import sqlalchemy as sa


revision: str = "b7c8d9e0f1a2"
down_revision: Union[str, Sequence[str], None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _index_names() -> set[str]:
    if context.is_offline_mode():
        return set()
    return {index["name"] for index in sa.inspect(op.get_bind()).get_indexes("tasks")}


def upgrade() -> None:
    bind = op.get_bind()
    duplicates = []
    if not context.is_offline_mode():
        duplicates = bind.execute(
            sa.text(
                """
                SELECT task_id_vendor, COUNT(*) AS duplicate_count
                FROM tasks
                WHERE task_id_vendor IS NOT NULL AND task_id_vendor <> ''
                GROUP BY task_id_vendor
                HAVING COUNT(*) > 1
                LIMIT 10
                """
            )
        ).all()
    if duplicates:
        duplicate_ids = ", ".join(str(row[0]) for row in duplicates)
        raise RuntimeError(
            "Cannot add unique provider-task index; duplicate task_id_vendor values exist: "
            f"{duplicate_ids}"
        )

    if "uq_tasks_task_id_vendor" not in _index_names():
        dialect = bind.dialect.name
        kwargs = {"if_not_exists": True}
        if dialect == "postgresql":
            kwargs["postgresql_where"] = sa.text("task_id_vendor IS NOT NULL AND task_id_vendor <> ''")
        elif dialect == "sqlite":
            kwargs["sqlite_where"] = sa.text("task_id_vendor IS NOT NULL AND task_id_vendor <> ''")
        op.create_index(
            "uq_tasks_task_id_vendor",
            "tasks",
            ["task_id_vendor"],
            unique=True,
            **kwargs,
        )


def downgrade() -> None:
    if "uq_tasks_task_id_vendor" in _index_names():
        op.drop_index("uq_tasks_task_id_vendor", table_name="tasks")
