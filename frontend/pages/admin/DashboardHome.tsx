// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, Building2, CheckCircle2, CreditCard, HandCoins, LayoutDashboard, Loader2, TrendingUp, UserRound, Users, Wallet } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { adminAPI, paymentAPI } from '../../services/api';
import { useToast } from '../../hooks/use-toast';
import PageHeader from '../../components/ui/page-header';
import LoadingSpinner from '../../components/ui/loading-spinner';
import { formatCurrency } from '../../lib/utils';
import EmptyState from '../../components/ui/empty-state';
import { useAdminAccess } from '../../lib/admin-rbac';

const fmt = formatCurrency;
const PIE_COLORS = ['#facc15', '#22c55e', '#38bdf8', '#a855f7', '#f97316'];

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

function CompactMetric({ label, value, tone = 'text-white', note }) {
  return (
    <div className="rounded-xl border border-yellow-400/10 bg-[#1a1a1a] p-4">
      <p className="text-[11px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${tone}`}>{value}</p>
      {note ? <p className="mt-1 text-xs text-gray-500">{note}</p> : null}
    </div>
  );
}

function ActivityItem({ title, subtitle, meta, accent = 'bg-yellow-400', badge }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-yellow-400/10 bg-[#1a1a1a] px-3 py-2.5">
      <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${accent}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold leading-5 text-white">{title}</p>
            {subtitle ? <p className="truncate text-[11px] text-gray-500">{subtitle}</p> : null}
          </div>
          {badge ? <div className="shrink-0">{badge}</div> : null}
        </div>
        {meta ? <p className="mt-1.5 line-clamp-1 text-[11px] text-gray-400">{meta}</p> : null}
      </div>
    </div>
  );
}

