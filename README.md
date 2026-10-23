# KaizenAI

KaizenAI is a web application for exploring and creating image, video, and audio content through one interface.

The `frontend` directory contains the Next.js application. The `backend` directory contains the FastAPI service, authentication, public content API, database models, billing code, and provider integrations. The `deploy` directory contains the production release script and service configuration.

The example images and videos in `frontend/public/examples` are part of the public product showcase. User accounts, generated files, databases, provider credentials, SMTP credentials, logs, and other runtime data stay outside Git.

## Local setup

Use Node.js 22 or newer and Python 3.12 or newer.

```bash
cd frontend
cp .env.example .env.local
npm ci
npm run dev
```

To run the backend separately, create its environment file from `backend/.env.example`, create a virtual environment, install `backend/requirements.txt`, and start Uvicorn from the `backend` directory.

## Production deployment

Copy `deploy/.env.example` to `deploy/.env` and set the SSH connection values. The deploy script requires a clean Git worktree. It packages the exact commit, verifies the package checksum and file manifest on the server, installs dependencies there, runs the database migration script, builds the frontend there, switches the release symlink, restarts both services, configures Nginx and checks HTTPS.

```bash
cp deploy/.env.example deploy/.env
./deploy/deploy.sh
```

The initial production configuration keeps AI generation and billing disabled until provider access and payment settings are configured. The public site and administrator login do not require SMTP.
