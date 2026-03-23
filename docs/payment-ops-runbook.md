# Payment Ops Runbook

## Tujuan
- Memastikan webhook Midtrans tercatat, diproses, dan bisa direplay tanpa menggandakan efek bisnis.
- Memberi tim admin satu tempat untuk memantau health payment tanpa harus membuka database.

## Dashboard Admin
- Buka `Admin > Keuangan > Payment Ops`.
- Cek kartu utama:
  - `Incoming 24 Jam`
  - `Processed`
  - `Duplicate / Invalid`
  - `Backlog / Stale Pending`
- Jika `queue backlog`, `invalid signature`, atau `stale pending` naik, cek tabel `Alert Internal` dan `Webhook Log`.

## Arti Alert
- `invalid_signature_spike`: ada lonjakan payload tidak valid ke notification URL.
- `payment_queue_backlog`: antrian payment worker menumpuk.
- `stale_pending_payment`: order masih pending melebihi SLA 5 menit.
- `payment_reconcile_fix_detected`: reconcile menemukan mismatch yang harus diperhatikan.
- `webhook_processing_failed`: webhook gagal diproses dan perlu review atau replay.
- `webhook_error_rate_high`: error rate webhook meningkat dalam jendela 5 menit.

## Langkah Saat Ada Masalah
1. Buka alert dan catat `orderId` atau `webhookInboxId`.
2. Cari item terkait di tabel `Webhook Log`.
3. Baca `lastError`, `processAttempts`, dan status order saat ini.
4. Jika payload valid tetapi processing gagal, gunakan tombol `Replay`.
5. Jika replay berhasil dan status order sudah final, alert akan resolved otomatis.
6. Jika backlog queue tinggi, cek Redis/worker dan health endpoint backend.

## Kapan Pakai Replay
- Pakai replay jika webhook valid sudah masuk, tetapi processing gagal atau perlu dijalankan ulang.
- Jangan replay webhook dengan status `INVALID`.
- Jangan replay berulang-ulang tanpa melihat `lastError`, karena itu hanya menambah load queue.

## Kapan Pakai Reconcile
- Gunakan reconcile jika order masih `pending` tetapi dicurigai sudah berubah di Midtrans.
- Reconcile otomatis tetap berjalan lewat cron.
- Jika reconcile memperbaiki banyak order dalam waktu singkat, cek notification URL dan health Redis.

## Checklist Production
- `MIDTRANS_SERVER_KEY` dan `MIDTRANS_IS_PRODUCTION` sudah benar.
- Notification URL Midtrans menunjuk ke `POST /api/payments/midtrans/webhook`.
- Redis sehat dan queue `payment` tidak backlog tinggi.
- Health endpoint backend menunjukkan database, redis, dan `paymentOps` dalam kondisi baik.
