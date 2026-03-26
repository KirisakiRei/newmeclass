// @ts-nocheck
import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './css/App.css';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import SEOHead from './components/SEOHead';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { Button } from './components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './components/ui/dialog';
import { Toaster } from './components/ui/toaster';
import VisitorTracker from './components/VisitorTracker';
import {
  clearAuthStorage,
  getLastSessionActivity,
  getSessionPolicy,
  recordSessionActivity,
  touchSessionForTokenKey,
} from './services/api';
import { buildPublicWebUrl } from './lib/app-urls';

// Lazy-load all pages to keep the initial bundle focused on the active route.
// download the code for the page they actually visit.

// Auth & user pages
const AuthBridge = lazy(() => import('./pages/auth/AuthBridge'));
const UserDashboard = lazy(() => import('./pages/user/UserDashboard'));
const UserTest = lazy(() => import('./pages/user/UserTest'));
const TestResult = lazy(() => import('./pages/user/TestResult'));
const CertificateDownload = lazy(() => import('./pages/shared/CertificateDownload'));

// Admin pages are downloaded only when a user navigates to /admin/*
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const DashboardHome = lazy(() => import('./pages/admin/DashboardHome'));
const Users = lazy(() => import('./pages/admin/Users'));
const LaporanPendapatan = lazy(() => import('./pages/admin/LaporanPendapatan'));
const Transaksi = lazy(() => import('./pages/admin/Transaksi'));
const PaymentOps = lazy(() => import('./pages/admin/PaymentOps'));
const PaymentOpsHelp = lazy(() => import('./pages/admin/PaymentOpsHelp'));
const Questions = lazy(() => import('./pages/admin/Questions'));
const PersonalityResults = lazy(() => import('./pages/admin/PersonalityResults'));
const PersonalityResultEdit = lazy(() => import('./pages/admin/PersonalityResultEdit'));
const Certificates = lazy(() => import('./pages/admin/Certificates'));
const CertificateDetail = lazy(() => import('./pages/admin/CertificateDetail'));
const Analytics = lazy(() => import('./pages/admin/Analytics'));
const RunningText = lazy(() => import('./pages/admin/RunningText'));
const Settings = lazy(() => import('./pages/admin/Settings'));
const Referrals = lazy(() => import('./pages/admin/Referrals'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const PremiumResults = lazy(() => import('./pages/admin/PremiumResults'));
const AdminYayasan = lazy(() => import('./pages/admin/AdminYayasan'));
const AdminWithdrawals = lazy(() => import('./pages/admin/AdminWithdrawals'));
const AdminMitra = lazy(() => import('./pages/admin/AdminMitra'));
const AdminMitraWithdrawals = lazy(() => import('./pages/admin/AdminMitraWithdrawals'));
const AdminPriceChangeRequests = lazy(() => import('./pages/admin/AdminPriceChangeRequests'));

// Yayasan & Mitra pages
const YayasanDashboard = lazy(() => import('./pages/yayasan/YayasanDashboard'));
const YayasanLogin = lazy(() => import('./pages/yayasan/YayasanLogin'));
const YayasanRegister = lazy(() => import('./pages/yayasan/YayasanRegister'));
const MitraLogin = lazy(() => import('./pages/mitra/MitraLogin'));
const MitraRegister = lazy(() => import('./pages/mitra/MitraRegister'));
const MitraClaimInvite = lazy(() => import('./pages/mitra/MitraClaimInvite'));
const MitraDashboard = lazy(() => import('./pages/mitra/MitraDashboard'));

// Export API config for other components
export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Small fallback shown only during lazy-chunk loading on page navigations
const PageLoader = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
  </div>
);

const ExternalRedirect = ({ to, label = 'Mengalihkan...' }) => {
  useEffect(() => {
    if (!to) return;
    window.location.replace(to);
  }, [to]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a] px-4">
      <div className="rounded-2xl border border-yellow-400/20 bg-[#2a2a2a] px-8 py-6 text-center text-white">
        <div className="flex items-center justify-center gap-3">
          <div className="h-5 w-5 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
          {label}
        </div>
      </div>
    </div>
  );
};

