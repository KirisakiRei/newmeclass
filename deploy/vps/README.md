# VPS CI/CD Setup

Dokumen ini menjelaskan setup server dan tempat mengubah parameter production untuk deployment NEWME via GitHub Actions + GHCR.

## Alur Deploy
- GitHub Actions build image frontend, backend runtime, dan backend tools.
- Image dipush ke GHCR private.
- Workflow manual connect ke VPS via SSH.
- VPS login ke GHCR, `docker compose pull`, lalu `docker compose up -d`.
- Konfigurasi runtime dibuat ulang setiap deploy ke `/opt/newme/.env.production`.

## Parameter: Ubah di Mana
- Ubah `GitHub Secrets` untuk data sensitif:
  - `VPS_HOST`, `VPS_USERNAME`, `VPS_SSH_KEY`
  - `GHCR_USERNAME`, `GHCR_READ_TOKEN`
  - `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`
  - `DATABASE_URL`, `DIRECT_URL`
  - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
  - `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `MIDTRANS_MERCHANT_ID`
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_EMAIL`
  - `REDIS_PASSWORD`
  - `SEED_SUPERADMIN_PASSWORD`
- Ubah `GitHub Variables` untuk parameter non-sensitif:
  - `APP_URL`
  - `FRONTEND_URL`
  - `CORS_ORIGINS`
  - `UPLOAD_PUBLIC_BASE_URL`
  - `FRONTEND_PORT`
  - opsional `RELEASE_BRANCH`
- Ubah file repo bila ingin mengubah topologi deployment:
  - [docker-compose.prod.yml](/c:/Users/LENOVO/Documents/Project/2026/newme/docker-compose.prod.yml)
  - [.github/workflows/deploy-production.yml](/c:/Users/LENOVO/Documents/Project/2026/newme/.github/workflows/deploy-production.yml)
  - [backend/.env.production.example](/c:/Users/LENOVO/Documents/Project/2026/newme/backend/.env.production.example)

## Nilai Production Saat Ini
- Database:
  - `MYSQL_DATABASE=NEWME_DB`
  - `MYSQL_USER=NEWME_ADMIN`
  - `MYSQL_PASSWORD=<your mysql app password>`
  - `DATABASE_URL=mysql://<user>:<urlencoded-password>@mysql:3306/<database>`
  - `DIRECT_URL=mysql://<user>:<urlencoded-password>@mysql:3306/<database>`
- Midtrans sandbox:
  - `MIDTRANS_SERVER_KEY=<your sandbox server key>`
  - `MIDTRANS_CLIENT_KEY=<your sandbox client key>`
  - `MIDTRANS_MERCHANT_ID=<your merchant id>`
  - `MIDTRANS_IS_PRODUCTION=false`
- Frontend single-domain:
  - `REACT_APP_BACKEND_URL=` harus kosong.

## Placeholder yang Masih Wajib Diganti
- `APP_URL`, `FRONTEND_URL`, `CORS_ORIGINS`, `UPLOAD_PUBLIC_BASE_URL`
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- `MYSQL_ROOT_PASSWORD`
- `GHCR_READ_TOKEN`
- `SEED_SUPERADMIN_PASSWORD`
- `SMTP_*` jika email akan dipakai
- `VPS_SSH_KEY` harus berupa private key OpenSSH penuh, bukan hanya isi base64-nya

## Placeholder: Isi dengan Apa
- `VPS_HOST`
  - Isi dengan IP public VPS atau domain yang mengarah ke VPS.
  - Contoh: `203.0.113.10` atau `app.newme.id`
- `VPS_USERNAME`
  - Untuk setup Anda, isi `root`.
- `VPS_SSH_KEY`
  - Isi private key SSH yang bisa login ke server `root@VPS_HOST`.
- `GHCR_USERNAME`
  - Isi username pemilik package GHCR. Untuk repo ini: `KirisakiRei`.
- `GHCR_READ_TOKEN`
  - Isi token GitHub yang punya izin read package.
  - Minimal perlu akses `read:packages`.
  - Jika package image GHCR Anda sudah diset `public`, field ini boleh dikosongkan.
- `APP_URL`
  - Isi URL publik website.
  - Jika belum ada domain, boleh pakai IP dulu: `http://203.0.113.10`
- `FRONTEND_URL`
  - Isi URL frontend publik. Untuk single-domain, samakan dengan `APP_URL`.
- `CORS_ORIGINS`
  - Isi origin yang boleh akses backend.
  - Untuk single-domain, samakan dengan `APP_URL`.
- `UPLOAD_PUBLIC_BASE_URL`
  - Isi base URL file upload publik.
  - Contoh: `http://203.0.113.10/uploads`
- `MYSQL_ROOT_PASSWORD`
  - Password root MySQL internal container. Sudah saya siapkan nilai aman di file lokal.
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
  - Secret JWT production. Sudah saya siapkan nilai aman di file lokal.
- `SEED_SUPERADMIN_PASSWORD`
  - Password admin awal. Sudah saya siapkan nilai aman di file lokal.
- `SMTP_*`
  - Kosongkan jika email belum dipakai.

