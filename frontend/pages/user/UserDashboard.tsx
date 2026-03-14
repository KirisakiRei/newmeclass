// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Copy, CreditCard, Droplets, FileText, Flame, Gift, Info, Leaf, Loader2, Lock, LogOut, Mountain, Play, Share2, Sparkles, Trophy, User, Wind } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import ResponsiveTabs from '../../components/ui/responsive-tabs';
import LoadingSpinner from '../../components/ui/loading-spinner';
import { useToast } from '../../hooks/use-toast';
import { aiAnalysisAPI, authAPI, certificatesAPI, referralAPI, userPaymentsAPI } from '../../services/api';
import { getApiErrorMessage } from '../../services/api-error';
import { buildFrontendUrl } from '../../lib/public-url';
import { formatCurrency } from '../../lib/utils';

const fmt = formatCurrency;
const isApprovedPayment = (status) => ['approved', 'success', 'settlement', 'capture', 'paid'].includes(String(status || '').toLowerCase());
const isPendingPayment = (status) => ['pending'].includes(String(status || '').toLowerCase());
const SNAP_LOAD_TIMEOUT_MS = 15000;
const FIVE_ELEMENTS = [
  {
    name: 'KAYU',
    label: 'Si Kreatif',
    icon: Leaf,
    color: 'from-green-500 to-emerald-600',
    bgColor: 'bg-green-500/20',
    textColor: 'text-green-400',
    borderColor: '#4ade80',
    description: 'Inovatif, visioner, artistik, dan kaya gagasan.',
    traits: ['Inovatif', 'Visioner', 'Artistik', 'Fleksibel'],
    careers: ['Desainer', 'Seniman', 'Entrepreneur', 'Arsitek'],
  },
  {
    name: 'API',
    label: 'Si Perasa',
    icon: Flame,
    color: 'from-red-500 to-orange-500',
    bgColor: 'bg-red-500/20',
    textColor: 'text-red-400',
    borderColor: '#f87171',
    description: 'Hangat, ekspresif, energik, dan mudah membangun koneksi.',
    traits: ['Passionate', 'Hangat', 'Ekspresif', 'Antusias'],
    careers: ['Sales', 'Marketing', 'Public Speaker', 'Entertainer'],
  },
  {
    name: 'TANAH',
    label: 'Si Stabil',
    icon: Mountain,
    color: 'from-yellow-600 to-amber-600',
    bgColor: 'bg-yellow-500/20',
    textColor: 'text-yellow-400',
    borderColor: '#facc15',
    description: 'Praktis, konsisten, dapat diandalkan, dan tenang.',
    traits: ['Konsisten', 'Praktis', 'Sabar', 'Loyal'],
    careers: ['Manager', 'Administrator', 'Akuntan', 'Project Manager'],
  },
  {
    name: 'LOGAM',
    label: 'Si Tegas',
    icon: Wind,
    color: 'from-gray-400 to-slate-500',
    bgColor: 'bg-gray-500/20',
    textColor: 'text-gray-300',
    borderColor: '#d1d5db',
    description: 'Disiplin, terstruktur, perfeksionis, dan fokus.',
    traits: ['Disiplin', 'Tegas', 'Terstruktur', 'Fokus'],
    careers: ['Lawyer', 'Auditor', 'Engineer', 'Analyst'],
  },
  {
    name: 'AIR',
    label: 'Si Adaptif',
    icon: Droplets,
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-500/20',
    textColor: 'text-blue-400',
    borderColor: '#60a5fa',
    description: 'Bijaksana, reflektif, intuitif, dan mudah menyesuaikan diri.',
    traits: ['Bijaksana', 'Intuitif', 'Reflektif', 'Adaptif'],
    careers: ['Psikolog', 'Peneliti', 'Penulis', 'Mediator'],
  },
];

