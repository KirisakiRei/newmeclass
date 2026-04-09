# Deploy Singkat NEWME ke VPS via Docker Hub

Fokus dokumen ini:

- apa yang perlu disiapkan
- script push image dari laptop
- script pull image di VPS
- command minimum yang perlu dijalankan

## 1. Yang perlu disiapkan

### Di laptop

- Docker Desktop sudah jalan
- sudah bisa `docker login`
- punya akses push ke Docker Hub `favcreamyy`
- punya `MIDTRANS client key` untuk build dashboard frontend

### Di VPS

- domain `newmeclass.com` dan `app.newmeclass.com` sudah mengarah ke IP VPS
- `docker`, `git`, `nginx`, `certbot` sudah terpasang
- repo ini sudah di-clone ke:

```bash
/opt/newme/app
```

- file env production sudah ada di:

```bash
/opt/newme/.env.production
```

### Isi penting file `/opt/newme/.env.production`

Minimal pastikan ini benar:

```env
APP_IMAGE_TAG=2026-04-09-01
APP_URL=https://newmeclass.com
PUBLIC_FRONTEND_URL=https://newmeclass.com
DASHBOARD_FRONTEND_URL=https://app.newmeclass.com
CMS_FRONTEND_URL=https://newmeclass.com
FRONTEND_URL=https://app.newmeclass.com
CORS_ORIGINS=https://newmeclass.com,https://app.newmeclass.com
UPLOAD_PUBLIC_BASE_URL=https://newmeclass.com/uploads

FRONTEND_PORT=8081
APP_FRONTEND_PORT=8080
NGINX_BACKEND_UPSTREAM=http://backend:5000

DATABASE_URL=mysql://NEWME_ADMIN:PASSWORD_DB@database:3306/NEWME_DB
DIRECT_URL=mysql://NEWME_ADMIN:PASSWORD_DB@database:3306/NEWME_DB
JWT_ACCESS_SECRET=GANTI_SECRET_YANG_PANJANG
AUTH_COOKIE_DOMAIN=.newmeclass.com
AUTH_COOKIE_SECURE=true
TRUST_PROXY=true

MIDTRANS_IS_PRODUCTION=true
MIDTRANS_SERVER_KEY=ISI_SERVER_KEY
MIDTRANS_CLIENT_KEY=ISI_CLIENT_KEY
MIDTRANS_MERCHANT_ID=ISI_MERCHANT_ID
```

## 2. Script yang saya buat

Saya sudah buat 2 script:

- laptop: [deploy/push-dockerhub.ps1](c:\Users\LENOVO\Documents\Project\2026\newme\deploy\push-dockerhub.ps1)
- VPS: [deploy/vps/pull-and-up.sh](c:\Users\LENOVO\Documents\Project\2026\newme\deploy\vps\pull-and-up.sh)

## 3. Cara push image dari laptop

Jalankan dari root project di PowerShell:

```powershell
.\deploy\push-dockerhub.ps1 `
  -ImageTag "2026-04-09-01" `
  -MidtransPublicClientKey "ISI_CLIENT_KEY_MIDTRANS"
```

Script ini otomatis:

- memastikan `buildx` siap
- login Docker Hub
- build 4 image
- push 4 image ke Docker Hub

Image yang didorong:

- `favcreamyy/newme-backend:2026-04-09-01`
- `favcreamyy/newme-backend-tools:2026-04-09-01`
- `favcreamyy/newme-landing-cms-frontend:2026-04-09-01`
- `favcreamyy/newme-app-frontend:2026-04-09-01`

Kalau mau release baru, cukup ganti tag:

```powershell
.\deploy\push-dockerhub.ps1 `
  -ImageTag "2026-04-10-01" `
  -MidtransPublicClientKey "ISI_CLIENT_KEY_MIDTRANS"
```

Setelah push selesai:

1. ubah `APP_IMAGE_TAG` di `/opt/newme/.env.production` pada VPS
2. jalankan script deploy di VPS

