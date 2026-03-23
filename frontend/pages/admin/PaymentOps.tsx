// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { ActivitySquare, AlertTriangle, CheckCircle2, Clock3, HelpCircle, Loader2, MoreHorizontal, RefreshCw, RotateCcw, Search, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { TableSkeleton } from '../../components/ui/loading-spinner';
import { paymentAPI } from '../../services/api';
import { getApiErrorMessage } from '../../services/api-error';
import { useToast } from '../../hooks/use-toast';
import { getAlertDisplay, getSummaryCards, getWebhookDisplay } from '../../lib/payment-ops';
import Pagination from '../../components/ui/pagination';
import { createEmptyPageState, extractPaginatedResponse } from '../../lib/paginated-response';
import { useAdminAccess } from '../../lib/admin-rbac';

function MetricCard({ icon: Icon, label, value, note, color = 'text-white' }) {
  return (
    <Card className="border-yellow-400/20 bg-[#2a2a2a]">
      <CardContent className="flex items-start gap-3 p-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1a1a1a]">
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-gray-400">{label}</p>
          <p className={`mt-1 text-xl font-bold ${color}`}>{value}</p>
          {note ? <p className="mt-1 text-xs text-gray-500">{note}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

function AlertStatusBadge({ value }) {
  const normalized = String(value || '').toUpperCase();
  const styles = {
    OPEN: 'bg-red-400/15 text-red-400',
    ACKNOWLEDGED: 'bg-yellow-400/15 text-yellow-400',
    RESOLVED: 'bg-green-400/15 text-green-400',
  };
  const label = {
    OPEN: 'Perlu dicek',
    ACKNOWLEDGED: 'Sedang ditindaklanjuti',
    RESOLVED: 'Sudah selesai',
  };
  return <span className={`rounded-full px-2.5 py-1 text-xs ${styles[normalized] || 'bg-gray-400/15 text-gray-300'}`}>{label[normalized] || 'Perlu dicek'}</span>;
}

function SeverityBadge({ value }) {
  const normalized = String(value || '').toUpperCase();
  const styles = {
    INFO: 'bg-blue-400/15 text-blue-400',
    WARNING: 'bg-yellow-400/15 text-yellow-400',
    CRITICAL: 'bg-red-400/15 text-red-400',
  };
  const label = {
    INFO: 'Informasi',
    WARNING: 'Perlu perhatian',
    CRITICAL: 'Penting',
  };
  return <span className={`rounded-full px-2.5 py-1 text-xs ${styles[normalized] || 'bg-gray-400/15 text-gray-300'}`}>{label[normalized] || 'Perlu perhatian'}</span>;
}

function DetailDialog({ item, onClose }) {
  if (!item) return null;
  const display = getWebhookDisplay(item);

  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl border-yellow-400/20 bg-[#2a2a2a]">
        <DialogHeader>
          <DialogTitle className="text-white">Ringkasan kasus webhook</DialogTitle>
          <DialogDescription className="text-gray-400">
            Detail ini membantu admin memahami kondisi sinkronisasi pembayaran dan langkah tindak lanjut yang paling aman.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg bg-[#1a1a1a] p-4">
              <p className="text-xs text-gray-400">Order ID</p>
              <p className="mt-1 break-all font-mono text-sm text-yellow-400">{item.orderId || '-'}</p>
            </div>
            <div className="rounded-lg bg-[#1a1a1a] p-4">
              <p className="text-xs text-gray-400">Kondisi sinkronisasi</p>
              <p className="mt-1 font-semibold text-white">{display.statusLabel}</p>
            </div>
            <div className="rounded-lg bg-[#1a1a1a] p-4">
              <p className="text-xs text-gray-400">Kondisi pembayaran</p>
              <p className="mt-1 font-semibold text-white">{display.paymentCondition}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg bg-[#1a1a1a] p-4">
              <p className="text-sm font-semibold text-white">Apa yang terjadi?</p>
              <p className="mt-2 text-sm text-gray-300">{display.statusDescription}</p>
            </div>
            <div className="rounded-lg bg-[#1a1a1a] p-4">
              <p className="text-sm font-semibold text-white">Dampak ke user</p>
              <p className="mt-2 text-sm text-gray-300">{display.impact}</p>
            </div>
            <div className="rounded-lg bg-[#1a1a1a] p-4">
              <p className="text-sm font-semibold text-white">Yang disarankan untuk admin</p>
              <p className="mt-2 text-sm text-gray-300">{display.action}</p>
            </div>
            <div className="rounded-lg bg-[#1a1a1a] p-4">
              <p className="text-sm font-semibold text-white">Informasi tambahan</p>
              <div className="mt-2 space-y-1 text-sm text-gray-300">
                <p>Event: {display.eventLabel}</p>
                <p>Ringkasan teknis: {display.reasonLabel || 'Tidak ada catatan teknis khusus'}</p>
                <p>Percobaan proses: {item.processAttempts || 0} kali</p>
                <p>Duplikat notifikasi: {item.duplicateCount || 0}</p>
                <p>Waktu diterima: {item.receivedAt ? new Date(item.receivedAt).toLocaleString('id-ID') : '-'}</p>
                <p>Catatan teknis: {display.technicalReason || 'Tidak ada catatan error'}</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function PaymentOps() {
  const { toast } = useToast();
  const adminAccess = useAdminAccess();
  const [summary, setSummary] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [webhooks, setWebhooks] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [loadingWebhooks, setLoadingWebhooks] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alertFilter, setAlertFilter] = useState({ severity: '', status: 'ACTIVE', search: '' });
  const [webhookFilter, setWebhookFilter] = useState({ status: '', search: '' });
  const [alertsPage, setAlertsPage] = useState(1);
  const [alertsPageSize, setAlertsPageSize] = useState(10);
  const [alertsPagination, setAlertsPagination] = useState(createEmptyPageState(10));
  const [webhooksPage, setWebhooksPage] = useState(1);
  const [webhooksPageSize, setWebhooksPageSize] = useState(10);
  const [webhooksPagination, setWebhooksPagination] = useState(createEmptyPageState(10));
  const [selectedWebhook, setSelectedWebhook] = useState(null);
  const [replayingId, setReplayingId] = useState('');
  const [acknowledgingId, setAcknowledgingId] = useState('');
  const [openActionMenuId, setOpenActionMenuId] = useState('');
  const canManagePaymentOps = adminAccess.hasPermission('payment_ops.manage');

  useEffect(() => {
    void loadAll();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadAlerts(), 200);
    return () => window.clearTimeout(timer);
  }, [alertFilter.severity, alertFilter.status, alertFilter.search, alertsPage, alertsPageSize]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadWebhooks(), 200);
    return () => window.clearTimeout(timer);
  }, [webhookFilter.status, webhookFilter.search, webhooksPage, webhooksPageSize]);

  const loadSummary = async () => {
    setLoadingSummary(true);
    try {
      const response = await paymentAPI.getOpsSummary();
      setSummary(response.data || null);
    } catch (error) {
      setSummary(null);
      toast({ title: 'Gagal memuat ringkasan', description: getApiErrorMessage(error, 'Ringkasan operasional pembayaran belum bisa dimuat.'), variant: 'destructive' });
    } finally {
      setLoadingSummary(false);
    }
  };

  const loadAlerts = async () => {
    setLoadingAlerts(true);
    try {
      const response = await paymentAPI.getOpsAlerts({
        ...alertFilter,
        page: alertsPage,
        pageSize: alertsPageSize,
      });
      const nextPage = extractPaginatedResponse(response.data, alertsPageSize);
      setAlerts(nextPage.items || []);
      setAlertsPagination(nextPage);
    } catch (error) {
      setAlerts([]);
      setAlertsPagination(createEmptyPageState(alertsPageSize));
      toast({ title: 'Gagal memuat daftar perhatian', description: getApiErrorMessage(error, 'Daftar kasus yang perlu diperhatikan belum bisa dimuat.'), variant: 'destructive' });
    } finally {
      setLoadingAlerts(false);
    }
  };

  const loadWebhooks = async () => {
    setLoadingWebhooks(true);
    try {
      const response = await paymentAPI.getOpsWebhooks({
        ...webhookFilter,
        page: webhooksPage,
        pageSize: webhooksPageSize,
      });
      const nextPage = extractPaginatedResponse(response.data, webhooksPageSize);
      setWebhooks(nextPage.items || []);
      setWebhooksPagination(nextPage);
    } catch (error) {
      setWebhooks([]);
      setWebhooksPagination(createEmptyPageState(webhooksPageSize));
      toast({ title: 'Gagal memuat riwayat notifikasi', description: getApiErrorMessage(error, 'Riwayat notifikasi pembayaran belum bisa dimuat.'), variant: 'destructive' });
    } finally {
      setLoadingWebhooks(false);
    }
  };

  const loadAll = async () => {
    setRefreshing(true);
    await Promise.all([loadSummary(), loadAlerts(), loadWebhooks()]);
    setRefreshing(false);
  };

  const handleAcknowledge = async (id) => {
    if (!canManagePaymentOps) return;
    setAcknowledgingId(id);
    try {
      await paymentAPI.acknowledgeOpsAlert(id);
      toast({ title: 'Sudah ditandai', description: 'Kasus ini sudah ditandai sedang ditindaklanjuti.' });
      await Promise.all([loadAlerts(), loadSummary()]);
    } catch (error) {
      toast({ title: 'Gagal menandai kasus', description: getApiErrorMessage(error, 'Kasus ini belum bisa ditandai saat ini.'), variant: 'destructive' });
    } finally {
      setAcknowledgingId('');
    }
  };

  const handleReplay = async (id) => {
    if (!canManagePaymentOps) return;
    setReplayingId(id);
    try {
      await paymentAPI.replayWebhook(id);
      toast({ title: 'Replay dikirim', description: 'Sistem akan mencoba memproses ulang notifikasi pembayaran ini.' });
      await loadAll();
    } catch (error) {
      toast({ title: 'Replay gagal', description: getApiErrorMessage(error, 'Notifikasi ini belum bisa diproses ulang.'), variant: 'destructive' });
    } finally {
      setReplayingId('');
    }
  };

  const summaryCards = useMemo(() => getSummaryCards(summary), [summary]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Monitoring Pembayaran</h1>
          <p className="mt-1 text-sm text-gray-400">
            Halaman ini membantu admin memantau apakah pembayaran user sudah masuk dan sudah berhasil sinkron ke sistem.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
            <Link to="/admin/payment-ops/help">
            <Button variant="outline" className="border-yellow-400/30 text-yellow-400">
              <HelpCircle className="mr-2 h-4 w-4" />
              Bantuan
            </Button>
          </Link>
          <Button onClick={loadAll} disabled={refreshing} className="bg-yellow-400 text-black hover:bg-yellow-500">
            {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
        </div>
      </div>

      <Card className="border-yellow-400/20 bg-[#2a2a2a]">
        <CardContent className="grid gap-4 p-5 md:grid-cols-3">
          <div className="rounded-xl bg-[#1a1a1a] p-4">
            <p className="text-sm font-semibold text-white">Yang perlu admin fokuskan</p>
            <p className="mt-2 text-sm text-gray-300">Utamakan cek pembayaran yang sudah terlalu lama tertunda dan kasus yang gagal diproses.</p>
          </div>
          <div className="rounded-xl bg-[#1a1a1a] p-4">
            <p className="text-sm font-semibold text-white">Kapan cukup menunggu</p>
            <p className="mt-2 text-sm text-gray-300">Kalau status masih baru masuk atau sedang diproses, biasanya cukup dipantau beberapa menit terlebih dahulu.</p>
          </div>
          <div className="rounded-xl bg-[#1a1a1a] p-4">
            <p className="text-sm font-semibold text-white">Kapan perlu bantuan developer</p>
            <p className="mt-2 text-sm text-gray-300">Jika kasus serupa muncul berulang, antrean menumpuk, atau user mengaku sudah bayar tetapi status lama tidak berubah.</p>
          </div>
        </CardContent>
      </Card>

      {loadingSummary ? <TableSkeleton rows={2} cols={4} /> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { icon: ActivitySquare, card: summaryCards[0] },
            { icon: CheckCircle2, card: summaryCards[1] },
            { icon: AlertTriangle, card: summaryCards[2] },
            { icon: Clock3, card: summaryCards[3] },
          ].map(({ icon, card }) => {
            const { key, ...rest } = card || {};
            return <MetricCard key={key || rest.label} icon={icon} {...rest} />;
          })}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <Card className="border-yellow-400/20 bg-[#2a2a2a]">
          <CardHeader>
            <CardTitle className="text-white">Kasus yang perlu perhatian</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Input
                value={alertFilter.search}
                onChange={(event) => {
                  setAlertsPage(1);
                  setAlertFilter((current) => ({ ...current, search: event.target.value }));
                }}
                placeholder="Cari order atau jenis masalah..."
                className="bg-[#1a1a1a] text-white"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <select value={alertFilter.severity} onChange={(event) => {
                  setAlertsPage(1);
                  setAlertFilter((current) => ({ ...current, severity: event.target.value }));
                }} className="rounded-lg border border-yellow-400/20 bg-[#1a1a1a] px-3 py-2 text-sm text-white">
                  <option value="">Semua prioritas</option>
                  <option value="INFO">Informasi</option>
                  <option value="WARNING">Perlu perhatian</option>
                  <option value="CRITICAL">Penting</option>
                </select>
                <select value={alertFilter.status} onChange={(event) => {
                  setAlertsPage(1);
                  setAlertFilter((current) => ({ ...current, status: event.target.value }));
                }} className="rounded-lg border border-yellow-400/20 bg-[#1a1a1a] px-3 py-2 text-sm text-white">
                  <option value="ACTIVE">Kasus aktif</option>
                  <option value="OPEN">Perlu dicek</option>
                  <option value="ACKNOWLEDGED">Sedang ditindaklanjuti</option>
                  <option value="RESOLVED">Sudah selesai</option>
                </select>
              </div>
            </div>

            {loadingAlerts ? <TableSkeleton rows={4} cols={2} /> : (
              <div className="space-y-3">
                {alerts.map((alert) => {
                  const display = getAlertDisplay(alert);
                  return (
                    <div key={alert.id} className="rounded-xl border border-yellow-400/10 bg-[#1a1a1a] p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <SeverityBadge value={alert.severity} />
                        <AlertStatusBadge value={alert.status} />
                        {display.signal ? <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-gray-300">{display.signal}</span> : null}
                        <span className="text-xs text-gray-500">{alert.lastTriggeredAt ? new Date(alert.lastTriggeredAt).toLocaleString('id-ID') : '-'}</span>
                      </div>
                      <p className="mt-3 text-xs uppercase tracking-wide text-yellow-400">{display.category}</p>
                      <p className="mt-1 font-semibold text-white">{display.title}</p>
                      <p className="mt-1 text-sm text-gray-400">{display.message}</p>
                      <div className="mt-3 rounded-lg bg-[#121212] p-3">
                        <p className="text-xs font-semibold text-white">Saran tindakan</p>
                        <p className="mt-1 text-xs text-gray-400">{display.recommendedAction}</p>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                        <span>{alert.orderId || display.helpCode}</span>
                        <div className="flex flex-wrap gap-2">
                          <Link to={`/admin/payment-ops/help?topic=${display.helpCode}#${display.helpCode}`}>
                            <Button size="sm" variant="outline" className="border-blue-400/30 text-blue-300">
                              <HelpCircle className="mr-2 h-4 w-4" />
                              Lihat Penjelasan
                            </Button>
                          </Link>
                          {canManagePaymentOps && String(alert.status).toUpperCase() !== 'RESOLVED' ? (
                            <Button size="sm" variant="outline" className="border-yellow-400/30 text-yellow-400" disabled={acknowledgingId === alert.id} onClick={() => handleAcknowledge(alert.id)}>
                              {acknowledgingId === alert.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                              Tandai sudah dicek
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {!alerts.length ? <div className="rounded-xl border border-dashed border-yellow-400/20 p-8 text-center text-sm text-gray-500">Saat ini tidak ada kasus aktif yang perlu perhatian admin.</div> : null}
              </div>
            )}
            {!loadingAlerts ? (
              <Pagination
                currentPage={alertsPagination.page}
                totalPages={alertsPagination.totalPages}
                totalItems={alertsPagination.total}
                pageSize={alertsPagination.pageSize}
                onPageChange={setAlertsPage}
                onPageSizeChange={(nextSize) => {
                  setAlertsPageSize(nextSize);
                  setAlertsPage(1);
                }}
                pageSizeOptions={[5, 10, 20, 50]}
                compact
              />
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-yellow-400/20 bg-[#2a2a2a]">
          <CardHeader>
            <CardTitle className="text-white">Riwayat notifikasi pembayaran</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <div className="relative min-w-[220px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input value={webhookFilter.search} onChange={(event) => {
                  setWebhooksPage(1);
                  setWebhookFilter((current) => ({ ...current, search: event.target.value }));
                }} placeholder="Cari order, transaction, atau IP..." className="bg-[#1a1a1a] pl-9 text-white" />
              </div>
              <select value={webhookFilter.status} onChange={(event) => {
                setWebhooksPage(1);
                setWebhookFilter((current) => ({ ...current, status: event.target.value }));
              }} className="rounded-lg border border-yellow-400/20 bg-[#1a1a1a] px-3 py-2 text-sm text-white">
                <option value="">Semua kondisi sinkronisasi</option>
                <option value="RECEIVED">Baru diterima</option>
                <option value="PROCESSING">Sedang diproses</option>
                <option value="PROCESSED">Berhasil sinkron</option>
                <option value="FAILED">Gagal diproses</option>
                <option value="IGNORED">Tidak perlu diproses ulang</option>
                <option value="INVALID">Notifikasi tidak valid</option>
              </select>
            </div>

            {loadingWebhooks ? <TableSkeleton rows={6} cols={6} /> : (
              <div className="overflow-auto">
                <table className="w-full table-fixed text-sm">
                  <thead>
                    <tr className="border-b border-yellow-400/10 text-left text-gray-400">
                      <th className="w-[16%] px-4 py-3 font-medium">Waktu masuk</th>
                      <th className="w-[22%] px-4 py-3 font-medium">Order</th>
                      <th className="w-[20%] px-4 py-3 font-medium">Kondisi pembayaran</th>
                      <th className="w-[24%] px-4 py-3 font-medium">Sinkronisasi</th>
                      <th className="w-[18%] px-4 py-3 text-right font-medium">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {webhooks.map((row) => {
                      const display = getWebhookDisplay(row);
                      return (
                        <tr key={row.id} className="border-b border-yellow-400/5">
                          <td className="px-4 py-3 text-xs text-gray-400">{row.receivedAt ? new Date(row.receivedAt).toLocaleString('id-ID') : '-'}</td>
                          <td className="px-4 py-3">
                            <p className="truncate font-mono text-xs text-yellow-400">{row.orderId || '-'}</p>
                            <p className="truncate text-xs text-gray-500">{display.eventLabel}</p>
                          </td>
                          <td className="px-4 py-3 text-sm text-white">
                            <p className="line-clamp-2">{display.paymentCondition}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-white">{display.statusLabel}</p>
                            <p className="line-clamp-2 text-xs text-gray-400">{display.reasonLabel || display.statusDescription}</p>
                            {display.technicalReason ? <p className="mt-0.5 text-[11px] text-gray-600">{display.technicalReason}</p> : null}
                          </td>
                          <td className="px-4 py-3">
                            <div className="relative flex justify-end">
                              <button
                                type="button"
                                onClick={() => setOpenActionMenuId((current) => current === row.id ? '' : row.id)}
                                className="rounded-lg border border-yellow-400/20 p-2 text-gray-300 transition-colors hover:border-yellow-400/40 hover:text-yellow-400"
                                aria-label="Buka aksi"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                              {openActionMenuId === row.id ? (
                                <div className="absolute right-0 top-11 z-20 min-w-[200px] rounded-xl border border-yellow-400/20 bg-[#171717] p-2 shadow-2xl">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedWebhook(row);
                                      setOpenActionMenuId('');
                                    }}
                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white transition-colors hover:bg-white/5"
                                  >
                                    Detail kasus
                                  </button>
                                  <Link
                                    to={`/admin/payment-ops/help?topic=${row.processingStatus === 'FAILED' ? 'webhook_processing_failed' : row.processingStatus === 'INVALID' ? 'invalid_signature_spike' : 'stale_pending_payment'}#${row.processingStatus === 'FAILED' ? 'webhook_processing_failed' : row.processingStatus === 'INVALID' ? 'invalid_signature_spike' : 'stale_pending_payment'}`}
                                    onClick={() => setOpenActionMenuId('')}
                                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-blue-300 transition-colors hover:bg-white/5"
                                  >
                                    Lihat bantuan
                                  </Link>
                                  {canManagePaymentOps ? <button
                                    type="button"
                                    disabled={!row.orderId || row.processingStatus === 'INVALID' || replayingId === row.id}
                                    onClick={() => {
                                      void handleReplay(row.id);
                                      setOpenActionMenuId('');
                                    }}
                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-green-300 transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {replayingId === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                                    Proses ulang webhook
                                  </button> : null}
                                </div>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {!webhooks.length ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-gray-500">Belum ada riwayat notifikasi yang cocok dengan filter ini.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            )}
            {!loadingWebhooks ? (
              <Pagination
                currentPage={webhooksPagination.page}
                totalPages={webhooksPagination.totalPages}
                totalItems={webhooksPagination.total}
                pageSize={webhooksPagination.pageSize}
                onPageChange={setWebhooksPage}
                onPageSizeChange={(nextSize) => {
                  setWebhooksPageSize(nextSize);
                  setWebhooksPage(1);
                }}
                pageSizeOptions={[10, 20, 50, 100]}
              />
            ) : null}
          </CardContent>
        </Card>
      </div>

      <DetailDialog item={selectedWebhook} onClose={() => setSelectedWebhook(null)} />
    </div>
  );
}