export default function UserDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [premiumResult, setPremiumResult] = useState(null);
  const [pricing, setPricing] = useState({ totalPrice: 100000, basePrice: 100000 });
  const [referralSettings, setReferralSettings] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [snapData, setSnapData] = useState(null);
  const [snapLoading, setSnapLoading] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [briefOpen, setBriefOpen] = useState(false);
  const [downloadingCertificate, setDownloadingCertificate] = useState(false);
  const [snapFrameStatus, setSnapFrameStatus] = useState('idle');
  const [snapReloadKey, setSnapReloadKey] = useState(0);

  useEffect(() => {
    void bootstrap();
  }, []);

  useEffect(() => {
    if (!snapData?.paymentUrl) {
      setSnapFrameStatus('idle');
      return undefined;
    }

    setSnapFrameStatus('loading');
    const timer = window.setTimeout(() => {
      setSnapFrameStatus((current) => (current === 'ready' ? current : 'error'));
    }, SNAP_LOAD_TIMEOUT_MS);

    return () => window.clearTimeout(timer);
  }, [snapData?.paymentUrl, snapReloadKey]);

  const tabs = useMemo(() => {
    return [
      { id: 'dashboard', label: 'Dashboard', icon: User },
      { id: 'results', label: 'Hasil Test', icon: Trophy },
      { id: 'elements', label: '5 Element', icon: Info },
      { id: 'test', label: 'Test', icon: FileText },
      { id: 'payment', label: 'Pembayaran', icon: CreditCard },
      { id: 'referral', label: 'Referral', icon: Gift },
    ];
  }, []);

  const bootstrap = async () => {
    try {
      const token = localStorage.getItem('user_token');
      if (!token) {
        navigate('/login', { replace: true });
        return;
      }
      const profile = (await authAPI.getProfile()).data;
      setUser(profile);
      await Promise.all([loadPricing(profile), loadPremiumResult(), loadPendingPayment(), loadReferralSettings()]);
    } catch (error) {
      localStorage.removeItem('user_token');
      localStorage.removeItem('user_data');
      navigate('/login', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    const profile = (await authAPI.getProfile()).data;
    setUser(profile);
    await loadPricing(profile);
    return profile;
  };

  const loadPricing = async (profile) => {
    const response = await userPaymentsAPI.getTestPrice(profile?.usedReferralCode || profile?.referredByCode || undefined);
    setPricing(response.data || { totalPrice: 100000, basePrice: 100000 });
  };

  const loadPremiumResult = async () => {
    try {
      const response = await aiAnalysisAPI.getLatest();
      if (response.data?.analysis) setPremiumResult(response.data.analysis);
    } catch {
      setPremiumResult(null);
    }
  };

  const loadReferralSettings = async () => {
    try {
      const response = await referralAPI.getSettings();
      setReferralSettings(response.data || null);
    } catch {
      setReferralSettings(null);
    }
  };

  const loadPendingPayment = async () => {
    try {
      const response = await userPaymentsAPI.getMyPayments();
      const pendingOrder = (response.data?.orders || []).find((item) => item.paymentType === 'TEST_PAYMENT' && isPendingPayment(item.status));
      if (pendingOrder) {
        setSnapData({
          orderId: pendingOrder.orderId,
          paymentUrl: pendingOrder.paymentUrl,
          amount: pendingOrder.amount,
        });
        setSnapReloadKey((value) => value + 1);
      }
    } catch {
      setSnapData(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user_token');
    localStorage.removeItem('user_data');
    navigate('/login');
  };

  const handleCreateSnap = async () => {
    setSnapLoading(true);
    try {
      const response = await userPaymentsAPI.createSnap();
      setSnapData(response.data?.data || null);
      setSnapReloadKey((value) => value + 1);
      toast({ title: 'Pembayaran dibuka', description: 'Lanjutkan pembayaran premium di panel yang tersedia.' });
    } catch (error) {
      toast({ title: 'Gagal membuat pembayaran', description: getApiErrorMessage(error, 'Pembayaran belum bisa dibuat.'), variant: 'destructive' });
    } finally {
      setSnapLoading(false);
    }
  };

  const handleReloadSnap = () => {
    if (!snapData?.paymentUrl) return;
    setSnapFrameStatus('loading');
    setSnapReloadKey((value) => value + 1);
    toast({ title: 'Memuat ulang pembayaran', description: 'Panel Midtrans sedang dimuat ulang.' });
  };

  const handleRecoverSnap = async () => {
    setSnapLoading(true);
    try {
      const response = await userPaymentsAPI.createSnap();
      setSnapData(response.data?.data || null);
      setSnapReloadKey((value) => value + 1);
      setSnapFrameStatus('loading');
      toast({ title: 'Sesi pembayaran dipulihkan', description: 'Silakan lanjutkan pembayaran Anda.' });
    } catch (error) {
      toast({
        title: 'Gagal memulihkan sesi pembayaran',
        description: getApiErrorMessage(error, 'Sesi pembayaran belum bisa dimuat ulang. Silakan coba lagi.'),
        variant: 'destructive',
      });
    } finally {
      setSnapLoading(false);
    }
  };

  const handleCheckPayment = async () => {
    if (!snapData?.orderId) return;
    setCheckingPayment(true);
    try {
      const response = await userPaymentsAPI.checkPayment(snapData.orderId);
      const status = String(response.data?.status || '').toLowerCase();
      if (isApprovedPayment(status)) {
        await refreshProfile();
        toast({ title: 'Pembayaran berhasil', description: 'Silakan mulai test premium.' });
      } else if (isPendingPayment(status)) {
        toast({ title: 'Pembayaran masih diproses', description: 'Status transaksi Anda masih pending.' });
      } else {
        toast({ title: 'Pembayaran belum berhasil', description: `Status saat ini: ${status || 'belum dibayar'}.`, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Gagal cek status', description: getApiErrorMessage(error, 'Status pembayaran belum bisa diperiksa.'), variant: 'destructive' });
    } finally {
      setCheckingPayment(false);
    }
  };

  const handleDownloadCertificate = async () => {
    if (!user?._id && !user?.id) return;
    setDownloadingCertificate(true);
    try {
      const response = await certificatesAPI.generateMyCertificate(user._id || user.id);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `newme-${user._id || user.id}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast({ title: 'Gagal download sertifikat', description: getApiErrorMessage(error, 'Sertifikat belum bisa diunduh saat ini.'), variant: 'destructive' });
    } finally {
      setDownloadingCertificate(false);
    }
  };

  const handleCopyReferral = async () => {
    const link = buildFrontendUrl('/register', { ref: user.myReferralCode });
    await navigator.clipboard.writeText(link);
    toast({ title: 'Tersalin', description: 'Link referral berhasil disalin.' });
  };

  const handleShareReferral = async () => {
    const link = buildFrontendUrl('/register', { ref: user.myReferralCode });
    if (!navigator.share) {
      await handleCopyReferral();
      return;
    }

    try {
      await navigator.share({
        title: 'Daftar di NEWME CLASS',
        text: `Gunakan kode referral saya ${user.myReferralCode || ''} untuk bergabung di NEWME CLASS.`,
        url: link,
      });
    } catch {
      await handleCopyReferral();
    }
  };

  const hasPremiumAccess = isApprovedPayment(user?.paymentStatus);
  const hasCompletedPremium = user?.paidTestStatus === 'completed';
  const hasCompletedFree = user?.freeTestStatus === 'completed';
  const showFreeTest = !user?.isYayasanLinked;

  if (loading || !user) {
    return <div className="min-h-screen bg-gradient-to-b from-[#1a1a1a] to-[#2a2a2a] flex items-center justify-center"><LoadingSpinner size="lg" text="Memuat dashboard..." /></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1a1a] to-[#2a2a2a]">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Selamat Datang, {user.fullName}</h1>
            <p className="text-gray-400">Dashboard NEWME CLASS</p>
          </div>
          <Button onClick={handleLogout} variant="outline" className="border-red-400/50 text-red-400">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
        <ResponsiveTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {user.isYayasanLinked && (
              <Card className="border-green-400/30 bg-[#2a2a2a]">
                <CardContent className="p-5">
                  <p className="inline-flex rounded-full bg-green-400/15 px-3 py-1 text-xs font-medium text-green-400">Peserta Yayasan</p>
                  <h3 className="mt-3 text-lg font-semibold text-white">Akun Anda terhubung ke yayasan</h3>
                  <p className="mt-1 text-sm text-gray-300">{user.yayasanName || 'Yayasan'} menjadi afiliasi utama akun ini.</p>
                  <div className="mt-4 grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                    <div><p className="text-gray-400">Yayasan</p><p className="text-white">{user.yayasanName || '-'}</p></div>
                    <div><p className="text-gray-400">Mitra Pengampu</p><p className="text-white">{user.mitraName || '-'}</p></div>
                  </div>
                </CardContent>
              </Card>
            )}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Card className="border-yellow-400/20 bg-[#2a2a2a]"><CardContent className="p-5"><p className="text-sm text-gray-400">Status Pembayaran</p><p className={`mt-2 text-lg font-semibold ${hasPremiumAccess ? 'text-green-400' : isPendingPayment(user.paymentStatus) ? 'text-yellow-400' : 'text-red-400'}`}>{hasPremiumAccess ? 'Berhasil' : isPendingPayment(user.paymentStatus) ? 'Proses' : 'Belum Dibayar'}</p></CardContent></Card>
              <Card className="border-yellow-400/20 bg-[#2a2a2a]"><CardContent className="p-5"><p className="text-sm text-gray-400">Status Test Premium</p><p className={`mt-2 text-lg font-semibold ${hasCompletedPremium ? 'text-purple-400' : hasPremiumAccess ? 'text-blue-400' : 'text-gray-300'}`}>{hasCompletedPremium ? 'Selesai' : hasPremiumAccess ? 'Siap Dimulai' : 'Menunggu Pembayaran'}</p></CardContent></Card>
              <Card className="border-yellow-400/20 bg-[#2a2a2a]"><CardContent className="p-5"><p className="text-sm text-gray-400">Harga Test Premium</p><p className="mt-2 text-lg font-semibold text-yellow-400">{fmt(pricing.totalPrice || pricing.basePrice || 100000)}</p></CardContent></Card>
            </div>
          </div>
        )}
        {activeTab === 'results' && (
          <Card className="border-yellow-400/20 bg-[#2a2a2a]">
            <CardContent className="p-6">
              {hasCompletedPremium && premiumResult ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#1a1a1a] p-5">
                    <div>
                      <p className="text-sm text-gray-400">Hasil Premium Anda</p>
                      <p className="mt-2 text-2xl font-bold text-yellow-400">{premiumResult.personalityType || premiumResult.personalityCode || 'Hasil Tersedia'}</p>
                      <p className="mt-2 text-sm text-gray-300">{premiumResult.dominantElement ? `Elemen dominan: ${premiumResult.dominantElement}` : 'Hasil premium telah tersedia di akun Anda.'}</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button className="bg-yellow-400 text-black hover:bg-yellow-500" onClick={() => navigate(`/test-result/${premiumResult.resultId || premiumResult.id}`)}>
                        <Trophy className="mr-2 h-4 w-4" />
                        Buka Halaman Hasil
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button variant="outline" className="border-yellow-400/40 text-yellow-400" disabled={downloadingCertificate} onClick={() => void handleDownloadCertificate()}>
                      {downloadingCertificate ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Download Sertifikat
                    </Button>
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-yellow-400/20 bg-[#111111]">
                    <iframe
                      title="Hasil Tes Premium"
                      src={`/test-result/${premiumResult.resultId || premiumResult.id}?embed=1`}
                      className="h-[1600px] w-full bg-white"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-lg font-semibold text-white">Belum ada hasil test premium</p>
                  <p className="mt-2 text-sm text-gray-400">Selesaikan pembayaran dan test premium untuk melihat hasil lengkap Anda.</p>
                  <Button className="mt-4 bg-yellow-400 text-black hover:bg-yellow-500" onClick={() => setActiveTab('test')}>Mulai dari tab test</Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        {activeTab === 'elements' && (
          <div className="space-y-6">
            <Card className="border-yellow-400/30 bg-gradient-to-br from-yellow-400/20 to-yellow-600/10">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-400">
                    <Info className="h-6 w-6 text-[#1a1a1a]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Metodologi 5 Element</h2>
                    <p className="text-sm text-gray-400">Bacaan dasar untuk memahami peta potensi diri Anda</p>
                  </div>
                </div>
                <p className="text-gray-300">
                  NEWME TEST menggunakan pendekatan 5 Element untuk membantu membaca kecenderungan karakter,
                  kekuatan alami, serta arah pengembangan diri Anda secara lebih utuh.
                </p>
              </CardContent>
            </Card>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {FIVE_ELEMENTS.map((element) => {
                const Icon = element.icon;
                return (
                  <Card key={element.name} className="border-yellow-400/20 bg-[#2a2a2a]" style={{ borderLeftWidth: 4, borderLeftColor: element.borderColor }}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${element.color}`}>
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <CardTitle className={element.textColor}>{element.name}</CardTitle>
                          <CardDescription className="text-gray-400">{element.label}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-gray-300">{element.description}</p>
                      <div>
                        <p className="mb-1 text-xs text-gray-400">Ciri utama</p>
                        <div className="flex flex-wrap gap-2">
                          {element.traits.map((trait) => (
                            <span key={trait} className={`rounded px-2 py-1 text-xs ${element.bgColor} ${element.textColor}`}>
                              {trait}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="mb-1 text-xs text-gray-400">Bidang yang sering cocok</p>
                        <p className="text-xs text-gray-300">{element.careers.join(', ')}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <Card className="border-yellow-400/20 bg-[#2a2a2a]">
              <CardHeader>
                <CardTitle className="text-white">9 Kategori Hasil Test</CardTitle>
                <CardDescription className="text-gray-400">
                  Kombinasi tipe sosial dengan elemen dominan yang muncul dari hasil NEWME TEST
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-yellow-400">EXTROVERT</h4>
                    <div className="space-y-1 text-sm text-gray-300">
                      <p><span className="text-green-400">eK</span> - Extrovert Kayu</p>
                      <p><span className="text-red-400">eA</span> - Extrovert Api</p>
                      <p><span className="text-yellow-400">eT</span> - Extrovert Tanah</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-purple-400">INTROVERT</h4>
                    <div className="space-y-1 text-sm text-gray-300">
                      <p><span className="text-green-400">iK</span> - Introvert Kayu</p>
                      <p><span className="text-red-400">iA</span> - Introvert Api</p>
                      <p><span className="text-yellow-400">iT</span> - Introvert Tanah</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-blue-400">AMBIVERT</h4>
                    <div className="space-y-1 text-sm text-gray-300">
                      <p><span className="text-gray-300">aL</span> - Ambivert Logam</p>
                      <p><span className="text-blue-400">aAi</span> - Ambivert Air</p>
                      <p><span className="text-yellow-400">aT</span> - Ambivert Tanah</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        {activeTab === 'test' && (
          <div className="space-y-4">
            {showFreeTest && (
              <Card className="border-yellow-400/20 bg-[#2a2a2a]">
                <CardHeader><CardTitle className="text-white">Test Gratis</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-300">Test gratis tetap tersedia untuk jalur individu sebagai pengantar awal.</p>
                  <div className="flex items-center justify-between">
                    <span className={`rounded-full px-3 py-1 text-xs ${hasCompletedFree ? 'bg-green-400/15 text-green-400' : 'bg-gray-400/15 text-gray-300'}`}>{hasCompletedFree ? 'Sudah digunakan' : 'Belum dimulai'}</span>
                    <Button variant="outline" className="border-yellow-400/40 text-yellow-400" onClick={() => navigate('/user-test?type=free')}>
                      {hasCompletedFree ? 'Lihat/Lanjutkan' : 'Mulai Test Gratis'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            <Card className="border-yellow-400/20 bg-[#2a2a2a]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Sparkles className="h-5 w-5 text-yellow-400" />
                  NEWME TEST PREMIUM
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Produk premium utama untuk membaca potensi dan hasil lengkap Anda.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!hasPremiumAccess ? (
                  <div className="rounded-lg bg-[#1a1a1a] p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-yellow-400/10">
                        <Lock className="h-6 w-6 text-yellow-400" />
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-white">Produk ini masih terkunci</p>
                        <p className="mt-2 text-sm text-gray-400">
                          Lakukan pembayaran terlebih dahulu untuk membuka akses NEWME TEST PREMIUM.
                          Setelah pembayaran terverifikasi, tombol mulai tes akan aktif otomatis.
                        </p>
                        <div className="mt-4 rounded-lg border border-yellow-400/20 bg-yellow-400/10 p-4 text-sm text-gray-200">
                          <p className="font-medium text-yellow-300">Yang Anda dapatkan</p>
                          <ul className="mt-2 space-y-2 text-gray-300">
                            <li>Analisis premium yang lebih lengkap dan terstruktur.</li>
                            <li>Ringkasan elemen dominan dan arah pengembangan diri.</li>
                            <li>Akses hasil premium dan sertifikat setelah tes selesai.</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    <Button className="mt-4 bg-yellow-400 text-black hover:bg-yellow-500" onClick={() => setActiveTab('payment')}>Lakukan Pembayaran</Button>
                  </div>
                ) : hasCompletedPremium ? (
                  <div className="rounded-lg bg-[#1a1a1a] p-5">
                    <p className="text-lg font-semibold text-white">Tes Anda sudah selesai</p>
                    <p className="mt-2 text-sm text-gray-400">Silakan buka tab hasil test untuk melihat ringkasan dan sertifikat Anda.</p>
                    <Button className="mt-4 bg-yellow-400 text-black hover:bg-yellow-500" onClick={() => setActiveTab('results')}>Lihat Hasil</Button>
                  </div>
                ) : (
                  <div className="rounded-lg bg-[#1a1a1a] p-5">
                    <p className="text-lg font-semibold text-white">Pembayaran terverifikasi, silakan mulai tes</p>
                    <p className="mt-2 text-sm text-gray-400">Tes premium hanya dapat dilakukan satu kali. Pastikan koneksi internet stabil sebelum memulai.</p>
                    <Button className="mt-4 bg-yellow-400 text-black hover:bg-yellow-500" onClick={() => setBriefOpen(true)}><Play className="mr-2 h-4 w-4" />Mulai Tes Premium</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
        {activeTab === 'payment' && (
          <div className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
            <Card className="border-yellow-400/20 bg-[#2a2a2a]">
              <CardHeader><CardTitle className="text-white">Informasi Pembayaran</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg bg-[#1a1a1a] p-5">
                  <p className="text-sm text-gray-400">Nominal Pembayaran</p>
                  <p className="mt-2 text-3xl font-black text-yellow-400">{fmt(pricing.totalPrice || pricing.basePrice || 100000)}</p>
                  <p className="mt-2 text-sm text-gray-300">
                    {user.isYayasanLinked ? 'Jalur yayasan menggunakan test premium penuh.' : 'Jalur individu dapat melanjutkan ke premium kapan saja.'}
                  </p>
                </div>
                <div className="rounded-lg bg-[#1a1a1a] p-4 text-sm text-gray-300">
                  <p className="font-medium text-white">Status pembayaran</p>
                  <p className="mt-2">
                    Saat ini:
                    {' '}
                    <span className={hasPremiumAccess ? 'text-green-400' : isPendingPayment(user.paymentStatus) ? 'text-yellow-400' : 'text-gray-200'}>
                      {hasPremiumAccess ? 'Berhasil' : isPendingPayment(user.paymentStatus) ? 'Proses' : 'Belum dibayar'}
                    </span>
                  </p>
                  {snapData?.orderId && (
                    <p className="mt-2 text-xs text-gray-500">Order ID: {snapData.orderId}</p>
                  )}
                </div>
                {hasPremiumAccess ? (
                  <div className="rounded-lg border border-green-400/20 bg-green-400/10 p-5">
                    <p className="text-lg font-semibold text-green-400">Pembayaran sudah berhasil</p>
                    <p className="mt-2 text-sm text-gray-300">{hasCompletedPremium ? 'Tes sudah selesai. Anda bisa langsung melihat hasil premium.' : 'Silakan lanjut ke tab test untuk mulai mengerjakan soal premium.'}</p>
                    <Button className="mt-4 bg-yellow-400 text-black hover:bg-yellow-500" onClick={() => setActiveTab(hasCompletedPremium ? 'results' : 'test')}>{hasCompletedPremium ? 'Lihat Hasil' : 'Mulai Tes'}</Button>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col gap-3">
                      <Button className="bg-yellow-400 text-black hover:bg-yellow-500" disabled={snapLoading} onClick={() => void handleCreateSnap()}>
                        {snapLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                        {snapData?.orderId ? 'Lanjutkan Pembayaran' : 'Lakukan Pembayaran'}
                      </Button>
                      <Button variant="outline" className="border-yellow-400/40 text-yellow-400" disabled={!snapData?.orderId || checkingPayment} onClick={() => void handleCheckPayment()}>
                        {checkingPayment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                        Cek Status Pembayaran
                      </Button>
                      <Button variant="outline" className="border-yellow-400/20 text-gray-200" disabled={!snapData?.paymentUrl} onClick={handleReloadSnap}>
                        Muat Ulang Panel Pembayaran
                      </Button>
                    </div>
                    <div className="rounded-lg border border-yellow-400/10 bg-[#1f1f1f] p-4 text-sm text-gray-300">
                      <p className="font-medium text-white">Jika panel Midtrans gagal dimuat</p>
                      <ul className="mt-2 space-y-2 text-gray-400">
                        <li>Gunakan tombol muat ulang panel untuk mencoba memanggil ulang embed Snap.</li>
                        <li>Gunakan cek status pembayaran untuk memastikan transaksi Anda belum masuk.</li>
                        <li>Jika masih gagal, pulihkan sesi pembayaran agar link Snap aktif diambil ulang tanpa membuat alur baru yang membingungkan.</li>
                      </ul>
                    </div>
                    <Button variant="outline" className="border-red-400/30 text-red-300" disabled={snapLoading} onClick={() => void handleRecoverSnap()}>
                      {snapLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Pulihkan Sesi Pembayaran
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
            <Card className="border-yellow-400/20 bg-[#2a2a2a]">
              <CardHeader><CardTitle className="text-white">Panel Midtrans Snap</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {!hasPremiumAccess && !snapData?.paymentUrl && (
                  <div className="flex min-h-[560px] items-center justify-center rounded-xl border border-dashed border-yellow-400/20 bg-[#1a1a1a] p-8 text-center">
                    <div>
                      <p className="text-lg font-semibold text-white">Panel pembayaran belum dibuka</p>
                      <p className="mt-2 text-sm text-gray-400">Klik tombol pembayaran di panel kiri untuk memuat Midtrans Snap di sini.</p>
                    </div>
                  </div>
                )}
                {!hasPremiumAccess && snapData?.paymentUrl && (
                  <div className="space-y-3">
                    {snapFrameStatus === 'loading' && (
                      <div className="rounded-lg border border-blue-400/20 bg-blue-400/10 p-3 text-sm text-blue-200">
                        Panel Midtrans sedang dimuat. Jika terlalu lama, gunakan tombol muat ulang atau pulihkan sesi pembayaran.
                      </div>
                    )}
                    {snapFrameStatus === 'error' && (
                      <div className="rounded-lg border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">
                        <p className="font-medium">Panel Midtrans belum berhasil dimuat.</p>
                        <p className="mt-2">Coba muat ulang panel, cek status pembayaran, atau pulihkan sesi pembayaran dari panel kiri.</p>
                        <div className="mt-3 flex flex-wrap gap-3">
                          <Button variant="outline" className="border-red-400/30 text-red-200" onClick={handleReloadSnap}>
                            Muat Ulang
                          </Button>
                          <Button variant="outline" className="border-yellow-400/30 text-yellow-200" onClick={() => void handleCheckPayment()}>
                            Cek Status
                          </Button>
                          <Button className="bg-yellow-400 text-black hover:bg-yellow-500" onClick={() => window.open(snapData.paymentUrl, '_blank', 'noopener,noreferrer')}>
                            Buka di Tab Baru
                          </Button>
                        </div>
                      </div>
                    )}
                    <div className="overflow-hidden rounded-xl border border-yellow-400/20 bg-white">
                      <iframe
                        key={`${snapData.orderId || 'snap'}-${snapReloadKey}`}
                        title="Pembayaran Midtrans Snap"
                        src={snapData.paymentUrl}
                        className="h-[640px] w-full bg-white"
                        onLoad={() => setSnapFrameStatus('ready')}
                      />
                    </div>
                  </div>
                )}
                {hasPremiumAccess && (
                  <div className="flex min-h-[560px] items-center justify-center rounded-xl border border-green-400/20 bg-green-400/10 p-8 text-center">
                    <div>
                      <CheckCircle className="mx-auto h-12 w-12 text-green-400" />
                      <p className="mt-4 text-lg font-semibold text-green-300">Pembayaran sudah terverifikasi</p>
                      <p className="mt-2 text-sm text-gray-300">Anda tidak perlu membuka panel Midtrans lagi. Lanjutkan ke tab test untuk memulai atau ke hasil test jika sudah selesai.</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
        {activeTab === 'referral' && (
          <div className="space-y-6">
            <Card className="border-yellow-400/20 bg-[#2a2a2a]">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <Gift className="mr-2 h-5 w-5 text-yellow-400" />
                  Link Referral Anda
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg bg-[#1a1a1a] p-4">
                  <p className="mb-2 text-sm text-gray-400">Kode Referral</p>
                  <p className="break-all font-mono text-lg font-bold text-yellow-400 sm:text-2xl">{user.myReferralCode || '-'}</p>
                </div>
                <div className="rounded-lg bg-[#1a1a1a] p-4">
                  <p className="mb-2 text-sm text-gray-400">Link Referral</p>
                  <div className="flex items-center gap-2">
                    <Input
                      value={buildFrontendUrl('/register', { ref: user.myReferralCode })}
                      readOnly
                      className="min-w-0 flex-1 bg-transparent text-xs text-white sm:text-sm"
                    />
                    <Button onClick={() => void handleCopyReferral()} size="sm" variant="outline" className="border-yellow-400/50 text-yellow-400">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => void handleShareReferral()} size="sm" className="bg-yellow-400 text-black hover:bg-yellow-500">
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-[#1a1a1a] p-4 text-center">
                    <p className="text-3xl font-bold text-yellow-400">{user.referralCount || 0}</p>
                    <p className="text-sm text-gray-400">Total Referral</p>
                  </div>
                  <div className="rounded-lg bg-[#1a1a1a] p-4 text-center">
                    <p className="break-words text-lg font-bold text-green-400 sm:text-2xl">{fmt(user.referralBonus || 0)}</p>
                    <p className="text-sm text-gray-400">Total Bonus</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            {user.isYayasanLinked && (
              <Card className="border-green-400/20 bg-[#2a2a2a]">
                <CardHeader>
                  <CardTitle className="text-white">Afiliasi Yayasan</CardTitle>
                  <CardDescription className="text-gray-400">
                    Informasi hubungan akun Anda dengan yayasan dan mitra pengampu.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm md:grid-cols-2">
                  <div className="rounded-lg bg-[#1a1a1a] p-4">
                    <p className="text-gray-400">Yayasan</p>
                    <p className="mt-1 text-white">{user.yayasanName || '-'}</p>
                  </div>
                  <div className="rounded-lg bg-[#1a1a1a] p-4">
                    <p className="text-gray-400">Mitra Pengampu</p>
                    <p className="mt-1 text-white">{user.mitraName || '-'}</p>
                  </div>
                </CardContent>
              </Card>
            )}
            {referralSettings && (
              <Card className="border-yellow-400/20 bg-[#2a2a2a]">
                <CardHeader>
                  <CardTitle className="text-white">{referralSettings.title || 'Informasi Referral'}</CardTitle>
                  <CardDescription className="text-gray-400">{referralSettings.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Array.isArray(referralSettings.benefits) && referralSettings.benefits.length > 0 && (
                    <div className="rounded-lg bg-[#1a1a1a] p-4">
                      <p className="mb-2 font-semibold text-yellow-400">Keuntungan</p>
                      <ul className="space-y-2">
                        {referralSettings.benefits.map((benefit) => (
                          <li key={benefit} className="flex items-center text-gray-300">
                            <CheckCircle className="mr-2 h-4 w-4 text-green-400" />
                            {benefit}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {referralSettings.termsAndConditions && (
                    <div className="rounded-lg bg-[#1a1a1a] p-4">
                      <p className="mb-2 font-semibold text-yellow-400">Syarat & Ketentuan</p>
                      <p className="whitespace-pre-line text-sm text-gray-400">{referralSettings.termsAndConditions}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
      <Dialog open={briefOpen} onOpenChange={setBriefOpen}>
        <DialogContent className="max-w-lg border-yellow-400/20 bg-[#2a2a2a]">
          <DialogHeader><DialogTitle className="text-white">Informasi Sebelum Memulai Tes</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm text-gray-300">
            <p>Tes premium memiliki 35 soal dan tidak dibatasi waktu.</p>
            <p>Pastikan koneksi internet stabil selama mengerjakan.</p>
            <p>Tes hanya dapat dilakukan satu kali dan hasil akan muncul setelah Anda menekan submit.</p>
          </div>
          <div className="mt-4 flex justify-end gap-3">
            <Button variant="outline" className="border-yellow-400/30 text-yellow-400" onClick={() => setBriefOpen(false)}>Kembali</Button>
            <Button className="bg-yellow-400 text-black hover:bg-yellow-500" onClick={() => navigate('/user-test?type=paid')}>
              Mulai Tes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
