// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowDownToLine,
  Building2,
  CheckCircle,
  Clock,
  Copy,
  DollarSign,
  Edit,
  Eye,
  Handshake,
  Link as LinkIcon,
  LogOut,
  MessageCircle,
  Save,
  Settings,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { useToast } from '../../hooks/use-toast';
import { authAPI, mitraAPI } from '../../services/api';
import { getApiErrorMessage } from '../../services/api-error';
import LoadingSpinner from '../../components/ui/loading-spinner';
import { formatCurrency } from '../../lib/utils';
import { buildFrontendUrl } from '../../lib/public-url';
import { copyTextToClipboard } from '../../lib/clipboard';
import ResponsiveTabs from '../../components/ui/responsive-tabs';
import Pagination from '../../components/ui/pagination';
import { createEmptyPageState, extractPaginatedResponse } from '../../lib/paginated-response';
import { useTheme } from '../../contexts/ThemeContext';
import { buildMitraUpgradeWhatsappMessage, buildWhatsAppUrl } from '../../lib/mitra-whatsapp';

const fmt = formatCurrency;
const SHARE_BUDGET = 150000;

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
  { id: 'yayasan', label: 'Yayasan Saya', icon: Building2 },
  { id: 'requests', label: 'Permintaan Harga', icon: Edit },
  { id: 'wallet', label: 'Wallet', icon: Wallet },
  { id: 'settings', label: 'Pengaturan', icon: Settings },
];

