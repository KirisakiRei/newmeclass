// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  Settings, 
  BarChart3, 
  HelpCircle,
  Image,
  Images,
  LogOut,
  Menu,
  X,
  Award,
  Gift,
  FileText,
  UsersRound,
  Shield,
  Layout,
  Layers,
  ShoppingBag,
  Package,
  MessageSquare,
  Activity,
  Trophy,
  ArrowDownToLine,
  ChevronDown,
  Handshake,
  Brain,
  Wallet,
  TrendingUp,
  ArrowLeftRight
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useToast } from '../../hooks/use-toast';
import { adminAPI } from '../../services/api';
import LoadingSpinner from '../../components/ui/loading-spinner';

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState({});
  const [authChecking, setAuthChecking] = useState(true);
  const [adminUser, setAdminUser] = useState(() => {
    const user = localStorage.getItem('admin_user');
    return user ? JSON.parse(user) : null;
  });

  // Navigation structure: groups with children + direct links
  const navigation = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    {
      name: 'Manajemen Konten',
      icon: Layout,
      children: [
        { name: 'Layout Website', href: '/admin/website-content', icon: Layout },
        { name: 'Hero Slides', href: '/admin/hero-slides', icon: Layers },
        { name: 'Produk Homepage', href: '/admin/homepage-products', icon: ShoppingBag },
        { name: 'Produk Shop', href: '/admin/shop-products', icon: Package },
        { name: 'Testimonial', href: '/admin/testimonials', icon: MessageSquare },
        { name: 'Kegiatan', href: '/admin/activities', icon: Activity },
        { name: 'Banners', href: '/admin/banners', icon: Image },
        { name: 'Artikel', href: '/admin/articles', icon: FileText },
        { name: 'Media Gallery', href: '/admin/media', icon: Images },
        { name: 'Team & Mitra', href: '/admin/team-management', icon: Shield },
      ],
    },
    {
      name: 'Test & Sertifikasi',
      icon: Award,
      children: [
        { name: 'Pertanyaan', href: '/admin/questions', icon: HelpCircle },
        { name: 'Hasil Kepribadian', href: '/admin/personality-results', icon: Brain },
        { name: 'Hasil Premium', href: '/admin/premium-results', icon: Trophy },
        { name: 'Sertifikat', href: '/admin/certificates', icon: Award },
      ],
    },
    {
      name: 'Manajemen Pengguna',
      icon: Users,
      children: [
        { name: 'Data Pengguna', href: '/admin/users', icon: Users },
        { name: 'Referral', href: '/admin/referrals', icon: Gift },
      ],
    },
    {
      name: 'Manajemen Yayasan',
      icon: UsersRound,
      children: [
        { name: 'Data Yayasan', href: '/admin/yayasan', icon: UsersRound },
      ],
    },
    {
      name: 'Manajemen Mitra',
      icon: Handshake,
      children: [
        { name: 'Data Mitra', href: '/admin/mitra', icon: Handshake },
        { name: 'Permintaan Harga', href: '/admin/price-change-requests', icon: ArrowLeftRight },
      ],
    },
    {
      name: 'Keuangan',
      icon: Wallet,
      children: [
        { name: 'Laporan Pendapatan', href: '/admin/revenue', icon: TrendingUp },
        { name: 'Transaksi', href: '/admin/transactions', icon: ArrowLeftRight },
      ],
    },
    { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    {
      name: 'Pengaturan',
      icon: Settings,
      children: [
        { name: 'Pengaturan Website', href: '/admin/settings', icon: Settings },
        { name: 'Manajemen Admin', href: '/admin/admin-users', icon: Shield },
      ],
    },
  ];

  const isActive = (path) => location.pathname === path;

  const isGroupActive = useCallback((item) => {
    if (item.children) {
      return item.children.some((child) => location.pathname === child.href);
    }
    return false;
  }, [location.pathname]);

  // Auto-expand groups that contain the active route
  useEffect(() => {
    const autoOpen = {};
    navigation.forEach((item) => {
      if (item.children && isGroupActive(item)) {
        autoOpen[item.name] = true;
      }
    });
    setOpenGroups((prev) => ({ ...prev, ...autoOpen }));
  }, [location.pathname]);

  useEffect(() => {
    const validateAdminSession = async () => {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        navigate('/admin/login', { replace: true });
        return;
      }

      try {
        const response = await adminAPI.getCurrentAdmin();
        setAdminUser(response.data);
        localStorage.setItem('admin_user', JSON.stringify(response.data));
      } catch {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        navigate('/admin/login', { replace: true });
        return;
      } finally {
        setAuthChecking(false);
      }
    };

    validateAdminSession();
  }, [navigate]);

  // Close mobile sidebar on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Close mobile sidebar on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setMobileOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleGroup = (name) => {
    setOpenGroups((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    toast({
      title: 'Logout Berhasil',
      description: 'Anda telah keluar dari dashboard'
    });
    navigate('/admin/login');
  };

  if (authChecking) {
    return <LoadingSpinner size="lg" text="Memverifikasi akses admin..." className="min-h-screen" />;
  }

  const SidebarContent = ({ collapsed = false }) => (
    <>
      {/* Header */}
      <div className="p-4 border-b border-yellow-400/20">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center">
                <span className="text-lg font-bold text-[#1a1a1a]">N</span>
              </div>
              <div>
                <h2 className="text-white font-bold">NEWME</h2>
                <p className="text-gray-400 text-xs">Admin Panel</p>
              </div>
            </div>
          )}
          {/* Desktop collapse toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden md:block text-gray-400 hover:text-yellow-400 p-2 rounded"
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          {/* Mobile close */}
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden text-gray-400 hover:text-yellow-400 p-2 rounded"
            aria-label="Tutup menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto" role="navigation" aria-label="Admin navigation">
        {navigation.map((item) => {
          const Icon = item.icon;

          // Direct link (no children)
          if (!item.children) {
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all ${
                  isActive(item.href) ?
                     'bg-yellow-400 text-[#1a1a1a]'
                    : 'text-gray-300 hover:bg-[#1a1a1a] hover:text-yellow-400'
                }`}
                aria-current={isActive(item.href) ? 'page' : undefined}
                title={collapsed ? item.name : undefined}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!collapsed && <span className="font-medium text-sm">{item.name}</span>}
              </Link>
            );
          }

          // Group with children
          const groupOpen = openGroups[item.name];
          const groupActive = isGroupActive(item);

          // Collapsed sidebar: show only group icon (first child link on click)
          if (collapsed) {
            return (
              <div key={item.name} title={item.name}>
                <button
                  onClick={() => navigate(item.children[0].href)}
                  className={`flex items-center justify-center w-full px-3 py-2.5 rounded-lg transition-all ${
                    groupActive ?
                       'bg-yellow-400/20 text-yellow-400'
                      : 'text-gray-300 hover:bg-[#1a1a1a] hover:text-yellow-400'
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                </button>
              </div>
            );
          }

          return (
            <div key={item.name}>
              {/* Group header button */}
              <button
                onClick={() => toggleGroup(item.name)}
                className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg transition-all ${
                  groupActive ?
                     'bg-yellow-400/10 text-yellow-400'
                    : 'text-gray-300 hover:bg-[#1a1a1a] hover:text-yellow-400'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className="w-5 h-5 shrink-0" />
                  <span className="font-medium text-sm">{item.name}</span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                    groupOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Children with indentation */}
              <div
                className={`overflow-hidden transition-all duration-200 ${
                  groupOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="ml-4 pl-3 border-l border-yellow-400/10 mt-0.5 space-y-0.5">
                  {item.children.map((child) => {
                    const ChildIcon = child.icon;
                    return (
                      <Link
                        key={child.name}
                        to={child.href}
                        className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-all ${
                          isActive(child.href) ?
                             'bg-yellow-400 text-[#1a1a1a]'
                            : 'text-gray-400 hover:bg-[#1a1a1a] hover:text-yellow-400'
                        }`}
                        aria-current={isActive(child.href) ? 'page' : undefined}
                      >
                        <ChildIcon className="w-4 h-4 shrink-0" />
                        <span className="text-sm">{child.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-yellow-400/20">
        {!collapsed && (
          <div className="mb-3">
            <p className="text-white font-semibold text-sm">{adminUser.username}</p>
            <p className="text-gray-400 text-xs">{adminUser.role}</p>
          </div>
        )}
        <Button
          onClick={handleLogout}
          variant="outline"
          className={`w-full border-yellow-400 text-yellow-400 hover:bg-yellow-400/10 ${
            collapsed && 'px-2'
          }`}
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span className="ml-2">Logout</span>}
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1a1a] to-[#2a2a2a] flex">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#2a2a2a] border-r border-yellow-400/20 flex flex-col transform transition-transform duration-300 md:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Desktop sidebar */}
      <aside className={`hidden md:flex ${
        sidebarOpen ? 'w-64' : 'w-20'
      } bg-[#2a2a2a] border-r border-yellow-400/20 transition-all duration-300 flex-col shrink-0`}>
        <SidebarContent collapsed={!sidebarOpen} />
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto min-w-0">
        {/* Mobile header bar */}
        <div className="md:hidden sticky top-0 z-30 bg-[#2a2a2a] border-b border-yellow-400/20 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-gray-300 hover:text-yellow-400 p-1"
            aria-label="Buka menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-[#1a1a1a]">N</span>
            </div>
            <span className="text-white font-bold text-sm">NEWME Admin</span>
          </div>
        </div>
        <div className="p-4 sm:p-6 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
