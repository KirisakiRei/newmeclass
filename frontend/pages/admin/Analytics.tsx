// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { BarChart3, Users, Eye, Globe, TrendingUp, Clock, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { useToast } from '../../hooks/use-toast';
import { analyticsAPI } from '../../services/api';
import PageHeader from '../../components/ui/page-header';
import StatsGrid from '../../components/ui/stats-grid';
import LoadingSpinner from '../../components/ui/loading-spinner';
import EmptyState from '../../components/ui/empty-state';

const EMPTY_ANALYTICS_STATS = {
  totalViews: 0,
  viewsToday: 0,
  uniqueVisitors: 0,
  viewsThisWeek: 0,
  viewsThisMonth: 0,
  dailyViews: [],
  topPages: [],
};

const EMPTY_ONLINE_USERS = {
  count: 0,
  users: [],
};

const normalizeAnalyticsStats = (value) => ({
  totalViews: value?.totalViews ?? value?.totalPageviews ?? 0,
  viewsToday: value?.viewsToday || 0,
  uniqueVisitors: value?.uniqueVisitors || 0,
  viewsThisWeek: value?.viewsThisWeek || 0,
  viewsThisMonth: value?.viewsThisMonth || 0,
  dailyViews: Array.isArray(value?.dailyViews) ? value.dailyViews : [],
  topPages: Array.isArray(value?.topPages) ? value.topPages : [],
});

const normalizeOnlineUsers = (value) => ({
  count: value?.count || 0,
  users: Array.isArray(value?.users) ? value.users : [],
});

const Analytics = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    // Auto refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, onlineRes] = await Promise.all([
        analyticsAPI.getStats(),
        analyticsAPI.getOnlineUsers()
      ]);
      setStats(normalizeAnalyticsStats(statsRes.data));
      setOnlineUsers(normalizeOnlineUsers(onlineRes.data));
    } catch (error) {
      console.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleCleanup = async () => {
    try {
      await analyticsAPI.cleanup();
      toast({ title: 'Sukses', description: 'Data lama berhasil dibersihkan' });
      loadData();
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal membersihkan data', variant: 'destructive' });
    }
  };

  if (loading) {
    return <LoadingSpinner size="lg" text="Memuat analytics..." className="min-h-[60vh]" />;
  }

  const safeStats = stats || EMPTY_ANALYTICS_STATS;
  const safeOnlineUsers = onlineUsers || EMPTY_ONLINE_USERS;

  return (
    <div>
      <PageHeader icon={BarChart3} title="Analytics" description="Statistik pengunjung dan aktivitas website"
        action={
          <div className="flex gap-2">
            <Button onClick={loadData} variant="outline" className="border-yellow-400/50 text-yellow-400">
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh
            </Button>
            <Button onClick={handleCleanup} variant="outline" className="border-red-400/50 text-red-400">
              Cleanup Data Lama
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      <StatsGrid className="mb-6" stats={[
        { label: 'Total Page Views', value: safeStats.totalViews || 0, icon: Eye, iconBg: 'bg-yellow-400/10', iconColor: 'text-yellow-400' },
        { label: 'Views Hari Ini', value: safeStats.viewsToday || 0, icon: TrendingUp, iconBg: 'bg-green-400/10', iconColor: 'text-green-400' },
        { label: 'Pengunjung Unik', value: safeStats.uniqueVisitors || 0, icon: Users, iconBg: 'bg-blue-400/10', iconColor: 'text-blue-400' },
        { label: 'Online Sekarang', value: safeOnlineUsers.count || 0, icon: Globe, iconBg: 'bg-green-400/10', iconColor: 'text-green-400', valueColor: 'text-green-400' },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Views Chart */}
        <Card className="bg-[#2a2a2a] border-yellow-400/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" /> Views 7 Hari Terakhir
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {safeStats.dailyViews.map((day, idx) => {
                const maxViews = Math.max(...safeStats.dailyViews.map(d => d.views)) || 1;
                const percentage = (day.views / maxViews) * 100;
                return (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="text-gray-400 text-sm w-24">{new Date(day.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' })}</span>
                    <div className="flex-1 bg-[#1a1a1a] rounded-full h-6 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-yellow-400 to-yellow-500 h-full rounded-full flex items-center justify-end px-2"
                        style={{ width: `${Math.max(percentage, 5)}%` }}
                      >
                        <span className="text-xs text-black font-semibold">{day.views}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Top Pages */}
        <Card className="bg-[#2a2a2a] border-yellow-400/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Globe className="w-5 h-5 mr-2" /> Halaman Populer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {safeStats.topPages.length > 0 ? (
                safeStats.topPages.map((page, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-[#1a1a1a] rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 bg-yellow-400 text-black rounded-full flex items-center justify-center text-sm font-bold">
                        {idx + 1}
                      </span>
                      <span className="text-white">{page._id || 'Unknown'}</span>
                    </div>
                    <span className="text-yellow-400 font-semibold">{page.count} views</span>
                  </div>
                ))
              ) : (
                <EmptyState icon="default" title="Belum ada data" className="py-4" />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Online Users */}
        <Card className="bg-[#2a2a2a] border-yellow-400/20 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Users className="w-5 h-5 mr-2" /> Pengguna Online ({safeOnlineUsers.count || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {safeOnlineUsers.users.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-gray-400 text-sm text-left">
                      <th className="pb-3">Session</th>
                      <th className="pb-3">Halaman</th>
                      <th className="pb-3">IP Address</th>
                      <th className="pb-3">Terakhir Aktif</th>
                    </tr>
                  </thead>
                  <tbody>
                    {safeOnlineUsers.users.slice(0, 10).map((user, idx) => (
                      <tr key={idx} className="border-t border-yellow-400/10">
                        <td className="py-3 text-gray-400 font-mono text-sm">{user.sessionId.slice(0, 8)}...</td>
                        <td className="py-3 text-white">{user.currentPage}</td>
                        <td className="py-3 text-gray-400">{user.ipAddress}</td>
                        <td className="py-3 text-gray-400 text-sm flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {new Date(user.lastActivity).toLocaleTimeString('id-ID')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState icon="users" title="Tidak ada pengguna online" description="Tidak ada pengguna online saat ini" className="py-4" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Period Stats */}
      <StatsGrid className="mt-6" columns={3} stats={[
        { label: 'Views Minggu Ini', value: safeStats.viewsThisWeek || 0 },
        { label: 'Views Bulan Ini', value: safeStats.viewsThisMonth || 0 },
        { label: 'Rata-rata Harian', value: safeStats.dailyViews.length ? Math.round(safeStats.dailyViews.reduce((a, b) => a + b.views, 0) / 7) : 0 },
      ]} />
    </div>
  );
};

export default Analytics;
