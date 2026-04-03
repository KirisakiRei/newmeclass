// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Copy, CreditCard, Droplets, FileText, Flame, Gift, Home, Info, Leaf, Loader2, Lock, LogOut, Mountain, Play, Share2, Sparkles, Trophy, User, Wind } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import ResponsiveTabs from '../../components/ui/responsive-tabs';
import LoadingSpinner from '../../components/ui/loading-spinner';
import { useToast } from '../../hooks/use-toast';
import { authAPI, clearAuthStorage, personalAnalysisAPI, referralAPI, runningInfoAPI, setSessionPresence, userPaymentsAPI } from '../../services/api';
import { getApiErrorMessage } from '../../services/api-error';
import { buildFrontendUrl } from '../../lib/public-url';
import { copyTextToClipboard } from '../../lib/clipboard';
import { ensureMidtransSnapLoaded } from '../../lib/midtrans-snap';
import { formatCurrency } from '../../lib/utils';
import { buildPublicWebUrl } from '../../lib/app-urls';

const fmt = formatCurrency;
const isApprovedPayment = (status) => ['approved', 'success', 'settlement', 'capture', 'paid'].includes(String(status || '').toLowerCase());
const isPendingPayment = (status) => ['pending'].includes(String(status || '').toLowerCase());
const PAYMENT_SYNC_INTERVAL_MS = 4000;
const asObject = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});
const asArray = (value) => (Array.isArray(value) ? value : []);
const asNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const DEFAULT_RUNNING_INFO_SETTINGS = {
  enabled: true,
  durationSeconds: 28,
};
const normalizeRunningInfoSettings = (value) => {
  const rawDuration = Number(value?.durationSeconds);
  return {
    enabled: value?.enabled === undefined ? DEFAULT_RUNNING_INFO_SETTINGS.enabled : Boolean(value.enabled),
    durationSeconds: Number.isFinite(rawDuration)
      ? Math.min(120, Math.max(10, Math.round(rawDuration)))
      : DEFAULT_RUNNING_INFO_SETTINGS.durationSeconds,
  };
};
const normalizeElementKey = (value) => String(value || '').trim().toUpperCase();
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

const getAllowedTabs = (isYayasanLinked = false) => (
  ['dashboard', 'results', 'elements', 'test', 'payment', ...(isYayasanLinked ? [] : ['referral'])]
);

const PERSONALITY_CATEGORY_GROUPS = [
  {
    title: 'EXTROVERT',
    titleClassName: 'text-yellow-400',
    items: [
      { code: 'eK', label: 'Extrovert Kayu', codeClassName: 'text-green-400' },
      { code: 'eA', label: 'Extrovert Api', codeClassName: 'text-red-400' },
      { code: 'eT', label: 'Extrovert Tanah', codeClassName: 'text-yellow-400' },
      { code: 'eL', label: 'Extrovert Logam', codeClassName: 'text-gray-300' },
    ],
  },
  {
    title: 'INTROVERT',
    titleClassName: 'text-purple-400',
    items: [
      { code: 'iK', label: 'Introvert Kayu', codeClassName: 'text-green-400' },
      { code: 'iA', label: 'Introvert Api', codeClassName: 'text-red-400' },
      { code: 'iT', label: 'Introvert Tanah', codeClassName: 'text-yellow-400' },
      { code: 'iL', label: 'Introvert Logam', codeClassName: 'text-gray-300' },
    ],
  },
  {
    title: 'AMBIVERT',
    titleClassName: 'text-blue-400',
    items: [
      { code: 'aA', label: 'Ambivert Air', codeClassName: 'text-blue-400' },
    ],
  },
];

