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
- `docker compose up -d --build`

## API Docs
- `http://localhost:5000/api/docs`