## 4. Cara pull image dan deploy di VPS

Masuk ke VPS, lalu jalankan:

```bash
cd /opt/newme/app
bash deploy/vps/pull-and-up.sh
```

Script ini otomatis:

- `git pull`
- copy `/opt/newme/.env.production` ke `.env`
- validasi compose
- `docker compose pull`
- `docker compose --profile ops run --rm migrate`
- `docker compose up -d`
- tampilkan status container

Kalau ingin sekalian seed:

```bash
cd /opt/newme/app
RUN_SEED=true bash deploy/vps/pull-and-up.sh
```

## 5. Urutan kerja paling sederhana

### Di laptop

1. Build dan push:

```powershell
.\deploy\push-dockerhub.ps1 `
  -ImageTag "2026-04-09-01" `
  -MidtransPublicClientKey "ISI_CLIENT_KEY_MIDTRANS"
```

### Di VPS

1. Edit env:

```bash
nano /opt/newme/.env.production
```

2. Pastikan:

```env
APP_IMAGE_TAG=2026-04-09-01
```

3. Deploy:

```bash
cd /opt/newme/app
bash deploy/vps/pull-and-up.sh
```

## 6. Yang perlu dicek kalau habis deploy

Cek status container:

```bash
cd /opt/newme/app
docker compose --env-file .env -f compose.production.yml ps
```

Cek health:

```bash
curl -fsS http://127.0.0.1:8081/api/health
curl -fsS http://127.0.0.1:8080/api/health
```

Cek domain di browser:

- `https://newmeclass.com`
- `https://app.newmeclass.com`

## 7. Nginx VPS yang perlu ada

Nginx host cukup arahkan:

- `newmeclass.com` -> `127.0.0.1:8081`
- `app.newmeclass.com` -> `127.0.0.1:8080`

Kalau belum ada, pakai config dasar ini:

```nginx
server {
    listen 80;
    server_name newmeclass.com;

    location / {
        proxy_pass http://127.0.0.1:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name app.newmeclass.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Setelah itu aktifkan SSL:

```bash
sudo certbot --nginx -d newmeclass.com -d app.newmeclass.com
```

## 8. Saran penting biar VPS lebih aman

- buka firewall hanya `22`, `80`, `443`
- jangan buka `3306`, `6379`, `8080`, `8081` ke publik
- sebaiknya port frontend di `compose.production.yml` di-bind ke `127.0.0.1`

Contoh yang lebih aman:

```yaml
ports:
  - "127.0.0.1:${FRONTEND_PORT:-8081}:80"
```

dan:

```yaml
ports:
  - "127.0.0.1:${APP_FRONTEND_PORT:-8080}:80"
```

## 9. Kalau mau update release berikutnya

Di laptop:

```powershell
.\deploy\push-dockerhub.ps1 `
  -ImageTag "2026-04-10-01" `
  -MidtransPublicClientKey "ISI_CLIENT_KEY_MIDTRANS"
```

Di VPS:

1. ubah `APP_IMAGE_TAG=2026-04-10-01`
2. jalankan:

```bash
cd /opt/newme/app
bash deploy/vps/pull-and-up.sh
```

## 10. Kalau Anda mau yang paling praktis

Alur paling simpel cukup ini saja:

Laptop:

```powershell
.\deploy\push-dockerhub.ps1 -ImageTag "2026-04-09-01" -MidtransPublicClientKey "ISI_CLIENT_KEY_MIDTRANS"
```

VPS:

```bash
nano /opt/newme/.env.production
cd /opt/newme/app
bash deploy/vps/pull-and-up.sh
```

Kalau Anda mau, saya bisa lanjut satu langkah lagi: saya ubahkan `compose.production.yml` agar port frontend otomatis hanya bind ke `127.0.0.1`, jadi sisi VPS-nya lebih aman tanpa Anda edit manual.
