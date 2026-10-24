import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from alembic import command
from alembic.config import Config

from core.config import settings
from core.database import Base, engine, run_migrations

import models.admin
import models.billing
import models.notification
import models.oauth_account
import models.task
import models.user


def main():
    if settings.DATABASE_URL.startswith("sqlite") and not settings.AUTO_CREATE_SCHEMA:
        raise RuntimeError(
            "Production migrations require PostgreSQL. Set DATABASE_URL to a PostgreSQL DSN "
            "or explicitly enable AUTO_CREATE_SCHEMA for a local SQLite environment."
        )

    # Keep create_all as a compatibility bootstrap for databases created by
    # the old deployment. Alembic records and applies incremental changes.
    Base.metadata.create_all(bind=engine)
    alembic_config = Config(str(BACKEND_DIR / "alembic.ini"))
    alembic_config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)
    command.upgrade(alembic_config, "head")

    # Old SQLite installations may contain columns from the former bootstrap
    # script. Never execute that SQLite-specific compatibility SQL on Postgres.
    if settings.DATABASE_URL.startswith("sqlite"):
        run_migrations()


if __name__ == '__main__':
    main()
