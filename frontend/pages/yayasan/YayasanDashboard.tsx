// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownToLine, Building2, CheckCircle, Copy, CreditCard, Eye, FileText, Gift, Loader2, LogOut, Settings, TrendingUp, Users, Wallet } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { useToast } from '../../hooks/use-toast';
import { authAPI, yayasanAPI } from '../../services/api';
import { getApiErrorMessage } from '../../services/api-error';
import LoadingSpinner from '../../components/ui/loading-spinner';
import { formatCurrency } from '../../lib/utils';
import { buildFrontendUrl } from '../../lib/public-url';
import { copyTextToClipboard } from '../../lib/clipboard';
import ResponsiveTabs from '../../components/ui/responsive-tabs';

const fmt = formatCurrency;
const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
  { id: 'users', label: 'Pengguna', icon: Users },
  { id: 'results', label: 'Hasil Test', icon: FileText },
  { id: 'wallet', label: 'Wallet', icon: Wallet },
  { id: 'settings', label: 'Pengaturan', icon: Settings },
];

const paymentLabel = (status) => status === 'approved' ? 'Berhasil' : status === 'pending' ? 'Proses' : status === 'rejected' ? 'Gagal' : 'Belum Bayar';
const paymentColor = (status) => status === 'approved' ? 'bg-green-400/15 text-green-400' : status === 'pending' ? 'bg-yellow-400/15 text-yellow-400' : status === 'rejected' ? 'bg-red-400/15 text-red-400' : 'bg-gray-400/15 text-gray-300';
const testLabel = (status) => status === 'completed' ? 'Selesai' : status === 'in_progress' ? 'Sedang Test' : 'Belum Test';
const testColor = (status) => status === 'completed' ? 'bg-purple-400/15 text-purple-400' : status === 'in_progress' ? 'bg-blue-400/15 text-blue-400' : 'bg-gray-400/15 text-gray-300';

