# Landing + CMS Frontend Migration

Status: `in progress`
Last updated: `2026-03-23`

## Goal
- Memisahkan area `landing page + CMS landing` dari `dashboard app` yang sekarang.
- Menjaga flow utama sistem tetap aman: admin operasional, mitra, yayasan, payment, test, dan result tidak boleh rusak.
- Menjadikan `landingpage-cms-frontend` sebagai app baru yang benar-benar terhubung ke backend.

## Final Direction
- `frontend/` tetap menjadi dashboard app.
- `landingpage-cms-frontend/` menjadi app baru untuk:
  - landing page publik
  - login/register publik
  - CMS landing
- Backend tetap satu.
- CMS memakai login admin yang sama, tetapi entrypoint frontend-nya terpisah.
- Konten landing/CMS baru disimpan di store backend terisolasi agar tidak merusak modul legacy `website-content` yang lama.

## Progress Checklist

### 1. Dokumentasi & Boundary
- [x] Analisis struktur `frontend/` lama
- [x] Analisis struktur `landingpage-cms-frontend/`
- [x] Tetapkan boundary: dashboard app vs landing/CMS app
- [x] Tetapkan strategi aman: landing CMS store terisolasi di backend
- [x] Buat file monitoring implementasi
- [x] Finalisasi catatan deploy/env untuk 2 frontend app

### 2. Backend
- [x] Tambahkan modul backend khusus landing/CMS content
- [x] Tambahkan endpoint public untuk membaca state landing
- [x] Tambahkan endpoint CMS untuk membaca, update section, dan reset state
- [x] Tambahkan helper URL frontend publik vs dashboard
- [x] Tambahkan permission admin khusus CMS landing
- [x] Tambahkan helper nested lokasi untuk register publik

### 3. Landing Frontend
- [x] Normalisasi asset `figma:asset` ke asset lokal
- [x] Tambahkan API client untuk app landing
- [x] Ubah `CMSContext` dari `localStorage mock` menjadi backend-connected provider
- [x] Tambahkan loading/error state global untuk content fetch
- [x] Ubah halaman publik utama agar membaca dari `CMSContext`
- [x] Hubungkan contact form publik ke backend

### 4. Auth & CMS Frontend
- [x] Hubungkan login user publik ke backend
- [x] Hubungkan register user publik ke backend
- [x] Perbaiki nested lokasi register
- [x] Tambahkan forgot/reset password di app landing
- [x] Tambahkan CMS login page
- [x] Tambahkan CMS route guard berbasis permission admin

### 5. Dashboard Compatibility
- [x] Tambahkan auth bridge ke dashboard app untuk menerima login/register dari landing app
- [x] Pastikan redirect payment/dashboard tetap menuju app dashboard
- [x] Pastikan flow mitra/yayasan tetap memakai dashboard app

### 6. Verification
- [x] Backend build
- [x] Dashboard frontend build
- [x] Landing/CMS frontend build
- [x] Smoke test public pages utama
- [x] Smoke test CMS login dan autosave
- [x] Smoke test register user + redirect ke dashboard

## Implementation Notes
- Untuk fase ini, modul `website-content`, `articles`, `products`, `banners`, dan halaman konten lama di dashboard tidak dihapus.
- App landing/CMS baru memakai contract backend baru agar migrasi aman dan tidak menimbulkan regression ke flow utama.
- Jika diperlukan, konten legacy bisa dimigrasikan ke store baru pada fase berikutnya setelah app baru stabil.
- Halaman publik `services`, `service detail`, `articles`, `privacy`, `contact`, `company profile`, `login`, `register`, `forgot/reset password`, dan `certificate verify` sudah disambungkan ke kontrak backend/CMS baru.
- Dashboard app lama tetap menjadi pintu untuk admin operasional, mitra, yayasan, user dashboard, payment, dan flow tes.

## Remaining Focus
- Lanjutkan penyisiran konten minor agar seluruh copy yang masih fallback default benar-benar bersumber dari CMS bila dibutuhkan.

## Deploy Notes
- `backend`
  - `PUBLIC_FRONTEND_URL` mengarah ke app landing/CMS publik.
  - `DASHBOARD_FRONTEND_URL` mengarah ke app dashboard operasional.
- `landingpage-cms-frontend`
  - `VITE_BACKEND_URL` mengarah ke backend utama.
  - `VITE_DASHBOARD_URL` mengarah ke frontend dashboard untuk auth bridge setelah login/register publik.
- `frontend`
  - tetap memakai `VITE_API_BASE_URL`/konfigurasi dashboard yang sudah ada.
- Redirect yang sudah dipisahkan:
  - auth/register publik -> landing app
  - payment/dashboard/mitra/yayasan/user area -> dashboard app
