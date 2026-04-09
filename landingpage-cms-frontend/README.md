
# NewmeClass

Frontend landing page and CMS for NewmeClass.

## Running the code

Run `npm i` to install the dependencies.

Copy `.env.example` to `.env` for direct local development.

Run `npm run dev` to start the development server.

## Production Deployment

This app is prepared for production deployment with Docker and Nginx through the root repository compose file.

### Files

- `Dockerfile`: multi-stage build for Vite static assets + Nginx runtime
- `nginx/default.conf.template`: SPA routing, `/api` proxy, `/uploads` proxy, asset caching, and health check
- `.env.production.example`: production build/runtime variables reference
- `.dockerignore`: excludes development-only files from Docker build context
- `../compose.yml`: single Docker entry point for Windows and VPS deployment

### Recommended production setup

1. Build the frontend with `VITE_BACKEND_URL` left empty so the app uses same-origin `/api`.
2. Set `VITE_DASHBOARD_URL` to the public dashboard origin used by auth bridge.
3. Set `NGINX_BACKEND_UPSTREAM` to the internal backend upstream, for example `http://backend:5000`.
4. Put the frontend container on the same Docker network as the backend container if you proxy to `backend:5000`.

### Example

```bash
cp ../.env.example ../.env
docker compose up -d --build
```
  
