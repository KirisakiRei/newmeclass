// @ts-nocheck

const ALERT_HELP_MAP = {
  stale_pending_payment: {
    title: 'Pembayaran belum sinkron dengan sistem',
    category: 'Sinkronisasi Pembayaran',
    shortMessage: 'Ada pembayaran yang masih tertunda lebih lama dari waktu normal sinkronisasi.',
    detail:
      'Biasanya ini berarti user sudah memulai pembayaran, tetapi sistem belum menerima hasil akhir yang lengkap. Bisa karena user belum menyelesaikan pembayaran, notifikasi dari gateway terlambat, atau proses sinkronisasi masih menunggu.',
    recommendedAction:
      'Lihat detail order terkait. Jika user mengaku sudah membayar dan status belum berubah, tunggu beberapa menit lalu cek kembali. Jika tetap tertunda, gunakan replay hanya bila log webhook sudah masuk dan gagal diproses.',
    escalation:
      'Laporkan ke developer jika kasus menumpuk, user sudah bayar tetapi status tidak berubah lama, atau halaman payment banyak komplain serupa.',
  },
  invalid_signature_spike: {
    title: 'Banyak notifikasi pembayaran tidak valid',
    category: 'Keamanan Webhook',
    shortMessage: 'Sistem menerima lonjakan notifikasi yang tidak lolos verifikasi keamanan.',
    detail:
      'Ini bisa berarti ada request yang bukan dari Midtrans, ada konfigurasi signature yang tidak cocok, atau ada percobaan request yang tidak sah ke endpoint pembayaran.',
    recommendedAction:
      'Admin cukup memantau dan jangan melakukan replay untuk kasus ini. Pastikan tidak ada user yang terdampak di daftar pembayaran pending. Jika jumlahnya melonjak, segera beri tahu developer.',
    escalation:
      'Wajib eskalasi ke developer bila alert ini muncul berulang atau dalam jumlah besar.',
  },
  queue_backlog: {
    title: 'Antrian sinkronisasi pembayaran menumpuk',
    category: 'Proses Sinkronisasi',
    shortMessage: 'Ada terlalu banyak proses pembayaran yang sedang menunggu untuk disinkronkan.',
    detail:
      'Kondisi ini menandakan antrean kerja di belakang layar sedang padat. User bisa melihat status pembayaran lebih lambat dari biasanya walaupun pembayaran sudah berhasil.',
    recommendedAction:
      'Pantau apakah jumlah antrean turun dalam beberapa menit. Fokus cek order yang paling lama pending. Bila antrean terus naik, eskalasi ke developer.',
    escalation:
      'Laporkan ke developer jika antrean tidak turun atau justru terus meningkat.',
  },
  reconcile_fix_detected: {
    title: 'Sistem memperbaiki data pembayaran secara otomatis',
    category: 'Pemulihan Otomatis',
    shortMessage: 'Sistem reconcile menemukan perbedaan status dan berhasil memperbaikinya.',
    detail:
      'Ini berarti ada beberapa pembayaran yang tidak langsung sinkron saat pertama kali, lalu diperbaiki oleh proses pemeriksaan otomatis.',
    recommendedAction:
      'Tidak perlu tindakan langsung jika jumlahnya kecil. Cukup pantau bila angka ini sering muncul karena itu menandakan sinkronisasi awal belum stabil.',
    escalation:
      'Eskalasi bila jumlah kasus tinggi atau terjadi bersamaan dengan banyak payment pending.',
  },
  webhook_processing_failed: {
    title: 'Notifikasi pembayaran gagal diproses',
    category: 'Proses Webhook',
    shortMessage: 'Sistem menerima notifikasi pembayaran, tetapi gagal menyelesaikan prosesnya.',
    detail:
      'Kasus ini biasanya berarti data notifikasi sudah masuk, namun ada error saat sistem mencoba mengubah status pembayaran atau menjalankan proses lanjutan.',
    recommendedAction:
      'Buka detail kasus. Jika status order belum sesuai dan log sudah lengkap, admin bisa mencoba replay. Jika replay gagal lagi, laporkan ke developer.',
    escalation:
      'Laporkan ke developer jika replay gagal berulang atau error yang sama muncul di banyak order.',
  },
  webhook_error_rate_high: {
    title: 'Terlalu banyak error pada notifikasi pembayaran',
    category: 'Stabilitas Payment',
    shortMessage: 'Persentase error proses notifikasi pembayaran sedang tinggi.',
    detail:
      'Ini menandakan banyak notifikasi payment yang tidak selesai diproses dengan baik dalam jangka waktu singkat.',
    recommendedAction:
      'Admin cukup fokus memantau order yang terkena dampak dan hindari replay massal. Segera sampaikan ke developer agar sumber error diperiksa.',
    escalation:
      'Wajib eskalasi jika alert ini aktif bersamaan dengan antrean menumpuk atau banyak payment user belum sinkron.',
  },
};

