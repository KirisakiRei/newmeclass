// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Banknote, Building2, Code2, Eye, Handshake, Loader2, TrendingUp, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { StatsSkeleton, TableSkeleton } from '../../components/ui/loading-spinner';
import { useToast } from '../../hooks/use-toast';
import { financeAPI, settingsAPI } from '../../services/api';
import { getApiErrorMessage } from '../../services/api-error';
import { formatCurrency } from '../../lib/utils';
import Pagination from '../../components/ui/pagination';
import { createEmptyPageState, extractPaginatedResponse } from '../../lib/paginated-response';
import { useAdminAccess } from '../../lib/admin-rbac';

const PERIODS = [
  { value: 'this_month', label: 'Bulan Ini' },
  { value: '3_months', label: '3 Bulan' },
  { value: 'this_year', label: 'Tahun Ini' },
  { value: 'all_time', label: 'Semua Waktu' },
];

const COLORS = {
  newmeNet: '#22c55e',
  devFee: '#eab308',
  mitra: '#f97316',
  yayasan: '#a855f7',
};

const fmt = formatCurrency;

const SUCCESS_TRANSACTION_STATUSES = new Set(['approved']);

function getTransactionStatusMeta(status) {
  const normalized = String(status || '').trim().toLowerCase();

  if (normalized === 'approved') {
    return { label: 'Berhasil', className: 'bg-green-400/15 text-green-400', canShowSplit: true };
  }
  if (normalized === 'pending') {
    return { label: 'Pending', className: 'bg-yellow-400/15 text-yellow-400', canShowSplit: false };
  }
  if (normalized === 'cancelled' || normalized === 'canceled') {
    return { label: 'Dibatalkan', className: 'bg-zinc-400/15 text-zinc-300', canShowSplit: false };
  }
  if (normalized === 'expired') {
    return { label: 'Kadaluarsa', className: 'bg-orange-400/15 text-orange-300', canShowSplit: false };
  }
  if (normalized === 'rejected') {
    return { label: 'Ditolak', className: 'bg-red-400/15 text-red-400', canShowSplit: false };
  }

  return { label: 'Gagal', className: 'bg-red-400/15 text-red-400', canShowSplit: false };
}