## File Siap Copy
- GitHub Secrets siap copy ada di [deploy/vps/github-secrets.local.env](/c:/Users/LENOVO/Documents/Project/2026/newme/deploy/vps/github-secrets.local.env)
- GitHub Variables siap copy ada di [deploy/vps/github-variables.local.env](/c:/Users/LENOVO/Documents/Project/2026/newme/deploy/vps/github-variables.local.env)
- Kedua file itu di-ignore oleh git, jadi aman dipakai sebagai checklist lokal dan tidak akan ikut ke repository.

## Setup VPS
Asumsi: Ubuntu 22.04/24.04 dan deploy dilakukan langsung dengan `root`.

1. Login ke VPS sebagai `root`.

2. Jalankan bootstrap server sekali saja.
```bash
curl -fsSL https://raw.githubusercontent.com/KirisakiRei/newmeclass/main/deploy/vps/bootstrap-root.sh | bash
```

3. Jika Anda belum push file bootstrap ke GitHub, jalankan manual command setara ini di VPS:
```bash
apt-get update
apt-get install -y ca-certificates curl ufw
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl restart docker
mkdir -p /opt/newme
chmod 755 /opt /opt/newme
ufw allow 22/tcp
ufw allow 80/tcp
ufw --force enable
docker compose version
```

4. Folder deploy `/opt/newme` akan dibuat otomatis jika belum ada.
- Workflow sudah menjalankan `mkdir -p /opt/newme` setiap deploy.
- Jadi di sisi CI/CD, folder yang belum ada tidak akan menjadi masalah.

5. Buka firewall hanya untuk SSH dan web.
```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw --force enable
```

6. Jangan buka port database/cache ke publik.
- Jangan expose `3306` dan `6379` di firewall publik.
- Compose production sudah menjaga MySQL dan Redis tetap internal.

7. Siapkan akses GHCR.
- Buat Personal Access Token atau fine-grained token dengan akses read package.
- Simpan di GitHub Secret `GHCR_READ_TOKEN`.
- Simpan username pemilik package di `GHCR_USERNAME`.

8. Arahkan domain ke IP VPS.
- Buat DNS `A record` ke IP server.
- Untuk fase ini website bisa diakses via HTTP port `80`.

## Menjalankan Deploy
- Buka GitHub repository.
- Masuk ke `Actions`.
- Jalankan workflow `Deploy Production`.
- Isi `git_ref` dan pilih apakah `run_seed` perlu dijalankan.

## Tanpa GitHub Actions
Kalau Anda tidak ingin memakai GitHub Actions, pakai jalur manual dari VPS.

1. Pastikan code terbaru sudah ada di GitHub branch yang ingin dipakai.

2. Di VPS, install `git` bila belum ada.
```bash
apt-get update
apt-get install -y git
```

3. Buat file env production di server.
```bash
nano /opt/newme/.env.production
```
- Isi file ini khusus untuk runtime aplikasi, bukan credential CI/CD.
- Jangan masukkan `VPS_SSH_KEY`, `VPS_HOST`, `VPS_USERNAME`, atau `GHCR_*`.
- Gunakan file lokal ini sebagai sumber yang sudah siap:
  - [deploy/vps/runtime-production.local.env](/c:/Users/LENOVO/Documents/Project/2026/newme/deploy/vps/runtime-production.local.env)

4. Clone repo dan deploy manual.
```bash
cd /opt/newme
git clone --branch dev --single-branch https://github.com/KirisakiRei/newmeclass.git app
cd app
docker compose --env-file /opt/newme/.env.production -f docker-compose.vps.yml up -d --build
```

5. Untuk deploy berikutnya cukup pull lalu rebuild.
```bash
cd /opt/newme/app
git pull --ff-only origin dev
docker compose --env-file /opt/newme/.env.production -f docker-compose.vps.yml up -d --build
```

6. Untuk seed awal production jalankan sekali saja.
```bash
cd /opt/newme/app
docker compose --env-file /opt/newme/.env.production -f docker-compose.vps.yml --profile ops run --rm seed
```

7. Alternatif yang lebih ringkas, pakai script:
```bash
bash /opt/newme/app/deploy/vps/manual-deploy.sh dev true
```

Catatan:
- Jalur ini tetap production, karena Dockerfile backend/frontend adalah multi-stage build.
- Yang berjalan di container tetap hasil build, bukan dev server.
- File compose untuk mode ini ada di [docker-compose.vps.yml](/c:/Users/LENOVO/Documents/Project/2026/newme/docker-compose.vps.yml).
- Untuk VPS kecil, `GENERATE_COMPRESSED_ASSETS=false` direkomendasikan agar build frontend tidak terlalu berat. Opsi ini sudah disiapkan di [deploy/vps/runtime-production.local.env](/c:/Users/LENOVO/Documents/Project/2026/newme/deploy/vps/runtime-production.local.env).

## Rollback
- Jalankan workflow yang sama dengan `git_ref` ke commit atau branch release sebelumnya.
- Workflow akan build ulang image dari ref tersebut, push tag SHA baru, lalu redeploy ke VPS.
