#!/usr/bin/env bash
set -Eeuo pipefail

if [[ $# -ne 3 ]]; then
    printf 'Usage: %s SQLITE_DB RELEASE_DIR APP_DIR\n' "$0" >&2
    exit 2
fi

SQLITE_DB=$1
RELEASE_DIR=$2
APP_DIR=$3
SHARED_DIR="$APP_DIR/shared"
ENV_FILE="$SHARED_DIR/backend.env"
BACKUP_DIR="$APP_DIR/backups/database"

if [[ "$SQLITE_DB" != "$SHARED_DIR/mvp.db" ]]; then
    printf 'Unexpected SQLite path\n' >&2
    exit 2
fi
if [[ "$RELEASE_DIR" != "$APP_DIR/releases/"* || ! -d "$RELEASE_DIR/backend" ]]; then
    printf 'Unexpected release directory\n' >&2
    exit 2
fi
if [[ ! -f "$SQLITE_DB" || ! -f "$ENV_FILE" ]]; then
    printf 'SQLite database or backend environment is missing\n' >&2
    exit 1
fi

sudo -n true
install -d -o ubuntu -g ubuntu -m 0755 "$BACKUP_DIR"
BACKUP_PATH="$BACKUP_DIR/mvp.sqlite.$(date -u +%Y%m%dT%H%M%SZ).db"
cp --reflink=auto -p "$SQLITE_DB" "$BACKUP_PATH"

DATABASE_USER=kaizenai
DATABASE_NAME=kaizenai
DATABASE_PASSWORD=$(openssl rand -hex 32)

if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DATABASE_USER'" | grep -Fxq 1; then
    sudo -u postgres psql -v ON_ERROR_STOP=1 \
        -c "CREATE ROLE $DATABASE_USER LOGIN PASSWORD '$DATABASE_PASSWORD'"
else
    sudo -u postgres psql -v ON_ERROR_STOP=1 \
        -c "ALTER ROLE $DATABASE_USER WITH LOGIN PASSWORD '$DATABASE_PASSWORD'"
fi

if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DATABASE_NAME'" | grep -Fxq 1; then
    sudo -u postgres createdb -O "$DATABASE_USER" "$DATABASE_NAME"
fi

TARGET_DATABASE_URL="postgresql+psycopg2://$DATABASE_USER:$DATABASE_PASSWORD@127.0.0.1:5432/$DATABASE_NAME"
PYTHON_BIN="$RELEASE_DIR/backend/.venv/bin/python"
if [[ ! -x "$PYTHON_BIN" ]]; then
    PYTHON_BIN="$APP_DIR/current/backend/.venv/bin/python"
fi
if [[ ! -x "$PYTHON_BIN" ]]; then
    printf 'Python virtualenv is missing; deploy dependencies before migration\n' >&2
    exit 1
fi

export DATABASE_URL="$TARGET_DATABASE_URL"
export AUTO_CREATE_SCHEMA=false
"$PYTHON_BIN" "$RELEASE_DIR/backend/scripts/migrate.py"
"$PYTHON_BIN" "$RELEASE_DIR/backend/scripts/migrate_sqlite_to_postgres.py" \
    --source "sqlite:////opt/kaizenai/shared/mvp.db" \
    --target "$TARGET_DATABASE_URL" \
    --confirm-empty-target

ENV_FILE_PATH="$ENV_FILE" TARGET_DATABASE_URL="$TARGET_DATABASE_URL" python3 - <<'PY'
from pathlib import Path
import os

env_path = Path(os.environ["ENV_FILE_PATH"])
updates = {
    "DATABASE_URL": os.environ["TARGET_DATABASE_URL"],
    "AUTO_CREATE_SCHEMA": "false",
}
lines = env_path.read_text(encoding="utf-8").splitlines()
result = []
seen = set()
for line in lines:
    key, separator, _ = line.partition("=")
    if separator and key in updates:
        if key not in seen:
            result.append(f"{key}={updates[key]}")
            seen.add(key)
    else:
        result.append(line)
for key, value in updates.items():
    if key not in seen:
        result.append(f"{key}={value}")
temporary = env_path.with_name(env_path.name + ".tmp")
temporary.write_text("\n".join(result) + "\n", encoding="utf-8")
temporary.chmod(0o600)
temporary.replace(env_path)
PY

chown ubuntu:ubuntu "$ENV_FILE" "$BACKUP_PATH"
chmod 0600 "$ENV_FILE" "$BACKUP_PATH"
printf 'postgres_database=%s\n' "$DATABASE_NAME"
printf 'sqlite_backup=%s\n' "$BACKUP_PATH"
