// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Handshake, CheckCircle, ToggleLeft, ToggleRight, Users, ShieldCheck, Building2, KeyRound, Eye, ChevronDown, ChevronUp, TrendingUp, Wallet, UserCheck } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { useToast } from '../../hooks/use-toast';
import PageHeader from '../../components/ui/page-header';
import StatsGrid from '../../components/ui/stats-grid';
import LoadingSpinner, { TableSkeleton } from '../../components/ui/loading-spinner';
import { formatCurrency } from '../../lib/utils';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function AdminMitra() {
  const { toast } = useToast();
  const [mitraList, setMitraList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openCard, setOpenCard] = useState(null);
  const [detailMitra, setDetailMitra] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const token = () => localStorage.getItem('admin_token');
  const headers = () => ({ Authorization: `Bearer ${token()}` });
  const detailYayasanList = Array.isArray(detailMitra?.yayasanDetails) ? detailMitra.yayasanDetails : [];

  useEffect(() => { loadMitra(); }, []);

  const loadMitra = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/mitra/admin/list`, { headers: headers() });
      setMitraList(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const toggleActive = async (id, current) => {
    try {
      await axios.put(`${API_URL}/api/mitra/admin/${id}/toggle-active`, {}, { headers: headers() });
      setMitraList(prev => prev.map(m => m._id === id ? { ...m, isActive: !current } : m));
      toast({ title: 'Berhasil', description: `Mitra ${!current ? 'diaktifkan' : 'dinonaktifkan'}` });
    } catch (e) {
      toast({ title: 'Error', description: 'Gagal mengubah status', variant: 'destructive' });
    }
  };

  const verify = async (id) => {
    try {
      await axios.put(`${API_URL}/api/mitra/admin/${id}/verify`, {}, { headers: headers() });
      setMitraList(prev => prev.map(m => m._id === id ? { ...m, isVerified: true } : m));
      toast({ title: 'Berhasil', description: 'Mitra diverifikasi' });
    } catch (e) {
      toast({ title: 'Error', description: 'Gagal verifikasi', variant: 'destructive' });
    }
  };

  const handleResetPassword = async (mitra) => {
    if (!window.confirm(`Reset password untuk ${mitra.name}`)) return;
    try {
      await axios.post(
        `${API_URL}/api/mitra/admin/${mitra._id}/reset-password`,
        {},
        { headers: headers() }
      );
      toast({ title: 'Berhasil', description: 'Link reset password telah dikirim' });
    } catch (e) {
      toast({ title: 'Error', description: 'Gagal mengirim reset password', variant: 'destructive' });
    }
  };

  const handleViewDetail = async (id) => {
    setShowDetail(true);
    setDetailMitra(null);
    setLoadingDetail(true);
    try {
      const res = await axios.get(`${API_URL}/api/mitra/admin/${id}/detail`, { headers: headers() });
      setDetailMitra(res.data);
    } catch (e) {
      toast({ title: 'Error', description: 'Gagal memuat detail mitra', variant: 'destructive' });
      setShowDetail(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const StatusBadges = ({ m }) => (
    <div className="flex gap-1 flex-wrap">
      <span className={`px-2 py-0.5 rounded text-xs ${m.isActive ? 'bg-green-400/20 text-green-400' : 'bg-red-400/20 text-red-400'}`}>
        {m.isActive ? 'Aktif' : 'Nonaktif'}
      </span>
      {m.isVerified ?
         <span className="px-2 py-0.5 rounded text-xs bg-blue-400/20 text-blue-400">Verified</span>
        : <span className="px-2 py-0.5 rounded text-xs bg-orange-400/20 text-orange-400">Unverified</span>
      }
    </div>
  );

  const ActionButtons = ({ m }) => (
    <div className="flex items-center gap-1 flex-nowrap">
      <Button size="sm" variant="ghost" onClick={() => handleViewDetail(m._id)}
        className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10" title="Lihat Detail">
        <Eye className="w-4 h-4" />
      </Button>
      {!m.isVerified && (
        <Button size="sm" variant="ghost" onClick={() => verify(m._id)}
          className="text-green-400 hover:text-green-300 hover:bg-green-400/10" title="Verifikasi">
          <CheckCircle className="w-4 h-4" />
        </Button>
      )}
      <Button size="sm" variant="ghost" onClick={() => toggleActive(m._id, m.isActive)}
        className={m.isActive ? 'text-green-400 hover:text-green-300 hover:bg-green-400/10' : 'text-red-400 hover:text-red-300 hover:bg-red-400/10'}
        title={m.isActive ? 'Nonaktifkan' : 'Aktifkan'}>
        {m.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => handleResetPassword(m)}
        className="text-purple-400 hover:text-purple-300 hover:bg-purple-400/10" title="Reset Password">
        <KeyRound className="w-4 h-4" />
      </Button>
    </div>
  );

  if (loading) return <LoadingSpinner size="lg" text="Memuat data mitra..." className="min-h-[60vh]" />;

  return (
    <div className="space-y-6">
      <PageHeader icon={Handshake} title="Manajemen Mitra" description="Kelola mitra (master agent) yang terdaftar di platform" />

      <StatsGrid stats={[
        { label: 'Total Mitra', value: mitraList.length, icon: Handshake, iconBg: 'bg-yellow-400/10', iconColor: 'text-yellow-400', valueColor: 'text-yellow-400' },
        { label: 'Terverifikasi', value: mitraList.filter(m => m.isVerified).length, icon: ShieldCheck, iconBg: 'bg-blue-400/10', iconColor: 'text-blue-400', valueColor: 'text-blue-400' },
        { label: 'Aktif', value: mitraList.filter(m => m.isActive).length, icon: Users, iconBg: 'bg-green-400/10', iconColor: 'text-green-400', valueColor: 'text-green-400' },
        { label: 'Total Yayasan', value: mitraList.reduce((sum, m) => sum + (m.yayasanCount || 0), 0), icon: Building2, iconBg: 'bg-purple-400/10', iconColor: 'text-purple-400', valueColor: 'text-purple-400' },
      ]} />

      <Card className="bg-[#2a2a2a] border-yellow-400/20">
        <CardContent className="p-0">
          {/* Accordion — below lg */}
          <div className="lg:hidden divide-y divide-yellow-400/10">
            {mitraList.length === 0 ? (
              <p className="text-center text-gray-400 py-8 px-4">Belum ada mitra terdaftar</p>
            ) : mitraList.map((m) => (
              <div key={m._id}>
                <button
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-[#333]"
                  onClick={() => setOpenCard(openCard === m._id ? null : m._id)}
                >
                  <div>
                    <p className="text-white font-medium">{m.name}</p>
                    <p className="text-gray-400 text-xs">{m.email}</p>
                    <div className="mt-1"><StatusBadges m={m} /></div>
                  </div>
                  {openCard === m._id ?
                     <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                </button>
                {openCard === m._id && (
                  <div className="px-4 pb-4 space-y-3 bg-[#1f1f1f]">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><p className="text-gray-500 text-xs">Telepon</p><p className="text-gray-300">{m.phone || '-'}</p></div>
                      <div>
                        <p className="text-gray-500 text-xs">Kode Undangan</p>
                        <code className="text-yellow-400 text-xs bg-yellow-400/10 px-1.5 py-0.5 rounded">{m.inviteCode || '-'}</code>
                      </div>
                      <div><p className="text-gray-500 text-xs">Yayasan</p><p className="text-blue-400 font-medium">{m.yayasanCount || 0}</p></div>
                      <div><p className="text-gray-500 text-xs">Bergabung</p><p className="text-gray-300">{m.createdAt ? new Date(m.createdAt).toLocaleDateString('id-ID') : '-'}</p></div>
                    </div>
                    <ActionButtons m={m} />
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
                  <th className="text-left py-3 px-3">Mitra</th>
                  <th className="text-left py-3 px-3 whitespace-nowrap">Kode Undangan</th>
                  <th className="text-left py-3 px-3 whitespace-nowrap">Yayasan</th>
                  <th className="text-left py-3 px-3 whitespace-nowrap">Status</th>
                  <th className="text-left py-3 px-3 whitespace-nowrap">Bergabung</th>
                  <th className="text-left py-3 px-3 whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {mitraList.length === 0 ? (
                  <tr><td colSpan={6} className="text-center text-gray-400 py-8">Belum ada mitra terdaftar</td></tr>
                ) : mitraList.map((m) => (
                  <tr key={m._id} className="border-b border-yellow-400/10 hover:bg-[#333]">
                    <td className="py-2.5 px-3">
                      <p className="text-white font-medium">{m.name}</p>
                      <p className="text-gray-400 text-xs">{m.email}</p>
                      <p className="text-gray-500 text-xs">{m.phone}</p>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <code className="text-yellow-400 text-xs bg-yellow-400/10 px-2 py-1 rounded">{m.inviteCode || '-'}</code>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="text-blue-400 font-medium">{m.yayasanCount || 0}</span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap"><StatusBadges m={m} /></td>
                    <td className="py-2.5 px-3 text-gray-400 text-xs whitespace-nowrap">
                      {m.createdAt ? new Date(m.createdAt).toLocaleDateString('id-ID') : '-'}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap"><ActionButtons m={m} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="bg-[#2a2a2a] border-yellow-400/20 max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Handshake className="w-5 h-5 text-yellow-400" /> Detail Mitra
            </DialogTitle>
          </DialogHeader>
          {loadingDetail ? (
            <div className="py-4"><TableSkeleton rows={4} cols={3} /></div>
          ) : detailMitra && (
            <div className="space-y-5">
              {/* Info */}
              <div className="p-4 bg-[#1a1a1a] rounded-lg">
                <h4 className="text-yellow-400 font-semibold mb-3 text-sm">Informasi Mitra</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-gray-500 text-xs">Nama</p><p className="text-white">{detailMitra.name}</p></div>
                  <div><p className="text-gray-500 text-xs">Email</p><p className="text-white break-all">{detailMitra.email}</p></div>
                  <div><p className="text-gray-500 text-xs">Telepon</p><p className="text-white">{detailMitra.phone || '-'}</p></div>
                  <div>
                    <p className="text-gray-500 text-xs">Kode Undangan</p>
                    <code className="text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded text-xs">{detailMitra.inviteCode}</code>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Status</p>
                    <div className="flex gap-1 mt-0.5">
                      <span className={`px-2 py-0.5 rounded text-xs ${detailMitra.isActive ? 'bg-green-400/20 text-green-400' : 'bg-red-400/20 text-red-400'}`}>
                        {detailMitra.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                      {detailMitra.isVerified && <span className="px-2 py-0.5 rounded text-xs bg-blue-400/20 text-blue-400">Verified</span>}
                    </div>
                  </div>
                  <div><p className="text-gray-500 text-xs">Bergabung</p><p className="text-white">{detailMitra.createdAt ? new Date(detailMitra.createdAt).toLocaleDateString('id-ID') : '-'}</p></div>
                  {detailMitra.address && <div className="col-span-2"><p className="text-gray-500 text-xs">Alamat</p><p className="text-white">{detailMitra.address}</p></div>}
                  {detailMitra.description && <div className="col-span-2"><p className="text-gray-500 text-xs">Deskripsi</p><p className="text-gray-300 text-xs">{detailMitra.description}</p></div>}
                </div>
              </div>

              {/* Summary stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Total Yayasan', value: detailMitra.totalYayasan || 0, color: 'text-purple-400', icon: Building2 },
                  { label: 'Total User', value: detailMitra.totalUsers || 0, color: 'text-blue-400', icon: Users },
                  { label: 'Sudah Tes', value: detailMitra.sudahTes || 0, color: 'text-green-400', icon: UserCheck },
                  { label: 'Belum Bayar', value: detailMitra.registBelumBayar || 0, color: 'text-red-400', icon: Users },
                ].map(({ label, value, color, icon: Icon }) => (
                  <div key={label} className="p-3 bg-[#1a1a1a] rounded-lg text-center">
                    <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
                    <p className={`font-bold text-xl ${color}`}>{value}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              {/* Per yayasan recap */}
              <div>
                <h4 className="text-yellow-400 font-semibold mb-2 text-sm">Rekap per Yayasan</h4>
                {/* Mobile */}
                <div className="sm:hidden space-y-2">
                  {detailYayasanList.map(y => (
                    <div key={y._id} className="p-3 bg-[#1a1a1a] rounded-lg">
                      <p className="text-white font-medium text-sm mb-1">{y.name}</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                        <div><span className="text-gray-500">Sudah Tes</span><p className="text-green-400 font-medium">{y.sudahTes}</p></div>
                        <div><span className="text-gray-500">Regis Belum Tes</span><p className="text-yellow-400 font-medium">{y.registBelumTes}</p></div>
                        <div><span className="text-gray-500">Belum Bayar</span><p className="text-red-400 font-medium">{y.registBelumBayar}</p></div>
                        <div><span className="text-gray-500">Revenue</span><p className="text-yellow-400 font-medium">{formatCurrency(y.revenue)}</p></div>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Desktop */}
                <div className="hidden sm:block rounded-lg overflow-hidden border border-yellow-400/10">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#1a1a1a] text-gray-400 text-xs">
                        <th className="text-left py-2 px-3">Yayasan</th>
                        <th className="text-center py-2 px-3">Sudah Tes</th>
                        <th className="text-center py-2 px-3">Regis Belum Tes</th>
                        <th className="text-center py-2 px-3">Belum Bayar</th>
                        <th className="text-right py-2 px-3">Revenue Mitra</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailYayasanList.map(y => (
                        <tr key={y._id} className="border-t border-yellow-400/10">
                          <td className="py-2 px-3">
                            <p className="text-white">{y.name}</p>
                            <p className="text-gray-500 text-xs">{y.email}</p>
                          </td>
                          <td className="py-2 px-3 text-center text-green-400 font-medium">{y.sudahTes}</td>
                          <td className="py-2 px-3 text-center text-yellow-400 font-medium">{y.registBelumTes}</td>
                          <td className="py-2 px-3 text-center text-red-400 font-medium">{y.registBelumBayar}</td>
                          <td className="py-2 px-3 text-right text-yellow-400 font-medium">{formatCurrency(y.revenue)}</td>
                        </tr>
                      ))}
                      {detailYayasanList.length > 1 && (
                        <tr className="border-t-2 border-yellow-400/30 bg-[#1a1a1a]">
                          <td className="py-2 px-3 text-gray-400 font-semibold text-xs">TOTAL</td>
                          <td className="py-2 px-3 text-center text-green-400 font-bold">{detailMitra.sudahTes}</td>
                          <td className="py-2 px-3 text-center text-yellow-400 font-bold">{detailMitra.registBelumTes}</td>
                          <td className="py-2 px-3 text-center text-red-400 font-bold">{detailMitra.registBelumBayar}</td>
                          <td className="py-2 px-3 text-right text-yellow-400 font-bold">{formatCurrency(detailMitra.totalRevenue)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Revenue & Wallet */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 bg-[#1a1a1a] rounded-lg flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                  <div>
                    <p className="text-gray-500 text-xs">Total Revenue (semua yayasan)</p>
                    <p className="text-yellow-400 font-bold text-lg">{formatCurrency(detailMitra.totalRevenue || 0)}</p>
                  </div>
                </div>
                <div className="p-4 bg-[#1a1a1a] rounded-lg flex items-center gap-3">
                  <Wallet className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <div>
                    <p className="text-gray-500 text-xs">Saldo Wallet</p>
                    <p className="text-green-400 font-bold text-lg">{formatCurrency(detailMitra.walletBalance || 0)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
