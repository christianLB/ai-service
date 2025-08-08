# Dev Quickstart (Stable Backend)

This repo is in migration. The stable backend entry excludes legacy modules.

## Prerequisites
- Node 20
- Docker + Docker Compose (optional for services)

## Environment
Copy `env.development.example` to `.env.local` (or export vars):

```
cp env.development.example .env.local
```

## Start services (Postgres, Redis)
Run with Docker Compose:

```
npm run dev:services
```

This starts:
- Postgres on 5432 with DB `ai_service_dev`
- Redis on 6379

To stop and remove volumes:

```
npm run dev:services:down
```

## Generate Prisma client
```
npm run db:setup
```

## Run stable backend (local Node)
```
npm run dev:stable
```

Health check:
```
curl http://localhost:3000/health
```
Expect HTTP 200.

## Notes
- Stable backend entry: `src/index.stable.ts`
- Build only stable backend: `npm run build:stable`
- CI on main uses the stable backend build to stay green while migrating legacy modules.