function SummaryCard({ icon: Icon, label, value, note, color = 'text-white' }) {
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

function BreakdownDialog({ open, onOpenChange, title, data }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl border-yellow-400/20 bg-[#2a2a2a]">
        <DialogHeader>
          <DialogTitle className="text-white">{title}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-auto rounded-lg border border-yellow-400/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-yellow-400/10 text-left text-gray-400">
                <th className="px-4 py-3 font-medium">Nama</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Kode</th>
                <th className="px-4 py-3 text-right font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {(data || []).map((item) => (
                <tr key={item.id || item._id} className="border-b border-yellow-400/5">
                  <td className="px-4 py-3 text-white">{item.name}</td>
                  <td className="px-4 py-3 text-gray-400">{item.email || '-'}</td>
                  <td className="px-4 py-3 font-mono text-yellow-400">{item.referralCode || '-'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-green-400">{fmt(item.amount || 0)}</td>
                </tr>
              ))}
              {!data?.length ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500">Belum ada data untuk periode ini.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SplitDialog({ item, onClose }) {
  if (!item) return null;
  if (!SUCCESS_TRANSACTION_STATUSES.has(String(item.status || '').trim().toLowerCase())) return null;
  const split = item.split || {};
  const total = Math.max(Number(split.grossAmount || item.amount || 0), 0);
  const segments = [
    { label: 'NEWME Net', value: split.newmeNet || 0, color: COLORS.newmeNet },
    { label: 'Developer Fee', value: split.devFee || 0, color: COLORS.devFee },
    { label: 'Mitra', value: split.mitraShare || 0, color: COLORS.mitra },
    { label: 'Yayasan', value: split.yayasanShare || 0, color: COLORS.yayasan },
  ].filter((segment) => segment.value > 0);

  return (
    <Dialog open={!!item} onOpenChange={onClose}>
      <DialogContent className="max-w-xl border-yellow-400/20 bg-[#2a2a2a]">
        <DialogHeader>
          <DialogTitle className="text-white">Detail Split Revenue</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg bg-[#1a1a1a] p-4">
            <p className="text-sm text-gray-400">Pengguna</p>
            <p className="mt-1 text-white">{item.user}</p>
            <p className="text-xs text-gray-500">{item.email || '-'}</p>
            <p className="mt-3 text-sm text-gray-400">Gross Revenue</p>
            <p className="text-2xl font-bold text-yellow-400">{fmt(total)}</p>
            {split.isEstimated ? (
              <p className="mt-2 text-xs text-yellow-300">Split ini masih estimasi karena transaksi belum membentuk revenue ledger final.</p>
            ) : null}
          </div>
          <div className="space-y-3">
            {segments.map((segment) => {
              const pct = total > 0 ? Math.round((segment.value / total) * 100) : 0;
              return (
                <div key={segment.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-300">{segment.label}</span>
                    <span className="font-semibold text-white">{fmt(segment.value)} ({pct}%)</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#1a1a1a]">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: segment.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DeveloperDisbursementDialog({ open, onOpenChange, availableBalance, defaults, loading, onSubmit }) {
  const [form, setForm] = useState({ amount: '', notes: '' });

  useEffect(() => {
    if (open) {
      setForm({ amount: availableBalance ? String(availableBalance) : '', notes: '' });
    }
  }, [availableBalance, open]);

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({
      amount: Number(form.amount || 0),
      notes: form.notes,
      bankName: defaults?.bankName || '',
      bankAccount: defaults?.bankAccount || '',
      accountName: defaults?.accountName || '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-yellow-400/20 bg-[#2a2a2a]">
        <DialogHeader>
          <DialogTitle className="text-white">Ajukan Pencairan Developer Fee</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="rounded-lg bg-[#1a1a1a] p-4 text-sm">
            <p className="text-gray-400">Saldo developer tersedia</p>
            <p className="mt-1 text-2xl font-bold text-yellow-400">{fmt(availableBalance || 0)}</p>
            <p className="mt-2 text-xs text-gray-500">
              Rekening default: {defaults?.bankName || '-'} / {defaults?.bankAccount || '-'} / {defaults?.accountName || '-'}
            </p>
          </div>
          <div>
            <Label className="text-gray-300">Jumlah Pencairan</Label>
            <Input
              type="number"
              min={1}
              value={form.amount}
              onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
              className="bg-[#1a1a1a] text-white"
            />
          </div>
          <div>
            <Label className="text-gray-300">Catatan</Label>
            <Textarea
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              className="min-h-[120px] bg-[#1a1a1a] text-white"
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-yellow-400 text-black hover:bg-yellow-500">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Buat Permintaan Pencairan
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function LaporanPendapatan() {
  const { toast } = useToast();
  const adminAccess = useAdminAccess();
  const [period, setPeriod] = useState('this_month');
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [settingsSummary, setSettingsSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [splitItem, setSplitItem] = useState(null);
  const [breakdownOpen, setBreakdownOpen] = useState({ type: '', open: false });
  const [disbursementOpen, setDisbursementOpen] = useState(false);
  const [submittingDisbursement, setSubmittingDisbursement] = useState(false);
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [transactionsPageSize, setTransactionsPageSize] = useState(10);
  const [transactionsPagination, setTransactionsPagination] = useState(createEmptyPageState(10));
  const canManageRevenue = adminAccess.hasPermission('revenue.manage');

  useEffect(() => {
    void loadSummary();
  }, [period]);

  useEffect(() => {
    void loadTransactions();
  }, [period, transactionsPage, transactionsPageSize]);

  useEffect(() => {
    void settingsAPI.getSystemSummary()
      .then((response) => setSettingsSummary(response.data || null))
      .catch(() => setSettingsSummary(null));
  }, []);

  const loadSummary = async () => {
    setLoading(true);
    try {
      const response = await financeAPI.getRevenue({ period });
      setStats(response.data || null);
    } catch (error) {
      setStats(null);
      toast({ title: 'Gagal memuat laporan', description: getApiErrorMessage(error, 'Ringkasan revenue belum bisa dimuat.'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    setLoadingTransactions(true);
    try {
      const response = await financeAPI.getTransactions({
        period,
        page: transactionsPage,
        pageSize: transactionsPageSize,
      });
      const nextPage = extractPaginatedResponse(response.data, transactionsPageSize);
      setTransactions(nextPage.items || []);
      setTransactionsPagination(nextPage);
    } catch (error) {
      setTransactions([]);
      toast({ title: 'Gagal memuat transaksi', description: getApiErrorMessage(error, 'Riwayat transaksi belum bisa dimuat.'), variant: 'destructive' });
    } finally {
      setLoadingTransactions(false);
    }
  };

  const handleCreateDisbursement = async (payload) => {
    if (!canManageRevenue) return;
    if (!payload.amount) {
      toast({ title: 'Jumlah belum valid', description: 'Masukkan nominal pencairan developer yang valid.', variant: 'destructive' });
      return;
    }
    setSubmittingDisbursement(true);
    try {
      await financeAPI.createDeveloperDisbursement(payload);
      toast({ title: 'Permintaan dibuat', description: 'Permintaan pencairan developer berhasil dikirim ke tab uang keluar.' });
      setDisbursementOpen(false);
      await loadSummary();
    } catch (error) {
      toast({ title: 'Gagal membuat pencairan', description: getApiErrorMessage(error, 'Permintaan pencairan developer belum berhasil dibuat.'), variant: 'destructive' });
    } finally {
      setSubmittingDisbursement(false);
    }
  };

  const chartData = useMemo(() => ([
    { name: 'NEWME Net', value: stats?.newmeNet || 0, color: COLORS.newmeNet },
    { name: 'Developer Fee', value: stats?.devFee || 0, color: COLORS.devFee },
    { name: 'Mitra', value: stats?.mitraRevenue || 0, color: COLORS.mitra },
    { name: 'Yayasan', value: stats?.yayasanRevenue || 0, color: COLORS.yayasan },
  ]).filter((item) => item.value > 0), [stats]);

  const breakdownData = breakdownOpen.type === 'mitra' ? stats?.mitraBreakdown : stats?.yayasanBreakdown;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Laporan Pendapatan</h1>
          <p className="mt-1 text-sm text-gray-400">Semua angka pada halaman ini sekarang dibentuk langsung dari backend finance dan revenue ledger.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((item) => (
            <button
              key={item.value}
              onClick={() => setPeriod(item.value)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                period === item.value ? 'bg-yellow-400 text-black' : 'border border-yellow-400/20 bg-[#2a2a2a] text-gray-300 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? <StatsSkeleton /> : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard icon={TrendingUp} label="Gross Revenue" value={fmt(stats?.totalAmount || 0)} note={`${stats?.totalCount || 0} transaksi sukses`} color="text-yellow-400" />
            <SummaryCard icon={Users} label="Jalur Individu" value={fmt(stats?.individuAmount || 0)} note={`${stats?.individuCount || 0} transaksi`} color="text-blue-400" />
            <SummaryCard icon={Building2} label="Jalur Yayasan" value={fmt(stats?.yayasanAmount || 0)} note={`${stats?.yayasanCount || 0} transaksi`} color="text-purple-400" />
            <SummaryCard icon={Banknote} label="NEWME Net" value={fmt(stats?.newmeNet || 0)} note={`Developer fee ${fmt(stats?.devFee || 0)}`} color="text-green-400" />
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_420px]">
            <Card className="border-yellow-400/20 bg-[#2a2a2a]">
              <CardHeader>
                <CardTitle className="text-white">Distribusi Revenue</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <button onClick={() => setBreakdownOpen({ type: 'mitra', open: true })} className="rounded-xl border border-yellow-400/10 bg-[#1a1a1a] p-4 text-left transition hover:border-orange-400/40">
                      <div className="flex items-center gap-3">
                        <Handshake className="h-5 w-5 text-orange-400" />
                        <div>
                          <p className="text-xs text-gray-400">Revenue Mitra</p>
                          <p className="mt-1 text-lg font-bold text-orange-400">{fmt(stats?.mitraRevenue || 0)}</p>
                        </div>
                      </div>
                    </button>
                    <button onClick={() => setBreakdownOpen({ type: 'yayasan', open: true })} className="rounded-xl border border-yellow-400/10 bg-[#1a1a1a] p-4 text-left transition hover:border-purple-400/40">
                      <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-purple-400" />
                        <div>
                          <p className="text-xs text-gray-400">Revenue Yayasan</p>
                          <p className="mt-1 text-lg font-bold text-purple-400">{fmt(stats?.yayasanRevenue || 0)}</p>
                        </div>
                      </div>
                    </button>
                    <button onClick={() => canManageRevenue && setDisbursementOpen(true)} className={`rounded-xl border border-yellow-400/10 bg-[#1a1a1a] p-4 text-left transition ${canManageRevenue ? 'hover:border-yellow-400/40' : 'cursor-default opacity-70'}`}>
                      <div className="flex items-center gap-3">
                        <Code2 className="h-5 w-5 text-yellow-400" />
                        <div>
                          <p className="text-xs text-gray-400">Saldo Developer</p>
                          <p className="mt-1 text-lg font-bold text-yellow-400">{fmt(stats?.devFeeBalance || 0)}</p>
                        </div>
                      </div>
                    </button>
                  </div>

                  <div className="rounded-xl border border-yellow-400/10 bg-[#1a1a1a] p-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <p className="text-xs text-gray-400">Developer Fee Terkumpul</p>
                        <p className="mt-1 text-lg font-bold text-yellow-400">{fmt(stats?.devFee || 0)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Developer Fee Dalam Proses</p>
                        <p className="mt-1 text-lg font-bold text-white">{fmt(stats?.developerReserved || 0)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Developer Fee Dicairkan</p>
                        <p className="mt-1 text-lg font-bold text-green-400">{fmt(stats?.developerDisbursed || 0)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Fee Rate Backend</p>
                        <p className="mt-1 text-lg font-bold text-white">{settingsSummary?.developerFee?.percent ?? stats?.devFeePercent ?? 5}%</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-yellow-400/10 bg-[#1a1a1a] p-4">
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={68} outerRadius={100} paddingAngle={2}>
                        {chartData.map((item) => <Cell key={item.name} fill={item.color} />)}
                      </Pie>
                      <Tooltip formatter={(value) => fmt(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {chartData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-gray-300">{item.name}</span>
                        </div>
                        <span className="font-medium text-white">{fmt(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-yellow-400/20 bg-[#2a2a2a]">
              <CardHeader>
                <CardTitle className="text-white">Konfigurasi Aktif</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="rounded-lg bg-[#1a1a1a] p-4">
                  <p className="text-xs text-gray-400">Gateway Pembayaran Backend</p>
                  <p className="mt-1 font-semibold text-white">{settingsSummary?.paymentGateway?.activeProvider || 'MIDTRANS'}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    Mode: {settingsSummary?.paymentGateway?.mode || 'sandbox'} • {settingsSummary?.paymentGateway?.isConfigured ? 'sudah dikonfigurasi' : 'belum lengkap'}
                  </p>
                </div>
                <div className="rounded-lg bg-[#1a1a1a] p-4">
                  <p className="text-xs text-gray-400">Harga Tes Premium</p>
                  <p className="mt-1 font-semibold text-yellow-400">{fmt(settingsSummary?.pricing?.testPrice || 99000)}</p>
                  <p className="mt-1 text-xs text-gray-500">Jalur yayasan tetap memakai total {fmt(settingsSummary?.pricing?.referralTotalPrice || 250000)} dengan budget share {fmt(settingsSummary?.pricing?.referralShareBudget || 150000)}.</p>
                </div>
                <div className="rounded-lg bg-[#1a1a1a] p-4">
                  <p className="text-xs text-gray-400">Rekening Developer</p>
                  <p className="mt-1 text-white">{settingsSummary?.developerFee?.bankName || '-'} / {settingsSummary?.developerFee?.bankAccount || '-'}</p>
                  <p className="mt-1 text-xs text-gray-500">{settingsSummary?.developerFee?.accountName || 'Belum diisi'}</p>
                </div>
                <div className="rounded-lg border border-yellow-400/20 bg-yellow-400/10 p-4 text-xs text-yellow-200">
                  Semua flow pembayaran aktif saat ini menggunakan Midtrans. Harga premium individu mengikuti nilai `paymentAmount` dari settings backend.
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <Card className="border-yellow-400/20 bg-[#2a2a2a]">
        <CardHeader>
          <CardTitle className="text-white">Riwayat Transaksi</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loadingTransactions ? <TableSkeleton rows={6} cols={6} /> : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-yellow-400/10 text-left text-gray-400">
                    <th className="px-4 py-3 font-medium">Tanggal</th>
                    <th className="px-4 py-3 font-medium">Pengguna</th>
                    <th className="px-4 py-3 font-medium">Jalur</th>
                    <th className="px-4 py-3 font-medium">Metode</th>
                    <th className="px-4 py-3 text-right font-medium">Nominal</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 text-center font-medium">Split</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((trx) => {
                    const statusMeta = getTransactionStatusMeta(trx.status);
                    return (
                    <tr key={trx.id || trx._id} className="border-b border-yellow-400/5">
                      <td className="px-4 py-3 text-xs text-gray-400">{trx.date ? new Date(trx.date).toLocaleString('id-ID') : '-'}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-white">{trx.user}</p>
                        <p className="text-xs text-gray-500">{trx.email || '-'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs ${trx.jalur === 'yayasan' ? 'bg-purple-400/15 text-purple-400' : 'bg-blue-400/15 text-blue-400'}`}>
                          {trx.jalur === 'yayasan' ? 'Yayasan' : 'Individu'}
                        </span>
                      </td>
                      <td className="px-4 py-3 uppercase text-gray-300">{trx.method}</td>
                      <td className="px-4 py-3 text-right font-semibold text-yellow-400">{fmt(trx.amount || 0)}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs ${statusMeta.className}`}>
                          {statusMeta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {statusMeta.canShowSplit ? (
                          <Button variant="outline" size="sm" className="border-yellow-400/30 text-yellow-400" onClick={() => setSplitItem(trx)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Lihat
                          </Button>
                        ) : (
                          <span className="text-xs text-gray-500">Tidak tersedia</span>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                  {!transactions.length ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-gray-500">Belum ada transaksi yang bisa ditampilkan.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Pagination
        currentPage={transactionsPagination.page}
        totalPages={transactionsPagination.totalPages}
        totalItems={transactionsPagination.total}
        pageSize={transactionsPagination.pageSize}
        onPageChange={setTransactionsPage}
        onPageSizeChange={(nextSize) => {
          setTransactionsPageSize(nextSize);
          setTransactionsPage(1);
        }}
      />

      <BreakdownDialog
        open={breakdownOpen.open}
        onOpenChange={(open) => setBreakdownOpen((current) => ({ ...current, open }))}
        title={breakdownOpen.type === 'mitra' ? 'Breakdown Revenue Mitra' : 'Breakdown Revenue Yayasan'}
        data={breakdownData}
      />
      <SplitDialog item={splitItem} onClose={() => setSplitItem(null)} />
      <DeveloperDisbursementDialog
        open={canManageRevenue && disbursementOpen}
        onOpenChange={setDisbursementOpen}
        availableBalance={stats?.devFeeBalance || 0}
        defaults={settingsSummary?.developerFee}
        loading={submittingDisbursement}
        onSubmit={handleCreateDisbursement}
      />
    </div>
  );
}
