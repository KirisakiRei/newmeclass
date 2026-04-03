// @ts-nocheck
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ActivitySquare,
  ArrowDownToLine,
  ArrowLeftRight,
  Award,
  BarChart3,
  Brain,
  ChevronDown,
  FileText,
  Gift,
  Handshake,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Package,
  Settings,
  Shield,
  TrendingUp,
  Trophy,
  Users,
  UsersRound,
  Wallet,
  X,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import LoadingSpinner from '../../components/ui/loading-spinner';
import { useToast } from '../../hooks/use-toast';
import { adminAPI, clearAuthStorage, getStoredSessionProfile, setSessionPresence, mitraAPI, yayasanAPI } from '../../services/api';
import {
  AdminAccessProvider,
  canAccessAdminPath,
  clearStoredAdminUser,
  getAdminRoleLabel,
  getFirstAllowedAdminPath,
  hasAdminPermission,
  setStoredAdminUser,
} from '../../lib/admin-rbac';

const NAVIGATION = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
  {
    label: 'Test & Sertifikasi',
    icon: Award,
    children: [
      { label: 'Pertanyaan', href: '/admin/questions', icon: HelpCircle, permission: 'questions.view' },
      { label: 'Hasil Kepribadian', href: '/admin/personality-results', icon: Brain, permission: 'personality_results.view' },
      { label: 'Hasil Premium', href: '/admin/premium-results', icon: Trophy, permission: 'premium_results.view' },
      { label: 'Sertifikat', href: '/admin/certificates', icon: Award, permission: 'certificates.view' },
    ],
  },
  {
    label: 'Operasional Pengguna',
    icon: Users,
    children: [
      { label: 'Data Pengguna', href: '/admin/users', icon: Users, permission: 'users.view' },
      { label: 'Referral', href: '/admin/referrals', icon: Gift, permission: 'referrals.view' },
      { label: 'Data Yayasan', href: '/admin/yayasan', icon: UsersRound, permission: 'yayasan.view' },
      { label: 'Data Mitra', href: '/admin/mitra', icon: Handshake, permission: 'mitra.view' },
      { label: 'Permintaan Harga', href: '/admin/price-change-requests', icon: ArrowLeftRight, permission: 'price_change_requests.view' },
    ],
  },
  {
    label: 'Keuangan & Utility',
    icon: Wallet,
    children: [
      { label: 'Laporan Pendapatan', href: '/admin/revenue', icon: TrendingUp, permission: 'revenue.view' },
      { label: 'Transaksi', href: '/admin/transactions', icon: ArrowLeftRight, permission: 'transactions.view' },
      { label: 'Monitoring Pembayaran', href: '/admin/payment-ops', icon: ActivitySquare, permission: 'payment_ops.view' },
      { label: 'Pencairan Yayasan', href: '/admin/withdrawals', icon: ArrowDownToLine, permission: 'yayasan_withdrawals.view' },
      { label: 'Pencairan Mitra', href: '/admin/mitra-withdrawals', icon: ArrowDownToLine, permission: 'mitra_withdrawals.view' },
    ],
  },
  { label: 'Analytics', href: '/admin/analytics', icon: BarChart3, permission: 'analytics.view' },
  {
    label: 'Pengaturan',
    icon: Settings,
    children: [
      { label: 'Running Text', href: '/admin/running-text', icon: Megaphone, permission: 'settings.view' },
      { label: 'Pengaturan Website', href: '/admin/settings', icon: Settings, permission: 'settings.view' },
      { label: 'Manajemen Admin', href: '/admin/admin-users', icon: Shield, permission: 'admin_management.view' },
    ],
  },
];

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState({});
  const [authChecking, setAuthChecking] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [adminUser, setAdminUser] = useState(() => getStoredSessionProfile('admin_token') || getStoredAdminUser());
  const [withdrawalBadges, setWithdrawalBadges] = useState({
    yayasan: 0,
    mitra: 0,
  });

  const visibleNavigation = useMemo(
    () => NAVIGATION
      .filter((item) => !item.permission || hasAdminPermission(adminUser, item.permission))
      .map((item) => {
        if (!item.children) return item;
        const children = item.children.filter((child) => hasAdminPermission(adminUser, child.permission));
        return { ...item, children };
      })
      .filter((item) => !item.children || item.children.length > 0),
    [adminUser],
  );

  const isActive = useCallback(
    (path) => location.pathname === path || location.pathname.startsWith(`${path}/`),
    [location.pathname],
  );

  const isGroupActive = useCallback(
    (item) => Array.isArray(item.children) && item.children.some((child) => isActive(child.href)),
    [isActive],
  );

  useEffect(() => {
    const activeGroups = visibleNavigation
      .filter((item) => item.children && isGroupActive(item))
      .map((item) => item.label);

    if (activeGroups.length === 0) return;

    setOpenGroups((current) => {
      const next = { ...current };
      let changed = false;
      activeGroups.forEach((label) => {
        if (!next[label]) {
          next[label] = true;
          changed = true;
        }
      });
      return changed ? next : current;
    });
  }, [isGroupActive, visibleNavigation]);

  useEffect(() => {
    const validateSession = async () => {
      try {
        const response = await adminAPI.getCurrentAdmin();
        const profile = response?.data || response;
        setAdminUser(profile);
        setStoredAdminUser(profile);
        setSessionPresence('admin_token', true, profile, response?.data?.session || response?.session || null);
      } catch {
        clearAuthStorage('admin_token');
        clearStoredAdminUser();
        navigate('/admin/login', { replace: true });
        return;
      } finally {
        setAuthChecking(false);
      }
    };

    void validateSession();
  }, [navigate]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setMobileOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const loadWithdrawalBadges = async () => {
      if (!adminUser) {
        setWithdrawalBadges({ yayasan: 0, mitra: 0 });
        return;
      }

      const canViewYayasanWithdrawals = hasAdminPermission(adminUser, 'yayasan_withdrawals.view');
      const canViewMitraWithdrawals = hasAdminPermission(adminUser, 'mitra_withdrawals.view');

      if (!canViewYayasanWithdrawals && !canViewMitraWithdrawals) {
        setWithdrawalBadges({ yayasan: 0, mitra: 0 });
        return;
      }

      try {
        const [yayasanResponse, mitraResponse] = await Promise.all([
          canViewYayasanWithdrawals
            ? yayasanAPI.getWithdrawals({ status: 'pending', page: 1, pageSize: 1 })
            : Promise.resolve({ data: { total: 0 } }),
          canViewMitraWithdrawals
            ? mitraAPI.getWithdrawals({ status: 'pending', page: 1, pageSize: 1 })
            : Promise.resolve({ data: { total: 0 } }),
        ]);

        setWithdrawalBadges({
          yayasan: Number(yayasanResponse?.data?.total || 0),
          mitra: Number(mitraResponse?.data?.total || 0),
        });
      } catch {
        setWithdrawalBadges({ yayasan: 0, mitra: 0 });
      }
    };

    void loadWithdrawalBadges();
  }, [adminUser, location.pathname]);

  useEffect(() => {
    if (authChecking || !adminUser) return;
    if (canAccessAdminPath(adminUser, location.pathname)) return;

    const fallbackPath = getFirstAllowedAdminPath(adminUser);
    if (fallbackPath) {
      toast({
        title: 'Akses dibatasi',
        description: 'Halaman ini tidak tersedia untuk permission admin Anda. Kami arahkan ke halaman yang masih diizinkan.',
        variant: 'destructive',
      });
      navigate(fallbackPath, { replace: true });
      return;
    }

    toast({
      title: 'Akun belum punya akses dashboard',
      description: 'Role ini belum memiliki permission view ke halaman admin mana pun.',
      variant: 'destructive',
    });
    clearAuthStorage('admin_token');
    clearStoredAdminUser();
    navigate('/admin/login', { replace: true });
  }, [adminUser, authChecking, location.pathname, navigate, toast]);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await adminAPI.logout();
    } catch {
      // Tetap bersihkan state lokal jika cookie backend sudah invalid atau logout gagal.
    } finally {
      clearAuthStorage('admin_token');
      clearStoredAdminUser();
      toast({
        title: 'Logout berhasil',
        description: 'Sesi admin telah diakhiri.',
      });
      navigate('/admin/login', { replace: true });
      setLoggingOut(false);
    }
  };

  const toggleGroup = (groupLabel) => {
    setOpenGroups((current) => ({ ...current, [groupLabel]: !current[groupLabel] }));
  };

  const getItemBadgeCount = useCallback((href) => {
    if (href === '/admin/withdrawals') {
      return withdrawalBadges.yayasan;
    }
    if (href === '/admin/mitra-withdrawals') {
      return withdrawalBadges.mitra;
    }
    return 0;
  }, [withdrawalBadges.mitra, withdrawalBadges.yayasan]);

  const getGroupBadgeCount = useCallback((item) => (
    Array.isArray(item.children)
      ? item.children.reduce((sum, child) => sum + getItemBadgeCount(child.href), 0)
      : 0
  ), [getItemBadgeCount]);

  const renderBadge = (count, compact = false) => {
    if (!count) return null;
    const displayValue = count > 99 ? '99+' : String(count);

    if (compact) {
      return <span className="ml-2 inline-flex h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_0_3px_rgba(239,68,68,0.12)]" />;
    }

    return (
      <span className="ml-2 inline-flex min-w-[22px] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[11px] font-semibold text-white">
        {displayValue}
      </span>
    );
  };

  if (authChecking) {
    return <LoadingSpinner size="lg" text="Memverifikasi akses admin..." className="min-h-screen" />;
  }

  const SidebarContent = ({ collapsed = false }) => (
    <>
      <div className="border-b border-yellow-400/20 p-4">
        <div className="flex items-center justify-between">
          {!collapsed ? (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500">
                <span className="text-lg font-bold text-[#1a1a1a]">N</span>
              </div>
              <div>
                <h2 className="font-bold text-white">NEWME</h2>
                <p className="text-xs text-gray-400">Admin Panel</p>
              </div>
            </div>
          ) : null}
          <button
            onClick={() => setSidebarOpen((current) => !current)}
            className="hidden rounded p-2 text-gray-400 hover:text-yellow-400 md:block"
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded p-2 text-gray-400 hover:text-yellow-400 md:hidden"
            aria-label="Tutup menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3" role="navigation" aria-label="Admin navigation">
        {visibleNavigation.map((item) => {
          const Icon = item.icon;

          if (!item.children) {
            const badgeCount = getItemBadgeCount(item.href);
            return (
              <Link
                key={item.label}
                to={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all ${
                  isActive(item.href)
                    ? 'bg-yellow-400 text-[#1a1a1a]'
                    : 'text-gray-300 hover:bg-[#1a1a1a] hover:text-yellow-400'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed ? (
                  <>
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className="ml-auto">{renderBadge(badgeCount)}</span>
                  </>
                ) : renderBadge(badgeCount, true)}
              </Link>
            );
          }

          const groupOpen = openGroups[item.label];
          const groupActive = isGroupActive(item);
          const groupBadgeCount = getGroupBadgeCount(item);

          if (collapsed) {
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.children[0]?.href || '/admin/dashboard')}
                className={`flex w-full items-center justify-center rounded-lg px-3 py-2.5 transition-all ${
                  groupActive
                    ? 'bg-yellow-400/20 text-yellow-400'
                    : 'text-gray-300 hover:bg-[#1a1a1a] hover:text-yellow-400'
                }`}
                title={item.label}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {renderBadge(groupBadgeCount, true)}
              </button>
            );
          }

          return (
            <div key={item.label}>
              <button
                onClick={() => toggleGroup(item.label)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 transition-all ${
                  groupActive
                    ? 'bg-yellow-400/10 text-yellow-400'
                    : 'text-gray-300 hover:bg-[#1a1a1a] hover:text-yellow-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="text-sm font-medium">{item.label}</span>
                  {renderBadge(groupBadgeCount)}
                </div>
                <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${groupOpen ? 'rotate-180' : ''}`} />
              </button>

              <div className={`overflow-hidden transition-all duration-200 ${groupOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="mt-0.5 space-y-0.5 border-l border-yellow-400/10 pl-3 ml-4">
                  {item.children.map((child) => {
                    const ChildIcon = child.icon;
                    const badgeCount = getItemBadgeCount(child.href);
                    return (
                      <Link
                        key={child.label}
                        to={child.href}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
                          isActive(child.href)
                            ? 'bg-yellow-400 text-[#1a1a1a]'
                            : 'text-gray-400 hover:bg-[#1a1a1a] hover:text-yellow-400'
                        }`}
                      >
                        <ChildIcon className="h-4 w-4 shrink-0" />
                        <span className="text-sm">{child.label}</span>
                        <span className="ml-auto">{renderBadge(badgeCount)}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-yellow-400/20 p-4">
        {!collapsed ? (
          <div className="mb-3">
            <p className="text-sm font-semibold text-white">{adminUser?.username || adminUser?.email || 'Admin'}</p>
            <p className="text-xs text-gray-400">{getAdminRoleLabel(adminUser)}</p>
          </div>
        ) : null}
        <Button
          onClick={handleLogout}
          disabled={loggingOut}
          variant="outline"
          className={`w-full border-yellow-400 text-yellow-400 hover:bg-yellow-400/10 ${collapsed ? 'px-2' : ''}`}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed ? <span className="ml-2">{loggingOut ? 'Logout...' : 'Logout'}</span> : null}
        </Button>
      </div>
    </>
  );

  return (
    <AdminAccessProvider adminUser={adminUser} setAdminUser={setAdminUser}>
      <div className="flex min-h-screen bg-gradient-to-b from-[#1a1a1a] to-[#2a2a2a]">
        {mobileOpen ? (
          <div
            className="fixed inset-0 z-40 bg-black/60 md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        ) : null}

        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-64 transform flex-col border-r border-yellow-400/20 bg-[#2a2a2a] transition-transform duration-300 md:hidden ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <SidebarContent />
        </aside>

        <aside
          className={`hidden shrink-0 flex-col border-r border-yellow-400/20 bg-[#2a2a2a] transition-all duration-300 md:flex ${
            sidebarOpen ? 'w-64' : 'w-20'
          }`}
        >
          <SidebarContent collapsed={!sidebarOpen} />
        </aside>

        <main className="min-w-0 flex-1 overflow-auto">
          <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-yellow-400/20 bg-[#2a2a2a] px-4 py-3 md:hidden">
            <button onClick={() => setMobileOpen(true)} className="p-1 text-gray-300 hover:text-yellow-400" aria-label="Buka menu">
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500">
                <span className="text-xs font-bold text-[#1a1a1a]">N</span>
              </div>
              <span className="text-sm font-bold text-white">NEWME Admin</span>
            </div>
          </div>
          <div className="p-4 sm:p-6 md:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </AdminAccessProvider>
  );
};

export default AdminLayout;
