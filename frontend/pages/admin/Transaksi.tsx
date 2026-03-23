// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Building2, CheckCircle, Clock, Code2, Handshake, Loader2, Search, Users2, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { TableSkeleton } from '../../components/ui/loading-spinner';
import { financeAPI } from '../../services/api';
import { getApiErrorMessage } from '../../services/api-error';
import { useToast } from '../../hooks/use-toast';
import { formatCurrency } from '../../lib/utils';
import Pagination from '../../components/ui/pagination';
import { createEmptyPageState, extractPaginatedResponse } from '../../lib/paginated-response';
import { useAdminAccess } from '../../lib/admin-rbac';

const fmt = formatCurrency;

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
        active ? 'bg-yellow-400 text-black' : 'text-gray-300 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

function MiniCard({ label, value, note, color = 'text-white' }) {
  return (
    <Card className="border-yellow-400/20 bg-[#2a2a2a]">
      <CardContent className="p-4">
        <p className="text-xs text-gray-400">{label}</p>
        <p className={`mt-1 text-xl font-bold ${color}`}>{value}</p>
        {note ? <p className="mt-1 text-xs text-gray-500">{note}</p> : null}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'approved') {
    return <span className="inline-flex items-center gap-1 rounded-full bg-green-400/15 px-2.5 py-1 text-xs text-green-400"><CheckCircle className="h-3.5 w-3.5" />Disetujui</span>;
  }
  if (normalized === 'failed') {
    return <span className="inline-flex items-center gap-1 rounded-full bg-red-400/15 px-2.5 py-1 text-xs text-red-300"><XCircle className="h-3.5 w-3.5" />Gagal Teknis</span>;
  }
  if (normalized === 'pending' || normalized === 'processing') {
    return <span className="inline-flex items-center gap-1 rounded-full bg-yellow-400/15 px-2.5 py-1 text-xs text-yellow-400"><Clock className="h-3.5 w-3.5" />Menunggu</span>;
  }
  return <span className="inline-flex items-center gap-1 rounded-full bg-red-400/15 px-2.5 py-1 text-xs text-red-400"><XCircle className="h-3.5 w-3.5" />Ditolak</span>;
}

function JalurBadge({ jalur }) {
  return jalur === 'yayasan'
    ? <span className="inline-flex items-center gap-1 rounded-full bg-purple-400/15 px-2.5 py-1 text-xs text-purple-400"><Building2 className="h-3.5 w-3.5" />Yayasan</span>
    : <span className="inline-flex items-center gap-1 rounded-full bg-blue-400/15 px-2.5 py-1 text-xs text-blue-400"><Users2 className="h-3.5 w-3.5" />Individu</span>;
}

function TypeBadge({ type }) {
  const normalized = String(type || '').toLowerCase();
  if (normalized === 'mitra') {
    return <span className="inline-flex items-center gap-1 rounded-full bg-orange-400/15 px-2.5 py-1 text-xs text-orange-400"><Handshake className="h-3.5 w-3.5" />Mitra</span>;
  }
  if (normalized === 'yayasan') {
    return <span className="inline-flex items-center gap-1 rounded-full bg-purple-400/15 px-2.5 py-1 text-xs text-purple-400"><Building2 className="h-3.5 w-3.5" />Yayasan</span>;
  }
  return <span className="inline-flex items-center gap-1 rounded-full bg-cyan-400/15 px-2.5 py-1 text-xs text-cyan-400"><Code2 className="h-3.5 w-3.5" />Developer</span>;
}

function FilterSelect({ value, onChange, options }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className="rounded-lg border border-yellow-400/20 bg-[#2a2a2a] px-3 py-2 text-sm text-white">
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  );
}