const WEBHOOK_STATUS_MAP = {
  RECEIVED: {
    label: 'Baru diterima',
    description: 'Notifikasi pembayaran sudah masuk, tetapi belum mulai diproses.',
    action: 'Tunggu sebentar. Jika terlalu lama tidak berubah, cek apakah antrean sinkronisasi sedang padat.',
  },
  PROCESSING: {
    label: 'Sedang diproses',
    description: 'Sistem sedang menyinkronkan status pembayaran.',
    action: 'Biasanya tidak perlu tindakan. Pantau hanya jika status ini bertahan terlalu lama.',
  },
  PROCESSED: {
    label: 'Berhasil sinkron',
    description: 'Status pembayaran sudah berhasil diproses oleh sistem.',
    action: 'Tidak perlu tindakan.',
  },
  FAILED: {
    label: 'Gagal diproses',
    description: 'Notifikasi masuk, tetapi proses sinkronisasi gagal selesai.',
    action: 'Buka detail dan gunakan replay bila kasusnya memang perlu dicoba ulang.',
  },
  IGNORED: {
    label: 'Tidak perlu diproses ulang',
    description: 'Notifikasi diterima, tetapi tidak mengubah apa pun karena status yang ada sudah lebih aman atau lebih baru.',
    action: 'Tidak perlu tindakan kecuali ada komplain dari user.',
  },
  INVALID: {
    label: 'Notifikasi tidak valid',
    description: 'Request tidak lolos verifikasi keamanan sehingga ditolak sistem.',
    action: 'Tidak bisa direplay. Bila jumlahnya banyak, laporkan ke developer.',
  },
};

const ALERT_STATUS_MAP = {
  OPEN: 'Perlu dicek',
  ACKNOWLEDGED: 'Sedang ditindaklanjuti',
  RESOLVED: 'Sudah selesai',
};

const ALERT_SEVERITY_MAP = {
  INFO: 'Informasi',
  WARNING: 'Perlu perhatian',
  CRITICAL: 'Penting',
};

const WEBHOOK_REASON_MAP = {
  invalid_signature: {
    label: 'Signature Midtrans tidak cocok',
    description:
      'Request ke endpoint webhook ditolak karena signature tidak cocok dengan server key yang aktif. Biasanya berasal dari request non-Midtrans, callback yang salah konfigurasi, atau script QA yang masih memakai key lama.',
    action:
      'Jangan replay dari panel ini. Cek apakah order memang dibayar user, lalu pastikan callback Midtrans dan server key yang dipakai aplikasi sudah sesuai.',
  },
  stale_transition: {
    label: 'Notifikasi lama datang belakangan',
    description:
      'Sistem sengaja mengabaikan notifikasi ini karena status order di database sudah lebih baru atau lebih aman daripada payload yang baru datang.',
    action:
      'Tidak perlu tindakan bila status order saat ini sudah benar. Replay tidak diperlukan untuk kasus ini.',
  },
  failed_transition: {
    label: 'Sinkronisasi status gagal diselesaikan',
    description:
      'Notifikasi payment sudah diterima, tetapi ada error saat sistem mencoba menerapkan perubahan status ke order terkait.',
    action:
      'Buka detail kasus. Jika status order belum benar dan payload notifikasi valid, admin boleh mencoba replay satu kali.',
  },
  unknown_processing_error: {
    label: 'Terjadi error saat memproses notifikasi',
    description:
      'Sistem menerima webhook, tetapi proses lanjutannya berhenti karena error internal yang belum terklasifikasi.',
    action:
      'Cek detail kasus dan eskalasi ke developer bila muncul berulang.',
  },
};