export default function MitraDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { settings } = useTheme();
  const [mitra, setMitra] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [yayasanList, setYayasanList] = useState([]);
  const [wallet, setWallet] = useState({ balance: 0, transactions: [] });
  const [requests, setRequests] = useState([]);
  const [yayasanPagination, setYayasanPagination] = useState(createEmptyPageState(10));
  const [requestsPagination, setRequestsPagination] = useState(createEmptyPageState(10));
  const [walletPagination, setWalletPagination] = useState(createEmptyPageState(10));
  const [yayasanPage, setYayasanPage] = useState(1);
  const [yayasanPageSize, setYayasanPageSize] = useState(10);
  const [requestsPage, setRequestsPage] = useState(1);
  const [requestsPageSize, setRequestsPageSize] = useState(10);
  const [walletPage, setWalletPage] = useState(1);
  const [walletPageSize, setWalletPageSize] = useState(10);
  const [withdrawForm, setWithdrawForm] = useState({ amount: '', bankName: '', bankAccount: '', accountName: '' });
  const [withdrawing, setWithdrawing] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailYayasan, setDetailYayasan] = useState(null);
  const [approveTarget, setApproveTarget] = useState(null);
  const [approveShare, setApproveShare] = useState(50000);
  const [requestTarget, setRequestTarget] = useState(null);
  const [requestForm, setRequestForm] = useState({ requestedYayasanShare: 50000, reason: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ fullName: '', email: '', phone: '', address: '' });

  useEffect(() => { checkAuth(); }, []);
  useEffect(() => {
    if (mitra) {
      void loadAll();
    }
  }, [mitra, yayasanPage, yayasanPageSize, requestsPage, requestsPageSize, walletPage, walletPageSize]);

  const checkAuth = async () => {
    try {
      if (!localStorage.getItem('mitra_token')) {
        navigate('/mitra/login');
        return;
      }
      const res = await mitraAPI.getProfile();
      setMitra(res.data);
      setProfileForm({
        fullName: res.data.fullName || res.data.name || '',
        email: res.data.email || '',
        phone: res.data.phone || '',
        address: res.data.address || '',
      });
      await loadAll();
    } catch {
      localStorage.removeItem('mitra_token');
      navigate('/mitra/login');
    } finally {
      setLoading(false);
    }
  };

  const loadAll = async () => {
    const [statsRes, yayasanRes, walletRes, requestsRes] = await Promise.allSettled([
      mitraAPI.getDashboardStats(),
      mitraAPI.getYayasan({ page: yayasanPage, pageSize: yayasanPageSize }),
      mitraAPI.getWallet({ page: walletPage, pageSize: walletPageSize }),
      mitraAPI.getPriceChangeRequests({ page: requestsPage, pageSize: requestsPageSize }),
    ]);
    if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
    if (yayasanRes.status === 'fulfilled') {
      const nextPage = extractPaginatedResponse(yayasanRes.value.data, yayasanPageSize);
      setYayasanList(nextPage.items || []);
      setYayasanPagination(nextPage);
    }
    if (walletRes.status === 'fulfilled') {
      const walletData = walletRes.value.data || { balance: 0, transactions: [] };
      const nextTransactions = extractPaginatedResponse(walletData.transactions, walletPageSize);
      setWallet({ ...walletData, transactions: nextTransactions.items || [] });
      setWalletPagination(nextTransactions);
    }
    if (requestsRes.status === 'fulfilled') {
      const nextPage = extractPaginatedResponse(requestsRes.value.data, requestsPageSize);
      setRequests(nextPage.items || []);
      setRequestsPagination(nextPage);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('mitra_token');
    localStorage.removeItem('mitra_data');
    navigate('/mitra/login');
  };

  const handleCopyInvite = async () => {
    const link = buildFrontendUrl('/yayasan/register', { mitra: mitra.inviteCode });
    const copied = await copyTextToClipboard(link);
    toast({
      title: copied ? 'Disalin!' : 'Salin gagal',
      description: copied ? 'Link undangan yayasan berhasil disalin' : 'Browser menolak akses clipboard. Coba salin manual dari kolom link.',
      variant: copied ? 'default' : 'destructive',
    });
  };

  const openDetail = async (yayasanId) => {
    setDetailOpen(true);
    setDetailYayasan(null);
    try {
      const response = await mitraAPI.getYayasanDetail(yayasanId);
      setDetailYayasan(response.data);
    } catch (error) {
      toast({ title: 'Error', description: getApiErrorMessage(error, 'Gagal memuat detail yayasan'), variant: 'destructive' });
      setDetailOpen(false);
    }
  };

  const handleApprove = async () => {
    if (!approveTarget) return;
    try {
      await mitraAPI.approveYayasan(approveTarget._id, { yayasanShare: Number(approveShare || 0) });
      toast({ title: 'Berhasil', description: 'Yayasan berhasil di-approve dan komisi awal dikunci' });
      setApproveTarget(null);
      await loadAll();
    } catch (error) {
      toast({ title: 'Error', description: getApiErrorMessage(error, 'Gagal approve yayasan'), variant: 'destructive' });
    }
  };

  const handleCreateRequest = async () => {
    if (!requestTarget) return;
    const normalizedReason = String(requestForm.reason || '').trim();
    if (normalizedReason.length < 10) {
      toast({
        title: 'Alasan belum lengkap',
        description: 'Alasan ubah harga minimal 10 karakter agar admin bisa meninjau permintaan dengan jelas.',
        variant: 'destructive',
      });
      return;
    }
    try {
      await mitraAPI.createPriceChangeRequest(requestTarget._id, {
        requestedYayasanShare: Number(requestForm.requestedYayasanShare || 0),
        reason: normalizedReason,
      });
      toast({ title: 'Berhasil', description: 'Permintaan ubah harga telah dikirim ke admin' });
      setRequestTarget(null);
      setRequestForm({ requestedYayasanShare: 50000, reason: '' });
      await loadAll();
    } catch (error) {
      toast({ title: 'Error', description: getApiErrorMessage(error, 'Gagal membuat permintaan ubah harga'), variant: 'destructive' });
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    setWithdrawing(true);
    try {
      await mitraAPI.withdraw({
        amount: Number(withdrawForm.amount),
        bankName: withdrawForm.bankName,
        bankAccount: withdrawForm.bankAccount,
        accountName: withdrawForm.accountName,
      });
      toast({ title: 'Berhasil', description: 'Permintaan penarikan berhasil dibuat' });
      setWithdrawForm({ amount: '', bankName: '', bankAccount: '', accountName: '' });
      await loadAll();
    } catch (error) {
      toast({ title: 'Error', description: getApiErrorMessage(error, 'Gagal membuat penarikan'), variant: 'destructive' });
    } finally {
      setWithdrawing(false);
    }
  };

  const handleProfileSave = async () => {
    setSavingProfile(true);
    try {
      const response = await authAPI.updateProfile({
        fullName: profileForm.fullName,
        email: profileForm.email,
        phone: profileForm.phone,
        address: profileForm.address,
      });
      setMitra(response.data);
      toast({ title: 'Berhasil', description: 'Profil mitra berhasil diperbarui' });
    } catch (error) {
      toast({ title: 'Error', description: getApiErrorMessage(error, 'Gagal menyimpan profil'), variant: 'destructive' });
    } finally {
      setSavingProfile(false);
    }
  };

  const requestMitraShare = useMemo(
    () => Math.max(SHARE_BUDGET - Number(requestForm.requestedYayasanShare || 0), 0),
    [requestForm.requestedYayasanShare],
  );
  const capacityUsed = Number(stats?.capacityUsed ?? mitra?.capacityUsed ?? 0);
  const capacityLimit = Number(stats?.capacityLimit ?? mitra?.capacityLimit ?? 0);
  const capacityRemaining = Math.max(Number(stats?.capacityRemaining ?? mitra?.capacityRemaining ?? (capacityLimit - capacityUsed)), 0);
  const isCapacityFull = Boolean(stats?.isCapacityFull ?? mitra?.isCapacityFull ?? (capacityLimit > 0 && capacityUsed >= capacityLimit));
  const whatsappUpgradeUrl = buildWhatsAppUrl(
    settings?.whatsapp,
    buildMitraUpgradeWhatsappMessage({
      mitraName: mitra?.name,
      capacityUsed,
      capacityLimit,
    }),
  );

  if (loading) return <LoadingSpinner size="lg" text="Memuat dashboard mitra..." className="min-h-screen" />;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1a1a] to-[#2a2a2a]">
      <header className="bg-[#2a2a2a] border-b border-yellow-400/20 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center">
              <Handshake className="w-5 h-5 text-[#1a1a1a]" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg">{mitra.name || 'Mitra'}</h1>
              <p className="text-gray-400 text-xs">{mitra.email}</p>
            </div>
          </div>
          <Button onClick={handleLogout} variant="outline" className="border-yellow-400 text-yellow-400 hover:bg-yellow-400/10">
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <ResponsiveTabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <Card className={`border ${isCapacityFull ? 'border-red-400/30 bg-red-400/10' : 'border-yellow-400/20 bg-[#2a2a2a]'}`}>
              <CardContent className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-yellow-400">Kapasitas Yayasan</p>
                    <h3 className="mt-2 text-xl font-bold text-white">{capacityUsed}/{capacityLimit} yayasan terkelola</h3>
                    <p className="mt-2 text-sm text-gray-300">
                      {isCapacityFull
                        ? 'Kapasitas Anda saat ini sudah penuh. Untuk pembahasan penambahan kapasitas, silakan hubungi admin NEWME.'
                        : `Sisa kapasitas aktif saat ini: ${capacityRemaining} yayasan.`}
                    </p>
                  </div>
                  {isCapacityFull ? (
                    <Button asChild className="bg-yellow-400 text-black hover:bg-yellow-500">
                      <a href={whatsappUpgradeUrl || '#'} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="mr-2 h-4 w-4" />
                        Hubungi Admin
                      </a>
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Yayasan', value: stats?.totalYayasan || 0, icon: Building2, color: 'yellow' },
                { label: 'Pending Approval', value: stats?.totalPendingYayasan || 0, icon: Clock, color: 'orange' },
                { label: 'Total Pengguna', value: stats?.totalUsers || 0, icon: Users, color: 'blue' },
                { label: 'Pendapatan', value: fmt(stats?.totalEarnings || 0), icon: DollarSign, color: 'green' },
              ].map((stat) => (
                <Card key={stat.label} className="bg-[#2a2a2a] border-yellow-400/20">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg bg-${stat.color}-400/10 flex items-center justify-center`}>
                        <stat.icon className={`w-5 h-5 text-${stat.color}-400`} />
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">{stat.label}</p>
                        <p className={`text-${stat.color}-400 font-bold text-lg`}>{stat.value}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="bg-[#2a2a2a] border-yellow-400/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <LinkIcon className="w-5 h-5 text-yellow-400" /> Link Undangan Yayasan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input value={buildFrontendUrl('/yayasan/register', { mitra: mitra.inviteCode || '' })} readOnly className="bg-[#1a1a1a] border-yellow-400/20 text-white" />
                  <Button
                    onClick={() => void handleCopyInvite()}
                    className="bg-yellow-400 text-black hover:bg-yellow-500 shrink-0"
                    disabled={isCapacityFull}
                  >
                    <Copy className="w-4 h-4 mr-2" /> Salin
                  </Button>
                </div>
                <p className="text-gray-400 text-xs mt-2">
                  {isCapacityFull
                    ? 'Link undangan yayasan dinonaktifkan sementara karena kapasitas Anda sedang penuh.'
                    : 'Bagikan link ini ke yayasan yang ingin Anda ajak bergabung.'}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'yayasan' && (
          <div className="space-y-4">
            <Card className="bg-[#2a2a2a] border-yellow-400/20">
              <CardHeader>
                <CardTitle className="text-white">Yayasan di Bawah Anda</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {yayasanList.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">Belum ada yayasan terdaftar</div>
                ) : (
                  <div className="divide-y divide-yellow-400/10">
                    {yayasanList.map((y) => {
                      const isApproved = y.approvalStatus === 'APPROVED' || y.isMitraApproved;
                      return (
                        <div key={y._id} className="p-4 hover:bg-[#333]">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-white font-semibold">{y.name}</p>
                                <span className={`px-2 py-0.5 rounded text-xs ${isApproved ? 'bg-green-400/20 text-green-400' : 'bg-yellow-400/20 text-yellow-400'}`}>
                                  {isApproved ? 'Approved' : 'Menunggu Approval'}
                                </span>
                              </div>
                              <p className="text-gray-400 text-xs mt-1">{y.email}</p>
                              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                                <div className="inline-flex items-center gap-2 rounded-lg bg-blue-400/10 px-3 py-2 text-blue-400">
                                  <Users className="w-4 h-4" />
                                  <span className="font-semibold">{y.usersCount || 0}</span>
                                  <span className="text-xs text-blue-300">pengguna</span>
                                </div>
                                <div className="rounded-lg bg-[#1a1a1a] px-3 py-2">
                                  <p className="text-gray-500 text-xs">Komisi Yayasan</p>
                                  <p className="text-yellow-400 font-semibold">{isApproved ? fmt(y.yayasanShare || 0) : '-'}</p>
                                </div>
                                <div className="rounded-lg bg-[#1a1a1a] px-3 py-2">
                                  <p className="text-gray-500 text-xs">Komisi Mitra</p>
                                  <p className="text-green-400 font-semibold">{isApproved ? fmt(y.mitraShare || 0) : '-'}</p>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2 lg:justify-end">
                              <Button size="sm" variant="outline" className="border-blue-400/50 text-blue-400" onClick={() => openDetail(y._id)}>
                                <Eye className="w-4 h-4 mr-1" /> Lihat Detail
                              </Button>
                              {!isApproved ? (
                                <Button
                                  size="sm"
                                  className="bg-yellow-400 text-black hover:bg-yellow-500"
                                  onClick={() => {
                                    setApproveTarget(y);
                                    setApproveShare(Number(y.yayasanShare || 50000));
                                  }}
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" /> Approve
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-yellow-400/50 text-yellow-400"
                                  onClick={() => {
                                    setRequestTarget(y);
                                    setRequestForm({
                                      requestedYayasanShare: Number(y.yayasanShare || 50000),
                                      reason: '',
                                    });
                                  }}
                                >
                                  <Edit className="w-4 h-4 mr-1" /> Ubah Harga
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
            <Pagination
              currentPage={yayasanPagination.page}
              totalPages={yayasanPagination.totalPages}
              totalItems={yayasanPagination.total}
              pageSize={yayasanPagination.pageSize}
              onPageChange={setYayasanPage}
              onPageSizeChange={(nextSize) => {
                setYayasanPageSize(nextSize);
                setYayasanPage(1);
              }}
            />
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="space-y-4">
            <Card className="bg-[#2a2a2a] border-yellow-400/20">
              <CardHeader>
                <CardTitle className="text-white">Permintaan Ubah Harga</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {requests.length === 0 ? (
                  <p className="text-gray-400">Belum ada permintaan ubah harga.</p>
                ) : requests.map((item) => (
                  <div key={item._id} className="rounded-lg border border-yellow-400/10 bg-[#1a1a1a] p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-white font-medium">{item.yayasanName}</p>
                        <p className="text-gray-500 text-xs">{item.yayasanEmail || '-'}</p>
                        <p className="text-gray-400 text-sm mt-2">
                          {fmt(item.currentYayasanShare || 0)} / {fmt(item.currentMitraShare || 0)} menjadi {fmt(item.requestedYayasanShare || 0)} / {fmt(item.requestedMitraShare || 0)}
                        </p>
                        <p className="text-gray-500 text-xs mt-1">{item.reason}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs ${
                        item.status === 'approved'
                          ? 'bg-green-400/20 text-green-400'
                          : item.status === 'rejected'
                            ? 'bg-red-400/20 text-red-400'
                            : 'bg-yellow-400/20 text-yellow-400'
                      }`}>
                        {item.status === 'approved' ? 'Disetujui' : item.status === 'rejected' ? 'Ditolak' : 'Menunggu Review'}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Pagination
              currentPage={requestsPagination.page}
              totalPages={requestsPagination.totalPages}
              totalItems={requestsPagination.total}
              pageSize={requestsPagination.pageSize}
              onPageChange={setRequestsPage}
              onPageSizeChange={(nextSize) => {
                setRequestsPageSize(nextSize);
                setRequestsPage(1);
              }}
            />
          </div>
        )}

        {activeTab === 'wallet' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-[#2a2a2a] border-yellow-400/20">
                <CardHeader><CardTitle className="text-white">Saldo Wallet</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-4xl font-bold text-yellow-400">{fmt(wallet.balance || 0)}</p>
                  <div className="rounded-lg bg-[#1a1a1a] p-3 text-sm">
                    <p className="text-gray-400">Dana dicadangkan untuk penarikan pending</p>
                    <p className="mt-1 font-semibold text-white">{fmt(wallet.reserveBalance || 0)}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#2a2a2a] border-yellow-400/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <ArrowDownToLine className="w-5 h-5 text-yellow-400" /> Tarik Dana
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleWithdraw} className="space-y-3">
                    <div>
                      <Label className="text-gray-400 text-sm">Jumlah</Label>
                      <Input type="number" value={withdrawForm.amount} onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })} required min={50000} className="bg-[#1a1a1a] border-yellow-400/20 text-white" />
                    </div>
                    <div>
                      <Label className="text-gray-400 text-sm">Nama Bank</Label>
                      <Input value={withdrawForm.bankName} onChange={(e) => setWithdrawForm({ ...withdrawForm, bankName: e.target.value })} required className="bg-[#1a1a1a] border-yellow-400/20 text-white" />
                    </div>
                    <div>
                      <Label className="text-gray-400 text-sm">Nomor Rekening</Label>
                      <Input value={withdrawForm.bankAccount} onChange={(e) => setWithdrawForm({ ...withdrawForm, bankAccount: e.target.value })} required className="bg-[#1a1a1a] border-yellow-400/20 text-white" />
                    </div>
                    <div>
                      <Label className="text-gray-400 text-sm">Nama Pemilik Rekening</Label>
                      <Input value={withdrawForm.accountName} onChange={(e) => setWithdrawForm({ ...withdrawForm, accountName: e.target.value })} required className="bg-[#1a1a1a] border-yellow-400/20 text-white" />
                    </div>
                    <Button type="submit" disabled={withdrawing} className="w-full bg-yellow-400 text-black hover:bg-yellow-500">
                      {withdrawing ? 'Memproses...' : 'Ajukan Penarikan'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-[#2a2a2a] border-yellow-400/20">
              <CardHeader>
                <CardTitle className="text-white">Riwayat Penarikan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {wallet.transactions.length === 0 ? (
                  <p className="text-gray-400">Belum ada riwayat penarikan.</p>
                ) : wallet.transactions.map((item) => (
                  <div key={item._id || item.id} className="rounded-lg border border-yellow-400/10 bg-[#1a1a1a] p-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-white font-medium">{item.bankName || 'Rekening Mitra'}</p>
                        <p className="text-xs text-gray-500">{item.bankAccount || '-'} / {item.accountName || '-'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-yellow-400 font-semibold">{fmt(item.amount || 0)}</p>
                        <p className="text-xs text-gray-500">{item.createdAt ? new Date(item.createdAt).toLocaleString('id-ID') : '-'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Pagination
              currentPage={walletPagination.page}
              totalPages={walletPagination.totalPages}
              totalItems={walletPagination.total}
              pageSize={walletPagination.pageSize}
              onPageChange={setWalletPage}
              onPageSizeChange={(nextSize) => {
                setWalletPageSize(nextSize);
                setWalletPage(1);
              }}
            />
          </div>
        )}

        {activeTab === 'settings' && (
          <Card className="bg-[#2a2a2a] border-yellow-400/20">
            <CardHeader>
              <CardTitle className="text-white">Edit Profil Mitra</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-400 text-sm">Nama</Label>
                  <Input value={profileForm.fullName} onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })} className="bg-[#1a1a1a] border-yellow-400/20 text-white" />
                </div>
                <div>
                  <Label className="text-gray-400 text-sm">Email</Label>
                  <Input value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} className="bg-[#1a1a1a] border-yellow-400/20 text-white" />
                </div>
                <div>
                  <Label className="text-gray-400 text-sm">Telepon</Label>
                  <Input value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} className="bg-[#1a1a1a] border-yellow-400/20 text-white" />
                </div>
                <div>
                  <Label className="text-gray-400 text-sm">Kode Undangan</Label>
                  <Input value={mitra.inviteCode || '-'} readOnly className="bg-[#1a1a1a] border-yellow-400/20 text-yellow-400 font-mono" />
                </div>
              </div>
              <div>
                <Label className="text-gray-400 text-sm">Alamat</Label>
                <Textarea value={profileForm.address} onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })} className="bg-[#1a1a1a] border-yellow-400/20 text-white min-h-[96px]" />
              </div>
              <div className="rounded-lg bg-[#1a1a1a] p-4 text-sm text-gray-400">
                Jika email atau nomor HP sudah dipakai akun lain, sistem akan menolak perubahan dan menampilkan pesan yang jelas.
              </div>
              <Button onClick={handleProfileSave} disabled={savingProfile} className="bg-yellow-400 text-black hover:bg-yellow-500">
                <Save className="w-4 h-4 mr-2" />
                {savingProfile ? 'Menyimpan...' : 'Simpan Profil'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={!!approveTarget} onOpenChange={(open) => !open && setApproveTarget(null)}>
        <DialogContent className="bg-[#2a2a2a] border-yellow-400/20">
          <DialogHeader><DialogTitle className="text-white">Approve Yayasan</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-[#1a1a1a] p-4 text-sm text-gray-300">
              Tentukan komisi awal yayasan. Setelah disimpan, perubahan berikutnya harus melalui permintaan ke admin.
            </div>
            <div>
              <Label className="text-gray-400 text-sm">Komisi Yayasan</Label>
              <Input type="number" value={approveShare} onChange={(e) => setApproveShare(Number(e.target.value))} className="bg-[#1a1a1a] border-yellow-400/20 text-white" />
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-[#1a1a1a] p-3">
                <p className="text-gray-500 text-xs">Komisi Mitra</p>
                <p className="text-green-400 font-semibold">{fmt(Math.max(SHARE_BUDGET - Number(approveShare || 0), 0))}</p>
              </div>
              <div className="rounded-lg bg-[#1a1a1a] p-3">
                <p className="text-gray-500 text-xs">Harga User</p>
                <p className="text-yellow-400 font-semibold">{fmt(250000)}</p>
              </div>
            </div>
            <Button onClick={handleApprove} className="w-full bg-yellow-400 text-black hover:bg-yellow-500">
              <CheckCircle className="w-4 h-4 mr-2" /> Approve dan Kunci Komisi Awal
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!requestTarget} onOpenChange={(open) => !open && setRequestTarget(null)}>
        <DialogContent className="bg-[#2a2a2a] border-yellow-400/20">
          <DialogHeader><DialogTitle className="text-white">Permintaan Ubah Harga</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-[#1a1a1a] p-4 text-sm text-gray-300">
              Ubah harga hanya bisa diproses admin. Pastikan Anda sudah menghubungi admin sebelum mengirim permintaan ini.
            </div>
            <div>
              <Label className="text-gray-400 text-sm">Komisi Yayasan Baru</Label>
              <Input
                type="number"
                value={requestForm.requestedYayasanShare}
                onChange={(e) => setRequestForm({ ...requestForm, requestedYayasanShare: Number(e.target.value) })}
                min={0}
                max={SHARE_BUDGET}
                className="bg-[#1a1a1a] border-yellow-400/20 text-white"
              />
            </div>
            <div className="rounded-lg bg-[#1a1a1a] p-3 text-sm">
              <p className="text-gray-500 text-xs">Komisi Mitra Baru</p>
              <p className="text-green-400 font-semibold">{fmt(requestMitraShare)}</p>
            </div>
            <div>
              <Label className="text-gray-400 text-sm">Alasan Ubah Harga</Label>
              <Textarea value={requestForm.reason} onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })} className="bg-[#1a1a1a] border-yellow-400/20 text-white min-h-[120px]" />
              <p className="mt-2 text-xs text-gray-500">Minimal 10 karakter agar alasan perubahan harga jelas untuk admin.</p>
            </div>
            <Button onClick={handleCreateRequest} className="w-full bg-yellow-400 text-black hover:bg-yellow-500">
              <Edit className="w-4 h-4 mr-2" /> Kirim Permintaan ke Admin
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-4xl bg-[#2a2a2a] border-yellow-400/20">
          <DialogHeader><DialogTitle className="text-white">Detail Yayasan</DialogTitle></DialogHeader>
          {!detailYayasan ? (
            <LoadingSpinner size="md" text="Memuat detail yayasan..." className="min-h-[240px]" />
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg bg-[#1a1a1a] p-4">
                  <p className="text-gray-500 text-xs">Nama</p>
                  <p className="text-white">{detailYayasan.name}</p>
                </div>
                <div className="rounded-lg bg-[#1a1a1a] p-4">
                  <p className="text-gray-500 text-xs">Email</p>
                  <p className="text-white break-all">{detailYayasan.email}</p>
                </div>
                <div className="rounded-lg bg-[#1a1a1a] p-4">
                  <p className="text-gray-500 text-xs">Total Pengguna</p>
                  <p className="text-blue-400 font-semibold">{detailYayasan.usersCount || 0}</p>
                </div>
                <div className="rounded-lg bg-[#1a1a1a] p-4">
                  <p className="text-gray-500 text-xs">Total Komisi Yayasan</p>
                  <p className="text-yellow-400 font-semibold">{fmt(detailYayasan.totalCommission || 0)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Registrasi', value: detailYayasan?.stats?.totalRegistered || 0, color: 'text-blue-400' },
                  { label: 'Sudah Tes', value: detailYayasan?.stats?.sudahTes || 0, color: 'text-green-400' },
                  { label: 'Bayar, Belum Tes', value: detailYayasan?.stats?.sudahBayarBelumTes || 0, color: 'text-yellow-400' },
                  { label: 'Belum Bayar', value: detailYayasan?.stats?.belumBayar || 0, color: 'text-red-400' },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg bg-[#1a1a1a] p-4 text-center">
                    <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                    <p className="text-gray-500 text-xs mt-1">{item.label}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-lg bg-[#1a1a1a] p-4">
                <p className="text-yellow-400 font-semibold mb-3">Pengguna Terdaftar</p>
                <div className="space-y-2">
                  {(detailYayasan.users || []).length === 0 ? (
                    <p className="text-gray-500 text-sm">Belum ada pengguna.</p>
                  ) : (detailYayasan.users || []).map((u) => (
                    <div key={u._id} className="flex flex-col gap-2 rounded-lg border border-yellow-400/10 p-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-white text-sm font-medium">{u.fullName}</p>
                        <p className="text-gray-500 text-xs">{u.email}</p>
                      </div>
                      <div className="flex gap-2">
                        <span className={`px-2 py-1 rounded text-xs ${u.paymentStatus === 'approved' ? 'bg-green-400/20 text-green-400' : 'bg-red-400/20 text-red-400'}`}>
                          {u.paymentStatus === 'approved' ? 'Lunas' : 'Belum Bayar'}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs ${u.paidTestStatus === 'completed' ? 'bg-purple-400/20 text-purple-400' : 'bg-gray-400/20 text-gray-400'}`}>
                          {u.paidTestStatus === 'completed' ? 'Tes Selesai' : 'Belum Tes'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
