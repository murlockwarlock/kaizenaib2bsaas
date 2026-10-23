import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from core.database import Base, engine, run_migrations

import models.admin
import models.billing
import models.notification
import models.oauth_account
import models.task
import models.user


def main():
    Base.metadata.create_all(bind=engine)
    run_migrations()


if __name__ == '__main__':
    main()
