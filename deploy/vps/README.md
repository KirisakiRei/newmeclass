# Docker Deployment NEWME

Sekarang ada dua mode yang jelas:

- Lokal: build dari source memakai [compose.yml](/c:/Users/LENOVO/Documents/Project/2026/newme/compose.yml)
- Production/VPS: pull image Docker Hub memakai [compose.production.yml](/c:/Users/LENOVO/Documents/Project/2026/newme/compose.production.yml)

## Konsep

- `public_frontend` dibuild dari `landingpage-cms-frontend` saat proses release image, lalu di VPS tinggal di-pull.
- `dashboard_frontend` dibuild dari folder `frontend` saat proses release image, lalu di VPS tinggal di-pull.
- `backend` dibuild dari `backend` saat proses release image, lalu di VPS tinggal di-pull.
- `database` dan `redis` ikut dijalankan dalam stack yang sama.
- `migrate` jalan otomatis sebelum `backend`.
- `seed` tetap tersedia, tetapi hanya dijalankan jika memang dibutuhkan.

Catatan penting autostart:
- `restart: unless-stopped` hanya menghidupkan ulang container yang sudah pernah dibuat.
- Untuk memastikan stack NEWME selalu diboot ulang setelah server restart, install service systemd [newme-compose.service](/c:/Users/LENOVO/Documents/Project/2026/newme/deploy/vps/newme-compose.service) dengan helper [install-compose-service.sh](/c:/Users/LENOVO/Documents/Project/2026/newme/deploy/vps/install-compose-service.sh).
- Verifikasi pasca boot/deploy bisa dilakukan dengan [smoke-check.sh](/c:/Users/LENOVO/Documents/Project/2026/newme/deploy/vps/smoke-check.sh).

## File Yang Dipakai

- [compose.yml](/c:/Users/LENOVO/Documents/Project/2026/newme/compose.yml)
- [compose.production.yml](/c:/Users/LENOVO/Documents/Project/2026/newme/compose.production.yml)
- [/.env.example](/c:/Users/LENOVO/Documents/Project/2026/newme/.env.example)
- [deploy/vps/manual-deploy.sh](/c:/Users/LENOVO/Documents/Project/2026/newme/deploy/vps/manual-deploy.sh)
- [.github/workflows/deploy-production.yml](/c:/Users/LENOVO/Documents/Project/2026/newme/.github/workflows/deploy-production.yml)

## Windows: Jalankan Lokal Dengan Docker Desktop

1. Salin file env contoh menjadi `.env` di root project.
```bash
copy .env.example .env
```

2. Isi nilai penting di `.env`.
- Minimal ganti:
  - `APP_URL`
  - `PUBLIC_FRONTEND_URL`
  - `DASHBOARD_FRONTEND_URL`
  - `CORS_ORIGINS`
  - `UPLOAD_PUBLIC_BASE_URL`
  - `MYSQL_PASSWORD`
  - `MYSQL_ROOT_PASSWORD`
  - `DATABASE_URL`
  - `DIRECT_URL`
  - `JWT_ACCESS_SECRET`
  - `SEED_SUPERADMIN_PASSWORD`

3. Jika ingin akses lokal dari browser, nilai aman awal bisa seperti ini:
```env
APP_URL=http://localhost
PUBLIC_FRONTEND_URL=http://localhost
DASHBOARD_FRONTEND_URL=http://localhost
FRONTEND_URL=http://localhost
CORS_ORIGINS=http://localhost
UPLOAD_PUBLIC_BASE_URL=http://localhost/uploads
FRONTEND_PORT=80
VITE_BACKEND_URL=
VITE_DASHBOARD_URL=http://localhost
NGINX_BACKEND_UPSTREAM=http://backend:5000
```

4. Untuk koneksi database lokal container, gunakan format ini:
```env
DATABASE_URL=mysql://NEWME_ADMIN:your_password@database:3306/NEWME_DB
DIRECT_URL=mysql://NEWME_ADMIN:your_password@database:3306/NEWME_DB
```

