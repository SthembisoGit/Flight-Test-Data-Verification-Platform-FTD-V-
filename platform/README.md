# AST-VDP Full-Stack Platform

Desktop-first full-stack layer for AST-VDP:

- API: NestJS (`apps/api`)
- Worker: NestJS + BullMQ (`apps/worker`)
- Frontend: Next.js + Tailwind (`apps/web`)
- App database: MySQL 8 (Prisma schema in `prisma/`)
- Queue broker: Redis
- Processing engine: existing C++ `astvdp` CLI (spawned by worker)

## Architecture

1. Frontend submits a run request (`simulate` or `upload CSV`).
2. API stores a `Job` row in MySQL and enqueues BullMQ payload.
3. Worker consumes queue job and executes `astvdp`.
4. Worker imports session/metrics/anomalies from generated SQLite into MySQL.
5. API serves jobs/sessions/anomalies/report/artifacts to frontend.

## Monorepo Layout

```text
platform/
  apps/
    api/
    worker/
    web/
  packages/
    contracts/
  prisma/
    schema.prisma
    migrations/
  docker-compose.yml
  .env.example
```

## Environment Variables

Copy `.env.example` to `.env` and adjust values.

### Required

1. `DATABASE_URL`
2. `REDIS_URL`
3. `API_PORT`
4. `QUEUE_NAME`
5. `QUEUE_CONCURRENCY`
6. `ENGINE_BINARY_PATH`
7. `ENGINE_WORKDIR`
8. `ENGINE_TIMEOUT_MS`
9. `ARTIFACTS_ROOT`
10. `MAX_UPLOAD_MB`
11. `ENABLE_PDF`
12. `CORS_ORIGIN`
13. `NEXT_PUBLIC_API_BASE_URL`
14. `API_BASE_URL_SERVER`
15. `NEXT_PUBLIC_POLL_INTERVAL_MS`

### MySQL/Redis Compose Values

1. `MYSQL_ROOT_PASSWORD`
2. `MYSQL_DATABASE`
3. `MYSQL_USER`
4. `MYSQL_PASSWORD`
5. `MYSQL_PORT`
6. `REDIS_PORT`
7. `WEB_PORT`

## Local Run (Host Processes)

Run from `platform/`:

```powershell
npm install
npm run prisma:generate
npm run prisma:migrate
```

For host-process mode (Windows engine), set these `.env` overrides before starting:

1. `DATABASE_URL=mysql://astvdp:astvdp@localhost:3306/astvdp`
2. `REDIS_URL=redis://localhost:6379`
3. `ENGINE_BINARY_PATH=C:\Users\USER\Desktop\DENEL\ast-vdp\build\windows-msvc-local\Release\astvdp.exe`
4. `ENGINE_WORKDIR=C:\Users\USER\Desktop\DENEL\ast-vdp`
5. `API_BASE_URL_SERVER=http://localhost:4000/api/v1`

Start processes in separate terminals:

```powershell
# API
npm run dev:api

# Worker
npm run dev:worker

# Frontend
npm run dev:web
```

Frontend: `http://localhost:3000`  
API docs: `http://localhost:4000/api/docs`

## Docker Compose Run

From `platform/`:

```powershell
copy .env.example .env
docker compose up --build
```

Notes:

1. Compose starts MySQL, Redis, API, Worker, Web.
2. Worker image now builds a Linux `astvdp` binary and defaults to `ENGINE_BINARY_PATH=/usr/local/bin/astvdp`.
3. Web server-side data fetches use `API_BASE_URL_SERVER` (set to `http://api:4000/api/v1` for compose).
4. Browser calls use `NEXT_PUBLIC_API_BASE_URL` (set to `http://localhost:4000/api/v1` by default).
5. If Docker is not installed, run API/worker/web as host processes.

## API Endpoints

Base prefix: `/api/v1`

1. `POST /jobs/simulate`
2. `POST /jobs/upload`
3. `GET /jobs`
4. `GET /jobs/:jobId`
5. `GET /sessions`
6. `GET /sessions/:sessionId`
7. `GET /sessions/:sessionId/anomalies`
8. `GET /sessions/:sessionId/report`
9. `GET /artifacts/:jobId/:file`
10. `GET /health`

## Test Commands

From `platform/`:

```powershell
npm test -w @astvdp/api
npm test -w @astvdp/worker
```

## Scalability Notes

1. API and worker are decoupled by Redis queue.
2. Worker concurrency controlled by `QUEUE_CONCURRENCY`.
3. Artifact storage isolated under `ARTIFACTS_ROOT` for future move to object storage.
4. MySQL schema is migration-managed via Prisma.
