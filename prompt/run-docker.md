Done. Here's what was created:
Dockerfile — Multi-stage build:
- deps stage: installs npm dependencies
- builder stage: generates Prisma client, runs next build
- runner stage: minimal Alpine image with standalone output, tsx + prisma CLI for entrypoint
docker-entrypoint.sh — Runs prisma db push and seed on startup, then launches server.js
docker-compose.yml — Two services:
- db: your existing postgres:16-alpine with healthcheck, persistent volume pgdata
- app: builds from Dockerfile, waits for db healthy, exposes port 3000
.dockerignore — Excludes node_modules, .next, .git, .env, prompt/, etc.
next.config.ts — Added output: "standalone" for Docker-optimized builds.
To run:
docker compose up --build
App will be at http://localhost:3000. Database persists across restarts via the pgdata volume.