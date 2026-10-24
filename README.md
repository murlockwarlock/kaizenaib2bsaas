# KaizenAI

AI SaaS web application for image, video, and audio tools.

## Stack

Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS.

Backend: FastAPI, SQLAlchemy, Alembic. SQLite is for local development; production uses PostgreSQL.

Production: Nginx, PostgreSQL, Redis, Celery worker/beat, systemd, Node.js 22, Python 3.12.

## Structure

`frontend` contains the web application.

`backend` contains the API, authentication, database models, public content, billing, and provider integrations.

`deploy` contains the production deploy script and service configuration.

## Local setup

Use Node.js 22 or newer and Python 3.12 or newer.

```bash
cd frontend
cp .env.example .env.local
npm ci
npm run dev
```

To run the backend separately, create an environment file from `backend/.env.example`, install `backend/requirements.txt`, and start Uvicorn from `backend`.

## Production deployment

Copy `deploy/.env.example` to `deploy/.env` and set the SSH connection values.

The deploy script packages the exact Git commit, installs dependencies, runs migrations, builds on the server, switches the release, configures Nginx, and checks the services.

```bash
cp deploy/.env.example deploy/.env
./deploy/deploy.sh
```

The initial production configuration keeps AI generation and billing disabled until provider access and payment settings are configured. The public site and administrator login do not require SMTP.

The production release starts four application services: backend API, Celery worker, Celery beat, and frontend. Redis is the Celery broker/result backend and is also used by authentication. RabbitMQ is not required.

`DATABASE_URL` must be a PostgreSQL DSN and `AUTO_CREATE_SCHEMA=false`. The deployment runs `backend/scripts/migrate.py` before switching the release; that command bootstraps compatibility tables and then runs Alembic to the current revision. An existing SQLite database must be migrated separately before production deployment; the deploy script refuses to start with SQLite so user balances cannot be silently split between databases.

For an existing SQLite installation, first create the empty PostgreSQL schema with the target `DATABASE_URL`, then copy data with an explicit empty-target confirmation:

```bash
cd backend
DATABASE_URL='postgresql+psycopg2://user:password@host/kaizenai' AUTO_CREATE_SCHEMA=false python scripts/migrate.py
python scripts/migrate_sqlite_to_postgres.py \
  --source 'sqlite:////opt/kaizenai/shared/mvp.db' \
  --target 'postgresql+psycopg2://user:password@host/kaizenai' \
  --confirm-empty-target
```

For a local backend-only smoke test, SQLite and automatic schema creation remain supported:

```bash
cd backend
python scripts/migrate.py
celery -A core.celery_app.celery_app worker --loglevel=INFO --queues=ai_editor
celery -A core.celery_app.celery_app beat --loglevel=INFO
```

Do not run multiple Celery beat processes for the same environment. Multiple workers are supported; `CELERY_WORKER_CONCURRENCY` controls concurrency, and provider failures are reconciled without charging or refunding the same task twice.

## Verification

The backend tests cover client/admin authorization, public catalog responses, generation success/failure callbacks, provider uncertainty, idempotent refunds, duplicate client requests, concurrent balance reservation, billing state transitions, file validation, and migration behavior. Locally they use SQLite; CI runs the same suite against PostgreSQL 16 with Redis 7.

Frontend CI runs TypeScript typechecking and a production Next.js build. The browser smoke pass should use a disposable backend with provider and billing flags disabled: public RU/EN pages must load, an authenticated client must see its balance and history, a disabled generation must show the provider-access error without charging, and an admin must see the dashboard even when KIE quota and checkout are unavailable.

For a local PostgreSQL/Redis test environment, run `docker compose -f docker-compose.test.yml up -d`, apply migrations with `DATABASE_URL=postgresql+psycopg2://kaizenai:kaizenai@127.0.0.1:5432/kaizenai_test AUTO_CREATE_SCHEMA=false python backend/scripts/migrate.py`, then run the backend suite with `TEST_DATABASE_URL` pointing to the same database. RabbitMQ is not part of the architecture: Redis is already used by authentication, Celery broker/result backend, and reconciliation scheduling.
