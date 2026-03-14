// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowUpCircle, ArrowDownCircle, Clock, CheckCircle, XCircle,
  Search, ChevronDown, ChevronUp, Loader2, Check, X,
  FileDown, Users2, Building2, Handshake, Code2
} from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { TableSkeleton } from '../../components/ui/loading-spinner';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { useToast } from '../../hooks/use-toast';
import { formatCurrency } from '../../lib/utils';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// ─── Status badge helper ──────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    approved:  { cls: 'bg-green-400/20 text-green-400',  icon: <CheckCircle className="w-3 h-3" />, label: 'Disetujui' },
    pending:   { cls: 'bg-yellow-400/20 text-yellow-400', icon: <Clock className="w-3 h-3" />,        label: 'Menunggu' },
    rejected:  { cls: 'bg-red-400/20 text-red-400',      icon: <XCircle className="w-3 h-3" />,      label: 'Ditolak' },
  };
  const s = map[status] || { cls: 'bg-gray-400/20 text-gray-400', icon: null, label: status };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${s.cls}`}>
      {s.icon}{s.label}
    </span>
  );
}

// ─── Jalur badge ─────────────────────────────────────────────────────────────
function JalurBadge({ jalur }) {
  return jalur === 'yayasan' ?
     <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-purple-400/20 text-purple-400"><Building2 className="w-3 h-3" />Yayasan</span>
    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-blue-400/20 text-blue-400"><Users2 className="w-3 h-3" />Individu</span>;
}

// ─── Disbursement type badge ──────────────────────────────────────────────────
function TypeBadge({ type }) {
  const map = {
    mitra:     { cls: 'bg-orange-400/20 text-orange-400', icon: <Handshake className="w-3 h-3" />, label: 'Mitra' },
    yayasan:   { cls: 'bg-purple-400/20 text-purple-400', icon: <Building2 className="w-3 h-3" />, label: 'Yayasan' },
    developer: { cls: 'bg-cyan-400/20 text-cyan-400',     icon: <Code2 className="w-3 h-3" />,     label: 'Developer' },
  };
  const t = map[type] || { cls: 'bg-gray-400/20 text-gray-400', icon: null, label: type };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${t.cls}`}>
      {t.icon}{t.label}
    </span>
  );
}

