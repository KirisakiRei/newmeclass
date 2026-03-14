// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { ArrowDownToLine, CheckCircle, XCircle, Clock, Building2, DollarSign, Hourglass } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { useToast } from '../../hooks/use-toast';
import PageHeader from '../../components/ui/page-header';
import StatsGrid from '../../components/ui/stats-grid';
import LoadingSpinner from '../../components/ui/loading-spinner';
import EmptyState from '../../components/ui/empty-state';
import { formatCurrency } from '../../lib/utils';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function AdminWithdrawals() {
  const { toast } = useToast();
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [actionType, setActionType] = useState('approve');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const token = () => localStorage.getItem('admin_token');
  const headers = () => ({ Authorization: `Bearer ${token()}` });

  useEffect(() => { loadWithdrawals(); }, []);

  const loadWithdrawals = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/yayasan/admin/withdrawals`, { headers: headers() });
      setWithdrawals(res.data);
    } catch (e) {
      console.error('Error loading withdrawals:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (item, type) => {
    setSelectedItem(item);
    setActionType(type);
    setNotes('');
    setShowDialog(true);
  };

  const confirmAction = async () => {
    if (!selectedItem) return;
    setProcessing(true);
    try {
      await axios.put(
        `${API_URL}/api/yayasan/admin/withdrawals/${selectedItem._id}/approve`,
        { status: actionType === 'approve' ? 'approved' : 'rejected', notes },
        { headers: headers() }
      );
      toast({
        title: 'Berhasil',
        description: `Penarikan ${actionType === 'approve' ? 'disetujui' : 'ditolak'}`
      });
      setShowDialog(false);
      loadWithdrawals();
    } catch (e) {
      toast({
        title: 'Error',
        description: e?.response?.data?.detail || 'Gagal memproses',
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
    }
  };

  const stats = {
    total: withdrawals.length,
    pending: withdrawals.filter(w => w.status === 'pending').length,
    approved: withdrawals.filter(w => w.status === 'approved').length,
    totalAmount: withdrawals.filter(w => w.status === 'approved').reduce((sum, w) => sum + (w.amount || 0), 0)
  };
  const selectedAmount = selectedItem?.amount || 0;
  const selectedBankName = selectedItem?.bankName || '-';
  const selectedBankAccount = selectedItem?.bankAccount || '-';

  if (loading) {
    return <LoadingSpinner size="lg" text="Memuat data penarikan..." className="min-h-[60vh]" />;
  }

  return (
    <div className="space-y-6" data-testid="admin-withdrawals">
      <PageHeader icon={ArrowDownToLine} title="Penarikan Yayasan" description="Kelola permintaan penarikan dari yayasan" />

      {/* Stats */}
      <StatsGrid stats={[
        { label: 'Total Request', value: stats.total, icon: ArrowDownToLine, iconBg: 'bg-white/10', iconColor: 'text-white' },
        { label: 'Pending', value: stats.pending, icon: Clock, iconBg: 'bg-yellow-400/10', iconColor: 'text-yellow-400', valueColor: 'text-yellow-400' },
        { label: 'Disetujui', value: stats.approved, icon: CheckCircle, iconBg: 'bg-green-400/10', iconColor: 'text-green-400', valueColor: 'text-green-400' },
        { label: 'Total Dicairkan', value: formatCurrency(stats.totalAmount), icon: DollarSign, iconBg: 'bg-blue-400/10', iconColor: 'text-blue-400', valueColor: 'text-blue-400' },
      ]} />

      {/* List */}
      <Card className="bg-[#2a2a2a] border-yellow-400/20">
        <CardHeader>
          <CardTitle className="text-white">Daftar Permintaan Penarikan</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {withdrawals.length === 0 ? (
            <EmptyState icon="package" title="Belum ada permintaan" description="Belum ada permintaan penarikan dari yayasan" />
          ) : (
            <div className="divide-y divide-yellow-400/10">
              {withdrawals.map((w) => (
                <div key={w._id} className="p-4 hover:bg-[#333]">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-yellow-400/20 rounded-full flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5 text-yellow-400" />
                      </div>
                      <div>
                        <p className="text-white font-semibold">{w.yayasanName || 'Yayasan'}</p>
                        <p className="text-gray-400 text-xs">{w.yayasanEmail}</p>
                        <div className="flex gap-4 mt-2 text-xs text-gray-400">
                          <span>Bank: <strong className="text-white">{w.bankName}</strong></span>
                          <span>Rek: <strong className="text-white">{w.bankAccount}</strong></span>
                          <span>a/n: <strong className="text-white">{w.accountName}</strong></span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-yellow-400">{formatCurrency(w.amount)}</p>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs mt-1 ${
                        w.status === 'pending' ? 'bg-yellow-400/20 text-yellow-400' :
                        w.status === 'approved' ? 'bg-green-400/20 text-green-400' :
                        'bg-red-400/20 text-red-400'
                      }`}>
                        {w.status === 'pending' && <Clock className="w-3 h-3" />}
                        {w.status === 'approved' && <CheckCircle className="w-3 h-3" />}
                        {w.status === 'rejected' && <XCircle className="w-3 h-3" />}
                        {w.status === 'pending' ? 'Menunggu' : w.status === 'approved' ? 'Disetujui' : 'Ditolak'}
                      </span>
                      <p className="text-gray-500 text-xs mt-1">
                        {w.createdAt ? new Date(w.createdAt).toLocaleDateString('id-ID') : '-'}
                      </p>
                    </div>
                  </div>

                  {w.status === 'pending' && (
                    <div className="flex gap-2 mt-3 justify-end">
                      <Button
                        size="sm"
                        onClick={() => handleAction(w, 'approve')}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" /> Setujui
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleAction(w, 'reject')}
                        variant="destructive"
                      >
                        <XCircle className="w-4 h-4 mr-1" /> Tolak
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-[#2a2a2a] border-yellow-400/20">
          <DialogHeader>
            <DialogTitle className="text-white">
              {actionType === 'approve' ? 'Setujui' : 'Tolak'} Penarikan
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {actionType === 'approve' ?
                 `Setujui penarikan ${formatCurrency(selectedAmount)} ke rekening ${selectedBankName} - ${selectedBankAccount}`
                : 'Berikan alasan penolakan penarikan ini.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label className="text-gray-400">Catatan (opsional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={actionType === 'reject' ? 'Alasan penolakan...' : 'Catatan tambahan...'}
                className="bg-[#1a1a1a] border-yellow-400/30 text-white mt-1"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <Button
              onClick={confirmAction}
              disabled={processing}
              className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {processing ? 'Memproses...' : 'Konfirmasi'}
            </Button>
            <Button variant="outline" onClick={() => setShowDialog(false)} className="border-yellow-400 text-yellow-400">
              Batal
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
