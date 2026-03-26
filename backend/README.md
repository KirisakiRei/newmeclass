# NEWME Backend

NestJS + Prisma + MySQL backend for NEWME SaaS platform.

## Quick Start
1. Copy `.env.example` to `.env` and fill real values.
2. Run `npm install`.
3. Start local infra (MySQL + Redis 7): `npm run dev:infra:up`.
4. Run `npm run prisma:generate`.
5. Run `npm run prisma:migrate`.
6. Run `npm run prisma:seed`.
7. Run `npm run start:dev`.

## Local Infra (Dev)
- Redis target for local dev is `>= 6.2` (default stack uses `redis:7.2-alpine`).
- Default Redis host mapping is `localhost:6380`.
- Useful commands:
  - `npm run dev:infra:up`
  - `npm run dev:infra:down`
  - `npm run dev:infra:logs`
  - `npm run redis:up`
  - `npm run redis:logs`

## Build & Test
- Build: `npm run build`
- Unit tests: `npm test`

## Docker
- Local backend infra only: `docker compose -f docker-compose.dev.yml up -d`

## Production VPS
1. Use [/.env.example](/c:/Users/LENOVO/Documents/Project/2026/newme/.env.example) as the reference for runtime variables.
2. Windows local and VPS both use [compose.yml](/c:/Users/LENOVO/Documents/Project/2026/newme/compose.yml).
3. Manual deploy helper is [deploy/vps/manual-deploy.sh](/c:/Users/LENOVO/Documents/Project/2026/newme/deploy/vps/manual-deploy.sh).
4. Deployment steps are documented in [deploy/vps/README.md](/c:/Users/LENOVO/Documents/Project/2026/newme/deploy/vps/README.md).

Production notes:
- Frontend image is built from the static `frontend/dist` output and served by Nginx.
- Backend image runs the compiled `dist/src/main.js` output.
- `/api` and `/uploads` are proxied through the frontend container on the same domain.
- MySQL, Redis, and backend uploads use named Docker volumes.

## API Docs
- `http://localhost:5000/api/docs`
