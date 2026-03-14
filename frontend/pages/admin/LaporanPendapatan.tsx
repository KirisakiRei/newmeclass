// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import {
  TrendingUp, DollarSign, Users, Building2, Handshake,
  ChevronRight, Banknote, Loader2, Eye
} from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { StatsSkeleton, TableSkeleton } from '../../components/ui/loading-spinner';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { useToast } from '../../hooks/use-toast';
import { formatCurrency } from '../../lib/utils';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const PERIODS = [
  { value: 'this_month', label: 'Bulan Ini' },
  { value: '3_months', label: '3 Bulan' },
  { value: 'this_year', label: 'Tahun Ini' },
  { value: 'all_time', label: 'Semua Waktu' },
];

const C = {
  newmeNet: '#22c55e',
  devFee:   '#eab308',
  mitra:    '#f97316',
  yayasan:  '#a855f7',
};

function calcSplit(trx, pct = 5) {
  if (trx.split) return trx.split;
  if (trx.jalur === 'individu') {
    const devFee = Math.round(trx.amount * pct / 100);
    return { devFee, newmeNet: trx.amount - devFee };
  }
  const newmeShare  = Math.round(trx.amount * 0.5);
  const mitraShare  = Math.round(trx.amount * 0.35);
  const yayasanShare = trx.amount - newmeShare - mitraShare;
  const devFee = Math.round(newmeShare * pct / 100);
  return { newmeShare, mitraShare, yayasanShare, devFee, newmeNet: newmeShare - devFee };
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function LaporanPendapatan() {
  const { toast } = useToast();
  const [period, setPeriod] = useState('this_month');
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingTrx, setLoadingTrx] = useState(true);
  const [splitItem, setSplitItem] = useState(null);
  const [cairkanModal, setCairkanModal] = useState(false);
  const [cairkanForm, setCairkanForm] = useState({ amount: '', notes: '' });
  const [siteSettings, setSiteSettings] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [mitraModal, setMitraModal] = useState(false);
  const [yayasanModal, setYayasanModal] = useState(false);

  const token   = () => localStorage.getItem('admin_token');
  const headers = () => ({ Authorization: `Bearer ${token()}` });

  useEffect(() => { loadStats(); loadTransactions(); }, [period]);
  useEffect(() => {
    axios.get(`${API_URL}/api/settings`).then(r => setSiteSettings(r.data)).catch(() => {});
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/finance/revenue`, { params: { period }, headers: headers() });
      setStats(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadTransactions = async () => {
    setLoadingTrx(true);
    try {
      const res = await axios.get(`${API_URL}/api/finance/transactions`, { headers: headers() });
      setTransactions(res.data);
    } catch (e) { console.error(e); }
    finally { setLoadingTrx(false); }
  };

  const openCairkan = () => {
    setCairkanForm({ amount: String(safeStats.devFeeBalance || ''), notes: '' });
    setCairkanModal(true);
  };

  const handleCairkan = async () => {
    const amount = parseFloat(cairkanForm.amount);
    if (!amount || amount <= 0) {
      toast({ title: 'Error', description: 'Masukkan jumlah yang valid', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(
        `${API_URL}/api/finance/disbursements/developer`,
        { amount, notes: cairkanForm.notes, bankName: siteSettings.devBankName || '', bankAccount: siteSettings.devBankAccount || '', accountName: siteSettings.devAccountName || '' },
        { headers: headers() }
      );
      toast({ title: 'Berhasil', description: 'Permintaan pencairan berhasil dibuat. Cek tab Uang Keluar.' });
      setCairkanModal(false);
      loadStats();
    } catch (e) {
      toast({ title: 'Error', description: 'Gagal membuat permintaan pencairan', variant: 'destructive' });
    } finally { setSubmitting(false); }
  };

  const safeStats = stats || {};
  const devFeePercent = siteSettings.devFeePercent || 5;
  const approvedTotal = (safeStats.newmeNet || 0) + (safeStats.devFee || 0) + (safeStats.mitraRevenue || 0) + (safeStats.yayasanRevenue || 0);
  const chartData = stats ? [
    { name: 'NEWME Net', value: safeStats.newmeNet || 0, color: C.newmeNet },
    { name: 'Dev Fee',   value: safeStats.devFee || 0, color: C.devFee   },
    { name: 'Mitra',    value: safeStats.mitraRevenue || 0, color: C.mitra    },
    { name: 'Yayasan',  value: safeStats.yayasanRevenue || 0, color: C.yayasan },
  ] : [];

  return (
    <div className="space-y-8">
      {/* Header + Period Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Laporan Pendapatan</h1>
          <p className="text-gray-400 text-sm mt-1">Ringkasan distribusi pendapatan NEWME CLASS</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                period === p.value ?
                   'bg-yellow-400 text-[#1a1a1a]'
                  : 'bg-[#2a2a2a] text-gray-400 hover:text-white border border-yellow-400/20'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <StatsSkeleton />
      ) : !stats ? (
        <div className="text-center text-gray-400 py-20">Gagal memuat data</div>
      ) : (
        <>
          {/* ── Sec 1: Ringkasan Pemasukan Kotor ─────────────────────────── */}
          <section className="space-y-3">
            <SectionTitle icon="📊" title="Ringkasan Pemasukan Kotor (Gross)" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <GrossCard label="Total Transaksi"     value={formatCurrency(safeStats.totalAmount    || 0)} sub={`${safeStats.totalCount    || 0} Transaksi`} icon={<DollarSign className="w-5 h-5 text-yellow-400" />} accent="yellow" />
              <GrossCard label="Transaksi Individu"  value={formatCurrency(safeStats.individuAmount || 0)} sub={`${safeStats.individuCount || 0} Transaksi`} icon={<Users      className="w-5 h-5 text-blue-400"   />} accent="blue"   />
              <GrossCard label="Transaksi Yayasan"   value={formatCurrency(safeStats.yayasanAmount  || 0)} sub={`${safeStats.yayasanCount  || 0} Transaksi`} icon={<Building2  className="w-5 h-5 text-purple-400" />} accent="purple" />
            </div>
          </section>

          {/* ── Sec 2: Distribusi Pendapatan ─────────────────────────────── */}
          <section className="space-y-3">
            <SectionTitle icon="🥧" title="Distribusi Pendapatan (Revenue Split — Approved)" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Donut Chart */}
              <Card className="bg-[#2a2a2a] border-yellow-400/20">
                <CardContent className="p-4">
                  <p className="text-gray-500 text-xs text-center mb-2">Dari total transaksi disetujui: {formatCurrency(approvedTotal)}</p>
                  <div className="relative">
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                        <Pie
                          data={chartData.filter(d => d.value > 0)}
                          cx="50%" cy="50%"
                          innerRadius={68} outerRadius={105}
                          paddingAngle={2}
                          dataKey="value"
                          strokeWidth={0}
                        >
                          {chartData.filter(d => d.value > 0).map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload.length) return null;
                            const pct = approvedTotal > 0 ? Math.round(payload[0].value / approvedTotal * 100) : 0;
                            return (
                              <div className="bg-[#1a1a1a] border border-yellow-400/30 rounded-lg px-3 py-2 text-sm shadow-xl">
                                <p className="text-gray-300 font-medium">{payload[0].name}</p>
                                <p className="text-yellow-400 font-bold">{formatCurrency(payload[0].value)}</p>
                                <p className="text-gray-500">{pct}% dari approved</p>
                              </div>
                            );
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Center label (absolute overlay) */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wide">Total Gross</p>
                      <p className="text-[15px] font-bold text-white leading-tight">{formatCurrency(safeStats.totalAmount || 0)}</p>
                      <p className="text-[10px] text-gray-500">{safeStats.totalCount || 0} transaksi</p>
                    </div>
                  </div>
                  {/* Chart legend */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-4">
                    {chartData.map((item) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-gray-400 text-xs">{item.name}</span>
                        <span className="text-white text-xs font-medium ml-auto">{formatCurrency(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Revenue Cards */}
              <div className="flex flex-col gap-3">
                <RevenueCard label="NEWME Net Revenue" value={safeStats.newmeNet || 0}       note="Setelah dikurangi dev fee"          color={C.newmeNet} icon={<TrendingUp className="w-4 h-4" />} />
                <RevenueCard label="Total Mitra Revenue" value={safeStats.mitraRevenue || 0} note="Klik untuk detail per mitra"         color={C.mitra}   icon={<Handshake  className="w-4 h-4" />} clickable onClick={() => setMitraModal(true)} />
                <RevenueCard label="Total Yayasan Revenue" value={safeStats.yayasanRevenue || 0} note="Klik untuk detail per yayasan"    color={C.yayasan} icon={<Building2  className="w-4 h-4" />} clickable onClick={() => setYayasanModal(true)} />
              </div>
            </div>
          </section>

          {/* ── Sec 3: Saldo Developer ───────────────────────────────────── */}
          <section className="space-y-3">
            <SectionTitle icon="💰" title="Saldo Developer" />
            <Card className="bg-[#2a2a2a] border-yellow-400/30">
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-yellow-400/20 rounded-xl flex items-center justify-center shrink-0">
                      <Banknote className="w-6 h-6 text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Dev Maintenance Fee Tersedia</p>
                      <p className="text-3xl font-bold text-yellow-400 mt-0.5">{formatCurrency(safeStats.devFeeBalance || 0)}</p>
                      <p className="text-gray-500 text-xs mt-1">
                        Akumulasi periode ini: <span className="text-white">{formatCurrency(safeStats.devFee || 0)}</span>
                        {' '}· Fee rate: <span className="text-white">{devFeePercent}%</span>
                      </p>
                    </div>
                  </div>
                  <Button onClick={openCairkan} className="bg-yellow-400 text-[#1a1a1a] hover:bg-yellow-300 font-semibold shrink-0">
                    Cairkan Dev Fee
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        </>
      )}

      {/* ── Sec 4: Riwayat Transaksi ─────────────────────────────────────── */}
      <section className="space-y-3">
        <SectionTitle icon="📋" title="Riwayat Transaksi (Detail)" />
        <Card className="bg-[#2a2a2a] border-yellow-400/20">
          {loadingTrx ? (
            <TableSkeleton rows={5} cols={6} />
          ) : transactions.length === 0 ? (
            <div className="text-center text-gray-500 py-10">Belum ada transaksi</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-yellow-400/10 text-gray-400">
                    <th className="text-left px-4 py-3 font-medium">Tanggal</th>
                    <th className="text-left px-4 py-3 font-medium">Pengguna</th>
                    <th className="text-left px-4 py-3 font-medium">Jenis</th>
                    <th className="text-right px-4 py-3 font-medium">Nominal</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-center px-4 py-3 font-medium">Distribusi</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(trx => (
                    <tr key={trx._id} className="border-b border-yellow-400/5 hover:bg-[#333] transition-colors">
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                        {trx.date ? new Date(trx.date).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-white font-medium">{trx.user}</p>
                        <p className="text-gray-500 text-xs">{trx.email}</p>
                      </td>
                      <td className="px-4 py-3"><JalurBadge jalur={trx.jalur} /></td>
                      <td className="px-4 py-3 text-right text-yellow-400 font-semibold whitespace-nowrap">{formatCurrency(trx.amount)}</td>
                      <td className="px-4 py-3"><TrxStatus status={trx.status} /></td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setSplitItem(trx)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#1a1a1a] border border-yellow-400/20 text-yellow-400 text-xs font-medium hover:bg-yellow-400/10 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />Lihat Split
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      <SplitDetailModal transaction={splitItem} devFeePercent={devFeePercent} onClose={() => setSplitItem(null)} />
      <BreakdownModal open={mitraModal}   onClose={() => setMitraModal(false)}   title="Breakdown Revenue Mitra"   data={safeStats.mitraBreakdown || []} />
      <BreakdownModal open={yayasanModal} onClose={() => setYayasanModal(false)} title="Breakdown Revenue Yayasan" data={safeStats.yayasanBreakdown || []} />
      <CairkanModal
        open={cairkanModal} onClose={() => setCairkanModal(false)}
        stats={stats} siteSettings={siteSettings}
        cairkanForm={cairkanForm} setCairkanForm={setCairkanForm}
        submitting={submitting} onSubmit={handleCairkan}
      />
    </div>
  );
}

// ─── Section Title ────────────────────────────────────────────────────────────
function SectionTitle({ icon, title }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-base">{icon}</span>
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{title}</h2>
      <div className="flex-1 h-px bg-yellow-400/10" />
    </div>
  );
}

// ─── Gross Stat Card ─────────────────────────────────────────────────────────
const ACCENT = {
  yellow: { bg: 'bg-yellow-400/10', border: 'border-yellow-400/30' },
  blue:   { bg: 'bg-blue-400/10',   border: 'border-blue-400/20'   },
  purple: { bg: 'bg-purple-400/10', border: 'border-purple-400/20' },
};
function GrossCard({ label, value, sub, icon, accent }) {
  const a = ACCENT[accent] || ACCENT.yellow;
  return (
    <Card className={`bg-[#2a2a2a] ${a.border}`}>
      <CardContent className="p-4 flex items-center gap-4">
        <div className={`w-12 h-12 ${a.bg} rounded-xl flex items-center justify-center shrink-0`}>{icon}</div>
        <div>
          <p className="text-gray-400 text-xs">{label}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-gray-500 text-xs mt-0.5">{sub}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Revenue Card (right of donut) ───────────────────────────────────────────
function RevenueCard({ label, value, note, color, icon, onClick, clickable }) {
  return (
    <Card
      className={`bg-[#2a2a2a] border-yellow-400/20 flex-1 transition-all ${
        clickable ? 'cursor-pointer hover:border-yellow-400/40 hover:bg-[#313131]' : ''
      }`}
      onClick={clickable ? onClick : undefined}
    >
      <CardContent className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}25`, color }}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-gray-400 text-xs">{label}</p>
          <p className="text-xl font-bold text-white">{formatCurrency(value)}</p>
          <p className="text-gray-500 text-xs mt-0.5">{note}</p>
        </div>
        {clickable && <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" />}
      </CardContent>
    </Card>
  );
}

// ─── Badges ──────────────────────────────────────────────────────────────────
function JalurBadge({ jalur }) {
  return jalur === 'yayasan' ?
     <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-purple-400/20 text-purple-400"><Building2 className="w-3 h-3" />Yayasan</span>
    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-blue-400/20 text-blue-400"><Users className="w-3 h-3" />Individu</span>;
}
function TrxStatus({ status }) {
  const m = { approved: ['bg-green-400/20 text-green-400', 'Sukses'], pending: ['bg-yellow-400/20 text-yellow-400', 'Menunggu'], rejected: ['bg-red-400/20 text-red-400', 'Ditolak'] };
  const [cls, lbl] = m[status] || ['bg-gray-400/20 text-gray-400', status];
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{lbl}</span>;
}

// ─── Split Bar Row ────────────────────────────────────────────────────────────
function SplitRow({ label, amount, total, color, note }) {
  const pct = total > 0 ? Math.round(amount / total * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
          <span className="text-sm text-gray-300 truncate">{label}</span>
          {note && <span className="text-xs text-gray-500 shrink-0">{note}</span>}
        </div>
        <div className="flex items-baseline gap-2 shrink-0">
          <span className="text-white font-semibold">{formatCurrency(amount)}</span>
          <span className="text-gray-500 text-xs w-8 text-right">{pct}%</span>
        </div>
      </div>
      <div className="w-full bg-[#1a1a1a] rounded-full h-2">
        <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

// ─── Split Detail Modal ───────────────────────────────────────────────────────
function SplitDetailModal({ transaction, devFeePercent, onClose }) {
  if (!transaction) return null;
  const split = calcSplit(transaction, devFeePercent);
  const isYayasan = transaction.jalur === 'yayasan';
  return (
    <Dialog open={!!transaction} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="bg-[#2a2a2a] border-yellow-400/20 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Detail Distribusi Pembayaran</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          {/* Transaction header card */}
          <div className="bg-[#1a1a1a] rounded-xl p-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-white font-semibold">{transaction.user}</p>
              <p className="text-gray-500 text-xs mt-0.5">{transaction.email}</p>
              <div className="mt-2"><JalurBadge jalur={transaction.jalur} /></div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-yellow-400 text-2xl font-bold">{formatCurrency(transaction.amount)}</p>
              <TrxStatus status={transaction.status} />
            </div>
          </div>

          {/* Split breakdown */}
          <div>
            <p className="text-gray-500 text-[10px] font-semibold uppercase tracking-widest mb-3">Distribusi</p>
            {!isYayasan ? (
              // ── Individu ────────────────────────────────────────────────
              <div className="space-y-4">
                <SplitRow label="Dev Maintenance Fee" amount={split.devFee   || 0} total={transaction.amount} color={C.devFee}   note={`(${devFeePercent}%)`} />
                <SplitRow label="NEWME Net Revenue"   amount={split.newmeNet || 0} total={transaction.amount} color={C.newmeNet} note={`(${100 - devFeePercent}%)`} />
              </div>
            ) : (
              // ── Yayasan ─────────────────────────────────────────────────
              <div className="space-y-4">
                {/* NEWME Share + sub breakdown */}
                <div className="space-y-2">
                  <SplitRow label="NEWME Share" amount={split.newmeShare || 0} total={transaction.amount} color={C.newmeNet} />
                  <div className="ml-5 pl-3 border-l-2 border-green-500/20 space-y-1.5">
                    <div className="flex justify-between items-center py-1.5 px-3 bg-[#1a1a1a] rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-yellow-400" />
                        <span className="text-gray-400 text-xs">↳ Dev Fee ({devFeePercent}%)</span>
                      </div>
                      <span className="text-yellow-400 text-sm font-medium">{formatCurrency(split.devFee || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 px-3 bg-[#1a1a1a] rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-gray-400 text-xs">↳ NEWME Net</span>
                      </div>
                      <span className="text-green-400 text-sm font-medium">{formatCurrency(split.newmeNet || 0)}</span>
                    </div>
                  </div>
                </div>
                <SplitRow
                  label="Mitra"
                  amount={split.mitraShare || 0}
                  total={transaction.amount}
                  color={C.mitra}
                  note={transaction.split.mitraName ? `— ${transaction.split.mitraName}` : ''}
                />
                <SplitRow
                  label="Yayasan"
                  amount={split.yayasanShare || 0}
                  total={transaction.amount}
                  color={C.yayasan}
                  note={transaction.split.yayasanName ? `— ${transaction.split.yayasanName}` : ''}
                />
              </div>
            )}
          </div>

          {/* Total verification row */}
          <div className="flex justify-between items-center bg-[#1a1a1a] rounded-xl px-4 py-3 border border-yellow-400/10">
            <span className="text-gray-400 text-sm font-medium">Total</span>
            <span className="text-yellow-400 font-bold text-lg">{formatCurrency(transaction.amount)}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Breakdown Modal (Mitra / Yayasan) ───────────────────────────────────────
function BreakdownModal({ open, onClose, title, data }) {
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="bg-[#2a2a2a] border-yellow-400/20 text-white max-w-lg">
        <DialogHeader><DialogTitle className="text-white">{title}</DialogTitle></DialogHeader>
        <div className="max-h-80 overflow-y-auto">
          {data.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-yellow-400/10">
                  <th className="text-left py-2 font-medium">Nama</th>
                  <th className="text-right py-2 font-medium">Transaksi</th>
                  <th className="text-right py-2 font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item, i) => (
                  <tr key={i} className="border-b border-yellow-400/5">
                    <td className="py-2.5 text-white">{item.name}</td>
                    <td className="py-2.5 text-right text-gray-400">{item.count}</td>
                    <td className="py-2.5 text-right text-yellow-400 font-semibold">{formatCurrency(item.revenue)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-yellow-400/20">
                  <td className="py-2 text-gray-400 font-medium">Total</td>
                  <td className="py-2 text-right text-gray-400">{data.reduce((s, d) => s + d.count, 0)}</td>
                  <td className="py-2 text-right text-yellow-400 font-bold">{formatCurrency(data.reduce((s, d) => s + d.revenue, 0))}</td>
                </tr>
              </tfoot>
            </table>
          ) : (
            <p className="text-gray-400 text-center py-8">Belum ada data</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Cairkan Modal ────────────────────────────────────────────────────────────
function CairkanModal({ open, onClose, stats, siteSettings, cairkanForm, setCairkanForm, submitting, onSubmit }) {
  const safeStats = stats || {};

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="bg-[#2a2a2a] border-yellow-400/20 text-white">
        <DialogHeader><DialogTitle className="text-white">Cairkan Dev Maintenance Fee</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="bg-[#1a1a1a] rounded-lg p-3 text-sm">
            <p className="text-gray-400 text-xs mb-1">Rekening Tujuan</p>
            {siteSettings.devBankName ? (
              <>
                <p className="text-white font-medium">{siteSettings.devBankName}</p>
                <p className="text-gray-400">{siteSettings.devBankAccount} · a/n {siteSettings.devAccountName}</p>
              </>
            ) : (
              <p className="text-yellow-400">Rekening developer belum diatur. Silakan atur di <a href="/admin/settings" className="underline">Pengaturan</a>.</p>
            )}
          </div>
          <div>
            <Label className="text-white">Jumlah (IDR)</Label>
            <Input type="number" value={cairkanForm.amount} onChange={e => setCairkanForm(f => ({ ...f, amount: e.target.value }))} className="bg-[#1a1a1a] text-white mt-1" placeholder="Masukkan jumlah..." />
            <p className="text-xs text-gray-500 mt-1">Saldo tersedia: <span className="text-yellow-400">{formatCurrency(safeStats.devFeeBalance || 0)}</span></p>
          </div>
          <div>
            <Label className="text-white">Catatan (opsional)</Label>
            <Textarea value={cairkanForm.notes} onChange={e => setCairkanForm(f => ({ ...f, notes: e.target.value }))} className="bg-[#1a1a1a] text-white mt-1" rows={2} placeholder="Contoh: Pencairan dev fee bulan Maret 2026" />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" onClick={onClose} className="text-gray-400 hover:text-white">Batal</Button>
            <Button onClick={onSubmit} disabled={submitting} className="bg-yellow-400 text-[#1a1a1a] hover:bg-yellow-300">
              {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Cairkan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