export default function YayasanDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [yayasan, setYayasan] = useState(null);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [results, setResults] = useState([]);
  const [wallet, setWallet] = useState({ balance: 0, transactions: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [userDetail, setUserDetail] = useState(null);
  const [resultDetail, setResultDetail] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [downloadingUserId, setDownloadingUserId] = useState('');
  const [withdrawForm, setWithdrawForm] = useState({ amount: '', bankName: '', bankAccount: '', accountName: '' });
  const [withdrawing, setWithdrawing] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', email: '', phone: '', address: '', description: '' });

  useEffect(() => {
    void bootstrap();
  }, []);

  const isApproved = yayasan?.approvalStatus === 'APPROVED' || yayasan?.isMitraApproved;
  const referralLink = useMemo(() => (isApproved && yayasan?.referralCode ? buildFrontendUrl('/register', { ref: yayasan.referralCode }) : ''), [isApproved, yayasan?.referralCode]);

  const bootstrap = async () => {
    try {
      if (!localStorage.getItem('yayasan_token')) {
        navigate('/yayasan/login', { replace: true });
        return;
      }
      const profile = (await yayasanAPI.getProfile()).data;
      setYayasan(profile);
      setProfileForm({
        name: profile.name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        address: profile.address || '',
        description: profile.description || '',
      });
      await loadDashboardData(profile);
    } catch {
      localStorage.removeItem('yayasan_token');
      navigate('/yayasan/login', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async (profile = yayasan) => {
    if (!profile) return;
    const approved = profile.approvalStatus === 'APPROVED' || profile.isMitraApproved;
    const requests = await Promise.allSettled([
      yayasanAPI.getDashboardStats(),
      approved ? yayasanAPI.getUsers() : Promise.resolve({ data: [] }),
      approved ? yayasanAPI.getTestResults() : Promise.resolve({ data: [] }),
      approved ? yayasanAPI.getWallet() : Promise.resolve({ data: { balance: 0, transactions: [] } }),
    ]);
    if (requests[0].status === 'fulfilled') setStats(requests[0].value.data);
    if (requests[1].status === 'fulfilled') setUsers(requests[1].value.data || []);
    if (requests[2].status === 'fulfilled') setResults(requests[2].value.data || []);
    if (requests[3].status === 'fulfilled') setWallet(requests[3].value.data || { balance: 0, transactions: [] });
  };

  const handleLogout = () => {
    localStorage.removeItem('yayasan_token');
    localStorage.removeItem('yayasan_data');
    navigate('/yayasan/login');
  };

  const handleCopyReferral = async () => {
    if (!referralLink) return;
    const copied = await copyTextToClipboard(referralLink);
    toast({
      title: copied ? 'Tersalin' : 'Salin gagal',
      description: copied ? 'Link referral yayasan berhasil disalin.' : 'Browser menolak akses clipboard. Coba salin manual dari kolom link.',
      variant: copied ? 'default' : 'destructive',
    });
  };

  const handleOpenUserDetail = async (id) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setUserDetail(null);
    try {
      setUserDetail((await yayasanAPI.getUserDetail(id)).data);
    } catch (error) {
      toast({ title: 'Gagal memuat detail', description: getApiErrorMessage(error, 'Detail pengguna belum bisa dibuka.'), variant: 'destructive' });
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDownloadCertificate = async (userId) => {
    setDownloadingUserId(userId);
    try {
      const opened = window.open(`/certificate-download/${userId}?download=1`, '_blank', 'noopener,noreferrer');
      if (!opened) {
        throw new Error('Popup blocked');
      }
    } catch (error) {
      toast({ title: 'Gagal membuka sertifikat', description: getApiErrorMessage(error, 'Izinkan pop-up browser untuk menyimpan sertifikat sebagai PDF.'), variant: 'destructive' });
    } finally {
      setDownloadingUserId('');
    }
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    try {
      const response = await authAPI.updateProfile({
        fullName: profileForm.name,
        email: profileForm.email,
        phone: profileForm.phone,
        address: profileForm.address,
        institutionName: profileForm.name,
        institutionAddress: profileForm.address,
        description: profileForm.description,
      });
      setYayasan(response.data);
      setProfileForm({
        name: response.data.name || '',
        email: response.data.email || '',
        phone: response.data.phone || '',
        address: response.data.address || '',
        description: response.data.description || '',
      });
      toast({ title: 'Profil diperbarui', description: 'Informasi yayasan berhasil disimpan.' });
    } catch (error) {
      toast({ title: 'Gagal memperbarui profil', description: getApiErrorMessage(error, 'Periksa email dan nomor telepon Anda.'), variant: 'destructive' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawForm.amount || !withdrawForm.bankName || !withdrawForm.bankAccount || !withdrawForm.accountName) {
      toast({ title: 'Data belum lengkap', description: 'Lengkapi seluruh data penarikan terlebih dahulu.', variant: 'destructive' });
      return;
    }
    setWithdrawing(true);
    try {
      await yayasanAPI.withdraw({
        amount: Number(withdrawForm.amount),
        bankName: withdrawForm.bankName,
        bankAccount: withdrawForm.bankAccount,
        accountName: withdrawForm.accountName,
      });
      setWithdrawForm({ amount: '', bankName: '', bankAccount: '', accountName: '' });
      toast({ title: 'Permintaan dikirim', description: 'Permintaan penarikan sedang diproses admin.' });
      await loadDashboardData();
    } catch (error) {
      toast({ title: 'Gagal mengajukan penarikan', description: getApiErrorMessage(error, 'Periksa saldo dan data rekening Anda.'), variant: 'destructive' });
    } finally {
      setWithdrawing(false);
    }
  };

  const filteredUsers = users.filter((item) => `${item.fullName || ''} ${item.email || ''}`.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) {
    return <div className="min-h-screen bg-gradient-to-b from-[#1a1a1a] to-[#2a2a2a] flex items-center justify-center"><LoadingSpinner size="lg" text="Memuat dashboard yayasan..." /></div>;
  }
  if (!yayasan) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1a1a] to-[#2a2a2a]">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600"><Building2 className="h-7 w-7 text-[#1a1a1a]" /></div>
            <div>
              <h1 className="text-2xl font-bold text-white">{yayasan.name}</h1>
              <p className="text-sm text-gray-400">Dashboard Yayasan</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className={`rounded-full px-3 py-1 text-xs ${isApproved ? 'bg-green-400/15 text-green-400' : 'bg-yellow-400/15 text-yellow-400'}`}>{isApproved ? 'Sudah disetujui mitra' : 'Menunggu approval mitra'}</span>
                {yayasan.mitraName && <span className="rounded-full bg-blue-400/15 px-3 py-1 text-xs text-blue-400">Mitra: {yayasan.mitraName}</span>}
              </div>
            </div>
          </div>
          <Button onClick={handleLogout} variant="outline" className="border-red-400/50 text-red-400 hover:bg-red-400/10"><LogOut className="mr-2 h-4 w-4" />Logout</Button>
        </div>
        <ResponsiveTabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {!isApproved && (
              <Card className="border-yellow-400/25 bg-[#2a2a2a]">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="rounded-full bg-yellow-400/10 p-3"><Gift className="h-5 w-5 text-yellow-400" /></div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Akun yayasan sedang menunggu approval mitra</h3>
                      <p className="mt-2 text-sm text-gray-300">Komisi yayasan dan link referral user akan aktif setelah mitra menyetujui akun ini dan menetapkan komisi awal.</p>
                      {yayasan.mitraName && <p className="mt-3 text-xs text-gray-400">Mitra pengampu: <span className="text-white">{yayasan.mitraName}</span></p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                { label: 'Total Pengguna', value: stats?.totalUsers || 0, icon: Users, color: 'text-yellow-400' },
                { label: 'Sudah Bayar', value: stats?.paidUsers || 0, icon: CreditCard, color: 'text-green-400' },
                { label: 'Test Selesai', value: stats?.completedTests || 0, icon: CheckCircle, color: 'text-purple-400' },
                { label: 'Komisi Yayasan', value: isApproved ? fmt(yayasan.yayasanShare || 0) : '-', icon: Wallet, color: 'text-blue-400' },
              ].map((item) => (
                <Card key={item.label} className="border-yellow-400/20 bg-[#2a2a2a]">
                  <CardContent className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="text-xs text-gray-400">{item.label}</p>
                      <p className={`mt-1 text-lg font-bold ${item.color}`}>{item.value}</p>
                    </div>
                    <item.icon className={`h-8 w-8 shrink-0 opacity-30 ${item.color}`} />
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card className="border-yellow-400/20 bg-[#2a2a2a]">
              <CardHeader><CardTitle className="text-white">Referral Yayasan</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {!isApproved ? (
                  <div className="rounded-lg border border-yellow-400/20 bg-[#1a1a1a] p-4 text-sm text-gray-300">Link referral akan muncul otomatis setelah approval mitra selesai.</div>
                ) : (
                  <>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Input value={referralLink} readOnly className="bg-[#1a1a1a] text-gray-300" />
                      <Button onClick={handleCopyReferral} className="bg-yellow-400 text-black hover:bg-yellow-500"><Copy className="mr-2 h-4 w-4" />Salin Link</Button>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <span className="text-gray-400">Kode referral: <code className="font-mono text-yellow-400">{yayasan.referralCode}</code></span>
                      <span className="text-gray-400">Komisi yayasan: <strong className="text-green-400">{fmt(yayasan.yayasanShare || 0)}</strong></span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {!isApproved ? (
              <Card className="border-yellow-400/20 bg-[#2a2a2a]"><CardContent className="py-12 text-center text-gray-400">Data pengguna akan muncul setelah yayasan disetujui oleh mitra.</CardContent></Card>
            ) : (
              <>
                <Input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Cari nama atau email pengguna..." className="border-yellow-400/30 bg-[#2a2a2a] text-white" />
                <Card className="border-yellow-400/20 bg-[#2a2a2a]">
                  <CardContent className="p-0">
                    {filteredUsers.length === 0 ? (
                      <p className="py-12 text-center text-gray-400">Belum ada pengguna terhubung.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead><tr className="border-b border-yellow-400/20 text-gray-400"><th className="px-4 py-3 text-left">Pengguna</th><th className="px-4 py-3 text-left">Status Bayar</th><th className="px-4 py-3 text-left">Status Test</th><th className="px-4 py-3 text-left">Aksi</th></tr></thead>
                          <tbody>
                            {filteredUsers.map((item) => (
                              <tr key={item._id} className="border-b border-yellow-400/10 hover:bg-[#333]">
                                <td className="px-4 py-3"><p className="font-medium text-white">{item.fullName}</p><p className="text-xs text-gray-400">{item.email}</p></td>
                                <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs ${paymentColor(item.paymentStatus)}`}>{paymentLabel(item.paymentStatus)}</span></td>
                                <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs ${testColor(item.paidTestStatus)}`}>{testLabel(item.paidTestStatus)}</span></td>
                                <td className="px-4 py-3"><Button size="sm" variant="outline" className="border-yellow-400/30 text-yellow-400" onClick={() => void handleOpenUserDetail(item._id)}><Eye className="mr-2 h-4 w-4" />Detail</Button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}
        {activeTab === 'results' && (
          <div className="space-y-4">
            {!isApproved ? (
              <Card className="border-yellow-400/20 bg-[#2a2a2a]"><CardContent className="py-12 text-center text-gray-400">Hasil test akan muncul setelah yayasan aktif dan pengguna mulai menyelesaikan test premium.</CardContent></Card>
            ) : results.length === 0 ? (
              <Card className="border-yellow-400/20 bg-[#2a2a2a]"><CardContent className="py-12 text-center text-gray-400">Belum ada hasil test premium dari pengguna yayasan ini.</CardContent></Card>
            ) : (
              results.map((item) => (
                <Card key={item._id} className="border-yellow-400/20 bg-[#2a2a2a]">
                  <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold text-white">{item.userName}</p>
                      <p className="text-xs text-gray-400">{item.userEmail}</p>
                      <p className="mt-2 text-sm text-yellow-400">{item.dominantLabel || item.analysis?.personalityType || '-'}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" className="border-yellow-400/30 text-yellow-400" onClick={() => { setResultDetail(item); setResultOpen(true); }}><Eye className="mr-2 h-4 w-4" />Lihat Detail</Button>
                      <Button size="sm" className="bg-yellow-400 text-black hover:bg-yellow-500" disabled={downloadingUserId === item.userId} onClick={() => void handleDownloadCertificate(item.userId)}>
                        {downloadingUserId === item.userId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowDownToLine className="mr-2 h-4 w-4" />}
                        Download Sertifikat
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
        {activeTab === 'wallet' && (
          <div className="space-y-6">
            {!isApproved ? (
              <Card className="border-yellow-400/20 bg-[#2a2a2a]"><CardContent className="py-12 text-center text-gray-400">Wallet komisi aktif setelah yayasan disetujui oleh mitra.</CardContent></Card>
            ) : (
              <>
                <Card className="border-yellow-400/35 bg-gradient-to-br from-yellow-400/20 to-yellow-600/10">
                  <CardContent className="p-6">
                    <p className="text-sm text-gray-400">Saldo Wallet</p>
                    <p className="mt-1 text-4xl font-black text-yellow-400">{fmt(wallet.balance || 0)}</p>
                    <p className="mt-2 text-xs text-gray-500">Komisi dari peserta yayasan yang berhasil membayar test premium.</p>
                    <div className="mt-4 rounded-lg bg-[#1a1a1a] p-3 text-sm">
                      <p className="text-gray-400">Dana dicadangkan untuk penarikan pending</p>
                      <p className="mt-1 font-semibold text-white">{fmt(wallet.reserveBalance || 0)}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-yellow-400/20 bg-[#2a2a2a]">
                  <CardHeader><CardTitle className="text-white">Ajukan Penarikan</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div><Label className="text-gray-400">Jumlah Penarikan</Label><Input type="number" value={withdrawForm.amount} onChange={(event) => setWithdrawForm((prev) => ({ ...prev, amount: event.target.value }))} className="mt-1 border-yellow-400/30 bg-[#1a1a1a] text-white" /></div>
                      <div><Label className="text-gray-400">Nama Bank</Label><Input value={withdrawForm.bankName} onChange={(event) => setWithdrawForm((prev) => ({ ...prev, bankName: event.target.value }))} className="mt-1 border-yellow-400/30 bg-[#1a1a1a] text-white" /></div>
                      <div><Label className="text-gray-400">Nomor Rekening</Label><Input value={withdrawForm.bankAccount} onChange={(event) => setWithdrawForm((prev) => ({ ...prev, bankAccount: event.target.value }))} className="mt-1 border-yellow-400/30 bg-[#1a1a1a] text-white" /></div>
                      <div><Label className="text-gray-400">Nama Pemilik Rekening</Label><Input value={withdrawForm.accountName} onChange={(event) => setWithdrawForm((prev) => ({ ...prev, accountName: event.target.value }))} className="mt-1 border-yellow-400/30 bg-[#1a1a1a] text-white" /></div>
                    </div>
                    <Button onClick={handleWithdraw} disabled={withdrawing} className="bg-yellow-400 text-black hover:bg-yellow-500">
                      {withdrawing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowDownToLine className="mr-2 h-4 w-4" />}
                      Ajukan Penarikan
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}
        {activeTab === 'settings' && (
          <Card className="border-yellow-400/20 bg-[#2a2a2a]">
            <CardHeader><CardTitle className="text-white">Edit Profil Yayasan</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div><Label className="text-gray-400">Nama Yayasan</Label><Input value={profileForm.name} onChange={(event) => setProfileForm((prev) => ({ ...prev, name: event.target.value }))} className="mt-1 border-yellow-400/30 bg-[#1a1a1a] text-white" /></div>
                  <div><Label className="text-gray-400">Email</Label><Input type="email" value={profileForm.email} onChange={(event) => setProfileForm((prev) => ({ ...prev, email: event.target.value }))} className="mt-1 border-yellow-400/30 bg-[#1a1a1a] text-white" /></div>
                  <div><Label className="text-gray-400">Nomor HP</Label><Input value={profileForm.phone} onChange={(event) => setProfileForm((prev) => ({ ...prev, phone: event.target.value }))} className="mt-1 border-yellow-400/30 bg-[#1a1a1a] text-white" /></div>
                  <div><Label className="text-gray-400">Status Approval</Label><Input value={isApproved ? 'Sudah disetujui mitra' : 'Menunggu approval mitra'} readOnly className="mt-1 border-yellow-400/20 bg-[#1a1a1a] text-gray-300" /></div>
                </div>
                <div><Label className="text-gray-400">Alamat</Label><Textarea value={profileForm.address} onChange={(event) => setProfileForm((prev) => ({ ...prev, address: event.target.value }))} className="mt-1 min-h-[100px] border-yellow-400/30 bg-[#1a1a1a] text-white" /></div>
                <div><Label className="text-gray-400">Deskripsi Yayasan</Label><Textarea value={profileForm.description} onChange={(event) => setProfileForm((prev) => ({ ...prev, description: event.target.value }))} className="mt-1 min-h-[120px] border-yellow-400/30 bg-[#1a1a1a] text-white" /></div>
                <Button type="submit" disabled={savingProfile} className="bg-yellow-400 text-black hover:bg-yellow-500">{savingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Simpan Perubahan</Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl border-yellow-400/20 bg-[#2a2a2a]">
          <DialogHeader><DialogTitle className="text-white">Detail Pengguna</DialogTitle></DialogHeader>
          {detailLoading ? (
            <div className="py-10"><LoadingSpinner text="Memuat detail pengguna..." /></div>
          ) : userDetail ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div><p className="text-xs text-gray-400">Nama</p><p className="text-white">{userDetail.fullName}</p></div>
                <div><p className="text-xs text-gray-400">Email</p><p className="text-white">{userDetail.email}</p></div>
                              <div><p className="text-xs text-gray-400">Status Bayar</p><span className={`inline-flex rounded-full px-2 py-1 text-xs ${paymentColor(userDetail.paymentStatus)}`}>{paymentLabel(userDetail.paymentStatus)}</span></div>
                              <div><p className="text-xs text-gray-400">Status Test</p><span className={`inline-flex rounded-full px-2 py-1 text-xs ${testColor(userDetail.paidTestStatus)}`}>{testLabel(userDetail.paidTestStatus)}</span></div>
              </div>
              {userDetail.latestResult ? (
                <div className="rounded-lg bg-[#1a1a1a] p-4">
                  <p className="text-sm font-medium text-yellow-400">Ringkasan Hasil Test</p>
                  <p className="mt-2 text-sm text-gray-300">Elemen dominan: <span className="text-white">{userDetail.latestResult.dominantElement || '-'}</span></p>
                  <p className="mt-1 text-sm text-gray-300">Tipe kepribadian: <span className="text-white">{userDetail.latestResult.displayAnalysis?.personalityType || userDetail.latestResult.personalityType || userDetail.latestResult.personalityCode || '-'}</span></p>
                </div>
              ) : (
                <div className="rounded-lg bg-[#1a1a1a] p-4 text-sm text-gray-400">Pengguna ini belum memiliki hasil test premium.</div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      <Dialog open={resultOpen} onOpenChange={setResultOpen}>
        <DialogContent className="max-w-2xl border-yellow-400/20 bg-[#2a2a2a]">
          <DialogHeader><DialogTitle className="text-white">Detail Hasil Test</DialogTitle></DialogHeader>
          {resultDetail && (
            <div className="space-y-4">
              <div><p className="text-lg font-semibold text-white">{resultDetail.userName}</p><p className="text-sm text-gray-400">{resultDetail.userEmail}</p></div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-lg bg-[#1a1a1a] p-4"><p className="text-xs text-gray-400">Dominan</p><p className="mt-1 text-yellow-400">{resultDetail.dominantLabel || '-'}</p></div>
                <div className="rounded-lg bg-[#1a1a1a] p-4"><p className="text-xs text-gray-400">Tipe Kepribadian</p><p className="mt-1 text-white">{resultDetail.displayAnalysis?.personalityType || resultDetail.analysis?.personalityType || resultDetail.personalityType || '-'}</p></div>
              </div>
              <div className="rounded-lg bg-[#1a1a1a] p-4"><p className="text-xs text-gray-400">Insight Singkat</p><p className="mt-2 text-sm text-gray-300">{resultDetail.displayAnalysis?.summary || resultDetail.analysis?.insights?.personalityLabel || 'Hasil test premium tersedia untuk pengguna ini.'}</p></div>
              <div className="flex justify-end"><Button className="bg-yellow-400 text-black hover:bg-yellow-500" disabled={downloadingUserId === resultDetail.userId} onClick={() => void handleDownloadCertificate(resultDetail.userId)}>{downloadingUserId === resultDetail.userId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowDownToLine className="mr-2 h-4 w-4" />}Download Sertifikat</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
