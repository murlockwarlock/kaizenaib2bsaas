# KaizenAI

AI SaaS web application for image, video, and audio tools.

## Stack

Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS.

Backend: FastAPI, SQLAlchemy, Alembic, SQLite.

Production: Nginx, systemd, Node.js 22, Python 3.12.

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