// ─── Print-receipt component (hidden in UI, visible when printing) ────────────
function PrintReceipt({ data }) {
  if (!data) return null;
  return (
    <div id="print-receipt" className="hidden print:block print:fixed print:inset-0 print:bg-white print:p-8">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-receipt, #print-receipt * { visibility: visible; }
          #print-receipt { position: fixed; inset: 0; background: white; padding: 2rem; font-family: sans-serif; }
        }
      `}</style>
      <div className="max-w-md mx-auto">
        <div className="text-center border-b-2 border-gray-800 pb-4 mb-4">
          <h1 className="text-2xl font-bold">NEWME CLASS</h1>
          <p className="text-gray-600 text-sm">Bukti Pencairan Dana</p>
        </div>
        <table className="w-full text-sm">
          <tbody>
            {[
              ['No. Referensi', data._id],
              ['Tanggal', data.processedAt ? new Date(data.processedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'],
              ['Penerima', data.name],
              ['Tipe', data.type.toUpperCase()],
              ['Bank', data.bankName],
              ['No. Rekening', data.bankAccount],
              ['Atas Nama', data.accountName],
              ['Jumlah', formatCurrency(data.amount)],
              ['Status', 'DISETUJUI'],
              ['Catatan', data.notes || '-'],
            ].map(([k, v]) => (
              <tr key={k} className="border-b border-gray-200">
                <td className="py-2 text-gray-600 w-40">{k}</td>
                <td className="py-2 font-medium">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-8 pt-4 border-t border-gray-400 text-xs text-gray-500 text-center">
          <p>Dokumen ini dicetak secara otomatis oleh sistem NEWME CLASS.</p>
          <p>Dicetak pada: {new Date().toLocaleString('id-ID')}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function Transaksi() {
  const [activeTab, setActiveTab] = useState('masuk');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Transaksi</h1>
        <p className="text-gray-400 text-sm mt-1">Kelola semua arus keuangan masuk dan keluar</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#1a1a1a] p-1 rounded-lg w-fit">
        <TabButton active={activeTab === 'masuk'} onClick={() => setActiveTab('masuk')}>
          <ArrowUpCircle className="w-4 h-4" />
          Uang Masuk
        </TabButton>
        <TabButton active={activeTab === 'keluar'} onClick={() => setActiveTab('keluar')}>
          <ArrowDownCircle className="w-4 h-4" />
          Uang Keluar
        </TabButton>
      </div>

      {activeTab === 'masuk' ? <UangMasuk /> : <UangKeluar />}
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-colors ${
        active ? 'bg-yellow-400 text-[#1a1a1a]' : 'text-gray-400 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

// ─── Tab 1: Uang Masuk ────────────────────────────────────────────────────────
function UangMasuk() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [jalurFilter, setJalurFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [openRow, setOpenRow] = useState(null);

  const token = () => localStorage.getItem('admin_token');
  const headers = () => ({ Authorization: `Bearer ${token()}` });

  useEffect(() => {
    load();
  }, [jalurFilter, statusFilter, search]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/finance/transactions`, {
        params: { jalur: jalurFilter || undefined, status: statusFilter || undefined, search: search || undefined },
        headers: headers(),
      });
      setData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: data.length,
    pending: data.filter(d => d.status === 'pending').length,
    approved: data.filter(d => d.status === 'approved').length,
    rejected: data.filter(d => d.status === 'rejected').length,
    totalAmount: data.filter(d => d.status === 'approved').reduce((s, d) => s + (d.amount || 0), 0),
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniStat label="Total" value={stats.total} color="text-white" />
        <MiniStat label="Pending" value={stats.pending} color="text-yellow-400" />
        <MiniStat label="Berhasil" value={stats.approved} color="text-green-400" extra={formatCurrency(stats.totalAmount)} />
        <MiniStat label="Ditolak" value={stats.rejected} color="text-red-400" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <Input
            placeholder="Cari nama / email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-[#2a2a2a] text-white border-yellow-400/20"
          />
        </div>
        <FilterSelect value={jalurFilter} onChange={setJalurFilter} label="Jalur" options={[
          { value: '', label: 'Semua Jalur' },
          { value: 'individu', label: 'Individu' },
          { value: 'yayasan', label: 'Yayasan' },
        ]} />
        <FilterSelect value={statusFilter} onChange={setStatusFilter} label="Status" options={[
          { value: '', label: 'Semua Status' },
          { value: 'pending', label: 'Pending' },
          { value: 'approved', label: 'Disetujui' },
          { value: 'rejected', label: 'Ditolak' },
        ]} />
      </div>

      {/* Table — desktop */}
      {loading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : data.length === 0 ? (
        <div className="text-center text-gray-500 py-12">Tidak ada transaksi ditemukan</div>
      ) : (
        <>
          {/* Desktop table */}
          <Card className="bg-[#2a2a2a] border-yellow-400/20 hidden sm:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-yellow-400/10 text-gray-400">
                    <th className="text-left px-4 py-3 font-medium">User</th>
                    <th className="text-left px-4 py-3 font-medium">Jalur</th>
                    <th className="text-right px-4 py-3 font-medium">Jumlah</th>
                    <th className="text-left px-4 py-3 font-medium">Metode</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium">Tanggal</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map(trx => (
                    <tr key={trx._id} className="border-b border-yellow-400/5 hover:bg-[#333]">
                      <td className="px-4 py-3">
                        <p className="text-white font-medium">{trx.user}</p>
                        <p className="text-gray-500 text-xs">{trx.email}</p>
                      </td>
                      <td className="px-4 py-3"><JalurBadge jalur={trx.jalur} /></td>
                      <td className="px-4 py-3 text-right text-yellow-400 font-semibold">{formatCurrency(trx.amount)}</td>
                      <td className="px-4 py-3 text-gray-400">{trx.method}</td>
                      <td className="px-4 py-3"><StatusBadge status={trx.status} /></td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {trx.date ? new Date(trx.date).toLocaleDateString('id-ID') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile accordion */}
          <div className="sm:hidden space-y-2">
            {data.map(trx => (
              <Card key={trx._id} className="bg-[#2a2a2a] border-yellow-400/20">
                <CardContent className="p-0">
                  <button
                    className="w-full p-4 flex items-center justify-between text-left"
                    onClick={() => setOpenRow(openRow === trx._id ? null : trx._id)}
                  >
                    <div>
                      <p className="text-white font-medium">{trx.user}</p>
                      <div className="flex gap-2 mt-1">
                        <JalurBadge jalur={trx.jalur} />
                        <StatusBadge status={trx.status} />
                      </div>
                    </div>
                    <div className="text-right ml-2">
                      <p className="text-yellow-400 font-bold">{formatCurrency(trx.amount)}</p>
                      {openRow === trx._id ? <ChevronUp className="w-4 h-4 text-gray-400 ml-auto mt-1" /> : <ChevronDown className="w-4 h-4 text-gray-400 ml-auto mt-1" />}
                    </div>
                  </button>
                  {openRow === trx._id && (
                    <div className="px-4 pb-4 space-y-1 text-sm border-t border-yellow-400/10 pt-3">
                      <p className="text-gray-400">Email: <span className="text-white">{trx.email}</span></p>
                      <p className="text-gray-400">Metode: <span className="text-white">{trx.method}</span></p>
                      <p className="text-gray-400">Tanggal: <span className="text-white">
                        {trx.date ? new Date(trx.date).toLocaleDateString('id-ID') : '-'}
                      </span></p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Tab 2: Uang Keluar ───────────────────────────────────────────────────────
function UangKeluar() {
  const { toast } = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [openRow, setOpenRow] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, item: null, action: 'approved' });
  const [confirmNotes, setConfirmNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [printData, setPrintData] = useState(null);

  const token = () => localStorage.getItem('admin_token');
  const headers = () => ({ Authorization: `Bearer ${token()}` });

  useEffect(() => {
    load();
  }, [typeFilter, statusFilter, search]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/finance/disbursements`, {
        params: { type: typeFilter || undefined, status: statusFilter || undefined, search: search || undefined },
        headers: headers(),
      });
      setData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openConfirm = (item, action) => {
    setConfirmDialog({ open: true, item, action });
    setConfirmNotes('');
  };

  const handleProcess = async () => {
    if (!confirmDialog.item) return;
    setProcessing(true);
    try {
      await axios.put(
        `${API_URL}/api/finance/disbursements/${confirmDialog.item._id}/process`,
        { status: confirmDialog.action, notes: confirmNotes },
        { headers: headers() }
      );
      toast({
        title: 'Berhasil',
        description: `Pencairan ${confirmDialog.action === 'approved' ? 'disetujui' : 'ditolak'}`
      });
      setConfirmDialog({ open: false, item: null, action: 'approved' });
      load();
    } catch (e) {
      toast({ title: 'Error', description: 'Gagal memproses pencairan', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handlePrint = (item) => {
    setPrintData(item);
    setTimeout(() => window.print(), 100);
  };

  const stats = {
    total: data.length,
    pending: data.filter(d => d.status === 'pending').length,
    approved: data.filter(d => d.status === 'approved').length,
    rejected: data.filter(d => d.status === 'rejected').length,
    totalAmount: data.filter(d => d.status === 'approved').reduce((s, d) => s + (d.amount || 0), 0),
  };

  return (
    <div className="space-y-4">
      {/* Hidden print receipt */}
      <PrintReceipt data={printData} />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniStat label="Total" value={stats.total} color="text-white" />
        <MiniStat label="Pending" value={stats.pending} color="text-yellow-400" />
        <MiniStat label="Selesai" value={stats.approved} color="text-green-400" extra={formatCurrency(stats.totalAmount)} />
        <MiniStat label="Ditolak" value={stats.rejected} color="text-red-400" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <Input
            placeholder="Cari nama penerima..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-[#2a2a2a] text-white border-yellow-400/20"
          />
        </div>
        <FilterSelect value={typeFilter} onChange={setTypeFilter} label="Tipe" options={[
          { value: '', label: 'Semua Tipe' },
          { value: 'mitra', label: 'Mitra' },
          { value: 'yayasan', label: 'Yayasan' },
          { value: 'developer', label: 'Developer' },
        ]} />
        <FilterSelect value={statusFilter} onChange={setStatusFilter} label="Status" options={[
          { value: '', label: 'Semua Status' },
          { value: 'pending', label: 'Pending' },
          { value: 'approved', label: 'Disetujui' },
          { value: 'rejected', label: 'Ditolak' },
        ]} />
      </div>

      {loading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : data.length === 0 ? (
        <div className="text-center text-gray-500 py-12">Tidak ada data pencairan ditemukan</div>
      ) : (
        <>
          {/* Desktop table */}
          <Card className="bg-[#2a2a2a] border-yellow-400/20 hidden sm:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-yellow-400/10 text-gray-400">
                    <th className="text-left px-4 py-3 font-medium">Penerima</th>
                    <th className="text-left px-4 py-3 font-medium">Bank</th>
                    <th className="text-right px-4 py-3 font-medium">Jumlah</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium">Tgl Request</th>
                    <th className="text-right px-4 py-3 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map(item => (
                    <tr key={item._id} className="border-b border-yellow-400/5 hover:bg-[#333]">
                      <td className="px-4 py-3">
                        <TypeBadge type={item.type} />
                        <p className="text-white font-medium mt-1">{item.name}</p>
                        <p className="text-gray-500 text-xs">{item.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-white">{item.bankName}</p>
                        <p className="text-gray-500 text-xs">{item.bankAccount} · {item.accountName}</p>
                      </td>
                      <td className="px-4 py-3 text-right text-yellow-400 font-semibold">{formatCurrency(item.amount)}</td>
                      <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString('id-ID') : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          {item.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => openConfirm(item, 'approved')}
                                className="bg-green-600 hover:bg-green-700 text-white h-7 px-2 text-xs"
                              >
                                <Check className="w-3 h-3 mr-1" />Setuju
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => openConfirm(item, 'rejected')}
                                className="bg-red-600 hover:bg-red-700 text-white h-7 px-2 text-xs"
                              >
                                <X className="w-3 h-3 mr-1" />Tolak
                              </Button>
                            </>
                          )}
                          {item.status === 'approved' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handlePrint(item)}
                              className="text-gray-400 hover:text-white h-7 px-2 text-xs border border-yellow-400/20"
                            >
                              <FileDown className="w-3 h-3 mr-1" />Cetak
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile accordion */}
          <div className="sm:hidden space-y-2">
            {data.map(item => (
              <Card key={item._id} className="bg-[#2a2a2a] border-yellow-400/20">
                <CardContent className="p-0">
                  <button
                    className="w-full p-4 flex items-center justify-between text-left"
                    onClick={() => setOpenRow(openRow === item._id ? null : item._id)}
                  >
                    <div>
                      <TypeBadge type={item.type} />
                      <p className="text-white font-medium mt-1">{item.name}</p>
                      <StatusBadge status={item.status} />
                    </div>
                    <div className="text-right ml-2">
                      <p className="text-yellow-400 font-bold">{formatCurrency(item.amount)}</p>
                      {openRow === item._id ? <ChevronUp className="w-4 h-4 text-gray-400 ml-auto mt-1" /> : <ChevronDown className="w-4 h-4 text-gray-400 ml-auto mt-1" />}
                    </div>
                  </button>
                  {openRow === item._id && (
                    <div className="px-4 pb-4 border-t border-yellow-400/10 pt-3 space-y-2">
                      <div className="text-sm space-y-1">
                        <p className="text-gray-400">Bank: <span className="text-white">{item.bankName}</span></p>
                        <p className="text-gray-400">Rekening: <span className="text-white">{item.bankAccount}</span></p>
                        <p className="text-gray-400">Atas nama: <span className="text-white">{item.accountName}</span></p>
                        <p className="text-gray-400">Tgl Request: <span className="text-white">{item.createdAt ? new Date(item.createdAt).toLocaleDateString('id-ID') : '-'}</span></p>
                      </div>
                      <div className="flex gap-2 pt-1">
                        {item.status === 'pending' && (
                          <>
                            <Button size="sm" onClick={() => openConfirm(item, 'approved')} className="bg-green-600 hover:bg-green-700 text-white text-xs flex-1">
                              <Check className="w-3 h-3 mr-1" />Setuju
                            </Button>
                            <Button size="sm" onClick={() => openConfirm(item, 'rejected')} className="bg-red-600 hover:bg-red-700 text-white text-xs flex-1">
                              <X className="w-3 h-3 mr-1" />Tolak
                            </Button>
                          </>
                        )}
                        {item.status === 'approved' && (
                          <Button size="sm" variant="ghost" onClick={() => handlePrint(item)} className="text-gray-400 hover:text-white text-xs border border-yellow-400/20 flex-1">
                            <FileDown className="w-3 h-3 mr-1" />Cetak Bukti
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Confirm Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={v => setConfirmDialog(d => ({ ...d, open: v }))}>
        <DialogContent className="bg-[#2a2a2a] border-yellow-400/20 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">
              {confirmDialog.action === 'approved' ? 'Setujui Pencairan' : 'Tolak Pencairan'}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {confirmDialog.item && (
                <>
                  <strong className="text-white">{confirmDialog.item.name}</strong> — {formatCurrency(confirmDialog.item.amount)}
                  <br />Bank {confirmDialog.item.bankName} · {confirmDialog.item.bankAccount}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label className="text-white">Catatan (opsional)</Label>
            <Textarea
              value={confirmNotes}
              onChange={e => setConfirmNotes(e.target.value)}
              className="bg-[#1a1a1a] text-white mt-1"
              rows={2}
              placeholder={confirmDialog.action === 'approved' ? 'Misal: Sudah ditransfer' : 'Alasan penolakan...'}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setConfirmDialog(d => ({ ...d, open: false }))} className="text-gray-400 hover:text-white">
              Batal
            </Button>
            <Button
              onClick={handleProcess}
              disabled={processing}
              className={confirmDialog.action === 'approved' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}
            >
              {processing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {confirmDialog.action === 'approved' ? 'Ya, Setujui' : 'Ya, Tolak'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────
function MiniStat({ label, value, color, extra }) {
  return (
    <Card className="bg-[#2a2a2a] border-yellow-400/20">
      <CardContent className="p-3">
        <p className="text-gray-400 text-xs">{label}</p>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        {extra && <p className="text-xs text-gray-500 -mt-0.5">{extra}</p>}
      </CardContent>
    </Card>
  );
}

function FilterSelect({ value, onChange, label, options }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="bg-[#2a2a2a] text-white border border-yellow-400/20 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400"
      aria-label={label}
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