export const PAYMENT_OPS_HELP_TOPICS = Object.entries(ALERT_HELP_MAP).map(([key, value]) => ({
  key,
  ...value,
}));

export function getAlertHelp(alertType) {
  return ALERT_HELP_MAP[alertType] || {
    title: 'Perlu pemeriksaan pembayaran',
    category: 'Operasional Pembayaran',
    shortMessage: 'Ada kondisi pembayaran yang perlu ditinjau admin.',
    detail: 'Buka detail kasus untuk melihat kondisi order dan langkah penanganan yang disarankan.',
    recommendedAction: 'Pantau status order dan lakukan replay hanya bila memang diperlukan.',
    escalation: 'Eskalasi ke developer bila masalah berulang atau berdampak ke banyak user.',
  };
}

export function getAlertDisplay(alert) {
  const help = getAlertHelp(alert?.type);
  const meta = alert?.metadata && typeof alert.metadata === 'object' ? alert.metadata : {};
  let signal = '';

  if (alert?.type === 'stale_pending_payment') {
    const count = Number(meta.count || (Array.isArray(meta.orderIds) ? meta.orderIds.length : 0) || 0);
    signal = count > 0 ? `${count} order masih tertahan saat ini` : `${Number(alert?.hitCount || 1)} kali terdeteksi`;
  } else if (alert?.type === 'invalid_signature_spike') {
    const invalidCount = Number(meta.invalid || 0);
    signal = invalidCount > 0 ? `${invalidCount} request invalid dalam 5 menit` : `${Number(alert?.hitCount || 1)} kali terdeteksi`;
  } else if (alert?.type === 'webhook_error_rate_high') {
    const errorCount = Number(meta.errorWindowCount || 0);
    const errorRate = Number(meta.errorRate || 0);
    signal = errorCount > 0 ? `${errorCount} error (${errorRate}%) dalam 5 menit` : `${Number(alert?.hitCount || 1)} kali terdeteksi`;
  } else if (alert?.type === 'webhook_processing_failed') {
    const attempts = Number(meta.processAttempts || 0);
    signal = attempts > 0 ? `Gagal ${attempts} kali pada webhook ini` : `${Number(alert?.hitCount || 1)} kali terdeteksi`;
  } else if (alert?.hitCount) {
    signal = `${Number(alert.hitCount)} kali terdeteksi`;
  }

  return {
    title: help.title,
    category: help.category,
    message: help.shortMessage,
    detail: help.detail,
    recommendedAction: help.recommendedAction,
    escalation: help.escalation,
    statusLabel: ALERT_STATUS_MAP[String(alert?.status || '').toUpperCase()] || 'Perlu dicek',
    severityLabel: ALERT_SEVERITY_MAP[String(alert?.severity || '').toUpperCase()] || 'Perlu perhatian',
    helpCode: alert?.type || 'general_payment_issue',
    signal,
  };
}

export function getWebhookStatusDisplay(status) {
  return WEBHOOK_STATUS_MAP[String(status || '').toUpperCase()] || {
    label: 'Perlu ditinjau',
    description: 'Status sinkronisasi belum memiliki penjelasan khusus.',
    action: 'Buka detail untuk memastikan kondisi order dan tindakan berikutnya.',
  };
}

