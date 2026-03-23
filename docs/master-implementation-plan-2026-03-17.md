# Master Implementation Plan - 2026-03-17

## Tujuan Utama
- Menstabilkan flow user yang paling kritis: login, sesi tes, submit hasil, dan pembayaran premium.
- Menyelesaikan akar masalah upload/media agar semua gambar yang diunggah benar-benar tersimpan, tampil, dan terdaftar di galeri.
- Merapikan pengalaman admin agar lebih production-ready: Monitoring Pembayaran, pagination tabel, dan fondasi RBAC dashboard admin.
- Menjadikan sumber data sertifikat lebih jelas dan bisa ditelusuri dari hasil kepribadian.

## Prioritas Eksekusi
1. Auth user test session dan submit resiliency.
2. Lockout login admin 3x gagal selama 15 menit.
3. Upload file nyata + URL valid + registrasi otomatis ke Media Gallery.
4. Konsolidasi uploader di grup Manajemen Konten.
5. Rename Payment Ops menjadi Monitoring Pembayaran dan rapikan tabel aksi.
6. Pagination backend-first untuk tabel operasional utama dashboard admin.
7. Fondasi RBAC admin v1 dengan role default dan matrix permission yang bisa diatur.
8. Penegasan sumber data sertifikat dari template/detail hasil kepribadian.

## Keputusan Produk
- User payment premium: gunakan Midtrans Snap berbasis popup/modal sebagai mode utama.
- Staff session tetap ketat; user test flow dibuat lebih tahan lama lewat keepalive dan retry submit, bukan dengan melonggarkan seluruh auth tanpa kontrol.
- Lockout admin: 3 kali salah login -> lock 15 menit.
- Pagination: backend sebagai sumber utama untuk tabel operasional; list drag-sort CMS menjadi pengecualian.
- RBAC v1: role bawaan `Developer`, `Super Admin`, `Admin`, `Operator`, dengan permission matrix yang bisa diubah oleh Super Admin.

## Ruang Lingkup Implementasi

### 1. Auth dan sesi tes user
- Pertahankan session staff yang ketat.
- Tambahkan mode sesi khusus halaman tes:
  - keepalive lebih sering selama tes aktif;
  - refresh saat tab kembali fokus;
  - retry submit sekali bila kena 401 dan refresh berhasil;
  - autosave jawaban lokal sampai backend benar-benar menyimpan hasil.
- Submit hasil tes hanya dianggap sukses jika `resultId` kembali dari backend.

### 2. Keamanan login admin
- Tambahkan pemeriksaan lockout backend saat login admin.
- Hitung percobaan gagal berdasarkan kombinasi email login dan IP dalam rolling window 15 menit.
- Tampilkan pesan error generik agar tidak membocorkan status akun.
- Catat audit event untuk gagal login, lockout aktif, dan login sukses.

### 3. Upload file dan Media Gallery
- Ganti stub upload backend dengan upload multipart nyata ke folder `uploads`.
- Pastikan file diserve melalui static assets backend dengan URL valid.
- Tambahkan metadata file yang cukup untuk Media Gallery:
  - kategori
  - nama file
  - mime type
  - ukuran
  - sumber upload
- Setelah upload sukses, aset otomatis didaftarkan ke `Media Gallery`.
- Lakukan backfill aset lama dari tabel konten yang sudah punya URL gambar.

### 4. Konsolidasi uploader grup Manajemen Konten
- Semua uploader konten diarahkan ke satu shared upload path.
- Halaman prioritas:
  - Layout Website
  - Hero Slides
  - Produk Homepage
  - Produk Shop
  - Testimonial
  - Kegiatan
  - Banners
  - Artikel
  - Team & Mitra
  - Media Gallery
- Preview gambar harus memakai normalisasi URL yang konsisten untuk local path dan absolute URL.

### 5. Monitoring Pembayaran
- Ubah label UI dari `Payment Ops` menjadi `Monitoring Pembayaran`.
- Ringkas tabel riwayat notifikasi pembayaran:
  - hilangkan horizontal scroll yang disebabkan area aksi;
  - pindahkan aksi ke menu titik-3;
  - pertahankan detail lewat drawer/modal;
  - raw JSON tetap disimpan di backend, tetapi tidak ditampilkan ke admin biasa.
- Istilah pada UI memakai bahasa operasional non-teknikal.

### 6. Pagination
- Buat contract pagination backend standar:
  - `page`
  - `pageSize`
  - `search`
  - `sortBy`
  - `sortOrder`
  - response: `items`, `total`, `page`, `pageSize`, `totalPages`
- Rollout awal di tabel operasional admin:
  - Data Pengguna
  - Data Mitra
  - Data Yayasan
  - Transaksi
  - Laporan Pendapatan
  - Monitoring Pembayaran
  - Hasil Premium
  - Manajemen Admin
- List drag-sort CMS tidak memakai pagination klasik pada tahap awal.

### 7. RBAC admin v1
- Tambahkan lapisan RBAC khusus dashboard admin, tanpa mengubah besar-besaran role bisnis yang sudah ada.
- Role default:
  - Developer: hidden/root-like
  - Super Admin: full access
  - Admin: full access kecuali halaman Manajemen Admin dan Pengaturan
  - Operator: akses operasional tanpa area keuangan
- Permission mencakup:
  - page-level view
  - action-level create/edit/delete/export/approve/replay/toggle/reorder
  - dashboard widget/card access
- Frontend harus membaca permission untuk:
  - sidebar/menu
  - route
  - tombol aksi
  - kartu/grafik dashboard
- Backend tetap menjadi sumber kebenaran otorisasi.

### 8. Sumber data sertifikat
- Rapikan sumber data agar blok sertifikat bisa dilacak jelas dari detail hasil kepribadian.
- Field yang harus eksplisit di template/detail hasil kepribadian:
  - kepribadian
  - karakter
  - kekuatan jatidiri
  - kompilasi adaptasi
  - ciri khas
  - rekomendasi profesi
- Kurangi fallback tersembunyi yang membuat admin bingung asal konten sertifikat.

## Acceptance Criteria
- User bisa mengerjakan tes lama tanpa submit 401 karena sesi tes tetap hidup atau submit berhasil retry.
- Login admin terkunci sementara setelah 3 kali password salah.
- File yang diupload benar-benar tersimpan dan langsung tampil di preview.
- Semua upload konten masuk ke Media Gallery dan bisa dipilih ulang dari galeri.
- Halaman Monitoring Pembayaran lebih ringkas, mudah dipahami, dan tidak punya horizontal scroll karena aksi tabel.
- Tabel admin utama sudah memakai pagination backend dengan default 10 item dan opsi 10/20/50/100.
- Fondasi RBAC tersedia dan siap dipakai untuk gating menu, route, card dashboard, dan tombol aksi.

## Catatan Implementasi
- Perubahan dilakukan bertahap dengan menjaga compat sebanyak mungkin pada API lama.
- Build, smoke test, dan QA flow utama wajib dijalankan setelah setiap kelompok perubahan besar.
