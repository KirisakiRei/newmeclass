// @ts-nocheck
import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './css/App.css';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import VisitorTracker from './components/VisitorTracker';
import SEOHead from './components/SEOHead';
import MaintenancePage from './components/MaintenancePage';
import ErrorBoundary from './components/ErrorBoundary';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { useTheme } from './contexts/ThemeContext';
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
import {
  clearAuthStorage,
  getLastSessionActivity,
  getSessionPolicy,
  recordSessionActivity,
  touchSessionForTokenKey,
} from './services/api';

// Lazy-load all pages to keep the initial bundle focused on the active route.
// download the code for the page they actually visit.

// Public pages
const Home = lazy(() => import('./pages/landingpage/Home'));
const CompanyProfile = lazy(() => import('./pages/landingpage/CompanyProfile'));
const KelasGaliBakat = lazy(() => import('./pages/landingpage/KelasGaliBakat'));
const NewmeTest = lazy(() => import('./pages/landingpage/NewmeTest'));
const Services = lazy(() => import('./pages/landingpage/Services'));
const Contact = lazy(() => import('./pages/landingpage/Contact'));
const Shop = lazy(() => import('./pages/landingpage/Shop'));
const CertificateVerify = lazy(() => import('./pages/landingpage/CertificateVerify'));
const ArticlesPage = lazy(() => import('./pages/landingpage/ArticlesPage'));
const ArticleDetail = lazy(() => import('./pages/landingpage/ArticleDetail'));
const PersonalityTestsLanding = lazy(() => import('./pages/landingpage/PersonalityTestsLanding'));
const PersonalityTest = lazy(() => import('./pages/landingpage/PersonalityTest'));
const PersonalityTestResult = lazy(() => import('./pages/landingpage/PersonalityTestResult'));
const TestSelection = lazy(() => import('./pages/user/TestSelection'));
const PrivacyPolicy = lazy(() => import('./pages/landingpage/PrivacyPolicy'));
const NotFound = lazy(() => import('./pages/landingpage/NotFound'));

// Auth & user pages
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));
const UserDashboard = lazy(() => import('./pages/user/UserDashboard'));
const UserTest = lazy(() => import('./pages/user/UserTest'));
const Wallet = lazy(() => import('./pages/user/Wallet'));
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
const Banners = lazy(() => import('./pages/admin/Banners'));
const Analytics = lazy(() => import('./pages/admin/Analytics'));
const Settings = lazy(() => import('./pages/admin/Settings'));
const Referrals = lazy(() => import('./pages/admin/Referrals'));
const Articles = lazy(() => import('./pages/admin/Articles'));
const TeamManagement = lazy(() => import('./pages/admin/TeamManagement'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const WebsiteContent = lazy(() => import('./pages/admin/WebsiteContent'));
const HeroSlides = lazy(() => import('./pages/admin/HeroSlides'));
const HomepageProducts = lazy(() => import('./pages/admin/HomepageProducts'));
const ShopProducts = lazy(() => import('./pages/admin/ShopProducts'));
const Testimonials = lazy(() => import('./pages/admin/Testimonials'));
const Activities = lazy(() => import('./pages/admin/Activities'));
const MediaGallery = lazy(() => import('./pages/admin/MediaGallery'));
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

// Component to handle maintenance mode check
const AppContent = () => {
  const { settings } = useTheme();

  // Maintenance mode activates once settings load and does not block the initial render.
  const isMaintenanceMode = settings?.maintenanceMode === true;

  return (
    <BrowserRouter>
      <SessionManager />
      <SEOHead />
      <VisitorTracker />
      <Suspense fallback={<PageLoader />}>
      <Routes>
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
          <Route path="banners" element={<Banners />} />
          <Route path="referrals" element={<Referrals />} />
          <Route path="articles" element={<Articles />} />
          <Route path="team-management" element={<TeamManagement />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="settings" element={<Settings />} />
          <Route path="admin-users" element={<AdminUsers />} />
          <Route path="website-content" element={<WebsiteContent />} />
          <Route path="hero-slides" element={<HeroSlides />} />
          <Route path="homepage-products" element={<HomepageProducts />} />
          <Route path="shop-products" element={<ShopProducts />} />
          <Route path="testimonials" element={<Testimonials />} />
          <Route path="activities" element={<Activities />} />
          <Route path="media" element={<MediaGallery />} />
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
        
        {/* If maintenance mode is ON, show maintenance page for all public routes */}
        {isMaintenanceMode ? (
          <Route path="/*" element={
            <MaintenancePage 
              message={settings?.maintenanceMessage} 
              settings={settings}
            />
          } />
        ) : (
          <>
            {/* Auth routes (no navbar/footer) */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
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
            
            {/* Public routes with navbar/footer */}
            <Route path="/*" element={
              <>
                <Navbar />
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/company-profile" element={<CompanyProfile />} />
                  <Route path="/kelas-gali-bakat" element={<KelasGaliBakat />} />
                  <Route path="/newme-test" element={<NewmeTest />} />
                  <Route path="/services/:serviceId" element={<Services />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/shop" element={<Shop />} />
                  <Route path="/articles" element={<ArticlesPage />} />
                  <Route path="/articles/:id" element={<ArticleDetail />} />
                  <Route path="/personality-tests" element={<PersonalityTestsLanding />} />
                  <Route path="/test/:testType" element={<Navigate to="/user-test" replace />} />
                  <Route path="/test/result/:testType/:result" element={<PersonalityTestResult />} />
                  <Route path="/test-selection" element={<TestSelection />} />
                  <Route path="/certificate-verify" element={<CertificateVerify />} />
                  <Route path="/verifikasi-sertifikat" element={<CertificateVerify />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
                <Footer />
                <ScrollToTop />
              </>
            } />
          </>
        )}
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