const RedirectToPublicWeb = ({ path, preserveSearch = true, label }) => {
  const location = useLocation();
  const target = useMemo(
    () => buildPublicWebUrl(path || location.pathname, preserveSearch ? location.search : ''),
    [location.pathname, location.search, path, preserveSearch],
  );

  return <ExternalRedirect to={target} label={label || 'Mengalihkan ke public web...'} />;
};

const DashboardNotFound = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a] px-6 text-center">
    <div className="max-w-md rounded-2xl border border-yellow-400/20 bg-[#2a2a2a] px-8 py-7">
      <h1 className="text-2xl font-bold text-white">Halaman tidak ditemukan</h1>
      <p className="mt-3 text-sm text-gray-400">
        Route ini tidak tersedia di dashboard app NEWME.
      </p>
      <div className="mt-5 flex justify-center">
        <Button asChild className="bg-yellow-400 text-black hover:bg-yellow-500">
          <a href="/admin/login">Kembali ke Admin Login</a>
        </Button>
      </div>
    </div>
  </div>
);

const resolveTokenKeyForPath = (pathname) => {
  if (pathname.startsWith('/admin')) return 'admin_token';
  if (pathname.startsWith('/yayasan')) return 'yayasan_token';
  if (pathname.startsWith('/mitra')) return 'mitra_token';
  if (typeof window !== 'undefined' && localStorage.getItem('user_token')) return 'user_token';
  return null;
};

