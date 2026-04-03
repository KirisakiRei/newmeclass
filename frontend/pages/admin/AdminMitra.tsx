// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle,
  Copy,
  Eye,
  Handshake,
  KeyRound,
  Plus,
  RotateCcw,
  Settings2,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Users,
  XCircle,
} from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { useToast } from '../../hooks/use-toast';
import PageHeader from '../../components/ui/page-header';
import StatsGrid from '../../components/ui/stats-grid';
import LoadingSpinner from '../../components/ui/loading-spinner';
import Pagination from '../../components/ui/pagination';
import { createEmptyPageState, extractPaginatedResponse } from '../../lib/paginated-response';
import { useAdminAccess } from '../../lib/admin-rbac';
import { mitraAPI } from '../../services/api';
import { getApiErrorMessage } from '../../services/api-error';
import { copyTextToClipboard } from '../../lib/clipboard';

const INITIAL_FORM = {
  fullName: '',
  phone: '',
  email: '',
};

const INITIAL_CAPACITY_FORM = {
  capacityLimit: 80,
  note: '',
};

const InviteBadge = ({ status }) => {
  const mapping = {
    PENDING: 'bg-yellow-400/15 text-yellow-400',
    CLAIMED: 'bg-green-400/15 text-green-400',
    EXPIRED: 'bg-orange-400/15 text-orange-400',
    REVOKED: 'bg-red-400/15 text-red-400',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${mapping[status] || 'bg-gray-400/15 text-gray-300'}`}>
      {status || 'N/A'}
    </span>
  );
};

export default function AdminMitra() {
  const { toast } = useToast();
  const adminAccess = useAdminAccess();
  const canManageMitra = adminAccess.hasPermission('mitra.manage');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState(createEmptyPageState(10));
  const [mitraList, setMitraList] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState(INITIAL_FORM);
  const [showDetail, setShowDetail] = useState(false);
  const [detailMitra, setDetailMitra] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showCapacityDialog, setShowCapacityDialog] = useState(false);
  const [capacitySubmitting, setCapacitySubmitting] = useState(false);
  const [capacityForm, setCapacityForm] = useState(INITIAL_CAPACITY_FORM);
  const [resetTargetMitra, setResetTargetMitra] = useState(null);
  const [resetSubmitting, setResetSubmitting] = useState(false);

  useEffect(() => {
    void loadMitra();
  }, [page, pageSize, searchTerm]);

  const summary = useMemo(() => ({
    total: pagination.total || 0,
    active: mitraList.filter((item) => item.isActive).length,
    claimed: mitraList.filter((item) => item.inviteStatus === 'CLAIMED' || item.isVerified).length,
    totalYayasan: mitraList.reduce((sum, item) => sum + Number(item.yayasanCount || 0), 0),
  }), [mitraList, pagination.total]);

  const loadMitra = async () => {
    setLoading(true);
    try {
      const response = await mitraAPI.getAdminList({
        page,
        pageSize,
        search: searchTerm || undefined,
      });
      const nextPage = extractPaginatedResponse(response.data, pageSize);
      setMitraList(nextPage.items || []);
      setPagination(nextPage);
    } catch (error) {
      toast({
        title: 'Error',
        description: getApiErrorMessage(error, 'Gagal memuat data mitra'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshDetail = async (id) => {
    const response = await mitraAPI.getAdminDetail(id);
    setDetailMitra(response.data);
    return response.data;
  };

  const handleViewDetail = async (id) => {
    setShowDetail(true);
    setDetailMitra(null);
    setDetailLoading(true);
    try {
      await refreshDetail(id);
    } catch (error) {
      toast({
        title: 'Error',
        description: getApiErrorMessage(error, 'Gagal memuat detail mitra'),
        variant: 'destructive',
      });
      setShowDetail(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreateMitra = async (event) => {
    event.preventDefault();
    setCreating(true);
    try {
      const response = await mitraAPI.createAdminInvite(createForm);
      setShowCreate(false);
      setCreateForm(INITIAL_FORM);
      await loadMitra();
      const copied = await copyTextToClipboard(response.data?.invite?.inviteUrl || '');
      toast({
        title: 'Mitra berhasil dibuat',
        description: copied
          ? 'Link invite langsung disalin ke clipboard.'
          : 'Akun mitra dibuat. Link invite tersedia di detail mitra.',
      });
    } catch (error) {
      toast({
        title: 'Gagal membuat mitra',
        description: getApiErrorMessage(error, 'Terjadi kesalahan saat membuat akun mitra.'),
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (mitra) => {
    if (!canManageMitra) return;
    try {
      await mitraAPI.toggleActive(mitra._id);
      await loadMitra();
      if (detailMitra?._id === mitra._id) {
        await refreshDetail(mitra._id);
      }
      toast({ title: 'Berhasil', description: `Akun mitra ${mitra.isActive ? 'dinonaktifkan' : 'diaktifkan'}.` });
    } catch (error) {
      toast({
        title: 'Gagal mengubah status',
        description: getApiErrorMessage(error, 'Terjadi kesalahan saat mengubah status mitra.'),
        variant: 'destructive',
      });
    }
  };

  const handleVerify = async (mitra) => {
    if (!canManageMitra) return;
    try {
      await mitraAPI.verify(mitra._id);
      await loadMitra();
      if (detailMitra?._id === mitra._id) {
        await refreshDetail(mitra._id);
      }
      toast({ title: 'Berhasil', description: 'Status verifikasi mitra diperbarui.' });
    } catch (error) {
      toast({
        title: 'Gagal verifikasi',
        description: getApiErrorMessage(error, 'Tidak dapat memverifikasi mitra.'),
        variant: 'destructive',
      });
    }
  };

  const handleResetPassword = async (mitra) => {
    if (!canManageMitra) return;
    setResetTargetMitra(mitra);
  };

  const confirmResetPassword = async () => {
    if (!canManageMitra || !resetTargetMitra?._id) return;
    setResetSubmitting(true);
    try {
      await mitraAPI.sendResetPasswordEmail(resetTargetMitra._id);
      setResetTargetMitra(null);
      toast({ title: 'Reset password berhasil', description: 'Link reset password telah dikirim ke email mitra.' });
    } catch (error) {
      toast({
        title: 'Gagal reset password',
        description: getApiErrorMessage(error, 'Tidak dapat mereset password mitra.'),
        variant: 'destructive',
      });
    } finally {
      setResetSubmitting(false);
    }
  };

  const handleResendInvite = async (mitraId) => {
    if (!canManageMitra) return;
    try {
      const response = await mitraAPI.resendInvite(mitraId);
      const copied = await copyTextToClipboard(response.data?.invite?.inviteUrl || '');
      await loadMitra();
      if (detailMitra?._id === mitraId) {
        await refreshDetail(mitraId);
      }
      toast({
        title: 'Invite baru dibuat',
        description: copied
          ? 'Link invite baru sudah disalin ke clipboard.'
          : 'Invite baru berhasil dibuat.',
      });
    } catch (error) {
      toast({
        title: 'Gagal membuat invite',
        description: getApiErrorMessage(error, 'Tidak dapat membuat invite baru.'),
        variant: 'destructive',
      });
    }
  };

  const handleRevokeInvite = async (mitraId) => {
    if (!canManageMitra) return;
    try {
      await mitraAPI.revokeInvite(mitraId);
      await loadMitra();
      if (detailMitra?._id === mitraId) {
        await refreshDetail(mitraId);
      }
      toast({ title: 'Invite dicabut', description: 'Invite aktif untuk mitra ini telah dinonaktifkan.' });
    } catch (error) {
      toast({
        title: 'Gagal mencabut invite',
        description: getApiErrorMessage(error, 'Tidak dapat mencabut invite mitra.'),
        variant: 'destructive',
      });
    }
  };

  const openCapacityDialog = (mitra) => {
    setDetailMitra(mitra);
    setCapacityForm({
      capacityLimit: Number(mitra?.capacityLimit || 80),
      note: '',
    });
    setShowCapacityDialog(true);
  };

  const handleUpdateCapacity = async (event) => {
    event.preventDefault();
    if (!detailMitra?._id) return;
    setCapacitySubmitting(true);
    try {
      await mitraAPI.updateCapacity(detailMitra._id, capacityForm);
      setShowCapacityDialog(false);
      await loadMitra();
      await refreshDetail(detailMitra._id);
      toast({ title: 'Kapasitas diperbarui', description: 'Limit pengelolaan yayasan berhasil diubah.' });
    } catch (error) {
      toast({
        title: 'Gagal mengubah kapasitas',
        description: getApiErrorMessage(error, 'Tidak dapat memperbarui kapasitas mitra.'),
        variant: 'destructive',
      });
    } finally {
      setCapacitySubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner size="lg" text="Memuat data mitra..." className="min-h-[60vh]" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Handshake}
        title="Manajemen Mitra"
        description="Buat akun mitra, kelola invite onboarding, dan atur kapasitas yayasan per mitra."
      />

      <StatsGrid
        stats={[
          { label: 'Total Mitra', value: summary.total, icon: Handshake, iconBg: 'bg-yellow-400/10', iconColor: 'text-yellow-400', valueColor: 'text-yellow-400' },
          { label: 'Akun Aktif', value: summary.active, icon: Users, iconBg: 'bg-green-400/10', iconColor: 'text-green-400', valueColor: 'text-green-400' },
          { label: 'Sudah Claim Invite', value: summary.claimed, icon: ShieldCheck, iconBg: 'bg-blue-400/10', iconColor: 'text-blue-400', valueColor: 'text-blue-400' },
          { label: 'Total Yayasan', value: summary.totalYayasan, icon: CheckCircle, iconBg: 'bg-purple-400/10', iconColor: 'text-purple-400', valueColor: 'text-purple-400' },
        ]}
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Input
          value={searchTerm}
          onChange={(event) => {
            setSearchTerm(event.target.value);
            setPage(1);
          }}
          placeholder="Cari nama, email, atau kode mitra..."
          className="max-w-sm border-yellow-400/30 bg-[#2a2a2a] text-white"
        />
        {canManageMitra ? (
          <Button onClick={() => setShowCreate(true)} className="bg-yellow-400 text-black hover:bg-yellow-500">
            <Plus className="mr-2 h-4 w-4" />
            Tambah Mitra
          </Button>
        ) : null}
      </div>

      <Card className="border-yellow-400/20 bg-[#2a2a2a]">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-yellow-400/20 text-gray-400">
                  <th className="px-4 py-3 text-left">Mitra</th>
                  <th className="px-4 py-3 text-left">Kode</th>
                  <th className="px-4 py-3 text-left">Invite</th>
                  <th className="px-4 py-3 text-left">Kapasitas</th>
                  <th className="px-4 py-3 text-left">Yayasan</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {mitraList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                      Belum ada mitra yang terdaftar.
                    </td>
                  </tr>
                ) : mitraList.map((mitra) => (
                  <tr key={mitra._id} className="border-b border-yellow-400/10 hover:bg-[#333]">
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{mitra.name}</p>
                      <p className="text-xs text-gray-400">{mitra.email && !String(mitra.email).includes('pending-mitra.newme.local') ? mitra.email : 'Email akan dilengkapi saat claim invite'}</p>
                      <p className="text-xs text-gray-500">{mitra.phone || '-'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <code className="rounded bg-yellow-400/10 px-2 py-1 text-xs text-yellow-400">{mitra.inviteCode || '-'}</code>
                    </td>
                    <td className="px-4 py-3"><InviteBadge status={mitra.inviteStatus} /></td>
                    <td className="px-4 py-3 text-white">{mitra.capacityUsed || 0}/{mitra.capacityLimit || 35}</td>
                    <td className="px-4 py-3 text-blue-400">{mitra.yayasanCount || 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <span className={`rounded-full px-2 py-0.5 text-xs ${mitra.isActive ? 'bg-green-400/15 text-green-400' : 'bg-red-400/15 text-red-400'}`}>
                          {mitra.isActive ? 'Aktif' : 'Nonaktif'}
                        </span>
                        {mitra.isVerified ? (
                          <span className="rounded-full bg-blue-400/15 px-2 py-0.5 text-xs text-blue-400">Verified</span>
                        ) : (
                          <span className="rounded-full bg-orange-400/15 px-2 py-0.5 text-xs text-orange-400">Pending</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <Button size="sm" variant="ghost" className="text-blue-400 hover:bg-blue-400/10 hover:text-blue-300" onClick={() => handleViewDetail(mitra._id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canManageMitra ? (
                          <>
                            <Button size="sm" variant="ghost" className="text-yellow-400 hover:bg-yellow-400/10 hover:text-yellow-300" onClick={() => handleResendInvite(mitra._id)}>
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-cyan-400 hover:bg-cyan-400/10 hover:text-cyan-300" onClick={() => openCapacityDialog(mitra)}>
                              <Settings2 className="h-4 w-4" />
                            </Button>
                            {!mitra.isVerified ? (
                              <Button size="sm" variant="ghost" className="text-green-400 hover:bg-green-400/10 hover:text-green-300" onClick={() => handleVerify(mitra)}>
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            ) : null}
                            <Button size="sm" variant="ghost" className={mitra.isActive ? 'text-green-400 hover:bg-green-400/10 hover:text-green-300' : 'text-red-400 hover:bg-red-400/10 hover:text-red-300'} onClick={() => handleToggleActive(mitra)}>
                              {mitra.isActive ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                            </Button>
                            <Button size="sm" variant="ghost" className="text-purple-400 hover:bg-purple-400/10 hover:text-purple-300" onClick={() => handleResetPassword(mitra)}>
                              <KeyRound className="h-4 w-4" />
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="border-yellow-400/20 bg-[#2a2a2a] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Tambah Mitra</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateMitra} className="space-y-4">
            <div>
              <Label className="text-gray-400">Nama Mitra *</Label>
              <Input value={createForm.fullName} onChange={(event) => setCreateForm({ ...createForm, fullName: event.target.value })} className="bg-[#1a1a1a] text-white border-yellow-400/20" required />
            </div>
            <div>
              <Label className="text-gray-400">No. HP *</Label>
              <Input value={createForm.phone} onChange={(event) => setCreateForm({ ...createForm, phone: event.target.value })} className="bg-[#1a1a1a] text-white border-yellow-400/20" required />
            </div>
            <div>
              <Label className="text-gray-400">Email Awal (opsional)</Label>
              <Input value={createForm.email} onChange={(event) => setCreateForm({ ...createForm, email: event.target.value })} className="bg-[#1a1a1a] text-white border-yellow-400/20" />
            </div>
            <div className="rounded-lg border border-yellow-400/20 bg-[#1a1a1a] p-4 text-sm text-gray-300">
              Sistem akan membuat akun mitra dengan kapasitas awal <span className="font-semibold text-white">35 yayasan</span> dan menghasilkan link invite claim selama 7 hari.
            </div>
            <Button type="submit" disabled={creating} className="w-full bg-yellow-400 text-black hover:bg-yellow-500">
              {creating ? 'Membuat akun...' : 'Buat Akun Mitra'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(resetTargetMitra)} onOpenChange={(open) => {
        if (!open) {
          setResetTargetMitra(null);
        }
      }}>
        <DialogContent className="border-yellow-400/20 bg-[#2a2a2a] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Kirim Reset Password Mitra</DialogTitle>
            <DialogDescription className="text-gray-400">
              Email reset password akan langsung dikirim ke akun mitra ini. Password lama tetap berlaku sampai proses reset selesai.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-yellow-400/20 bg-[#1a1a1a] p-4 text-sm text-gray-300">
            <p className="font-medium text-white">{resetTargetMitra?.name || resetTargetMitra?.fullName || '-'}</p>
            <p className="mt-1 break-all text-gray-400">{resetTargetMitra?.email || 'Email belum tersedia'}</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="border-gray-600 text-gray-200" onClick={() => setResetTargetMitra(null)}>
              Batal
            </Button>
            <Button onClick={confirmResetPassword} disabled={resetSubmitting} className="bg-yellow-400 text-black hover:bg-yellow-500">
              {resetSubmitting ? 'Mengirim...' : 'Kirim Email Reset'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-yellow-400/20 bg-[#2a2a2a] sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Handshake className="h-5 w-5 text-yellow-400" />
              Detail Mitra
            </DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="py-10 text-center text-gray-400">Memuat detail...</div>
          ) : detailMitra ? (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl bg-[#1a1a1a] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-yellow-400">Informasi Mitra</p>
                  <div className="mt-3 space-y-2 text-sm">
                    <p className="text-white font-semibold">{detailMitra.name}</p>
                    <p className="text-gray-400">{detailMitra.email && !String(detailMitra.email).includes('pending-mitra.newme.local') ? detailMitra.email : 'Email akan diisi saat claim invite'}</p>
                    <p className="text-gray-400">{detailMitra.phone || '-'}</p>
                    <p className="text-gray-400">Kode Mitra: <span className="font-mono text-yellow-400">{detailMitra.inviteCode}</span></p>
                    <div className="flex flex-wrap gap-2 pt-2">
                      <InviteBadge status={detailMitra.inviteStatus} />
                      <span className={`rounded-full px-2 py-0.5 text-xs ${detailMitra.isActive ? 'bg-green-400/15 text-green-400' : 'bg-red-400/15 text-red-400'}`}>
                        {detailMitra.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                  </div>
                  {canManageMitra ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button size="sm" className="bg-yellow-400 text-black hover:bg-yellow-500" onClick={() => handleResendInvite(detailMitra._id)}>
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Kirim Ulang Invite
                      </Button>
                      <Button size="sm" variant="outline" className="border-red-400/40 text-red-400 hover:bg-red-400/10" onClick={() => handleRevokeInvite(detailMitra._id)}>
                        <XCircle className="mr-2 h-4 w-4" />
                        Cabut Invite
                      </Button>
                      <Button size="sm" variant="outline" className="border-cyan-400/40 text-cyan-400 hover:bg-cyan-400/10" onClick={() => openCapacityDialog(detailMitra)}>
                        <Settings2 className="mr-2 h-4 w-4" />
                        Ubah Kapasitas
                      </Button>
                    </div>
                  ) : null}
                </div>

                <div className="rounded-xl bg-[#1a1a1a] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-yellow-400">Kapasitas & Operasional</p>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-[#222] p-3">
                      <p className="text-gray-500">Kapasitas</p>
                      <p className="mt-1 text-xl font-bold text-white">{detailMitra.capacityUsed || 0}/{detailMitra.capacityLimit || 35}</p>
                    </div>
                    <div className="rounded-lg bg-[#222] p-3">
                      <p className="text-gray-500">Sisa Slot</p>
                      <p className="mt-1 text-xl font-bold text-green-400">{detailMitra.capacityRemaining || 0}</p>
                    </div>
                    <div className="rounded-lg bg-[#222] p-3">
                      <p className="text-gray-500">Total Yayasan</p>
                      <p className="mt-1 text-xl font-bold text-blue-400">{detailMitra.totalYayasan || 0}</p>
                    </div>
                    <div className="rounded-lg bg-[#222] p-3">
                      <p className="text-gray-500">Total User</p>
                      <p className="mt-1 text-xl font-bold text-purple-400">{detailMitra.totalUsers || 0}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-[#1a1a1a] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-yellow-400">Riwayat Perubahan Kapasitas</p>
                <div className="mt-3 space-y-3">
                  {Array.isArray(detailMitra.capacityHistory) && detailMitra.capacityHistory.length > 0 ? detailMitra.capacityHistory.map((item) => (
                    <div key={item.id} className="rounded-lg border border-yellow-400/10 bg-[#222] p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-white">{item.previousLimit} → {item.newLimit} yayasan</p>
                        <p className="text-xs text-gray-500">{new Date(item.createdAt).toLocaleString('id-ID')}</p>
                      </div>
                      <p className="mt-1 text-sm text-gray-400">{item.note || 'Tanpa catatan tambahan.'}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        Diubah oleh: {item.changedByAdminName || item.changedByAdminEmail || 'Admin'}
                      </p>
                    </div>
                  )) : (
                    <p className="text-sm text-gray-400">Belum ada riwayat perubahan kapasitas.</p>
                  )}
                </div>
              </div>

              <div className="rounded-xl bg-[#1a1a1a] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-yellow-400">Yayasan Terkelola</p>
                <div className="mt-3 space-y-3">
                  {Array.isArray(detailMitra.yayasanDetails) && detailMitra.yayasanDetails.length > 0 ? detailMitra.yayasanDetails.map((yayasan) => (
                    <div key={yayasan._id} className="rounded-lg border border-yellow-400/10 bg-[#222] p-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-white">{yayasan.name}</p>
                          <p className="text-xs text-gray-400">{yayasan.email}</p>
                        </div>
                        <div className="text-right text-xs text-gray-400">
                          <p>{yayasan.usersCount || 0} pengguna</p>
                          <p>{yayasan.approvalStatus === 'APPROVED' ? 'Approved' : 'Pending approval'}</p>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <p className="text-sm text-gray-400">Belum ada yayasan yang dikelola mitra ini.</p>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={showCapacityDialog} onOpenChange={setShowCapacityDialog}>
        <DialogContent className="border-yellow-400/20 bg-[#2a2a2a] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Ubah Kapasitas Mitra</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateCapacity} className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {[35, 80].map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant="outline"
                  className={`border-yellow-400/30 ${Number(capacityForm.capacityLimit) === value ? 'bg-yellow-400/10 text-yellow-400' : 'text-gray-300'}`}
                  onClick={() => setCapacityForm((current) => ({ ...current, capacityLimit: value }))}
                >
                  {value} Yayasan
                </Button>
              ))}
            </div>
            <div>
              <Label className="text-gray-400">Limit Kapasitas Baru *</Label>
              <Input
                type="number"
                min={1}
                value={capacityForm.capacityLimit}
                onChange={(event) => setCapacityForm((current) => ({ ...current, capacityLimit: Number(event.target.value || 0) }))}
                className="border-yellow-400/20 bg-[#1a1a1a] text-white"
                required
              />
            </div>
            <div>
              <Label className="text-gray-400">Catatan Internal</Label>
              <Textarea
                value={capacityForm.note}
                onChange={(event) => setCapacityForm((current) => ({ ...current, note: event.target.value }))}
                className="min-h-[100px] border-yellow-400/20 bg-[#1a1a1a] text-white"
                placeholder="Contoh: Upgrade kapasitas sesuai addendum kerja sama Maret 2026."
              />
            </div>
            <Button type="submit" disabled={capacitySubmitting} className="w-full bg-yellow-400 text-black hover:bg-yellow-500">
              {capacitySubmitting ? 'Menyimpan...' : 'Simpan Perubahan Kapasitas'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
