// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Eye, FileText, Filter, Search } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import LoadingSpinner, { TableSkeleton } from '../../components/ui/loading-spinner';
import PageHeader from '../../components/ui/page-header';
import Pagination from '../../components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { useToast } from '../../hooks/use-toast';
import { createEmptyPageState, extractPaginatedResponse } from '../../lib/paginated-response';
import { adminAPI } from '../../services/api';
import { getApiErrorMessage } from '../../services/api-error';

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'Semua kategori' },
  { value: 'auth', label: 'Auth' },
  { value: 'admin_management', label: 'Manajemen Admin' },
  { value: 'settings', label: 'Pengaturan' },
  { value: 'content', label: 'Konten' },
  { value: 'users', label: 'Users' },
  { value: 'yayasan', label: 'Yayasan' },
  { value: 'mitra', label: 'Mitra' },
  { value: 'finance', label: 'Keuangan' },
  { value: 'approval', label: 'Approval' },
  { value: 'testing', label: 'Testing' },
];

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const normalizeDialogItems = (items = []) => (
  (Array.isArray(items) ? items : []).filter((item) => item?.label && item?.value !== undefined)
);

export default function AdminActivityLogs() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState(createEmptyPageState(10));
  const [logs, setLogs] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    action: '',
    dateFrom: '',
    dateTo: '',
  });
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const response = await adminAPI.getActivityLogs({
          page,
          pageSize,
          search: filters.search || undefined,
          category: filters.category !== 'all' ? filters.category : undefined,
          action: filters.action || undefined,
          dateFrom: filters.dateFrom || undefined,
          dateTo: filters.dateTo || undefined,
        });
        if (!active) return;
        const next = extractPaginatedResponse(response?.data || response, pageSize);
        setLogs(Array.isArray(next.items) ? next.items : []);
        setPagination(next);
      } catch (error) {
        if (!active) return;
        setLogs([]);
        setPagination(createEmptyPageState(pageSize));
        toast({
          title: 'Gagal memuat log aktivitas',
          description: getApiErrorMessage(error, 'Log aktivitas belum bisa dimuat.'),
          variant: 'destructive',
        });
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [filters.action, filters.category, filters.dateFrom, filters.dateTo, filters.search, page, pageSize, toast]);

  const openDetail = async (id) => {
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const response = await adminAPI.getActivityLogDetail(id);
      setSelectedLog(response?.data || response || null);
    } catch (error) {
      setSelectedLog(null);
      toast({
        title: 'Gagal memuat detail log',
        description: getApiErrorMessage(error, 'Detail aktivitas belum bisa dimuat.'),
        variant: 'destructive',
      });
    } finally {
      setDetailLoading(false);
    }
  };

  const filterSummary = useMemo(
    () => [
      filters.search ? `Cari: ${filters.search}` : null,
      filters.category !== 'all'
        ? `Kategori: ${CATEGORY_OPTIONS.find((item) => item.value === filters.category)?.label || filters.category}`
        : null,
      filters.action ? `Aksi: ${filters.action}` : null,
      filters.dateFrom ? `Dari: ${filters.dateFrom}` : null,
      filters.dateTo ? `Sampai: ${filters.dateTo}` : null,
    ].filter(Boolean),
    [filters],
  );

  return (
    <>
      <PageHeader
        icon={FileText}
        title="Log Aktivitas"
        description="Pantau histori login admin dan perubahan data yang dilakukan dari dashboard admin."
      />

      <Card className="border-yellow-400/20 bg-[#2a2a2a]">
        <CardHeader>
          <CardTitle className="text-white">Filter Aktivitas</CardTitle>
          <CardDescription className="text-gray-400">
            Gunakan filter untuk menemukan aktivitas admin tertentu tanpa mengubah flow halaman lain.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="space-y-2 xl:col-span-2">
              <Label className="text-white">Pencarian</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <Input
                  value={filters.search}
                  onChange={(event) => {
                    setFilters((current) => ({ ...current, search: event.target.value }));
                    setPage(1);
                  }}
                  placeholder="Cari admin, target, atau ringkasan aktivitas..."
                  className="border-yellow-400/20 bg-[#1a1a1a] pl-10 text-white"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-white">Kategori</Label>
              <Select
                value={filters.category}
                onValueChange={(value) => {
                  setFilters((current) => ({ ...current, category: value }));
                  setPage(1);
                }}
              >
                <SelectTrigger className="border-yellow-400/20 bg-[#1a1a1a] text-white">
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent className="border-yellow-400/20 bg-[#1a1a1a] text-white">
                  {CATEGORY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-white">Kode Aksi</Label>
              <Input
                value={filters.action}
                onChange={(event) => {
                  setFilters((current) => ({ ...current, action: event.target.value.toUpperCase() }));
                  setPage(1);
                }}
                placeholder="ADMIN_LOGIN_SUCCESS"
                className="border-yellow-400/20 bg-[#1a1a1a] text-white"
              />
            </div>
            <div className="rounded-xl border border-yellow-400/10 bg-[#1a1a1a] p-4">
              <div className="flex items-center gap-2 text-gray-300">
                <Filter className="h-4 w-4 text-yellow-400" />
                <span className="text-sm font-medium">Aktif</span>
              </div>
              <p className="mt-2 text-2xl font-semibold text-white">{filterSummary.length}</p>
              <p className="text-xs text-gray-500">filter terpasang</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <Label className="text-white">Tanggal Mulai</Label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(event) => {
                    setFilters((current) => ({ ...current, dateFrom: event.target.value }));
                    setPage(1);
                  }}
                  className="border-yellow-400/20 bg-[#1a1a1a] pl-10 text-white"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-white">Tanggal Akhir</Label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(event) => {
                    setFilters((current) => ({ ...current, dateTo: event.target.value }));
                    setPage(1);
                  }}
                  className="border-yellow-400/20 bg-[#1a1a1a] pl-10 text-white"
                />
              </div>
            </div>
            <div className="flex items-end gap-3 md:col-span-2">
              <Button
                type="button"
                variant="outline"
                className="border-yellow-400/30 text-yellow-400"
                onClick={() => {
                  setFilters({
                    search: '',
                    category: 'all',
                    action: '',
                    dateFrom: '',
                    dateTo: '',
                  });
                  setPage(1);
                }}
              >
                Reset Filter
              </Button>
              {filterSummary.length ? (
                <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                  {filterSummary.map((item) => (
                    <span key={item} className="rounded-full bg-white/5 px-2.5 py-1">
                      {item}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6 border-yellow-400/20 bg-[#2a2a2a]">
        <CardHeader>
          <CardTitle className="text-white">Riwayat Aktivitas</CardTitle>
          <CardDescription className="text-gray-400">
            Menampilkan histori login dan mutasi data admin yang sudah tercatat.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton rows={6} cols={7} />
          ) : !logs.length ? (
            <div className="rounded-2xl border border-dashed border-yellow-400/20 bg-[#1a1a1a] p-10 text-center text-gray-400">
              Belum ada log aktivitas yang cocok dengan filter saat ini.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-yellow-400/10 text-left text-xs uppercase tracking-[0.2em] text-gray-500">
                    <th className="px-4 py-3">Waktu</th>
                    <th className="px-4 py-3">Admin</th>
                    <th className="px-4 py-3">Kategori</th>
                    <th className="px-4 py-3">Aktivitas</th>
                    <th className="px-4 py-3">Target</th>
                    <th className="px-4 py-3">Ringkasan</th>
                    <th className="px-4 py-3 text-right">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((item) => (
                    <tr key={item.id} className="border-b border-yellow-400/5 align-top text-gray-300">
                      <td className="px-4 py-4 text-xs text-gray-400">{formatDateTime(item.createdAt)}</td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-white">{item.actor?.name || '-'}</p>
                        <p className="mt-1 text-xs text-gray-500">{item.actor?.email || '-'}</p>
                        <p className="mt-1 text-[11px] text-yellow-200">{item.actor?.roleLabel || '-'}</p>
                      </td>
                      <td className="px-4 py-4">
                        <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-gray-200">{item.category || '-'}</span>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-white">{item.action?.label || '-'}</p>
                        <p className="mt-1 text-xs text-gray-500">{item.action?.code || '-'}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-white">{item.target?.label || '-'}</p>
                        <p className="mt-1 text-xs text-gray-500">{item.target?.type || '-'}</p>
                      </td>
                      <td className="px-4 py-4 text-sm leading-6 text-gray-300">{item.summary || '-'}</td>
                      <td className="px-4 py-4 text-right">
                        <Button
                          type="button"
                          variant="outline"
                          className="border-yellow-400/30 text-yellow-400"
                          onClick={() => void openDetail(item.id)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Lihat
                        </Button>
                      </td>
                    </tr>
                  ))}
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

      <Dialog
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) {
            setSelectedLog(null);
            setDetailLoading(false);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto border-yellow-400/20 bg-[#2a2a2a]">
          <DialogHeader>
            <DialogTitle className="text-white">Detail Aktivitas Admin</DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="py-10">
              <LoadingSpinner text="Memuat detail aktivitas..." />
            </div>
          ) : !selectedLog ? (
            <div className="rounded-xl border border-dashed border-yellow-400/20 bg-[#1a1a1a] p-8 text-center text-gray-400">
              Detail aktivitas tidak tersedia.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-2xl border border-yellow-400/10 bg-[#1a1a1a] p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Ringkasan</p>
                <p className="mt-3 text-lg font-semibold text-white">{selectedLog.summary || '-'}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-yellow-400/10 px-2.5 py-1 text-yellow-200">{selectedLog.action?.label || '-'}</span>
                  <span className="rounded-full bg-white/5 px-2.5 py-1 text-gray-300">{selectedLog.category || '-'}</span>
                  <span className="rounded-full bg-white/5 px-2.5 py-1 text-gray-300">{formatDateTime(selectedLog.createdAt)}</span>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {Array.isArray(selectedLog.detailSections) && selectedLog.detailSections.length ? selectedLog.detailSections.map((section) => (
                  <Card key={section.title} className="border-yellow-400/10 bg-[#1a1a1a]">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-white">{section.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {normalizeDialogItems(section.items).map((item) => (
                        <div key={`${section.title}-${item.label}`} className="rounded-lg border border-white/5 bg-[#121212] px-3 py-2">
                          <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500">{item.label}</p>
                          <p className="mt-1 text-sm text-gray-200">{item.value}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )) : null}
              </div>

              <Card className="border-yellow-400/10 bg-[#1a1a1a]">
                <CardHeader>
                  <CardTitle className="text-base text-white">Perubahan Field</CardTitle>
                  <CardDescription className="text-gray-400">
                    Hanya field aman dan relevan yang diringkas di sini.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {Array.isArray(selectedLog.changes) && selectedLog.changes.length ? (
                    <div className="space-y-3">
                      {selectedLog.changes.map((change) => (
                        <div key={`${change.field}-${change.before}-${change.after}`} className="rounded-xl border border-yellow-400/10 bg-[#121212] p-4">
                          <p className="font-medium text-white">{change.label || change.field}</p>
                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <div className="rounded-lg border border-white/5 bg-[#181818] p-3">
                              <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500">Sebelum</p>
                              <p className="mt-1 text-sm text-gray-200">{change.before || '-'}</p>
                            </div>
                            <div className="rounded-lg border border-yellow-400/10 bg-yellow-400/5 p-3">
                              <p className="text-[11px] uppercase tracking-[0.2em] text-yellow-300">Sesudah</p>
                              <p className="mt-1 text-sm text-yellow-100">{change.after || '-'}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-yellow-400/20 bg-[#121212] p-6 text-sm text-gray-400">
                      Tidak ada ringkasan perubahan field untuk aktivitas ini.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