const DashboardHome = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);
  const [paymentOps, setPaymentOps] = useState(null);
  const adminAccess = useAdminAccess();
  const showFinance = adminAccess.hasPermission([
    'revenue.view',
    'transactions.view',
    'payment_ops.view',
    'yayasan_withdrawals.view',
    'mitra_withdrawals.view',
  ]);

  useEffect(() => {
    void loadAll();
  }, []);

  const loadAll = async () => {
    setRefreshing(true);
    try {
      const [dashboardRes, paymentOpsRes] = await Promise.all([
        adminAPI.getDashboardStats(),
        paymentAPI.getOpsSummary().catch(() => ({ data: null })),
      ]);

      setStats(dashboardRes.data || null);
      setPaymentOps(paymentOpsRes.data || null);
    } catch (error) {
      toast({ title: 'Gagal memuat dashboard', description: 'Ringkasan sistem belum bisa dimuat saat ini.', variant: 'destructive' });
      setStats(null);
      setPaymentOps(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const summary = stats?.summary || {};
  const charts = stats?.charts || {};
  const recent = stats?.recent || {};
  const registrations = stats?.registrations || { total: 0, recent: [] };
  const contacts = stats?.contacts || { total: 0, recent: [] };

  const roleChart = useMemo(
    () => (Array.isArray(charts.roleDistribution) ? charts.roleDistribution.map((item) => ({ name: item.label, value: item.count })) : []).filter((item) => item.value > 0),
    [charts.roleDistribution],
  );
  const paymentStatusChart = useMemo(
    () => (Array.isArray(charts.paymentStatusDistribution) ? charts.paymentStatusDistribution.map((item) => ({ name: item.key, value: item.count })) : []).filter((item) => item.value > 0),
    [charts.paymentStatusDistribution],
  );

  if (loading) {
    return <LoadingSpinner size="lg" text="Memuat dashboard admin..." className="min-h-[60vh]" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <PageHeader
          icon={LayoutDashboard}
          title="Dashboard"
          description="Ringkasan bisnis dan operasional untuk membantu admin memantau kondisi sistem dari satu halaman."
        />
        <Button onClick={() => void loadAll()} disabled={refreshing} className="bg-yellow-400 text-black hover:bg-yellow-500">
          {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TrendingUp className="mr-2 h-4 w-4" />}
          Refresh Dashboard
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={Users} label="Total User" value={summary.totalUsers || 0} note="User individu terdaftar" color="text-yellow-400" />
        <SummaryCard icon={UserRound} label="Total Mitra" value={summary.totalMitra || 0} note="Mitra yang aktif di sistem" color="text-blue-400" />
        <SummaryCard icon={Building2} label="Total Yayasan" value={summary.totalYayasan || 0} note="Yayasan yang terdaftar" color="text-purple-400" />
        {showFinance ? (
          <SummaryCard icon={CreditCard} label="Pembayaran Sukses" value={summary.successfulPayments || 0} note={`${summary.pendingPayments || 0} masih pending`} color="text-green-400" />
        ) : (
          <SummaryCard icon={CheckCircle2} label="Lead Registrasi" value={registrations.total || 0} note={`${contacts.total || 0} pesan kontak tercatat`} color="text-green-400" />
        )}
      </div>

      {showFinance ? (
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
          <SummaryCard icon={Wallet} label="Revenue NEWME" value={fmt(summary.newmeRevenue || 0)} note="Akumulasi share NEWME" color="text-green-400" />
          <SummaryCard icon={HandCoins} label="Revenue Mitra" value={fmt(summary.mitraRevenue || 0)} note="Akumulasi share mitra" color="text-orange-400" />
          <SummaryCard icon={Building2} label="Revenue Yayasan" value={fmt(summary.yayasanRevenue || 0)} note="Akumulasi share yayasan" color="text-purple-400" />
          <SummaryCard icon={TrendingUp} label="Revenue Total" value={fmt(summary.totalRevenue || 0)} note="Semua transaksi berhasil" color="text-yellow-400" />
        </div>
      ) : null}

      <div className={`grid gap-6 ${showFinance ? 'xl:grid-cols-2' : 'xl:grid-cols-1'}`}>
        <Card className="border-yellow-400/20 bg-[#2a2a2a]">
          <CardHeader>
            <CardTitle className="text-white">Tren Registrasi Pengguna</CardTitle>
            <CardDescription className="text-gray-400">Jumlah user individu baru dalam 6 bulan terakhir.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={charts.userGrowth || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                <XAxis dataKey="label" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" allowDecimals={false} />
                <Tooltip formatter={(value) => [value, 'User Baru']} />
                <Bar dataKey="value" fill="#facc15" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-yellow-400/20 bg-[#2a2a2a]">
          <CardHeader>
            <CardTitle className="text-white">Distribusi Role</CardTitle>
            <CardDescription className="text-gray-400">Komposisi entitas utama yang aktif di sistem.</CardDescription>
          </CardHeader>
          <CardContent>
            {roleChart.length ? (
              <div className="grid items-center gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={roleChart} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={2}>
                      {roleChart.map((item, index) => <Cell key={item.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value) => [value, 'Jumlah']} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                  {roleChart.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between rounded-lg bg-[#1a1a1a] px-3 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                        <span className="text-gray-300">{item.name}</span>
                      </div>
                      <span className="font-medium text-white">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState icon={Users} title="Belum ada data role" className="py-4" />
            )}
          </CardContent>
        </Card>

        {showFinance ? (
        <Card className="border-yellow-400/20 bg-[#2a2a2a]">
          <CardHeader>
            <CardTitle className="text-white">Tren Revenue</CardTitle>
            <CardDescription className="text-gray-400">Pergerakan revenue dalam 6 bulan terakhir.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={charts.revenueTrend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                <XAxis dataKey="label" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip formatter={(value) => [fmt(value), 'Revenue']} />
                <Bar dataKey="value" fill="#22c55e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        ) : null}

        {showFinance ? (
        <Card className="border-yellow-400/20 bg-[#2a2a2a]">
          <CardHeader>
            <CardTitle className="text-white">Status Pembayaran</CardTitle>
            <CardDescription className="text-gray-400">Sebaran status order pembayaran saat ini.</CardDescription>
          </CardHeader>
          <CardContent>
            {paymentStatusChart.length ? (
              <div className="grid items-center gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={paymentStatusChart} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={2}>
                      {paymentStatusChart.map((item, index) => <Cell key={item.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value) => [value, 'Order']} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                  {paymentStatusChart.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between rounded-lg bg-[#1a1a1a] px-3 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                        <span className="text-gray-300">{item.name}</span>
                      </div>
                      <span className="font-medium text-white">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState icon={CreditCard} title="Belum ada data pembayaran" className="py-4" />
            )}
          </CardContent>
        </Card>
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <Card className="border-yellow-400/20 bg-[#2a2a2a] xl:col-span-12">
          <CardHeader>
            <CardTitle className="text-white">Perhatian Operasional</CardTitle>
            <CardDescription className="text-gray-400">Empat indikator yang paling cepat menunjukkan apakah operasional sistem sedang sehat atau perlu ditindaklanjuti.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <CompactMetric
                label="User Baru Hari Ini"
                value={registrations.recent?.length || 0}
                tone="text-yellow-400"
                note="Lead registrasi yang baru tercatat"
              />
              <CompactMetric
                label="Pesan Kontak Baru"
                value={contacts.recent?.length || 0}
                tone="text-blue-400"
                note="Pesan yang masuk dan perlu ditindaklanjuti"
              />
              {showFinance ? (
                <>
                  <CompactMetric
                    label="Alert Aktif"
                    value={summary.openPaymentAlerts || paymentOps?.openAlerts || 0}
                    tone="text-red-400"
                    note="Kasus yang masih perlu perhatian"
                  />
                  <CompactMetric
                    label="Pending Lewat SLA"
                    value={paymentOps?.stalePendingPayments || 0}
                    tone="text-yellow-400"
                    note="Pembayaran belum sinkron tepat waktu"
                  />
                  <CompactMetric
                    label="Antrean Sinkronisasi"
                    value={paymentOps?.queueBacklog || 0}
                    tone="text-blue-400"
                    note="Webhook atau job yang masih menunggu"
                  />
                  <CompactMetric
                    label="Pencairan Menunggu"
                    value={summary.pendingDisbursements || 0}
                    tone="text-purple-400"
                    note="Withdrawal yang belum selesai diproses"
                  />
                </>
              ) : (
                <>
                  <CompactMetric
                    label="Total Lead Registrasi"
                    value={registrations.total || 0}
                    tone="text-green-400"
                    note="Calon pengguna yang sudah meninggalkan data"
                  />
                  <CompactMetric
                    label="Total Pesan Kontak"
                    value={contacts.total || 0}
                    tone="text-yellow-400"
                    note="Pesan masuk yang tercatat di website"
                  />
                </>
              )}
            </div>
            <div className="rounded-xl border border-yellow-400/10 bg-[#1a1a1a] px-4 py-3">
              <p className="text-sm font-semibold text-white">Status cepat</p>
              <p className="mt-1 text-sm text-gray-400">
                {showFinance && (Number(summary.openPaymentAlerts || paymentOps?.openAlerts || 0) > 0 || Number(paymentOps?.stalePendingPayments || 0) > 0)
                  ? 'Ada beberapa hal yang sebaiknya dicek lebih dulu hari ini.'
                  : 'Dashboard ini menampilkan ringkasan utama yang paling relevan untuk operasional harian Anda.'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className={`grid gap-6 ${showFinance ? 'xl:grid-cols-2' : 'xl:grid-cols-1'}`}>
        <Card className="border-yellow-400/20 bg-[#2a2a2a]">
          <CardHeader>
            <CardTitle className="text-white">User Terbaru</CardTitle>
            <CardDescription className="text-gray-400">Pantau user baru yang baru masuk tanpa perlu membuka halaman user secara penuh.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {recent.users?.length ? recent.users.map((item) => (
                <ActivityItem
                  key={item.id}
                  title={item.name || 'User'}
                  subtitle={item.email || '-'}
                  meta={item.createdAt ? `Terdaftar ${new Date(item.createdAt).toLocaleDateString('id-ID')}` : 'Tanggal tidak tersedia'}
                  accent="bg-yellow-400"
                  badge={
                    <span className={`rounded-full px-2.5 py-1 text-[11px] ${
                      String(item.paymentStatus).toUpperCase() === 'APPROVED'
                        ? 'bg-green-400/15 text-green-400'
                        : 'bg-yellow-400/15 text-yellow-400'
                    }`}>
                      {String(item.paymentStatus || 'baru').toLowerCase()}
                    </span>
                  }
                />
              )) : <EmptyState icon={Users} title="Belum ada user terbaru" className="py-4" />}
            </div>
          </CardContent>
        </Card>

        {showFinance ? (
        <Card className="border-yellow-400/20 bg-[#2a2a2a]">
          <CardHeader>
            <CardTitle className="text-white">Transaksi Terbaru</CardTitle>
            <CardDescription className="text-gray-400">Lihat order pembayaran terbaru beserta nominal dan statusnya secara ringkas.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {recent.payments?.length ? recent.payments.map((item) => (
                <ActivityItem
                  key={item.id}
                  title={item.user || 'Pengguna'}
                  subtitle={item.orderId}
                  meta={`${fmt(item.amount || 0)}${item.createdAt ? ` • ${new Date(item.createdAt).toLocaleDateString('id-ID')}` : ''}`}
                  accent="bg-green-400"
                  badge={
                    <span className={`rounded-full px-2.5 py-1 text-[11px] ${
                      String(item.status).toUpperCase() === 'PENDING' || String(item.status).toUpperCase() === 'CREATED'
                        ? 'bg-yellow-400/15 text-yellow-400'
                        : String(item.status).toUpperCase() === 'SUCCESS' || String(item.status).toUpperCase() === 'SETTLEMENT' || String(item.status).toUpperCase() === 'CAPTURE'
                          ? 'bg-green-400/15 text-green-400'
                          : 'bg-gray-400/15 text-gray-300'
                    }`}>
                      {String(item.status || '-')}
                    </span>
                  }
                />
              )) : <EmptyState icon={CreditCard} title="Belum ada transaksi terbaru" className="py-4" />}
            </div>
          </CardContent>
        </Card>
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-yellow-400/20 bg-[#2a2a2a]">
          <CardHeader>
            <CardTitle className="text-white">Lead Registrasi Terbaru</CardTitle>
            <CardDescription className="text-gray-400">{registrations.total || 0} lead registrasi tercatat.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {registrations.recent?.length ? registrations.recent.map((reg) => (
                <div key={reg._id} className="rounded-xl bg-[#1a1a1a] p-4">
                  <p className="font-medium text-white">{reg.name}</p>
                  <p className="text-sm text-gray-500">{reg.email}</p>
                </div>
              )) : <EmptyState icon={Users} title="Belum ada lead registrasi" className="py-4" />}
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-400/20 bg-[#2a2a2a]">
          <CardHeader>
            <CardTitle className="text-white">Pesan Kontak Terbaru</CardTitle>
            <CardDescription className="text-gray-400">{contacts.total || 0} pesan kontak masuk.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {contacts.recent?.length ? contacts.recent.map((contact) => (
                <div key={contact._id} className="rounded-xl bg-[#1a1a1a] p-4">
                  <p className="font-medium text-white">{contact.name}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-gray-400">{contact.message}</p>
                </div>
              )) : <EmptyState icon={BarChart3} title="Belum ada pesan kontak" className="py-4" />}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardHome;