function ProcessDialog({ state, onClose, onSubmit, loading }) {
  const [notes, setNotes] = useState('');
  const [providerMode, setProviderMode] = useState('mock');

  useEffect(() => {
    if (state.open) {
      setNotes(state.item?.notes || '');
      setProviderMode('mock');
    }
  }, [state]);

  return (
    <Dialog open={state.open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg border-yellow-400/20 bg-[#2a2a2a]">
        <DialogHeader>
          <DialogTitle className="text-white">{state.action === 'approved' ? 'Setujui Pencairan' : 'Tolak Pencairan'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg bg-[#1a1a1a] p-4 text-sm">
            <p className="text-gray-400">Penerima</p>
            <p className="mt-1 font-semibold text-white">{state.item?.name || '-'}</p>
            <p className="text-xs text-gray-500">{state.item?.email || '-'}</p>
            <p className="mt-3 text-gray-400">Nominal</p>
            <p className="mt-1 text-2xl font-bold text-yellow-400">{fmt(state.item?.amount || 0)}</p>
            <p className="mt-2 text-xs text-gray-500">{state.item?.bankName || '-'} / {state.item?.bankAccount || '-'} / {state.item?.accountName || '-'}</p>
          </div>
          <div>
            <Label className="text-gray-300">Catatan Admin</Label>
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-[120px] bg-[#1a1a1a] text-white" />
          </div>
          {state.action === 'approved' ? (
            <div>
              <Label className="text-gray-300">Mode Proses</Label>
              <select value={providerMode} onChange={(event) => setProviderMode(event.target.value)} className="mt-2 w-full rounded-lg border border-yellow-400/20 bg-[#1a1a1a] px-3 py-2 text-sm text-white">
                <option value="midtrans_iris">Midtrans IRIS</option>
                <option value="mock">Mock / QA</option>
                <option value="manual">Manual Fallback</option>
              </select>
              <p className="mt-2 text-xs text-gray-500">Gunakan Midtrans IRIS sebagai jalur utama. Mock dipakai QA, manual dipakai bila provider sedang bermasalah.</p>
            </div>
          ) : null}
          {state.item?.providerReferenceId || state.item?.providerStatus ? (
            <div className="rounded-lg border border-yellow-400/10 bg-[#1a1a1a] p-4 text-xs text-gray-400">
              <p>Provider: <span className="text-white">{state.item?.provider || '-'}</span></p>
              <p className="mt-1">Status provider: <span className="text-white">{state.item?.providerStatus || '-'}</span></p>
              <p className="mt-1">Reference: <span className="text-white">{state.item?.providerReferenceId || '-'}</span></p>
              {state.item?.failureReason ? <p className="mt-1 text-red-300">Failure: {state.item.failureReason}</p> : null}
            </div>
          ) : null}
          <Button
            onClick={() => onSubmit({ status: state.action, notes, providerMode })}
            disabled={loading}
            className={`w-full ${state.action === 'approved' ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-red-500 text-white hover:bg-red-600'}`}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {state.action === 'approved' ? 'Konfirmasi Persetujuan' : 'Konfirmasi Penolakan'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function UangMasuk() {
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [jalur, setJalur] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState(createEmptyPageState(10));

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 200);
    return () => window.clearTimeout(timer);
  }, [jalur, search, status, page, pageSize]);

  const load = async () => {
    setLoading(true);
    try {
      const response = await financeAPI.getTransactions({
        jalur: jalur || undefined,
        status: status || undefined,
        search: search || undefined,
        page,
        pageSize,
      });
      const nextPage = extractPaginatedResponse(response.data, pageSize);
      setRows(nextPage.items || []);
      setPagination(nextPage);
    } catch (error) {
      setRows([]);
      toast({ title: 'Gagal memuat uang masuk', description: getApiErrorMessage(error, 'Data uang masuk belum bisa dimuat.'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => ({
    total: pagination.total,
    pending: rows.filter((row) => row.status === 'pending').length,
    approved: rows.filter((row) => row.status === 'approved').length,
    rejected: rows.filter((row) => row.status === 'rejected').length,
    failed: rows.filter((row) => row.status === 'failed').length,
    totalAmount: rows.filter((row) => row.status === 'approved').reduce((sum, row) => sum + (row.amount || 0), 0),
  }), [rows, pagination.total]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <MiniCard label="Total Transaksi" value={stats.total} />
        <MiniCard label="Pending" value={stats.pending} color="text-yellow-400" />
        <MiniCard label="Disetujui" value={stats.approved} note={fmt(stats.totalAmount)} color="text-green-400" />
        <MiniCard label="Ditolak" value={stats.rejected} color="text-red-400" />
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input value={search} onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }} placeholder="Cari nama, email, atau order id..." className="bg-[#2a2a2a] pl-9 text-white" />
        </div>
        <FilterSelect value={jalur} onChange={(value) => {
          setJalur(value);
          setPage(1);
        }} options={[
          { value: '', label: 'Semua jalur' },
          { value: 'individu', label: 'Individu' },
          { value: 'yayasan', label: 'Yayasan' },
        ]} />
        <FilterSelect value={status} onChange={(value) => {
          setStatus(value);
          setPage(1);
        }} options={[
          { value: '', label: 'Semua status' },
          { value: 'approved', label: 'Disetujui' },
          { value: 'pending', label: 'Pending' },
          { value: 'rejected', label: 'Ditolak' },
        ]} />
      </div>

      <Card className="border-yellow-400/20 bg-[#2a2a2a]">
        <CardContent className="p-0">
          {loading ? <TableSkeleton rows={6} cols={6} /> : (
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
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id || row._id} className="border-b border-yellow-400/5">
                      <td className="px-4 py-3 text-xs text-gray-400">{row.date ? new Date(row.date).toLocaleString('id-ID') : '-'}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-white">{row.user}</p>
                        <p className="text-xs text-gray-500">{row.email || '-'}</p>
                      </td>
                      <td className="px-4 py-3"><JalurBadge jalur={row.jalur} /></td>
                      <td className="px-4 py-3 uppercase text-gray-300">{row.method}</td>
                      <td className="px-4 py-3 text-right font-semibold text-yellow-400">{fmt(row.amount || 0)}</td>
                      <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                    </tr>
                  ))}
                  {!rows.length ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-gray-500">Tidak ada transaksi masuk yang cocok dengan filter.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Pagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={pagination.total}
        pageSize={pagination.pageSize}
        onPageChange={setPage}
        onPageSizeChange={(nextSize) => {
          setPageSize(nextSize);
          setPage(1);
        }}
      />
    </div>
  );
}

function UangKeluar() {
  const { toast } = useToast();
  const adminAccess = useAdminAccess();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState(createEmptyPageState(10));
  const [processState, setProcessState] = useState({ open: false, item: null, action: 'approved' });
  const [processing, setProcessing] = useState(false);
  const canManageTransactions = adminAccess.hasPermission('transactions.manage');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 200);
    return () => window.clearTimeout(timer);
  }, [search, status, type, page, pageSize]);

  const load = async () => {
    setLoading(true);
    try {
      const response = await financeAPI.getDisbursements({
        type: type || undefined,
        status: status || undefined,
        search: search || undefined,
        page,
        pageSize,
      });
      const nextPage = extractPaginatedResponse(response.data, pageSize);
      setRows(nextPage.items || []);
      setPagination(nextPage);
    } catch (error) {
      setRows([]);
      toast({ title: 'Gagal memuat uang keluar', description: getApiErrorMessage(error, 'Data pencairan belum bisa dimuat.'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => ({
    total: pagination.total,
    pending: rows.filter((row) => row.status === 'pending' || row.status === 'processing').length,
    approved: rows.filter((row) => row.status === 'approved').length,
    rejected: rows.filter((row) => row.status === 'rejected').length,
    totalAmount: rows.filter((row) => row.status === 'approved').reduce((sum, row) => sum + (row.amount || 0), 0),
  }), [rows, pagination.total]);

  const handleProcess = async (payload) => {
    if (!canManageTransactions || !processState.item) return;
    setProcessing(true);
    try {
      await financeAPI.processDisbursement(processState.item.id || processState.item._id, payload);
      toast({
        title: payload.status === 'approved' ? 'Pencairan disetujui' : 'Pencairan ditolak',
        description: 'Status uang keluar berhasil diperbarui.',
      });
      setProcessState({ open: false, item: null, action: 'approved' });
      await load();
    } catch (error) {
      toast({ title: 'Gagal memproses pencairan', description: getApiErrorMessage(error, 'Status pencairan belum bisa diperbarui.'), variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <MiniCard label="Total Pencairan" value={stats.total} />
        <MiniCard label="Menunggu" value={stats.pending} color="text-yellow-400" />
        <MiniCard label="Disetujui" value={stats.approved} note={fmt(stats.totalAmount)} color="text-green-400" />
        <MiniCard label="Ditolak" value={stats.rejected} color="text-red-400" />
        <MiniCard label="Gagal Teknis" value={stats.failed} color="text-red-300" />
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input value={search} onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }} placeholder="Cari penerima, email, atau rekening..." className="bg-[#2a2a2a] pl-9 text-white" />
        </div>
        <FilterSelect value={type} onChange={(value) => {
          setType(value);
          setPage(1);
        }} options={[
          { value: '', label: 'Semua tipe' },
          { value: 'mitra', label: 'Mitra' },
          { value: 'yayasan', label: 'Yayasan' },
          { value: 'developer', label: 'Developer' },
        ]} />
        <FilterSelect value={status} onChange={(value) => {
          setStatus(value);
          setPage(1);
        }} options={[
          { value: '', label: 'Semua status' },
          { value: 'pending', label: 'Pending' },
          { value: 'processing', label: 'Processing' },
          { value: 'approved', label: 'Disetujui' },
          { value: 'failed', label: 'Gagal Teknis' },
          { value: 'rejected', label: 'Ditolak' },
        ]} />
      </div>

      <Card className="border-yellow-400/20 bg-[#2a2a2a]">
        <CardContent className="p-0">
          {loading ? <TableSkeleton rows={6} cols={7} /> : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-yellow-400/10 text-left text-gray-400">
                    <th className="px-4 py-3 font-medium">Tanggal</th>
                    <th className="px-4 py-3 font-medium">Penerima</th>
                    <th className="px-4 py-3 font-medium">Tipe</th>
                    <th className="px-4 py-3 font-medium">Rekening</th>
                    <th className="px-4 py-3 text-right font-medium">Nominal</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Provider</th>
                    <th className="px-4 py-3 text-right font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id || row._id} className="border-b border-yellow-400/5">
                      <td className="px-4 py-3 text-xs text-gray-400">{row.createdAt ? new Date(row.createdAt).toLocaleString('id-ID') : '-'}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-white">{row.name || '-'}</p>
                        <p className="text-xs text-gray-500">{row.email || '-'}</p>
                      </td>
                      <td className="px-4 py-3"><TypeBadge type={row.type} /></td>
                      <td className="px-4 py-3 text-xs text-gray-300">
                        <p>{row.bankName || '-'}</p>
                        <p className="text-gray-500">{row.bankAccount || '-'} / {row.accountName || '-'}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-yellow-400">{fmt(row.amount || 0)}</td>
                      <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                      <td className="px-4 py-3 text-xs text-gray-300">
                        <p className="uppercase">{row.provider || '-'}</p>
                        <p className="mt-1 text-gray-500">{row.providerStatus || '-'}</p>
                        {row.providerReferenceId ? <p className="mt-1 break-all text-[11px] text-gray-500">{row.providerReferenceId}</p> : null}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {(row.status === 'pending' || row.status === 'processing') && canManageTransactions ? (
                            <>
                              <Button size="sm" className="bg-green-500 text-white hover:bg-green-600" onClick={() => setProcessState({ open: true, item: row, action: 'approved' })}>
                                Setujui
                              </Button>
                              <Button size="sm" variant="outline" className="border-red-400/30 text-red-400" onClick={() => setProcessState({ open: true, item: row, action: 'rejected' })}>
                                Tolak
                              </Button>
                            </>
                          ) : (
                            <span className="text-xs text-gray-500">{row.processedAt ? new Date(row.processedAt).toLocaleString('id-ID') : 'Sudah diproses'}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!rows.length ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-gray-500">Tidak ada uang keluar yang cocok dengan filter.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Pagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={pagination.total}
        pageSize={pagination.pageSize}
        onPageChange={setPage}
        onPageSizeChange={(nextSize) => {
          setPageSize(nextSize);
          setPage(1);
        }}
      />

      <ProcessDialog
        state={processState}
        onClose={(open) => setProcessState((current) => ({ ...current, open }))}
        onSubmit={handleProcess}
        loading={processing}
      />
    </div>
  );
}

export default function Transaksi() {
  const [activeTab, setActiveTab] = useState('masuk');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Transaksi</h1>
        <p className="mt-1 text-sm text-gray-400">Data uang masuk dan uang keluar di halaman ini sekarang membaca payload finance backend yang sama dengan laporan pendapatan.</p>
      </div>

      <div className="flex w-fit gap-1 rounded-lg bg-[#1a1a1a] p-1">
        <TabButton active={activeTab === 'masuk'} onClick={() => setActiveTab('masuk')}>
          <ArrowUpCircle className="h-4 w-4" />
          Uang Masuk
        </TabButton>
        <TabButton active={activeTab === 'keluar'} onClick={() => setActiveTab('keluar')}>
          <ArrowDownCircle className="h-4 w-4" />
          Uang Keluar
        </TabButton>
      </div>

      {activeTab === 'masuk' ? <UangMasuk /> : <UangKeluar />}
    </div>
  );
}
