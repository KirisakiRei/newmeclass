# Docker Deployment NEWME

Sekarang deployment dibuat sesederhana mungkin:

- Satu file compose: [compose.yml](/c:/Users/LENOVO/Documents/Project/2026/newme/compose.yml)
- Satu file env: [/.env.example](/c:/Users/LENOVO/Documents/Project/2026/newme/.env.example)
- Satu perintah utama, baik di Windows maupun VPS:

```bash
docker compose up -d --build
```

## Konsep

- `public_frontend` dibuild dari `landingpage-cms-frontend` lalu dijalankan di Nginx.
- `dashboard_frontend` dibuild dari folder `frontend` lalu dijalankan sebagai dashboard/app frontend.
- `backend` dibuild dari `backend`.
- `database` dan `redis` ikut dijalankan dalam stack yang sama.
- `migrate` jalan otomatis sebelum `backend`.
- `seed` tetap tersedia, tetapi hanya dijalankan jika memang dibutuhkan.

Jadi tidak ada lagi pemisahan compose untuk `prod`, `vps`, atau frontend terpisah.

## File Yang Dipakai

- [compose.yml](/c:/Users/LENOVO/Documents/Project/2026/newme/compose.yml)
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

4. Isi nilai production yang asli di `.env`.

5. Jalankan:
```bash
docker compose up -d --build
```

6. Jika perlu seed:
```bash
docker compose --profile ops run --rm seed
```

7. Untuk update deployment berikutnya:
```bash
git pull --ff-only origin main
docker compose up -d --build
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
- Script akan menjalankan `docker compose up -d --build`.

## GitHub Actions

Workflow production sekarang juga disederhanakan:

- tidak build image ke GHCR
- tidak pull image terpisah di VPS
- langsung checkout commit target di VPS
- copy env ke VPS
- jalankan `docker compose up -d --build`

Hasilnya, alur CI/CD sama dengan alur manual dan sama dengan alur lokal.

## Ringkasan Perintah

Jalankan:
```bash
docker compose up -d --build
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
