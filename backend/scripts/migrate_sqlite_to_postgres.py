"""Copy an existing SQLite installation into an already-migrated database.

This is intentionally an explicit, empty-target migration tool. It does not
drop tables, overwrite rows, or guess how to merge two installations.
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

from sqlalchemy import MetaData, create_engine, func, select, text


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True, help="SQLite SQLAlchemy URL")
    parser.add_argument("--target", required=True, help="PostgreSQL SQLAlchemy URL")
    parser.add_argument(
        "--confirm-empty-target",
        action="store_true",
        required=True,
        help="Required safety acknowledgement; target tables must be empty",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if not args.source.startswith("sqlite"):
        raise SystemExit("--source must be a SQLite URL")
    if not args.target.startswith("postgresql"):
        raise SystemExit("--target must be a PostgreSQL URL")

    backend_dir = Path(__file__).resolve().parents[1]
    sys.path.insert(0, str(backend_dir))
    # Models import the application Base; point it at the destination before
    # importing them so no accidental source engine is created.
    os.environ["DATABASE_URL"] = args.target
    os.environ["AUTO_CREATE_SCHEMA"] = "false"

    from core.database import Base

    import models.admin  # noqa: F401
    import models.billing  # noqa: F401
    import models.notification  # noqa: F401
    import models.oauth_account  # noqa: F401
    import models.task  # noqa: F401
    import models.user  # noqa: F401

    source_engine = create_engine(args.source)
    target_engine = create_engine(args.target)
    source_metadata = MetaData()
    source_metadata.reflect(bind=source_engine)

    with target_engine.connect() as connection:
        missing_tables = [
            table.name
            for table in Base.metadata.sorted_tables
            if table.name not in source_metadata.tables
        ]
        if missing_tables:
            # Missing source tables are allowed because old installations did
            # not have every optional feature. The target schema itself must
            # already be created by scripts/migrate.py.
            print(f"Skipping tables absent from source: {', '.join(missing_tables)}")

        non_empty = []
        for table in Base.metadata.sorted_tables:
            count = connection.execute(select(func.count()).select_from(table)).scalar_one()
            if count:
                non_empty.append(f"{table.name}={count}")
        if non_empty:
            raise SystemExit(
                "Target database is not empty; refusing to merge data: "
                + ", ".join(non_empty[:20])
            )

    copied = 0
    with source_engine.connect() as source_connection, target_engine.begin() as target_connection:
        for target_table in Base.metadata.sorted_tables:
            source_table = source_metadata.tables.get(target_table.name)
            if source_table is None:
                continue

            columns = [
                column.name
                for column in target_table.columns
                if column.name in source_table.c
            ]
            if not columns:
                continue

            rows = source_connection.execute(
                select(*(source_table.c[column] for column in columns))
            ).mappings()
            batch = [dict(row) for row in rows]
            if batch:
                target_connection.execute(target_table.insert(), batch)
                copied += len(batch)

            if "id" in target_table.c:
                safe_table_name = target_table.name.replace('"', '""')
                target_connection.execute(
                    text(
                        f"""
                        SELECT CASE
                            WHEN pg_get_serial_sequence(:table_name, 'id') IS NOT NULL
                            THEN setval(
                                pg_get_serial_sequence(:table_name, 'id'),
                                COALESCE((SELECT MAX(id) FROM \"{safe_table_name}\"), 1),
                                (SELECT MAX(id) IS NOT NULL FROM \"{safe_table_name}\")
                            )
                            ELSE NULL
                        END
                        """
                    ),
                    {"table_name": target_table.name},
                )

    print(f"Copied {copied} rows into PostgreSQL")


if __name__ == "__main__":
    main()
