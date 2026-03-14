// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Building2, CheckCircle, ToggleLeft, ToggleRight, Users, ShieldCheck, Eye, ChevronDown, ChevronUp, TrendingUp, UserCheck, Handshake } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { useToast } from '../../hooks/use-toast';
import PageHeader from '../../components/ui/page-header';
import StatsGrid from '../../components/ui/stats-grid';
import LoadingSpinner, { TableSkeleton } from '../../components/ui/loading-spinner';
import { formatCurrency } from '../../lib/utils';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function AdminYayasan() {
  const { toast } = useToast();
  const [yayasanList, setYayasanList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openCard, setOpenCard] = useState(null);
  const [detailYayasan, setDetailYayasan] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const token = () => localStorage.getItem('admin_token');
  const headers = () => ({ Authorization: `Bearer ${token()}` });
  const detailUsers = Array.isArray(detailYayasan?.users) ? detailYayasan.users : [];
  const detailStats = detailYayasan?.stats || {};

  useEffect(() => { loadYayasan(); }, []);

  const loadYayasan = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/yayasan/admin/list`, { headers: headers() });
      setYayasanList(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const toggleActive = async (id, current) => {
    try {
      await axios.put(`${API_URL}/api/yayasan/admin/${id}/toggle-active`, {}, { headers: headers() });
      setYayasanList(prev => prev.map(y => y._id === id ? { ...y, isActive: !current } : y));
      toast({ title: 'Berhasil', description: `Yayasan ${!current ? 'diaktifkan' : 'dinonaktifkan'}` });
    } catch (e) {
      toast({ title: 'Error', description: 'Gagal mengubah status', variant: 'destructive' });
    }
  };

  const verify = async (id) => {
    try {
      await axios.put(`${API_URL}/api/yayasan/admin/${id}/verify`, {}, { headers: headers() });
      setYayasanList(prev => prev.map(y => y._id === id ? { ...y, isVerified: true } : y));
      toast({ title: 'Berhasil', description: 'Yayasan diverifikasi' });
    } catch (e) {
      toast({ title: 'Error', description: 'Gagal verifikasi', variant: 'destructive' });
    }
  };

  const handleViewDetail = async (id) => {
    setShowDetail(true);
    setDetailYayasan(null);
    setUserSearch('');
    setLoadingDetail(true);
    try {
      const res = await axios.get(`${API_URL}/api/yayasan/admin/${id}/detail`, { headers: headers() });
      setDetailYayasan(res.data);
    } catch (e) {
      toast({ title: 'Error', description: 'Gagal memuat detail yayasan', variant: 'destructive' });
      setShowDetail(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const payLabel = (s) => s === 'approved' ? 'Lunas' : s === 'pending' ? 'Pending' : 'Belum Bayar';
  const payColor = (s) => s === 'approved' ? 'bg-green-400/20 text-green-400' : s === 'pending' ? 'bg-yellow-400/20 text-yellow-400' : 'bg-red-400/20 text-red-400';
  const testLabel = (s) => s === 'completed' ? 'Selesai' : s === 'in_progress' ? 'Berlangsung' : 'Belum Tes';
  const testColor = (s) => s === 'completed' ? 'bg-green-400/20 text-green-400' : s === 'in_progress' ? 'bg-purple-400/20 text-purple-400' : 'bg-gray-400/20 text-gray-400';

  const StatusBadges = ({ y }) => (
    <div className="flex gap-1 flex-wrap">
      <span className={`px-2 py-0.5 rounded text-xs ${y.isActive ? 'bg-green-400/20 text-green-400' : 'bg-red-400/20 text-red-400'}`}>
        {y.isActive ? 'Aktif' : 'Nonaktif'}
      </span>
      {y.isVerified ?
         <span className="px-2 py-0.5 rounded text-xs bg-blue-400/20 text-blue-400">Verified</span>
        : <span className="px-2 py-0.5 rounded text-xs bg-orange-400/20 text-orange-400">Unverified</span>
      }
    </div>
  );

  const ActionButtons = ({ y }) => (
    <div className="flex items-center gap-1 flex-nowrap">
      <Button size="sm" variant="ghost" onClick={() => handleViewDetail(y._id)}
        className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10" title="Lihat Detail">
        <Eye className="w-4 h-4" />
      </Button>
      {!y.isVerified && (
        <Button size="sm" variant="ghost" onClick={() => verify(y._id)}
          className="text-green-400 hover:text-green-300 hover:bg-green-400/10" title="Verifikasi">
          <CheckCircle className="w-4 h-4" />
        </Button>
      )}
      <Button size="sm" variant="ghost" onClick={() => toggleActive(y._id, y.isActive)}
        className={y.isActive ? 'text-green-400 hover:text-green-300 hover:bg-green-400/10' : 'text-red-400 hover:text-red-300 hover:bg-red-400/10'}
        title={y.isActive ? 'Nonaktifkan' : 'Aktifkan'}>
        {y.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
      </Button>
    </div>
  );

  const filteredUsers = detailUsers.filter(u =>
    !userSearch ||
    (u.fullName || '').toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(userSearch.toLowerCase())
  );

  if (loading) return <LoadingSpinner size="lg" text="Memuat data yayasan..." className="min-h-[60vh]" />;

  return (
    <div className="space-y-6">
      <PageHeader icon={Building2} title="Manajemen Yayasan" description="Kelola yayasan yang terdaftar di platform" />

      <StatsGrid stats={[
        { label: 'Total Yayasan', value: yayasanList.length, icon: Building2, iconBg: 'bg-yellow-400/10', iconColor: 'text-yellow-400', valueColor: 'text-yellow-400' },
        { label: 'Terverifikasi', value: yayasanList.filter(y => y.isVerified).length, icon: ShieldCheck, iconBg: 'bg-blue-400/10', iconColor: 'text-blue-400', valueColor: 'text-blue-400' },
        { label: 'Aktif', value: yayasanList.filter(y => y.isActive).length, icon: Users, iconBg: 'bg-green-400/10', iconColor: 'text-green-400', valueColor: 'text-green-400' },
      ]} columns={3} />

      <Card className="bg-[#2a2a2a] border-yellow-400/20">
        <CardContent className="p-0">
          {/* Accordion — below lg */}
          <div className="lg:hidden divide-y divide-yellow-400/10">
            {yayasanList.length === 0 ? (
              <p className="text-center text-gray-400 py-8 px-4">Belum ada yayasan terdaftar</p>
            ) : yayasanList.map((y) => (
              <div key={y._id}>
                <button
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-[#333]"
                  onClick={() => setOpenCard(openCard === y._id ? null : y._id)}
                >
                  <div>
                    <p className="text-white font-medium">{y.name}</p>
                    <p className="text-gray-400 text-xs">{y.email}</p>
                    <div className="mt-1"><StatusBadges y={y} /></div>
                  </div>
                  {openCard === y._id ?
                     <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                </button>
                {openCard === y._id && (
                  <div className="px-4 pb-4 space-y-3 bg-[#1f1f1f]">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><p className="text-gray-500 text-xs">Mitra</p><p className="text-yellow-400 text-xs">{y.mitraName || '-'}</p></div>
                      <div>
                        <p className="text-gray-500 text-xs">Kode Referral</p>
                        <code className="text-yellow-400 text-xs bg-yellow-400/10 px-1.5 py-0.5 rounded">{y.referralCode}</code>
                      </div>
                      <div><p className="text-gray-500 text-xs">Harga</p><p className="text-green-400 font-medium">{formatCurrency(y.referralPrice || 100000)}</p></div>
                      <div><p className="text-gray-500 text-xs">Bergabung</p><p className="text-gray-300">{y.createdAt ? new Date(y.createdAt).toLocaleDateString('id-ID') : '-'}</p></div>
                    </div>
                    <ActionButtons y={y} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden lg:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-yellow-400/20 text-gray-400">
                  <th className="text-left py-3 px-3">Yayasan</th>
                  <th className="text-left py-3 px-3 whitespace-nowrap">Mitra</th>
                  <th className="text-left py-3 px-3 whitespace-nowrap">Kode Referral</th>
                  <th className="text-left py-3 px-3 whitespace-nowrap">Harga</th>
                  <th className="text-left py-3 px-3 whitespace-nowrap">Status</th>
                  <th className="text-left py-3 px-3 whitespace-nowrap">Bergabung</th>
                  <th className="text-left py-3 px-3 whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {yayasanList.length === 0 ? (
                  <tr><td colSpan={7} className="text-center text-gray-400 py-8">Belum ada yayasan terdaftar</td></tr>
                ) : yayasanList.map((y) => (
                  <tr key={y._id} className="border-b border-yellow-400/10 hover:bg-[#333]">
                    <td className="py-2.5 px-3">
                      <p className="text-white font-medium">{y.name}</p>
                      <p className="text-gray-400 text-xs">{y.email}</p>
                    </td>
                    <td className="py-2.5 px-3">
                      {y.mitraName ?
                         <span className="text-yellow-400 text-xs">{y.mitraName}</span>
                        : <span className="text-gray-500 text-xs">-</span>}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <code className="text-yellow-400 text-xs bg-yellow-400/10 px-2 py-1 rounded">{y.referralCode}</code>
                    </td>
                    <td className="py-2.5 px-3 text-green-400 font-medium text-xs whitespace-nowrap">{formatCurrency(y.referralPrice || 100000)}</td>
                    <td className="py-2.5 px-3 whitespace-nowrap"><StatusBadges y={y} /></td>
                    <td className="py-2.5 px-3 text-gray-400 text-xs whitespace-nowrap">{y.createdAt ? new Date(y.createdAt).toLocaleDateString('id-ID') : '-'}</td>
                    <td className="py-2.5 px-3 whitespace-nowrap"><ActionButtons y={y} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="bg-[#2a2a2a] border-yellow-400/20 max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-yellow-400" /> Detail Yayasan
            </DialogTitle>
          </DialogHeader>
          {loadingDetail ? (
            <div className="py-4"><TableSkeleton rows={4} cols={3} /></div>
          ) : detailYayasan && (
            <div className="space-y-5">
              {/* Info */}
              <div className="p-4 bg-[#1a1a1a] rounded-lg">
                <h4 className="text-yellow-400 font-semibold mb-3 text-sm">Informasi Yayasan</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-gray-500 text-xs">Nama</p><p className="text-white">{detailYayasan.name}</p></div>
                  <div><p className="text-gray-500 text-xs">Email</p><p className="text-white break-all">{detailYayasan.email}</p></div>
                  <div>
                    <p className="text-gray-500 text-xs">Kode Referral</p>
                    <code className="text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded text-xs">{detailYayasan.referralCode}</code>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Mitra Terafiliasi</p>
                    <p className="text-yellow-400 flex items-center gap-1"><Handshake className="w-3 h-3" />{detailYayasan.mitraName || '-'}</p>
                  </div>
                  <div><p className="text-gray-500 text-xs">Harga Test</p><p className="text-green-400 font-medium">{formatCurrency(detailYayasan.totalPrice || detailYayasan.referralPrice || 0)}</p></div>
                  <div><p className="text-gray-500 text-xs">Bergabung</p><p className="text-white">{detailYayasan.createdAt ? new Date(detailYayasan.createdAt).toLocaleDateString('id-ID') : '-'}</p></div>
                  <div><p className="text-gray-500 text-xs">Bagi Hasil Yayasan</p><p className="text-blue-400">{formatCurrency(detailYayasan.yayasanShare || 0)} / user</p></div>
                  <div><p className="text-gray-500 text-xs">Bagi Hasil Mitra</p><p className="text-purple-400">{formatCurrency(detailYayasan.mitraShare || 0)} / user</p></div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Total Registrasi', value: detailStats.totalRegistered || 0, color: 'text-blue-400' },
                  { label: 'Sudah Tes', value: detailStats.sudahTes || 0, color: 'text-green-400' },
                  { label: 'Bayar, Belum Tes', value: detailStats.sudahBayarBelumTes || 0, color: 'text-yellow-400' },
                  { label: 'Belum Bayar', value: detailStats.belumBayar || 0, color: 'text-red-400' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="p-3 bg-[#1a1a1a] rounded-lg text-center">
                    <p className={`font-bold text-2xl ${color}`}>{value}</p>
                    <p className="text-gray-500 text-xs mt-1">{label}</p>
                  </div>
                ))}
              </div>

              {/* Revenue */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 bg-[#1a1a1a] rounded-lg flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                  <div>
                    <p className="text-gray-500 text-xs">Total Revenue Yayasan</p>
                    <p className="text-yellow-400 font-bold text-lg">{formatCurrency(detailYayasan.totalRevenue || 0)}</p>
                  </div>
                </div>
                <div className="p-4 bg-[#1a1a1a] rounded-lg flex items-center gap-3">
                  <UserCheck className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <div>
                    <p className="text-gray-500 text-xs">Bagian Yayasan</p>
                    <p className="text-green-400 font-bold text-lg">{formatCurrency(detailYayasan.yayasanRevenue || 0)}</p>
                  </div>
                </div>
              </div>

              {/* User list */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-yellow-400 font-semibold text-sm">Daftar User ({detailUsers.length || 0})</h4>
                  <Input
                    placeholder="Cari nama / email..."
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    className="w-44 bg-[#1a1a1a] border-yellow-400/20 text-white text-xs h-8"
                  />
                </div>
                {/* Mobile user cards */}
                <div className="sm:hidden space-y-2">
                  {filteredUsers.length === 0 ? (
                    <p className="text-center text-gray-500 text-sm py-4">Tidak ada user ditemukan</p>
                  ) : filteredUsers.map(u => (
                    <div key={u._id} className="p-3 bg-[#1a1a1a] rounded-lg">
                      <p className="text-white font-medium text-sm">{u.fullName}</p>
                      <p className="text-gray-500 text-xs mb-2">{u.email}</p>
                      <div className="flex gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded text-xs ${payColor(u.paymentStatus)}`}>{payLabel(u.paymentStatus)}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${testColor(u.paidTestStatus)}`}>{testLabel(u.paidTestStatus)}</span>
                        <span className="text-gray-500 text-xs">{u.createdAt ? new Date(u.createdAt).toLocaleDateString('id-ID') : '-'}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Desktop user table */}
                <div className="hidden sm:block rounded-lg overflow-hidden border border-yellow-400/10">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#1a1a1a] text-gray-400 text-xs">
                        <th className="text-left py-2 px-3">Nama</th>
                        <th className="text-left py-2 px-3">Email</th>
                        <th className="text-center py-2 px-3">Status Bayar</th>
                        <th className="text-center py-2 px-3">Status Tes</th>
                        <th className="text-right py-2 px-3">Tgl Daftar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.length === 0 ? (
                        <tr><td colSpan={5} className="text-center text-gray-500 py-6 text-xs">Tidak ada user ditemukan</td></tr>
                      ) : filteredUsers.map(u => (
                        <tr key={u._id} className="border-t border-yellow-400/10 hover:bg-[#333]">
                          <td className="py-2 px-3 text-white font-medium">{u.fullName}</td>
                          <td className="py-2 px-3 text-gray-400 text-xs">{u.email}</td>
                          <td className="py-2 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-xs ${payColor(u.paymentStatus)}`}>{payLabel(u.paymentStatus)}</span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-xs ${testColor(u.paidTestStatus)}`}>{testLabel(u.paidTestStatus)}</span>
                          </td>
                          <td className="py-2 px-3 text-right text-gray-400 text-xs">
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString('id-ID') : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