export function getWebhookDisplay(row) {
  const statusInfo = getWebhookStatusDisplay(row?.processingStatus);
  const reasonKey = String(row?.lastError || '').trim();
  const reasonInfo = WEBHOOK_REASON_MAP[reasonKey] || null;
  const orderStatus = String(row?.order?.status || row?.statusBeforeProcess || '').toUpperCase();
  let paymentCondition =
    orderStatus === 'SETTLEMENT' || orderStatus === 'SUCCESS' || orderStatus === 'CAPTURE'
      ? 'Pembayaran sudah sukses'
      : orderStatus === 'PENDING' || orderStatus === 'CREATED'
        ? 'Pembayaran masih menunggu'
        : orderStatus
          ? `Status pembayaran ${orderStatus}`
          : 'Status pembayaran belum terbaca';

  if (String(row?.processingStatus || '').toUpperCase() === 'INVALID') {
    paymentCondition =
      orderStatus === 'SETTLEMENT' || orderStatus === 'SUCCESS' || orderStatus === 'CAPTURE'
        ? 'Pembayaran sukses, tetapi request ini ditolak'
        : 'Belum ada notifikasi Midtrans yang sah untuk order ini';
  }

  let impact = 'Belum terlihat dampak langsung ke user.';
  if (String(row?.processingStatus || '').toUpperCase() === 'FAILED') {
    impact = 'Status pembayaran user bisa belum ikut berubah di dashboard.';
  } else if (String(row?.processingStatus || '').toUpperCase() === 'INVALID') {
    impact = 'Tidak ada perubahan status pembayaran karena request ditolak demi keamanan.';
  } else if (String(row?.processingStatus || '').toUpperCase() === 'PROCESSING') {
    impact = 'User mungkin melihat status belum berubah untuk sementara waktu.';
  }

  return {
    statusLabel: statusInfo.label,
    statusDescription: reasonInfo?.description || statusInfo.description,
    action: reasonInfo?.action || statusInfo.action,
    paymentCondition,
    impact,
    eventLabel: row?.eventType ? String(row.eventType).replace(/_/g, ' ') : 'Perubahan status pembayaran',
    attemptsLabel: `${row?.processAttempts || 0} kali percobaan`,
    duplicateLabel: `${row?.duplicateCount || 0} duplikat`,
    reasonLabel: reasonInfo?.label || (reasonKey ? reasonKey.replace(/_/g, ' ') : ''),
    technicalReason: reasonKey || null,
  };
}

export function getSummaryCards(summary) {
  return [
    {
      key: 'incoming',
      label: 'Notifikasi pembayaran masuk',
      value: summary?.incomingWebhooks || 0,
      note: `5 menit: ${summary?.windows?.last5m?.incoming || 0} | 1 jam: ${summary?.windows?.last1h?.incoming || 0}`,
      color: 'text-yellow-400',
    },
    {
      key: 'processed',
      label: 'Berhasil disinkronkan',
      value: summary?.processedWebhooks || 0,
      note: `Rata-rata ${summary?.avgProcessingLatencyMs || 0} ms`,
      color: 'text-green-400',
    },
    {
      key: 'issues',
      label: 'Notifikasi bermasalah',
      value: (summary?.invalidSignatures || 0) + (summary?.failedJobs || 0),
      note: `Ditolak verifikasi ${summary?.invalidSignatures || 0} | gagal proses ${summary?.failedJobs || 0}`,
      color: 'text-red-400',
    },
    {
      key: 'attention',
      label: 'Perlu perhatian admin',
      value: (summary?.stalePendingPayments || 0) + (summary?.openAlerts || 0),
      note: `Pending terlambat ${summary?.stalePendingPayments || 0} | alert aktif ${summary?.openAlerts || 0}`,
      color: 'text-blue-400',
    },
  ];
}