export default function UserDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [premiumResult, setPremiumResult] = useState(null);
  const [pricing, setPricing] = useState({ totalPrice: 99000, basePrice: 99000 });
  const [referralSettings, setReferralSettings] = useState(null);
  const [referralWallet, setReferralWallet] = useState(null);
  const [runningInfos, setRunningInfos] = useState([]);
  const [runningInfoSettings, setRunningInfoSettings] = useState(DEFAULT_RUNNING_INFO_SETTINGS);
  const [withdrawForm, setWithdrawForm] = useState({ amount: '', danaNumber: '', accountName: '', notes: '' });
  const [withdrawing, setWithdrawing] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    const requestedTab = String(searchParams.get('tab') || '').trim().toLowerCase();
    return getAllowedTabs(false).includes(requestedTab)
      ? requestedTab
      : 'dashboard';
  });
  const [snapData, setSnapData] = useState(null);
  const [snapLoading, setSnapLoading] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [launchingSnap, setLaunchingSnap] = useState(false);
  const [snapPopupActive, setSnapPopupActive] = useState(false);
  const [snapLoadError, setSnapLoadError] = useState('');
  const [briefOpen, setBriefOpen] = useState(false);
  const [downloadingCertificate, setDownloadingCertificate] = useState(false);
  const paymentSyncInFlightRef = useRef(false);
  const snapPopupActiveRef = useRef(false);
  const activeSnapTokenRef = useRef('');

  useEffect(() => {
    void bootstrap();
  }, []);

  useEffect(() => {
    const requestedTab = String(searchParams.get('tab') || '').trim().toLowerCase();
    if (getAllowedTabs(Boolean(user?.isYayasanLinked)).includes(requestedTab)) {
      setActiveTab(requestedTab);
    }
  }, [searchParams, user?.isYayasanLinked]);

  useEffect(() => {
    if (!snapData?.orderId || isApprovedPayment(user?.paymentStatus)) {
      return undefined;
    }

    const initialTimer = window.setTimeout(() => {
      void syncPaymentStatusSilently(snapData.orderId);
    }, 1200);
    const interval = window.setInterval(() => {
      void syncPaymentStatusSilently(snapData.orderId);
    }, PAYMENT_SYNC_INTERVAL_MS);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
    };
  }, [snapData?.orderId, user?.paymentStatus]);

  useEffect(() => {
    const returnOrderId = String(searchParams.get('orderId') || '').trim();
    if (!returnOrderId || !user || isApprovedPayment(user?.paymentStatus)) {
      return;
    }
    void syncPaymentStatusSilently(returnOrderId);
  }, [searchParams, user?.id, user?.paymentStatus]);

  useEffect(() => {
    if (!user || isApprovedPayment(user?.paymentStatus)) {
      return;
    }

    void ensureMidtransSnapLoaded().catch(() => {
      // Keep silent here; we surface load errors only when the user explicitly opens payment.
    });
  }, [user?.id, user?.paymentStatus]);

  const tabs = useMemo(() => {
    return [
      { id: 'dashboard', label: 'Dashboard', icon: User },
      { id: 'results', label: 'Hasil Test', icon: Trophy },
      { id: 'elements', label: '5 Element', icon: Info },
      { id: 'test', label: 'Test', icon: FileText },
      { id: 'payment', label: 'Pembayaran', icon: CreditCard },
      ...(user?.isYayasanLinked ? [] : [{ id: 'referral', label: 'Referral', icon: Gift }]),
    ];
  }, [user?.isYayasanLinked]);

  const bootstrap = async () => {
    try {
      const profileResponse = await authAPI.getProfile();
      const profile = profileResponse?.data || profileResponse;
      setSessionPresence('user_token', true, profile, profileResponse?.data?.session || profileResponse?.session || null);
      setUser(profile);
      if (profile?.isYayasanLinked && activeTab === 'referral') {
        setActiveTab('dashboard');
      }
      await Promise.all([
        loadPricing(profile),
        loadPremiumResult(),
        loadPendingPayment(),
        loadReferralSettings(),
        loadRunningInfo(),
        ...(profile?.isYayasanLinked ? [] : [loadReferralWallet()]),
      ]);
    } catch (error) {
      clearAuthStorage('user_token');
      navigate('/login', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    const profileResponse = await authAPI.getProfile();
    const profile = profileResponse?.data || profileResponse;
    setSessionPresence('user_token', true, profile, profileResponse?.data?.session || profileResponse?.session || null);
    setUser(profile);
    await loadPricing(profile);
    if (profile?.isYayasanLinked && activeTab === 'referral') {
      setActiveTab('dashboard');
    }
    return profile;
  };

  const finalizeSuccessfulPayment = async (options = {}) => {
    const { showToast = false } = options;
    const latestProfile = await refreshProfile();
    await loadPremiumResult();
    setSnapData(null);
    setSnapLoadError('');
    setActiveTab(latestProfile?.paidTestStatus === 'completed' ? 'results' : 'test');
    if (showToast) {
      toast({
        title: 'Pembayaran berhasil',
        description: latestProfile?.paidTestStatus === 'completed'
          ? 'Hasil premium Anda sudah tersedia.'
          : 'Pembayaran sudah sinkron. Anda bisa langsung mulai tes premium.',
      });
    }
  };

  const syncPaymentStatusSilently = async (orderId) => {
    if (!orderId || paymentSyncInFlightRef.current) return;
    paymentSyncInFlightRef.current = true;
    try {
      const response = await userPaymentsAPI.checkPayment(orderId);
      const status = String(response.data?.status || '').toLowerCase();
      if (isApprovedPayment(status)) {
        await finalizeSuccessfulPayment({ showToast: true });
      } else if (!isPendingPayment(status)) {
        setSnapData((current) => {
          if (!current || current.orderId !== orderId) return current;
          return null;
        });
      }
    } catch {
      // Keep silent retry in the background. The user can still use manual check as fallback.
    } finally {
      paymentSyncInFlightRef.current = false;
    }
  };

  const loadPricing = async (profile) => {
    const response = await userPaymentsAPI.getTestPrice(profile?.usedReferralCode || profile?.referredByCode || undefined);
    setPricing(response.data || { totalPrice: 99000, basePrice: 99000 });
  };

  const loadPremiumResult = async () => {
    try {
      const response = await personalAnalysisAPI.getLatest();
      setPremiumResult(response.data?.success && response.data?.analysis ? response.data.analysis : null);
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

  const loadReferralWallet = async () => {
    try {
      const response = await referralAPI.getMyWallet();
      setReferralWallet(response.data || null);
    } catch {
      setReferralWallet(null);
    }
  };

  const loadRunningInfo = async () => {
    try {
      const response = await runningInfoAPI.getActive();
      setRunningInfos(Array.isArray(response.data?.items) ? response.data.items : []);
      setRunningInfoSettings(normalizeRunningInfoSettings(response.data?.settings));
    } catch {
      setRunningInfos([]);
      setRunningInfoSettings(DEFAULT_RUNNING_INFO_SETTINGS);
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
          snapToken: pendingOrder.snapToken,
          amount: pendingOrder.amount,
          status: pendingOrder.status,
        });
      }
    } catch {
      setSnapData(null);
    }
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch {
      // Tetap lanjutkan pembersihan lokal agar user tidak tertahan jika token sudah invalid.
    } finally {
      clearAuthStorage('user_token');
      navigate('/login', { replace: true });
    }
  };

  const handleGoHome = () => {
    window.location.href = buildPublicWebUrl('/');
  };

  const openSnapFallbackWindow = (paymentUrl, options = {}) => {
    if (!paymentUrl) return false;
    const popup = window.open(
      paymentUrl,
      'newme-midtrans-snap',
      'popup=yes,width=520,height=760,resizable=yes,scrollbars=yes',
    );

    if (popup) {
      popup.focus();
      return true;
    }

    if (options.allowFallback !== false) {
      window.open(paymentUrl, '_blank', 'noopener,noreferrer');
    }

    return false;
  };

  const triggerSnapPayment = async (payload = snapData) => {
    const token = payload?.snapToken;
    const resetSnapPopupState = () => {
      snapPopupActiveRef.current = false;
      activeSnapTokenRef.current = '';
      setSnapPopupActive(false);
    };

    if (snapPopupActiveRef.current && activeSnapTokenRef.current === token) {
      toast({
        title: 'Midtrans masih terbuka',
        description: 'Selesaikan atau tutup popup pembayaran yang sedang aktif terlebih dahulu.',
      });
      return;
    }

    if (!token) {
      if (payload?.paymentUrl) {
        const opened = openSnapFallbackWindow(payload.paymentUrl, { allowFallback: true });
        if (opened) {
          toast({
            title: 'Midtrans dibuka',
            description: 'Snap dibuka lewat halaman Midtrans karena token popup tidak tersedia.',
          });
          return;
        }
      }
      setSnapLoadError('Snap token belum tersedia. Silakan buat ulang sesi pembayaran.');
      toast({
        title: 'Sesi pembayaran belum lengkap',
        description: 'Silakan buat ulang sesi pembayaran lalu coba lagi.',
        variant: 'destructive',
      });
      return;
    }
    setLaunchingSnap(true);
    setSnapLoadError('');
    try {
      await ensureMidtransSnapLoaded();
      snapPopupActiveRef.current = true;
      activeSnapTokenRef.current = token;
      setSnapPopupActive(true);
      window.snap?.pay(token, {
        onSuccess: async () => {
          resetSnapPopupState();
          toast({ title: 'Pembayaran berhasil', description: 'Midtrans memberi sinyal sukses. Kami sedang sinkronkan akses premium Anda.' });
          await finalizeSuccessfulPayment({ showToast: false });
        },
        onPending: async (result) => {
          resetSnapPopupState();
          toast({ title: 'Pembayaran sedang diproses', description: 'Transaksi Anda tercatat di Midtrans. Dashboard akan terus sinkron otomatis.' });
          if (result?.order_id) {
            await syncPaymentStatusSilently(result.order_id);
          }
        },
        onError: (result) => {
          resetSnapPopupState();
          const message = result?.status_message || 'Midtrans belum bisa memproses transaksi ini.';
          setSnapLoadError(message);
          toast({ title: 'Pembayaran gagal dibuka', description: message, variant: 'destructive' });
        },
        onClose: () => {
          resetSnapPopupState();
          toast({ title: 'Pembayaran belum selesai', description: 'Anda dapat membuka kembali Midtrans Snap kapan saja dari halaman pembayaran.' });
        },
      });
    } catch (error) {
      resetSnapPopupState();
      const message = getApiErrorMessage(error, 'Midtrans Snap belum bisa dimuat di browser ini.');
      setSnapLoadError(message);
      toast({ title: 'Snap tidak tersedia', description: message, variant: 'destructive' });
    } finally {
      setLaunchingSnap(false);
    }
  };

  const handleCreateSnap = async () => {
    setSnapLoading(true);
    try {
      const response = await userPaymentsAPI.createSnap();
      const nextSnapData = response.data?.data || null;
      if (nextSnapData) {
        setSnapData(nextSnapData);
        setActiveTab('payment');
        await triggerSnapPayment(nextSnapData);
      }
      toast({
        title: 'Pembayaran siap dilanjutkan',
        description: 'Sesi Midtrans sudah siap dan langsung dibuka dari halaman pembayaran.',
      });
    } catch (error) {
      toast({ title: 'Gagal membuat pembayaran', description: getApiErrorMessage(error, 'Pembayaran belum bisa dibuat.'), variant: 'destructive' });
    } finally {
      setSnapLoading(false);
    }
  };

  const handleStartOrResumePayment = async () => {
    if (snapData?.orderId) {
      await triggerSnapPayment(snapData);
      return;
    }
    await handleCreateSnap();
  };

  const handleReloadSnap = () => {
    if (!snapData?.orderId) return;
    void triggerSnapPayment(snapData);
  };

  const handleRecoverSnap = async () => {
    setSnapLoading(true);
    try {
      const response = await userPaymentsAPI.createSnap();
      const nextSnapData = response.data?.data || null;
      if (nextSnapData) {
        setSnapData(nextSnapData);
        await triggerSnapPayment(nextSnapData);
      }
      toast({
        title: 'Sesi pembayaran dipulihkan',
        description: 'Sesi pembayaran terbaru sudah dibuka kembali.',
      });
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

  const handleChangePaymentMethod = async () => {
    setSnapLoading(true);
    try {
      const response = await userPaymentsAPI.createSnap({ replacePending: true });
      const nextSnapData = response.data?.data || null;
      if (nextSnapData) {
        setSnapData(nextSnapData);
        await triggerSnapPayment(nextSnapData);
      }
      toast({
        title: 'Metode pembayaran diperbarui',
        description: 'Sesi Midtrans baru sudah dibuka agar Anda bisa memilih metode pembayaran lagi.',
      });
    } catch (error) {
      toast({
        title: 'Gagal mengganti metode pembayaran',
        description: getApiErrorMessage(error, 'Sesi pembayaran lama belum bisa diganti. Silakan coba lagi.'),
        variant: 'destructive',
      });
    } finally {
      setSnapLoading(false);
    }
  };

  const handleCancelPayment = async () => {
    if (!snapData?.orderId) return;
    setSnapLoading(true);
    try {
      await userPaymentsAPI.cancelPayment(snapData.orderId);
      snapPopupActiveRef.current = false;
      activeSnapTokenRef.current = '';
      setSnapPopupActive(false);
      setSnapData(null);
      toast({
        title: 'Transaksi dibatalkan',
        description: 'Transaksi pending berhasil dibatalkan. Anda dapat membuat pembayaran baru kapan saja.',
      });
    } catch (error) {
      toast({
        title: 'Gagal membatalkan transaksi',
        description: getApiErrorMessage(error, 'Transaksi pending belum berhasil dibatalkan.'),
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
        await finalizeSuccessfulPayment({ showToast: true });
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
    const targetUserId = user?._id || user?.id;
    if (!targetUserId) return;
    setDownloadingCertificate(true);
    try {
      navigate(`/certificate-download/${targetUserId}?download=1&viewer=user`);
    } catch (error) {
      toast({ title: 'Gagal membuka sertifikat', description: getApiErrorMessage(error, 'Halaman sertifikat belum bisa dibuka saat ini.'), variant: 'destructive' });
    } finally {
      setDownloadingCertificate(false);
    }
  };

  const handleCopyReferral = async () => {
    const link = buildFrontendUrl('/register', { ref: user.myReferralCode });
    const copied = await copyTextToClipboard(link);
    toast({
      title: copied ? 'Tersalin' : 'Salin gagal',
      description: copied ? 'Link referral berhasil disalin.' : 'Browser menolak akses clipboard. Coba salin manual dari kolom link.',
      variant: copied ? 'default' : 'destructive',
    });
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

  const handleReferralWithdraw = async () => {
    if (!withdrawForm.amount || !withdrawForm.danaNumber || !withdrawForm.accountName) {
      toast({
        title: 'Data belum lengkap',
        description: 'Isi nominal, nomor DANA, dan nama akun terlebih dahulu.',
        variant: 'destructive',
      });
      return;
    }

    setWithdrawing(true);
    try {
      await referralAPI.requestWithdraw({
        amount: Number(withdrawForm.amount),
        danaNumber: withdrawForm.danaNumber,
        accountName: withdrawForm.accountName,
        notes: withdrawForm.notes || undefined,
      });
      setWithdrawForm({ amount: '', danaNumber: '', accountName: '', notes: '' });
      toast({
        title: 'Request withdraw dikirim',
        description: 'Permintaan pencairan referral Anda sedang menunggu persetujuan admin.',
      });
      await loadReferralWallet();
    } catch (error) {
      toast({
        title: 'Gagal mengajukan withdraw',
        description: getApiErrorMessage(error, 'Periksa nominal dan data akun DANA Anda.'),
        variant: 'destructive',
      });
    } finally {
      setWithdrawing(false);
    }
  };

  const hasPremiumAccess = isApprovedPayment(user?.paymentStatus);
  const hasCompletedPremium = user?.paidTestStatus === 'completed';
  const hasCompletedFree = user?.freeTestStatus === 'completed';
  const showFreeTest = !user?.isYayasanLinked;
  const paymentAmount = pricing.totalPrice || pricing.basePrice || 99000;
  const hasPendingOrder = Boolean(snapData?.orderId);
  const paymentUiState = hasPremiumAccess
    ? (hasCompletedPremium ? 'paid_completed' : 'paid_ready')
    : (isPendingPayment(user?.paymentStatus) || hasPendingOrder ? 'pending' : 'unpaid');
  const paymentStatusLabel = hasPremiumAccess ? 'Lunas' : paymentUiState === 'pending' ? 'Menunggu' : 'Belum Bayar';
  const paymentStatusClassName = hasPremiumAccess
    ? 'text-emerald-400'
    : paymentUiState === 'pending'
      ? 'text-yellow-400'
      : 'text-white';
  const activeOrderId = snapData?.orderId || '';
  const activePaymentUrl = snapData?.paymentUrl || '';
  const resultDetailId = premiumResult?.resultId || premiumResult?.id || '';
  const paymentStepper = [
    {
      label: 'Buka Invoice',
      state: paymentUiState === 'unpaid' ? 'idle' : 'completed',
    },
    {
      label: 'Bayar di Midtrans',
      state: paymentUiState === 'pending' ? 'active' : paymentUiState === 'unpaid' ? 'idle' : 'completed',
    },
    {
      label: 'Sinkron Otomatis',
      state: paymentUiState === 'paid_ready' || paymentUiState === 'paid_completed' ? 'completed' : 'idle',
    },
  ];
  const paymentSummaryNote = hasPremiumAccess
    ? 'Pembayaran premium berhasil dan akses NEWME Anda sudah aktif.'
    : 'Pembayaran diproses melalui Midtrans payment gateway. Status akan terupdate otomatis setelah pembayaran berhasil dikonfirmasi.';
  const premiumDisplayAnalysis = asObject(premiumResult?.displayAnalysis);
  const premiumAnalysis = asObject(premiumResult?.analysis);
  const premiumInsights = asObject(premiumAnalysis.insights);
  const premiumPersonalInsights = asObject(premiumAnalysis.personalInsights || premiumAnalysis.aiInsights);
  const premiumCoreScoring = asObject(premiumResult?.coreScoring || premiumAnalysis.coreScoring);
  const premiumPersonalityType =
    premiumDisplayAnalysis.personalityType
    || premiumAnalysis.personalityType
    || premiumResult?.personalityType
    || premiumResult?.personalityCode
    || 'Hasil Tersedia';
  const premiumSummary =
    premiumDisplayAnalysis.summary
    || premiumPersonalInsights.ringkasanKepribadian
    || 'Analisis personal premium Anda sudah tersedia dan siap ditinjau.';
  const premiumDominantRanks = Object.keys(premiumCoreScoring).length > 0
    ? [
        {
          rank: 'Dominan I',
          element: normalizeElementKey(premiumCoreScoring.dominan_1_elemen),
          percentage: asNumber(premiumCoreScoring.dominan_1_persentase),
        },
        {
          rank: 'Dominan II',
          element: normalizeElementKey(premiumCoreScoring.dominan_2_elemen),
          percentage: asNumber(premiumCoreScoring.dominan_2_persentase),
        },
        {
          rank: 'Dominan III',
          element: normalizeElementKey(premiumCoreScoring.dominan_3_elemen),
          percentage: asNumber(premiumCoreScoring.dominan_3_persentase),
        },
      ].filter((item) => item.element)
    : [];
  const premiumStrengths =
    asArray(premiumDisplayAnalysis.strengths).length > 0
      ? asArray(premiumDisplayAnalysis.strengths)
      : asArray(premiumPersonalInsights.kekuatanUtama);
  const premiumGrowthAreas =
    asArray(premiumDisplayAnalysis.areasToImprove).length > 0
      ? asArray(premiumDisplayAnalysis.areasToImprove)
      : asArray(premiumPersonalInsights.areasPengembanganDiri);
  const premiumCareerRecommendations = (() => {
    const displayCareers = asArray(premiumDisplayAnalysis.careerRecommendations);
    if (displayCareers.length > 0) return displayCareers;

    const specificCareers = asArray(premiumPersonalInsights.rekomendasiKarirSpesifik)
      .map((item) => {
        if (typeof item === 'string') return item;
        if (!item || typeof item !== 'object') return null;
        return item.bidang || asArray(item.roleContoh)[0] || null;
      })
      .filter(Boolean);
    if (specificCareers.length > 0) return specificCareers;

    const fallbackCareer = premiumInsights.rekomendasiKarir || premiumInsights.dibutuhkanPadaProfesi;
    return fallbackCareer ? [fallbackCareer] : [];
  })();
  const runningTextVisible = Boolean(runningInfoSettings?.enabled) && runningInfos.length > 0;
  const runningTextDuration = normalizeRunningInfoSettings(runningInfoSettings).durationSeconds;
  const runningTextTracks = Array.from({ length: 2 });

  if (loading || !user) {
    return <div className="min-h-screen bg-gradient-to-b from-[#1a1a1a] to-[#2a2a2a] flex items-center justify-center"><LoadingSpinner size="lg" text="Memuat dashboard..." /></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1a1a] to-[#2a2a2a]">
      <style>
        {`
          @keyframes dashboard-running-text-marquee {
            from { transform: translate3d(0, 0, 0); }
            to { transform: translate3d(-50%, 0, 0); }
          }

          .dashboard-running-text-track {
            animation-name: dashboard-running-text-marquee;
            animation-timing-function: linear;
            animation-iteration-count: infinite;
            will-change: transform;
          }

          @media (prefers-reduced-motion: reduce) {
            .dashboard-running-text-track {
              animation: none !important;
              transform: none !important;
              width: 100% !important;
            }

            .dashboard-running-text-duplicate {
              display: none !important;
            }
          }
        `}
      </style>
      {runningTextVisible && (
        <div className="w-full overflow-hidden border-b border-yellow-300/50 bg-yellow-400 text-[#1a1a1a] shadow-[0_8px_28px_rgba(250,204,21,0.18)]">
          <div
            className="dashboard-running-text-track flex w-max min-w-full"
            style={{ animationDuration: `${runningTextDuration}s` }}
          >
            {runningTextTracks.map((_, trackIndex) => (
              <div
                key={`dashboard-running-track-${trackIndex}`}
                className={`inline-flex min-w-full shrink-0 items-center gap-8 px-4 py-3 text-sm font-semibold sm:px-6 ${trackIndex === 1 ? 'dashboard-running-text-duplicate' : ''}`}
              >
                {runningInfos.map((item, index) => (
                  <span key={`${item.id || item.message}-${trackIndex}-${index}`} className="inline-flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#1a1a1a]" />
                    <span>{item.message}</span>
                    {item.linkUrl && item.linkText ? (
                      <a href={item.linkUrl} target="_blank" rel="noreferrer" className="font-black underline underline-offset-4">
                        {item.linkText}
                      </a>
                    ) : null}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Selamat Datang, {user.fullName}</h1>
            <p className="text-gray-400">Dashboard NEWME CLASS</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleGoHome} variant="outline" className="border-yellow-400/40 text-yellow-300">
              <Home className="mr-2 h-4 w-4" />
              Home
            </Button>
            <Button onClick={handleLogout} variant="outline" className="border-red-400/50 text-red-400">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
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
                  <div className="mt-4 grid grid-cols-1 gap-4 text-sm">
                    <div><p className="text-gray-400">Yayasan</p><p className="text-white">{user.yayasanName || '-'}</p></div>
                  </div>
                </CardContent>
              </Card>
            )}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Card className="border-yellow-400/20 bg-[#2a2a2a]"><CardContent className="p-5"><p className="text-sm text-gray-400">Status Pembayaran</p><p className={`mt-2 text-lg font-semibold ${hasPremiumAccess ? 'text-green-400' : isPendingPayment(user.paymentStatus) ? 'text-yellow-400' : 'text-red-400'}`}>{hasPremiumAccess ? 'Berhasil' : isPendingPayment(user.paymentStatus) ? 'Proses' : 'Belum Dibayar'}</p></CardContent></Card>
              <Card className="border-yellow-400/20 bg-[#2a2a2a]"><CardContent className="p-5"><p className="text-sm text-gray-400">Status Test Premium</p><p className={`mt-2 text-lg font-semibold ${hasCompletedPremium ? 'text-purple-400' : hasPremiumAccess ? 'text-blue-400' : 'text-gray-300'}`}>{hasCompletedPremium ? 'Selesai' : hasPremiumAccess ? 'Siap Dimulai' : 'Menunggu Pembayaran'}</p></CardContent></Card>
              <Card className="border-yellow-400/20 bg-[#2a2a2a]"><CardContent className="p-5"><p className="text-sm text-gray-400">Harga Test Premium</p><p className="mt-2 text-lg font-semibold text-yellow-400">{fmt(pricing.totalPrice || pricing.basePrice || 99000)}</p></CardContent></Card>
            </div>
          </div>
        )}
        {activeTab === 'results' && (
          <Card className="border-yellow-400/20 bg-[#2a2a2a]">
            <CardContent className="p-6">
              {hasCompletedPremium && premiumResult ? (
                <div className="space-y-4">
                  <Card className="border-yellow-400/30 bg-gradient-to-br from-yellow-400/20 to-yellow-600/10">
                    <CardContent className="p-6">
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-start gap-4">
                          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-yellow-400 text-black">
                            <Trophy className="h-7 w-7" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-300">Hasil Tes Premium</p>
                            <h2 className="mt-1 text-2xl font-bold text-white">{premiumPersonalityType}</h2>
                            <p className="mt-2 text-sm text-gray-300">
                              {premiumResult?.dominantElement ? `Elemen dominan: ${premiumResult.dominantElement}` : 'Hasil premium Anda sudah siap ditinjau.'}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className="rounded-full bg-black/20 px-3 py-1 text-xs font-bold text-yellow-100">
                                Kode: {premiumResult?.personalityCode || premiumInsights.code || '-'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          className="border-yellow-400/40 text-yellow-400"
                          disabled={downloadingCertificate}
                          onClick={() => void handleDownloadCertificate()}
                        >
                          {downloadingCertificate ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                          Download Sertifikat
                        </Button>
                      </div>
                      <p className="mt-4 text-sm leading-7 text-gray-200">{premiumSummary}</p>

                  {premiumDominantRanks.length > 0 && (
                        <div className="mt-5 grid gap-3 md:grid-cols-3">
                          {premiumDominantRanks.map((item) => {
                            const elementInfo = FIVE_ELEMENTS.find((entry) => entry.name === item.element);
                            return (
                              <div key={item.rank} className="rounded-xl border border-white/10 bg-black/15 p-4">
                                <p className="text-xs font-bold uppercase tracking-[0.18em] text-yellow-100/80">{item.rank}</p>
                                <p className={`mt-2 text-lg font-bold ${elementInfo?.textColor || 'text-white'}`}>
                                  {item.element || '-'}
                                </p>
                                <p className="mt-1 text-2xl font-black text-white">{item.percentage.toFixed(2)}%</p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <div className="grid gap-4 md:grid-cols-2">
                    {premiumStrengths.length > 0 && (
                      <Card className="border-green-400/20 bg-[#1f1f1f]">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-white">
                            <CheckCircle className="h-5 w-5 text-green-400" />
                            Kekuatan Anda
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {premiumStrengths.map((item, index) => (
                              <div key={`${item}-${index}`} className="flex items-start gap-3 rounded-lg bg-green-500/10 p-3 text-sm text-gray-200">
                                <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-400" />
                                <span>{item}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {premiumGrowthAreas.length > 0 && (
                      <Card className="border-blue-400/20 bg-[#1f1f1f]">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-white">
                            <Info className="h-5 w-5 text-blue-400" />
                            Area Pengembangan
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {premiumGrowthAreas.map((item, index) => (
                              <div key={`${item}-${index}`} className="flex items-start gap-3 rounded-lg bg-blue-500/10 p-3 text-sm text-gray-200">
                                <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-400" />
                                <span>{item}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {premiumCareerRecommendations.length > 0 && (
                    <Card className="border-purple-400/20 bg-[#1f1f1f]">
                      <CardHeader>
                        <CardTitle className="text-white">Rekomendasi Karir</CardTitle>
                        <CardDescription className="text-gray-400">Bidang yang paling dekat dengan kecenderungan hasil premium Anda.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {premiumCareerRecommendations.map((item, index) => (
                            <span key={`${item}-${index}`} className="rounded-full border border-purple-400/30 bg-purple-500/10 px-4 py-2 text-sm text-purple-200">
                              {item}
                            </span>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="rounded-2xl border border-yellow-400/20 bg-[#1a1a1a] p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-lg font-semibold text-white">Sertifikat Hasil Premium</p>
                        <p className="mt-1 text-sm text-gray-400">Unduh sertifikat pada halaman khusus agar file yang tersimpan hanya berisi sertifikat full page.</p>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Button variant="outline" className="border-yellow-400/40 text-yellow-400" onClick={() => navigate(`/test-result/${premiumResult.resultId || premiumResult.id}`)}>
                          Lihat Halaman Hasil
                        </Button>
                        <Button className="bg-yellow-400 text-black hover:bg-yellow-500" disabled={downloadingCertificate} onClick={() => void handleDownloadCertificate()}>
                          {downloadingCertificate ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                          Download Sertifikat
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-lg font-semibold text-white">Belum ada hasil test premium</p>
                  <p className="mt-2 text-sm text-gray-400">Selesaikan pembayaran dan test premium untuk melihat hasil lengkap Anda.</p>
                  <Button className="mt-4 bg-yellow-400 text-black hover:bg-yellow-500" onClick={() => setActiveTab('test')}>Mulai Tes Premium</Button>
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
                  {PERSONALITY_CATEGORY_GROUPS.map((group) => (
                    <div key={group.title} className="space-y-2">
                      <h4 className={`font-semibold ${group.titleClassName}`}>{group.title}</h4>
                      <div className="space-y-1 text-sm text-gray-300">
                        {group.items.map((item) => (
                          <p key={item.code}>
                            <span className={item.codeClassName}>{item.code}</span> - {item.label}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
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
          <div className="space-y-6">
            <div className="rounded-[28px] border border-yellow-400/12 bg-[#232323] px-4 py-5 shadow-[0_22px_50px_rgba(0,0,0,0.24)] sm:px-6 lg:px-8">
              <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-center md:gap-4">
                {paymentStepper.map((step, index) => (
                  <React.Fragment key={step.label}>
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${
                          step.state === 'completed'
                            ? 'border-yellow-400 bg-yellow-400 text-black'
                            : step.state === 'active'
                              ? 'border-yellow-400 text-yellow-300'
                              : 'border-yellow-400/20 text-gray-400'
                        }`}
                      >
                        {step.state === 'completed' ? <CheckCircle className="h-4 w-4" /> : index + 1}
                      </div>
                      <span className={`text-sm font-medium sm:text-base ${step.state === 'idle' ? 'text-gray-400' : 'text-gray-100'}`}>
                        {step.label}
                      </span>
                    </div>
                    {index < paymentStepper.length - 1 ? (
                      <div className="hidden h-px w-12 bg-gradient-to-r from-yellow-400/40 to-white/10 md:block lg:w-16" />
                    ) : null}
                  </React.Fragment>
                ))}
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.02fr_0.98fr]">
              <Card className="border-yellow-400/25 bg-[#2d2d2d] shadow-[0_26px_60px_rgba(0,0,0,0.22)]">
                <CardHeader className="pb-5">
                  <CardTitle className="text-sm uppercase tracking-[0.22em] text-gray-300">Detail Tagihan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-5 rounded-[24px] bg-[#232323] px-5 py-4 sm:px-6">
                    <div className="flex items-center justify-between gap-4 border-b border-yellow-400/12 pb-4">
                      <span className="text-sm uppercase tracking-[0.16em] text-gray-400">Nominal</span>
                      <span className="text-2xl font-black text-white sm:text-4xl">{fmt(paymentAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 border-b border-yellow-400/12 pb-4">
                      <span className="text-sm uppercase tracking-[0.16em] text-gray-400">Status</span>
                      <span className={`text-lg font-semibold ${paymentStatusClassName}`}>{paymentStatusLabel}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm uppercase tracking-[0.16em] text-gray-400">Sinkronisasi</span>
                      <span className="text-base font-semibold text-white sm:text-lg">Otomatis via Midtrans</span>
                    </div>
                  </div>

                  {activeOrderId ? (
                    <div className="rounded-[22px] border border-yellow-400/12 bg-[#1e1e1e] px-5 py-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Order aktif</p>
                      <p className="mt-3 break-all text-sm text-gray-200">{activeOrderId}</p>
                    </div>
                  ) : null}

                  <div className="rounded-[22px] bg-[#141414] px-5 py-5 text-sm leading-7 text-gray-300">
                    {paymentSummaryNote}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-yellow-400/25 bg-[#151515] shadow-[0_26px_60px_rgba(0,0,0,0.26)]">
                <CardHeader className="pb-5">
                  <CardTitle className="text-sm uppercase tracking-[0.22em] text-yellow-400">Action Center</CardTitle>
                  <CardDescription className="text-sm leading-6 text-gray-400">
                    {paymentUiState === 'unpaid'
                      ? 'Buka invoice premium Anda dan lanjutkan ke Midtrans untuk menyelesaikan pembayaran.'
                      : paymentUiState === 'pending'
                        ? 'Pembayaran Anda sedang diproses. Gunakan aksi di bawah untuk memeriksa atau melanjutkan transaksi.'
                        : hasCompletedPremium
                          ? 'Akses premium Anda sudah aktif dan hasil tes siap dibuka kapan saja.'
                          : 'Akses premium Anda sudah aktif. Silakan lanjutkan ke tes premium.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div
                    className={`rounded-[22px] border px-5 py-5 ${
                      paymentUiState === 'pending'
                        ? 'border-yellow-400/25 bg-[#2e2a1d]'
                        : paymentUiState === 'unpaid'
                          ? 'border-yellow-400/15 bg-[#242424]'
                          : 'border-emerald-400/25 bg-emerald-400/10'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                          paymentUiState === 'pending'
                            ? 'bg-yellow-400/15 text-yellow-300'
                            : paymentUiState === 'unpaid'
                              ? 'bg-yellow-400/10 text-yellow-300'
                              : 'bg-emerald-400/15 text-emerald-400'
                        }`}
                      >
                        {paymentUiState === 'pending' ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : paymentUiState === 'unpaid' ? (
                          <FileText className="h-5 w-5" />
                        ) : (
                          <CheckCircle className="h-5 w-5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-xl font-semibold ${
                          paymentUiState === 'pending'
                            ? 'text-yellow-300'
                            : paymentUiState === 'unpaid'
                              ? 'text-white'
                              : 'text-emerald-300'
                        }`}>
                          {paymentUiState === 'pending'
                            ? 'Menunggu Konfirmasi'
                            : paymentUiState === 'unpaid'
                              ? 'Invoice Siap Dibuka'
                              : 'Pembayaran Berhasil'}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-gray-300">
                          {paymentUiState === 'pending'
                            ? 'Pembayaran Anda sedang diverifikasi dan dashboard akan mencoba sinkron otomatis.'
                            : paymentUiState === 'unpaid'
                              ? 'Klik tombol utama di bawah untuk membuka halaman pembayaran Midtrans.'
                              : hasCompletedPremium
                                ? 'Akses premium aktif dan hasil tes Anda sudah tersedia di dashboard.'
                                : 'Akses premium Anda sudah aktif dan siap dipakai untuk memulai tes.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {paymentUiState === 'unpaid' && (
                    <Button
                      className="h-14 w-full rounded-xl bg-yellow-400 text-base font-semibold text-black hover:bg-yellow-500"
                      disabled={snapLoading || launchingSnap || snapPopupActive}
                      onClick={() => void handleStartOrResumePayment()}
                    >
                      {snapLoading || launchingSnap ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                      {snapPopupActive ? 'Midtrans Sedang Terbuka' : 'Bayar Sekarang via Midtrans'}
                    </Button>
                  )}

                  {paymentUiState === 'pending' && (
                    <>
                      <Button
                        className="h-14 w-full rounded-xl bg-yellow-400 text-base font-semibold text-black hover:bg-yellow-500"
                        disabled={!activeOrderId || checkingPayment}
                        onClick={() => void handleCheckPayment()}
                      >
                        {checkingPayment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        Cek Status Pembayaran
                      </Button>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <Button
                          variant="outline"
                          className="h-12 rounded-xl border-yellow-400/35 bg-transparent text-yellow-300 hover:bg-yellow-400/10 hover:text-yellow-200"
                          disabled={!activeOrderId || launchingSnap || snapPopupActive}
                          onClick={handleReloadSnap}
                        >
                          {launchingSnap ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                          {snapPopupActive ? 'Midtrans Sedang Terbuka' : 'Buka Midtrans'}
                        </Button>
                        <Button
                          variant="outline"
                          className="h-12 rounded-xl border-blue-400/35 bg-transparent text-blue-300 hover:bg-blue-400/10 hover:text-blue-200"
                          disabled={!activeOrderId || snapLoading}
                          onClick={() => void handleChangePaymentMethod()}
                        >
                          {snapLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                          Ganti Metode Pembayaran
                        </Button>
                        {activePaymentUrl ? (
                          <Button
                            variant="outline"
                            className="h-12 rounded-xl border-yellow-400/18 bg-transparent text-gray-100 hover:bg-white/5 hover:text-white"
                            onClick={() => openSnapFallbackWindow(activePaymentUrl, { allowFallback: true })}
                          >
                            Link Darurat Midtrans
                          </Button>
                        ) : null}
                        <Button
                          variant="outline"
                          className="h-12 rounded-xl border-red-500/35 bg-transparent text-red-200 hover:bg-red-500/10 hover:text-red-100"
                          disabled={!activeOrderId || snapLoading}
                          onClick={() => void handleCancelPayment()}
                        >
                          {snapLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                          Batalkan Transaksi
                        </Button>
                      </div>
                    </>
                  )}

                  {paymentUiState === 'paid_ready' && (
                    <Button
                      className="h-14 w-full rounded-xl bg-yellow-400 text-base font-semibold text-black hover:bg-yellow-500"
                      onClick={() => setBriefOpen(true)}
                    >
                      <Play className="h-4 w-4" />
                      Mulai Tes Premium
                    </Button>
                  )}

                  {paymentUiState === 'paid_completed' && (
                    <div className="space-y-3">
                      <Button
                        className="h-14 w-full rounded-xl bg-yellow-400 text-base font-semibold text-black hover:bg-yellow-500"
                        onClick={() => setActiveTab('results')}
                      >
                        <Trophy className="h-4 w-4" />
                        Lihat Hasil Tes
                      </Button>
                      {resultDetailId ? (
                        <Button
                          variant="outline"
                          className="h-12 w-full rounded-xl border-yellow-400/30 bg-transparent text-yellow-300 hover:bg-yellow-400/10 hover:text-yellow-200"
                          onClick={() => navigate(`/test-result/${resultDetailId}`)}
                        >
                          Buka Halaman Hasil Lengkap
                        </Button>
                      ) : null}
                    </div>
                  )}

                  {snapLoadError ? (
                    <div className="rounded-[20px] border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm leading-6 text-red-200">
                      <p className="font-medium text-red-100">Terjadi kendala pada sesi pembayaran.</p>
                      <p className="mt-2">{snapLoadError}</p>
                      {activePaymentUrl ? (
                        <div className="mt-4 flex flex-wrap gap-3">
                          <Button
                            variant="outline"
                            className="border-yellow-400/30 bg-transparent text-yellow-300 hover:bg-yellow-400/10 hover:text-yellow-200"
                            onClick={() => openSnapFallbackWindow(activePaymentUrl, { allowFallback: true })}
                          >
                            Buka Link Midtrans
                          </Button>
                          <Button
                            variant="outline"
                            className="border-red-400/30 bg-transparent text-red-200 hover:bg-red-500/10 hover:text-red-100"
                            disabled={snapLoading}
                            onClick={() => void handleRecoverSnap()}
                          >
                            {snapLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            Pulihkan Sesi
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </div>
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
            <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
              <Card className="border-yellow-400/20 bg-[#2a2a2a]">
                <CardHeader>
                  <CardTitle className="text-white">Wallet Referral</CardTitle>
                  <CardDescription className="text-gray-400">
                    Saldo referral user hanya bisa dicairkan lewat DANA.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg bg-[#1a1a1a] p-4">
                    <p className="text-sm text-gray-400">Saldo tersedia</p>
                    <p className="mt-2 text-3xl font-black text-yellow-400">{fmt(referralWallet?.availableBalance || 0)}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-[#1a1a1a] p-4">
                      <p className="text-sm text-gray-400">Ditahan</p>
                      <p className="mt-2 font-semibold text-blue-300">{fmt(referralWallet?.reserveBalance || 0)}</p>
                    </div>
                    <div className="rounded-lg bg-[#1a1a1a] p-4">
                      <p className="text-sm text-gray-400">Sudah dibayar</p>
                      <p className="mt-2 font-semibold text-green-400">{fmt(referralWallet?.paidWithdraw || 0)}</p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-yellow-400/15 bg-yellow-400/5 p-4 text-sm text-gray-300">
                    Minimum withdraw: <span className="font-semibold text-yellow-300">{fmt(referralWallet?.minimumWithdraw || referralSettings?.minimumWithdraw || 50000)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-yellow-400/20 bg-[#2a2a2a]">
                <CardHeader>
                  <CardTitle className="text-white">Ajukan Withdraw DANA</CardTitle>
                  <CardDescription className="text-gray-400">
                    Admin akan meninjau request sebelum payout dikirim.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="mb-2 text-sm text-gray-400">Nominal</p>
                      <Input
                        type="number"
                        value={withdrawForm.amount}
                        onChange={(event) => setWithdrawForm((prev) => ({ ...prev, amount: event.target.value }))}
                        className="border-yellow-400/20 bg-[#1a1a1a] text-white"
                        placeholder="50000"
                      />
                    </div>
                    <div>
                      <p className="mb-2 text-sm text-gray-400">Nomor DANA</p>
                      <Input
                        value={withdrawForm.danaNumber}
                        onChange={(event) => setWithdrawForm((prev) => ({ ...prev, danaNumber: event.target.value }))}
                        className="border-yellow-400/20 bg-[#1a1a1a] text-white"
                        placeholder="08xxxxxxxxxx"
                      />
                    </div>
                    <div>
                      <p className="mb-2 text-sm text-gray-400">Nama Akun DANA</p>
                      <Input
                        value={withdrawForm.accountName}
                        onChange={(event) => setWithdrawForm((prev) => ({ ...prev, accountName: event.target.value }))}
                        className="border-yellow-400/20 bg-[#1a1a1a] text-white"
                        placeholder="Nama pemilik akun"
                      />
                    </div>
                    <div>
                      <p className="mb-2 text-sm text-gray-400">Catatan</p>
                      <Input
                        value={withdrawForm.notes}
                        onChange={(event) => setWithdrawForm((prev) => ({ ...prev, notes: event.target.value }))}
                        className="border-yellow-400/20 bg-[#1a1a1a] text-white"
                        placeholder="Opsional"
                      />
                    </div>
                  </div>
                  <Button className="bg-yellow-400 text-black hover:bg-yellow-500" disabled={withdrawing} onClick={() => void handleReferralWithdraw()}>
                    {withdrawing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Kirim Request Withdraw
                  </Button>
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-white">Riwayat Wallet Referral</p>
                    {(referralWallet?.walletItems || []).length > 0 ? (
                      <div className="space-y-2">
                        {referralWallet.walletItems.slice(0, 8).map((item) => (
                          <div key={item.id} className="flex items-center justify-between rounded-lg bg-[#1a1a1a] p-3">
                            <div>
                              <p className="text-sm font-medium text-white">{item.description}</p>
                              <p className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleString('id-ID')}</p>
                            </div>
                            <div className="text-right">
                              <p className={`font-semibold ${item.amount >= 0 ? 'text-green-400' : 'text-yellow-400'}`}>
                                {item.amount >= 0 ? '+' : '-'}{fmt(Math.abs(item.amount || 0))}
                              </p>
                              <p className="text-xs text-gray-500">{item.status}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-lg bg-[#1a1a1a] p-4 text-sm text-gray-400">
                        Belum ada mutasi wallet referral.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
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
