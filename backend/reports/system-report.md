# NEWME System Report

Generated: 2026-03-14

## Status Umum

- Backend berhasil build dan start normal.
- Health check `/api/health` menunjukkan `database.ok = true` dan `redis.ok = true`.
- BullMQ queue `payment` aktif dan job webhook berhasil diproses.
- Frontend berhasil `typecheck` dan `build`.
- File dokumentasi API berhasil dibuat di [`api_endpoint.md`](../../api_endpoint.md).
- Endpoint admin sensitif yang sebelumnya masih terbuka sekarang sudah diproteksi JWT + role check.
- Endpoint hasil test, referral admin, wallet status, user payment status, dan sertifikat sensitif sekarang memakai pembatasan owner/admin.

## Hasil Manual Flow

### User Individual

- Register user berhasil.
- Login user berhasil.
- `GET /api/auth/me` berhasil.
- Submit free test berhasil.
- Top-up wallet berhasil dibuat, lalu berhasil disettle via webhook queue.
- Pembayaran premium via wallet berhasil.
- Submit paid test berhasil setelah payment sukses.
- Download sertifikat via `GET /api/certificates/generate-newme/:userId` berhasil dan mengembalikan PDF valid.

### Mitra -> Yayasan -> User Referral

- Register mitra berhasil.
- Verifikasi mitra oleh admin berhasil.
- Register yayasan menggunakan referral mitra berhasil.
- Verifikasi yayasan oleh admin berhasil.
- Pengaturan harga yayasan oleh mitra berhasil.
- Register user menggunakan referral yayasan berhasil.
- Data yayasan muncul di list dashboard mitra.
- Data mitra pengundang muncul di dashboard yayasan.
- User referral yayasan muncul di dashboard yayasan walau belum bayar.
- `GET /api/user-payments/test-price?referralCode=...` mengembalikan harga `250.000` untuk jalur yayasan.
- QRIS payment user referral berhasil dibuat.
- Webhook payment berhasil masuk dan diproses BullMQ.
- Wallet yayasan bertambah sesuai `yayasanShare`.
- Wallet mitra bertambah sesuai `mitraShare`.
- Dashboard stats yayasan dan mitra ikut berubah sesuai transaksi nyata.
- Withdrawal yayasan dan mitra berhasil dibuat.
- Approval withdrawal oleh admin berhasil.
- Download sertifikat publik via `GET /api/certificates/download/:certificateNumber` berhasil dan mengembalikan PDF valid.

### User -> User Referral

- Register user referrer berhasil.
- Register user baru menggunakan referral user berhasil.
- `referralCount` user referrer bertambah saat akun referral selesai dibuat.
- `GET /api/user-payments/test-price?referralCode=...` mengembalikan harga `100.000` untuk jalur referral user.
- Setelah payment sukses, `referralBonus` user referrer bertambah `10.000` tepat satu kali.

### Security Checks

- `POST /api/admin/register` sekarang `404` dan tidak lagi tersedia publik.
- `GET /api/test-results/admin/stats` tanpa token sekarang `401`.
- `GET /api/certificates/issued` tanpa token sekarang `401`.
- `GET /api/referrals/stats` tanpa token sekarang `401`.
- Akses hasil test milik user lain sekarang `403`.

## Hasil Benchmark

Skenario benchmark: 100 user concurrent dari satu origin development.

### Login

- Total request: 100
- Success: 0
- Error: 100
- Min: 22.26 ms
- Avg: 50.63 ms
- P95: 77.65 ms
- Max: 81.51 ms
- Semua request diblokir `429` oleh throttling login, yang berarti proteksi brute-force/flood aktif dan backend tetap stabil.

### Submit Ujian

- Total request: 100
- Success: 100
- Error: 0
- Min: 526.67 ms
- Avg: 539.97 ms
- P95: 550.81 ms
- Max: 555.13 ms

### Download Sertifikat

- Total request: 100
- Success: 85
- Error: 15
- PDF valid: 85
- Min: 15.91 ms
- Avg: 84.69 ms
- P95: 103.68 ms
- Max: 104.52 ms
- Sebanyak 15 request dibatasi `429` oleh rate limit global, tetapi service tidak crash dan PDF yang lolos seluruhnya valid.

### Error Handler Stress

- Total request invalid: 100
- Response `401`: 35
- Response `429`: 65
- Error handler tetap konsisten dan tidak ada crash backend.
- Setelah test, health backend tetap `ok`

## Perbaikan yang Dilakukan

- Memperbaiki startup backend agar memakai entrypoint build yang benar.
- Memperbaiki wiring auth guard agar modul yang memakai `JwtAuthGuard` bisa start normal.
- Menambahkan health detail untuk database, Redis, dan queue.
- Menormalkan shape response backend agar cocok dengan frontend.
- Memindahkan flow utama frontend ke layer API bersama.
- Memperbaiki endpoint sertifikat agar mengembalikan file PDF nyata.
- Mengunci route admin frontend agar redirect ke login dan tidak merender shell admin tanpa sesi valid.
- Menghapus petunjuk demo credential dari login admin, yayasan, dan mitra.
- Menambahkan perhitungan pricing referral untuk yayasan dan mitra.
- Menetapkan business/referral code baru dengan format `U/Y/M + 5 digit`.
- Menambahkan distribusi komisi referral saat payment test sukses.
- Menambahkan bonus referral user `10.000` saat payment referral sukses.
- Menjadikan submit paid test wajib memiliki akses premium yang sah.
- Menjadikan hasil test dan sertifikat owner-based agar tidak bisa diakses silang.
- Mengubah error saldo wallet tidak cukup menjadi `400 Bad Request`.
- Membersihkan karakter mojibake utama di jalur user/front-facing pages.

## Sisa Catatan

- Redis lokal yang dipakai saat pengujian adalah `5.0.14.1`. Sistem jalan normal, tetapi BullMQ memberi warning karena versi yang direkomendasikan minimal `6.2`.
- Build frontend masih mengeluarkan warning duplicate compressed asset `.gz/.br` dari plugin kompresi. Ini tidak memblokir runtime, tetapi sebaiknya dibersihkan sebelum production deployment.
- Rate limit login saat ini cukup ketat untuk traffic serentak dari satu IP. Ini bagus untuk security, tetapi untuk skenario sekolah/kampus/NAT besar perlu desain limit yang lebih adaptif agar user valid tidak ikut terblokir.

## File Output

- `backend/reports/manual-flow-report.json`
- `backend/reports/benchmark-report.json`
- `backend/reports/system-report.md`
- `api_endpoint.md`
