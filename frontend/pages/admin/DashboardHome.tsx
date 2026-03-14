// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Users, Mail, Building2, TrendingUp, CreditCard, Package, Eye, ShoppingBag, LayoutDashboard } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { adminAPI, paymentAPI, productsAPI, analyticsAPI } from '../../services/api';
import { useToast } from '../../hooks/use-toast';
import PageHeader from '../../components/ui/page-header';
import StatsGrid from '../../components/ui/stats-grid';
import LoadingSpinner from '../../components/ui/loading-spinner';
import StatusBadge, { getStatusType, getStatusLabel } from '../../components/ui/status-badge';
import EmptyState from '../../components/ui/empty-state';
import { formatCurrency } from '../../lib/utils';

const EMPTY_DASHBOARD_STATS = {
  registrations: { total: 0, recent: [] },
  contacts: { total: 0, recent: [] },
};

const normalizeDashboardStats = (value) => ({
  registrations: {
    total: value?.registrations?.total || 0,
    recent: Array.isArray(value?.registrations?.recent) ? value.registrations.recent : [],
  },
  contacts: {
    total: value?.contacts?.total || 0,
    recent: Array.isArray(value?.contacts?.recent) ? value.contacts.recent : [],
  },
});

const normalizePaymentStats = (value) => ({
  total: value?.total || 0,
  approved: value?.approved || 0,
  pending: value?.pending || 0,
  totalRevenue: value?.totalRevenue || 0,
});

const normalizeProductStats = (value) => ({
  total: value?.total || 0,
});

const normalizeAnalyticsStats = (value) => ({
  viewsToday: value?.viewsToday || 0,
  onlineUsers: value?.onlineUsers || 0,
});

const DashboardHome = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [paymentStats, setPaymentStats] = useState(null);
  const [productStats, setProductStats] = useState(null);
  const [analyticsStats, setAnalyticsStats] = useState(null);

  useEffect(() => {
    loadAllStats();
  }, []);

  const loadAllStats = async () => {
    try {
      const [dashboardRes, paymentRes, productRes, analyticsRes] = await Promise.all([
        adminAPI.getDashboardStats(),
        paymentAPI.getStats().catch(() => ({ data: null })),
        productsAPI.getStats().catch(() => ({ data: null })),
        analyticsAPI.getStats().catch(() => ({ data: null }))
      ]);
      
      setStats(normalizeDashboardStats(dashboardRes.data));
      setPaymentStats(normalizePaymentStats(paymentRes.data));
      setProductStats(normalizeProductStats(productRes.data));
      setAnalyticsStats(normalizeAnalyticsStats(analyticsRes.data));
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal memuat statistik', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner size="lg" text="Memuat dashboard..." className="min-h-[60vh]" />;
  }

  const dashboardStats = stats || EMPTY_DASHBOARD_STATS;
  const payments = paymentStats || normalizePaymentStats(null);
  const products = productStats || normalizeProductStats(null);
  const analytics = analyticsStats || normalizeAnalyticsStats(null);

  return (
    <div>
      <PageHeader icon={LayoutDashboard} title="Dashboard" description="Selamat datang di Admin Panel NEWME CLASS" />

      {/* Main Stats */}
      <StatsGrid className="mb-6" stats={[
        { label: 'Total Registrasi', value: dashboardStats.registrations.total || 0, icon: Users, iconBg: 'bg-yellow-400/10', iconColor: 'text-yellow-400' },
        { label: 'Pesan Kontak', value: dashboardStats.contacts.total || 0, icon: Mail, iconBg: 'bg-blue-400/10', iconColor: 'text-blue-400' },
        { label: 'Total Revenue', value: formatCurrency(payments.totalRevenue), icon: CreditCard, iconBg: 'bg-green-400/10', iconColor: 'text-green-400', valueColor: 'text-green-400' },
        { label: 'Page Views', value: analytics.viewsToday || 0, icon: Eye, iconBg: 'bg-purple-400/10', iconColor: 'text-purple-400' },
      ]} />

      {/* Secondary Stats */}
      <StatsGrid className="mb-6" stats={[
        { label: 'Products', value: products.total || 0, icon: ShoppingBag, iconBg: 'bg-yellow-400/10', iconColor: 'text-yellow-400' },
        { label: 'Pending Pembayaran', value: payments.pending || 0, icon: CreditCard, iconBg: 'bg-orange-400/10', iconColor: 'text-orange-400', valueColor: 'text-orange-400' },
        { label: 'Online Users', value: analytics.onlineUsers || 0, icon: TrendingUp, iconBg: 'bg-green-400/10', iconColor: 'text-green-400', valueColor: 'text-green-400' },
      ]} columns={3} />

      {/* Recent Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-[#2a2a2a] border-yellow-400/20">
          <CardHeader>
            <CardTitle className="text-white">Registrasi Terbaru</CardTitle>
            <CardDescription className="text-gray-400">
              {dashboardStats.registrations.recent.length || 0} registrasi terbaru
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardStats.registrations.recent.length > 0 ? (
                dashboardStats.registrations.recent.slice(0, 5).map((reg) => (
                <div key={reg._id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-[#1a1a1a] rounded-lg">
                  <div className="min-w-0">
                    <p className="text-white font-medium truncate">{reg.name}</p>
                    <p className="text-gray-400 text-sm truncate">{reg.email}</p>
                  </div>
                  <span className={`self-start sm:self-center shrink-0 px-2 py-1 rounded text-xs ${
                    reg.testStatus === 'approved' ? 'bg-green-400/20 text-green-400' :
                    reg.testStatus === 'pending' ? 'bg-yellow-400/20 text-yellow-400' :
                    'bg-gray-400/20 text-gray-400'
                  }`}>
                    {reg.testStatus}
                  </span>
                </div>
              ))
            ) : (
              <EmptyState icon="users" title="Belum ada registrasi" className="py-4" />
            )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#2a2a2a] border-yellow-400/20">
          <CardHeader>
            <CardTitle className="text-white">Pesan Terbaru</CardTitle>
            <CardDescription className="text-gray-400">
              {dashboardStats.contacts.recent.length || 0} pesan terbaru
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardStats.contacts.recent.length > 0 ? (
                dashboardStats.contacts.recent.slice(0, 5).map((contact) => (
                <div key={contact._id} className="p-3 bg-[#1a1a1a] rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-white font-medium">{contact.name}</p>
                    {contact.status === 'new' && (
                      <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm line-clamp-2">{contact.message}</p>
                </div>
              ))
            ) : (
              <EmptyState icon="default" title="Belum ada pesan" className="py-4" />
            )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardHome;