5. Build dan jalankan:
```bash
docker compose up -d --build
```

6. Cek status:
```bash
docker compose ps
```

7. Cek log jika ada yang gagal:
```bash
docker compose logs -f
```

8. Buka aplikasi:
- Frontend: `http://localhost`
- Backend health: `http://localhost/api/health`

9. Jika ingin seed data awal:
```bash
docker compose --profile ops run --rm seed
```

10. Jika pernah ada volume MySQL lama dan migration gagal, reset sekali:
```bash
docker compose down -v
docker compose up -d --build
```

## Local: Build Lalu Push Ke Docker Hub

Build image production di mesin lokal, lalu push ke namespace Docker Hub `favcreamyy`.

Contoh tag `v1`:

```bash
docker login
docker buildx build --platform linux/amd64 -t favcreamyy/newme-backend:v1 --target runtime ./backend --push
docker buildx build --platform linux/amd64 -t favcreamyy/newme-backend-tools:v1 --target build ./backend --push
docker buildx build --platform linux/amd64 -t favcreamyy/newme-landing-cms-frontend:v1 ./landingpage-cms-frontend --push
docker buildx build --platform linux/amd64 -t favcreamyy/newme-app-frontend:v1 ./frontend --push
```

Catatan:
- Ganti `linux/amd64` bila VPS memakai arsitektur lain.
- Set `APP_IMAGE_TAG=v1` di env production VPS agar compose menarik tag yang sama.

## VPS: Deploy Manual

1. Install Docker dan Git di VPS.

2. Clone repo ke server:
```bash
cd /opt
git clone https://github.com/KirisakiRei/newmeclass.git newme
cd /opt/newme
```

3. Buat `.env` dari contoh:
```bash
cp .env.example .env
```

4. Isi nilai production yang asli di `.env` dan tambahkan:
```env
APP_IMAGE_TAG=v1
```

5. Jalankan:
```bash
docker compose -f compose.production.yml pull
docker compose -f compose.production.yml up -d
```

6. Jika perlu seed:
```bash
docker compose -f compose.production.yml --profile ops run --rm seed
```

7. Untuk update deployment berikutnya:
```bash
git pull --ff-only origin main
docker compose -f compose.production.yml pull
docker compose -f compose.production.yml up -d
```

8. Agar stack otomatis aktif setelah reboot host:
```bash
sudo bash deploy/vps/install-compose-service.sh
sudo systemctl status newme-compose.service
```

## VPS: Deploy Dengan Script

Script helper tetap ada dan sekarang memakai compose yang sama.

Contoh:
```bash
bash deploy/vps/manual-deploy.sh main true
```

Catatan:
- Script akan sync code.
- Script akan copy env runtime ke `.env`.
- Script akan menjalankan `docker compose -f compose.production.yml pull` lalu `up -d`.
- Jika `DOCKERHUB_USERNAME` dan `DOCKERHUB_TOKEN` tersedia di environment shell VPS, script juga akan login ke Docker Hub dulu.

## GitHub Actions

Workflow production sekarang:

- tidak build image di GitHub Actions
- menerima `image_tag` saat deploy
- checkout commit target di VPS untuk update file deployment
- copy env ke VPS
- login Docker Hub di VPS
- jalankan `docker compose -f compose.production.yml pull`
- jalankan `docker compose -f compose.production.yml up -d`

## Ringkasan Perintah

Jalankan:
```bash
docker compose up -d --build
```

Deploy production:
```bash
docker compose -f compose.production.yml pull
docker compose -f compose.production.yml up -d
```

Lihat status:
```bash
docker compose ps
```

Lihat log:
```bash
docker compose logs -f
```

Stop:
```bash
docker compose down
```

Reset volume:
```bash
docker compose down -v
```