const SessionManager = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [warningOpen, setWarningOpen] = useState(false);
  const [remainingMs, setRemainingMs] = useState(0);
  const [extending, setExtending] = useState(false);
  const heartbeatRef = useRef(0);

  const tokenKey = useMemo(() => resolveTokenKeyForPath(location.pathname), [location.pathname]);
  const policy = useMemo(() => getSessionPolicy(tokenKey), [tokenKey]);

  const forceLogout = useCallback(() => {
    if (!tokenKey || !policy) return;
    clearAuthStorage(tokenKey);
    setWarningOpen(false);
    navigate(policy.redirectTo, { replace: true, state: { sessionExpired: true } });
  }, [navigate, policy, tokenKey]);

  const heartbeatSession = useCallback(async () => {
    if (!tokenKey || !policy || !localStorage.getItem(tokenKey)) return;
    const now = Date.now();
    if ((now - heartbeatRef.current) < 60 * 1000) return;
    heartbeatRef.current = now;
    try {
      await touchSessionForTokenKey(tokenKey);
    } catch {
      forceLogout();
    }
  }, [forceLogout, policy, tokenKey]);

  const markActivity = useCallback(() => {
    if (!tokenKey || !policy || !localStorage.getItem(tokenKey)) return;
    recordSessionActivity(tokenKey);
    void heartbeatSession();
  }, [heartbeatSession, policy, tokenKey]);

  useEffect(() => {
    if (!tokenKey || !policy || !localStorage.getItem(tokenKey)) {
      setWarningOpen(false);
      return;
    }
    markActivity();
  }, [location.pathname, markActivity, policy, tokenKey]);

  useEffect(() => {
    if (!tokenKey || !policy) return undefined;

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        markActivity();
      }
    };

    const events = ['click', 'keydown', 'mousedown', 'touchstart'];
    events.forEach((eventName) => window.addEventListener(eventName, markActivity, { passive: true }));
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, markActivity));
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [markActivity, policy, tokenKey]);

  useEffect(() => {
    if (!tokenKey || !policy) return undefined;

    const interval = window.setInterval(() => {
      const token = localStorage.getItem(tokenKey);
      if (!token) {
        setWarningOpen(false);
        return;
      }

      const lastActivity = getLastSessionActivity(tokenKey);
      const remaining = policy.idleTimeoutMs - (Date.now() - lastActivity);
      setRemainingMs(Math.max(remaining, 0));

      if (remaining <= 0) {
        forceLogout();
        return;
      }

      setWarningOpen(remaining <= policy.warningThresholdMs);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [forceLogout, policy, tokenKey]);

  const handleContinueSession = async () => {
    if (!tokenKey) return;
    setExtending(true);
    try {
      recordSessionActivity(tokenKey);
      await touchSessionForTokenKey(tokenKey);
      setWarningOpen(false);
    } catch {
      forceLogout();
    } finally {
      setExtending(false);
    }
  };

  if (!tokenKey || !policy || !localStorage.getItem(tokenKey)) {
    return null;
  }

  return (
    <Dialog open={warningOpen} onOpenChange={setWarningOpen}>
      <DialogContent className="border-yellow-400/20 bg-[#171717] text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sesi akan berakhir</DialogTitle>
          <DialogDescription className="text-gray-400">
            Demi keamanan, sesi Anda akan diputus otomatis jika tidak ada aktivitas. Waktu tersisa sekitar {Math.max(Math.ceil(remainingMs / 1000), 0)} detik.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" className="border-gray-600 text-gray-200" onClick={forceLogout}>
            Logout sekarang
          </Button>
          <Button className="bg-yellow-400 text-black hover:bg-yellow-500" onClick={() => void handleContinueSession()} disabled={extending}>
            {extending ? 'Memperpanjang...' : 'Lanjutkan sesi'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const AppContent = () => {
  return (
    <BrowserRouter>
      <SEOHead />
      <VisitorTracker />
      <SessionManager />
      <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Navigate to="/admin/login" replace />} />

        {/* Admin routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute tokenKey="admin_token" redirectTo="/admin/login">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardHome />} />
          <Route path="users" element={<Users />} />
          <Route path="revenue" element={<LaporanPendapatan />} />
          <Route path="transactions" element={<Transaksi />} />
          <Route path="payment-ops" element={<PaymentOps />} />
          <Route path="payment-ops/help" element={<PaymentOpsHelp />} />
          <Route path="questions" element={<Questions />} />
          <Route path="certificates" element={<Certificates />} />
          <Route path="certificates/:id" element={<CertificateDetail />} />
          <Route path="banners" element={<RedirectToPublicWeb path="/cms/landing/banners" preserveSearch={false} label="Mengalihkan ke CMS landing..." />} />
          <Route path="referrals" element={<Referrals />} />
          <Route path="articles" element={<RedirectToPublicWeb path="/cms/landing/articles" preserveSearch={false} label="Mengalihkan ke CMS landing..." />} />
          <Route path="team-management" element={<RedirectToPublicWeb path="/cms/company" preserveSearch={false} label="Mengalihkan ke CMS landing..." />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="running-text" element={<RunningText />} />
          <Route path="settings" element={<Settings />} />
          <Route path="admin-users" element={<AdminUsers />} />
          <Route path="website-content" element={<RedirectToPublicWeb path="/cms" preserveSearch={false} label="Mengalihkan ke CMS landing..." />} />
          <Route path="hero-slides" element={<RedirectToPublicWeb path="/cms/landing/hero" preserveSearch={false} label="Mengalihkan ke CMS landing..." />} />
          <Route path="homepage-products" element={<RedirectToPublicWeb path="/cms/landing/products" preserveSearch={false} label="Mengalihkan ke CMS landing..." />} />
          <Route path="shop-products" element={<RedirectToPublicWeb path="/cms/shop" preserveSearch={false} label="Mengalihkan ke CMS landing..." />} />
          <Route path="testimonials" element={<RedirectToPublicWeb path="/cms/landing/testimonials" preserveSearch={false} label="Mengalihkan ke CMS landing..." />} />
          <Route path="activities" element={<RedirectToPublicWeb path="/cms/landing/activities" preserveSearch={false} label="Mengalihkan ke CMS landing..." />} />
          <Route path="media" element={<RedirectToPublicWeb path="/cms/media" preserveSearch={false} label="Mengalihkan ke CMS landing..." />} />
          <Route path="premium-results" element={<PremiumResults />} />
          <Route path="personality-results" element={<PersonalityResults />} />
          <Route path="personality-results/:code" element={<PersonalityResultEdit />} />
          <Route path="yayasan" element={<AdminYayasan />} />
          <Route path="withdrawals" element={<AdminWithdrawals />} />
          <Route path="mitra" element={<AdminMitra />} />
          <Route path="mitra-withdrawals" element={<AdminMitraWithdrawals />} />
          <Route path="price-change-requests" element={<AdminPriceChangeRequests />} />
        </Route>
        
        {/* Yayasan routes */}
        <Route path="/yayasan" element={<Navigate to="/yayasan/login" replace />} />
        <Route path="/yayasan/login" element={<YayasanLogin />} />
        <Route path="/yayasan/register" element={<YayasanRegister />} />
        <Route
          path="/yayasan/dashboard"
          element={
            <ProtectedRoute tokenKey="yayasan_token" redirectTo="/yayasan/login">
              <YayasanDashboard />
            </ProtectedRoute>
          }
        />

        <Route path="/certificate-download/:userId" element={<CertificateDownload />} />
        
        {/* Mitra routes */}
        <Route path="/mitra" element={<Navigate to="/mitra/login" replace />} />
        <Route path="/mitra/login" element={<MitraLogin />} />
        <Route path="/mitra/register" element={<MitraRegister />} />
        <Route path="/mitra/claim" element={<MitraClaimInvite />} />
        <Route
          path="/mitra/dashboard"
          element={
            <ProtectedRoute tokenKey="mitra_token" redirectTo="/mitra/login">
              <MitraDashboard />
            </ProtectedRoute>
          }
        />

        <Route path="/auth/bridge" element={<AuthBridge />} />

        <Route path="/login" element={<RedirectToPublicWeb path="/login" />} />
        <Route path="/register" element={<RedirectToPublicWeb path="/register" />} />
        <Route path="/forgot-password" element={<RedirectToPublicWeb path="/forgot-password" />} />
        <Route path="/reset-password/:token" element={<RedirectToPublicWeb />} />
        <Route path="/company-profile" element={<RedirectToPublicWeb />} />
        <Route path="/services" element={<RedirectToPublicWeb />} />
        <Route path="/services/:serviceId" element={<RedirectToPublicWeb />} />
        <Route path="/shop" element={<RedirectToPublicWeb />} />
        <Route path="/articles" element={<RedirectToPublicWeb />} />
        <Route path="/articles/:id" element={<RedirectToPublicWeb />} />
        <Route path="/contact" element={<RedirectToPublicWeb />} />
        <Route path="/privacy-policy" element={<RedirectToPublicWeb />} />
        <Route path="/certificate/verify" element={<RedirectToPublicWeb />} />
        <Route path="/certificate-verify" element={<RedirectToPublicWeb path="/certificate/verify" />} />
        <Route path="/verifikasi-sertifikat" element={<RedirectToPublicWeb path="/certificate/verify" />} />
        <Route path="/cms/*" element={<RedirectToPublicWeb preserveSearch={false} />} />
        <Route path="/kelas-gali-bakat" element={<RedirectToPublicWeb path="/services/personality-tests" preserveSearch={false} />} />
        <Route path="/newme-test" element={<RedirectToPublicWeb path="/services/personality-tests" preserveSearch={false} />} />
        <Route path="/personality-tests" element={<RedirectToPublicWeb path="/services/personality-tests" preserveSearch={false} />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute tokenKey="user_token" redirectTo="/login">
              <UserDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/user-test"
          element={
            <ProtectedRoute tokenKey="user_token" redirectTo="/login">
              <UserTest />
            </ProtectedRoute>
          }
        />
        <Route
          path="/wallet"
          element={
            <ProtectedRoute tokenKey="user_token" redirectTo="/login">
              <Navigate to="/dashboard" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/test-result/:resultId"
          element={
            <ProtectedRoute tokenKey="user_token" redirectTo="/login">
              <TestResult />
            </ProtectedRoute>
          }
        />
        <Route path="/test/:testType" element={<Navigate to="/user-test" replace />} />
        <Route path="/test-selection" element={<Navigate to="/user-test" replace />} />
        <Route path="/test/result/:testType/:result" element={<Navigate to="/dashboard" replace />} />

        <Route path="*" element={<DashboardNotFound />} />
      </Routes>
      </Suspense>
      <Toaster />
    </BrowserRouter>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <div className="App">
        <AppContent />
      </div>
    </ErrorBoundary>
  );
}

export default App;

