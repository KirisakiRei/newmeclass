// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { AlertCircle, DollarSign, Edit2, Gift, Loader2, Save, TrendingUp, Users, Wallet } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { useToast } from '../../hooks/use-toast';
import { referralAPI } from '../../services/api';
import PageHeader from '../../components/ui/page-header';
import StatsGrid from '../../components/ui/stats-grid';
import LoadingSpinner from '../../components/ui/loading-spinner';
import { formatCurrency } from '../../lib/utils';
import { useAdminAccess } from '../../lib/admin-rbac';

const Referrals = () => {
  const { toast } = useToast();
  const adminAccess = useAdminAccess();
  const canEditReferrals = adminAccess.hasPermission('referrals.edit');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processingId, setProcessingId] = useState('');
  const [editingSettings, setEditingSettings] = useState(false);
  const [stats, setStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [formData, setFormData] = useState({
    isActive: true,
    bonusPerReferral: 10000,
    minimumWithdraw: 50000,
    title: '',
    description: '',
    benefits: [],
    termsAndConditions: '',
  });
  const [newBenefit, setNewBenefit] = useState('');

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    try {
      const [settingsRes, statsRes, leaderboardRes, withdrawalsRes] = await Promise.all([
        referralAPI.getSettings(),
        referralAPI.getStats(),
        referralAPI.getLeaderboard(10),
        referralAPI.getWithdrawals({ page: 1, pageSize: 20 }),
      ]);

      const settings = settingsRes.data || {};
      setFormData({
        isActive: settings.isActive ?? true,
        bonusPerReferral: settings.bonusPerReferral || 10000,
        minimumWithdraw: settings.minimumWithdraw || 50000,
        title: settings.title || '',
        description: settings.description || '',
        benefits: Array.isArray(settings.benefits) ? settings.benefits : [],
        termsAndConditions: settings.termsAndConditions || '',
      });
      setStats(statsRes.data || {});
      setLeaderboard(Array.isArray(leaderboardRes.data) ? leaderboardRes.data : []);
      setWithdrawals(withdrawalsRes.data?.items || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Gagal memuat data referral user',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!canEditReferrals) return;
    setSaving(true);
    try {
      await referralAPI.updateSettings({
        ...formData,
      });
      toast({
        title: 'Berhasil',
        description: 'Pengaturan referral user berhasil disimpan.',
      });
      setEditingSettings(false);
      await loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Gagal menyimpan pengaturan referral user.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleProcessWithdrawal = async (id, action) => {
    if (!canEditReferrals) return;
    setProcessingId(id);
    try {
      if (action === 'approve') {
        await referralAPI.approveWithdrawal(id, {});
      } else {
        await referralAPI.rejectWithdrawal(id, {});
      }
      toast({
        title: 'Berhasil',
        description: action === 'approve'
          ? 'Withdraw referral user disetujui.'
          : 'Withdraw referral user ditolak.',
      });
      await loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Gagal memproses withdraw referral user.',
        variant: 'destructive',
      });
    } finally {
      setProcessingId('');
    }
  };

  const addBenefit = () => {
    const value = String(newBenefit || '').trim();
    if (!value) return;
    setFormData((prev) => ({ ...prev, benefits: [...prev.benefits, value] }));
    setNewBenefit('');
  };

  const removeBenefit = (index) => {
    setFormData((prev) => ({
      ...prev,
      benefits: prev.benefits.filter((_, currentIndex) => currentIndex !== index),
    }));
  };

  if (loading) {
    return <LoadingSpinner size="lg" text="Memuat referral user..." className="min-h-[60vh]" />;
  }

  const safeStats = stats || {};

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Gift}
        title="Referral User"
        description="Kelola bonus referral user, wallet, dan withdraw DANA"
        action={
          editingSettings && canEditReferrals ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditingSettings(false)} className="border-gray-600">
                Batal
              </Button>
              <Button onClick={handleSaveSettings} disabled={saving} className="bg-yellow-400 text-black hover:bg-yellow-500">
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          ) : canEditReferrals ? (
            <Button onClick={() => setEditingSettings(true)} className="bg-yellow-400 text-black hover:bg-yellow-500">
              <Edit2 className="mr-2 h-4 w-4" />
              Edit Pengaturan
            </Button>
          ) : null
        }
      />

      <StatsGrid stats={[
        { label: 'Total Referrer User', value: safeStats.totalReferrers || 0, icon: Users, iconBg: 'bg-yellow-400/10', iconColor: 'text-yellow-400' },
        { label: 'Total Referral User', value: safeStats.totalReferrals || 0, icon: TrendingUp, iconBg: 'bg-green-400/10', iconColor: 'text-green-400', valueColor: 'text-green-400' },
        { label: 'Bonus User Pending', value: formatCurrency(safeStats.pendingBonus || 0), icon: Wallet, iconBg: 'bg-blue-400/10', iconColor: 'text-blue-400', valueColor: 'text-blue-400' },
        { label: 'Bonus User Dibayar', value: formatCurrency(safeStats.totalBonusPaid || 0), icon: DollarSign, iconBg: 'bg-yellow-400/10', iconColor: 'text-yellow-400' },
      ]} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <Card className="border-yellow-400/20 bg-[#2a2a2a]">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <Gift className="mr-2 h-5 w-5 text-yellow-400" />
              Pengaturan Referral User
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-[#1a1a1a] p-3">
              <span className="text-gray-400">Status Program</span>
              {editingSettings ? (
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(event) => setFormData((prev) => ({ ...prev, isActive: event.target.checked }))}
                    className="peer sr-only"
                  />
                  <div className="h-6 w-11 rounded-full bg-gray-600 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-yellow-400 peer-checked:after:translate-x-full" />
                </label>
              ) : (
                <span className={`rounded px-2 py-1 text-xs ${formData.isActive ? 'bg-green-400/20 text-green-400' : 'bg-red-400/20 text-red-400'}`}>
                  {formData.isActive ? 'Aktif' : 'Nonaktif'}
                </span>
              )}
            </div>

            <div>
              <label className="text-sm text-gray-400">Bonus Per Referral (IDR)</label>
              <Input
                type="number"
                value={formData.bonusPerReferral}
                disabled={!editingSettings}
                onChange={(event) => setFormData((prev) => ({ ...prev, bonusPerReferral: Number(event.target.value || 0) }))}
                className="border-yellow-400/20 bg-[#1a1a1a] text-white"
              />
            </div>

            <div>
              <label className="text-sm text-gray-400">Minimum Withdraw (IDR)</label>
              <Input
                type="number"
                value={formData.minimumWithdraw}
                disabled={!editingSettings}
                onChange={(event) => setFormData((prev) => ({ ...prev, minimumWithdraw: Number(event.target.value || 0) }))}
                className="border-yellow-400/20 bg-[#1a1a1a] text-white"
              />
            </div>

            <div>
              <label className="text-sm text-gray-400">Judul Program</label>
              <Input
                value={formData.title}
                disabled={!editingSettings}
                onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))}
                className="border-yellow-400/20 bg-[#1a1a1a] text-white"
              />
            </div>

            <div>
              <label className="text-sm text-gray-400">Deskripsi</label>
              <textarea
                rows={3}
                value={formData.description}
                disabled={!editingSettings}
                onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
                className="w-full rounded-lg border border-yellow-400/20 bg-[#1a1a1a] p-3 text-white disabled:opacity-50"
              />
            </div>

            <div>
              <label className="text-sm text-gray-400">Keuntungan Program</label>
              <div className="mt-2 space-y-2">
                {formData.benefits.map((benefit, index) => (
                  <div key={`${benefit}-${index}`} className="flex items-center gap-2 rounded bg-[#1a1a1a] p-2">
                    <span className="flex-1 text-white">{benefit}</span>
                    {editingSettings ? (
                      <button type="button" onClick={() => removeBenefit(index)} className="text-red-400 hover:text-red-300">
                        ×
                      </button>
                    ) : null}
                  </div>
                ))}
                {editingSettings ? (
                  <div className="flex gap-2">
                    <Input
                      value={newBenefit}
                      onChange={(event) => setNewBenefit(event.target.value)}
                      placeholder="Tambah manfaat baru..."
                      className="border-yellow-400/20 bg-[#1a1a1a] text-white"
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          addBenefit();
                        }
                      }}
                    />
                    <Button onClick={addBenefit} size="sm" className="bg-yellow-400 text-black hover:bg-yellow-500">
                      +
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-400">Syarat & Ketentuan</label>
              <textarea
                rows={4}
                value={formData.termsAndConditions}
                disabled={!editingSettings}
                onChange={(event) => setFormData((prev) => ({ ...prev, termsAndConditions: event.target.value }))}
                className="w-full rounded-lg border border-yellow-400/20 bg-[#1a1a1a] p-3 text-white disabled:opacity-50"
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-yellow-400/20 bg-[#2a2a2a]">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <TrendingUp className="mr-2 h-5 w-5 text-yellow-400" />
                Top Referrer User
              </CardTitle>
              <CardDescription className="text-gray-400">
                Hanya menampilkan referral milik user.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {leaderboard.length === 0 ? (
                <p className="py-6 text-center text-gray-400">Belum ada data referral user.</p>
              ) : (
                <div className="space-y-3">
                  {leaderboard.map((user, index) => (
                    <div key={user.userId || index} className="flex items-center justify-between rounded-lg bg-[#1a1a1a] p-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-400 font-bold text-black">
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-medium text-white">{user.fullName}</p>
                          <p className="text-sm text-gray-400">{user.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-yellow-400">{user.referralCount || 0}</p>
                        <p className="text-xs text-gray-400">{formatCurrency(user.totalCommission || 0)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-yellow-400/20 bg-[#2a2a2a]">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <AlertCircle className="mr-2 h-5 w-5 text-yellow-400" />
                Request Withdraw User
              </CardTitle>
              <CardDescription className="text-gray-400">
                Split referral hanya dibayarkan saat admin menyetujui withdraw user.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {withdrawals.length === 0 ? (
                <p className="py-6 text-center text-gray-400">Belum ada request withdraw referral user.</p>
              ) : (
                <div className="space-y-3">
                  {withdrawals.map((item) => (
                    <div key={item.id} className="rounded-lg border border-yellow-400/10 bg-[#1a1a1a] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-white">{item.userName || 'User'}</p>
                          <p className="text-sm text-gray-400">{item.userEmail || '-'}</p>
                          <p className="mt-2 text-xs text-gray-500">DANA: {item.danaNumber || '-'}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-yellow-400">{formatCurrency(item.amount || 0)}</p>
                          <span className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs ${
                            item.status === 'approved'
                              ? 'bg-green-400/15 text-green-400'
                              : item.status === 'rejected' || item.status === 'failed'
                                ? 'bg-red-400/15 text-red-400'
                                : 'bg-yellow-400/15 text-yellow-400'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          className="bg-yellow-400 text-black hover:bg-yellow-500"
                          disabled={!canEditReferrals || processingId === item.id || item.status !== 'pending'}
                          onClick={() => void handleProcessWithdrawal(item.id, 'approve')}
                        >
                          {processingId === item.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          Setujui
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-400/40 text-red-300"
                          disabled={!canEditReferrals || processingId === item.id || item.status !== 'pending'}
                          onClick={() => void handleProcessWithdrawal(item.id, 'reject')}
                        >
                          Tolak
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Referrals;
