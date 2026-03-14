// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Eye, Clock, DollarSign, CreditCard, PieChart, Handshake, Building2, Landmark } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { useToast } from '../../hooks/use-toast';
import { adminAPI } from '../../services/api';
import axios from 'axios';
import PageHeader from '../../components/ui/page-header';
import StatsGrid from '../../components/ui/stats-grid';
import LoadingSpinner from '../../components/ui/loading-spinner';
import EmptyState from '../../components/ui/empty-state';
import { formatCurrency, formatDateTime } from '../../lib/utils';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Payments = () => {
  const { toast } = useToast();
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionType, setActionType] = useState(''); // 'approve' or 'reject'

  useEffect(() => {
    loadPayments();
    loadStats();
  }, []);

  const loadPayments = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await axios.get(`${API_URL}/api/payments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPayments(response.data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Gagal memuat data pembayaran',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await axios.get(`${API_URL}/api/payments/stats/summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleApprove = (payment) => {
    setSelectedPayment(payment);
    setActionType('approve');
    setShowDialog(true);
  };

  const handleReject = (payment) => {
    setSelectedPayment(payment);
    setActionType('reject');
    setShowDialog(true);
  };

  const confirmAction = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      await axios.put(
        `${API_URL}/api/payments/${selectedPayment._id}/approve`,
        {
          status: actionType === 'approve' ? 'approved' : 'rejected',
          rejectionReason: actionType === 'reject' ? rejectionReason : null
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast({
        title: 'Berhasil!',
        description: `Pembayaran berhasil ${actionType === 'approve' ? 'disetujui' : 'ditolak'}`,
      });

      setShowDialog(false);
      setRejectionReason('');
      loadPayments();
      loadStats();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Gagal memproses pembayaran',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return <LoadingSpinner size="lg" text="Memuat pembayaran..." className="min-h-[60vh]" />;
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <StatsGrid stats={[
          { label: 'Total Pembayaran', value: stats.total, icon: CreditCard, iconBg: 'bg-yellow-400/10', iconColor: 'text-yellow-400' },
          { label: 'Pending', value: stats.pending, icon: Clock, iconBg: 'bg-yellow-400/10', iconColor: 'text-yellow-400', valueColor: 'text-yellow-400' },
          { label: 'Disetujui', value: stats.approved, icon: CheckCircle, iconBg: 'bg-green-400/10', iconColor: 'text-green-400', valueColor: 'text-green-400' },
          { label: 'Total Revenue', value: formatCurrency(stats.totalRevenue), icon: DollarSign, iconBg: 'bg-green-400/10', iconColor: 'text-green-400' },
        ]} />
      )}

      {/* Payments List */}
      <Card className="bg-[#2a2a2a] border-yellow-400/20">
        <CardHeader>
          <CardTitle className="text-white">Daftar Pembayaran</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {payments.length === 0 ? (
              <EmptyState icon="default" title="Belum ada pembayaran" description="Data pembayaran akan muncul di sini" />
            ) : (
              payments.map((payment) => (
                <div key={payment._id} className="bg-[#1a1a1a] p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-white font-semibold">{payment.userName}</h3>
                      <p className="text-gray-400 text-sm">{payment.userEmail}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {payment.status === 'pending' && (
                        <span className="flex items-center space-x-1 text-yellow-400 text-sm">
                          <Clock className="w-4 h-4" />
                          <span>Pending</span>
                        </span>
                      )}
                      {payment.status === 'approved' && (
                        <span className="flex items-center space-x-1 text-green-400 text-sm">
                          <CheckCircle className="w-4 h-4" />
                          <span>Disetujui</span>
                        </span>
                      )}
                      {payment.status === 'rejected' && (
                        <span className="flex items-center space-x-1 text-red-400 text-sm">
                          <XCircle className="w-4 h-4" />
                          <span>Ditolak</span>
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                    <div>
                      <span className="text-gray-500">Jumlah:</span>
                      <span className="text-white ml-2 font-semibold">{formatCurrency(payment.paymentAmount)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Metode:</span>
                      <span className="text-white ml-2">{payment.paymentMethod}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Tanggal:</span>
                      <span className="text-white ml-2">{formatDateTime(payment.uploadedAt)}</span>
                    </div>
                    {payment.referralSource && (
                      <div>
                        <span className="text-gray-500">Sumber:</span>
                        <span className="text-white ml-2">{payment.referralSource === 'mitra' ? 'Via Mitra' : 'Langsung'}</span>
                      </div>
                    )}
                  </div>

                  {/* Komisi Breakdown */}
                  {payment.status === 'approved' && payment.commission && (
                    <div className="bg-[#2a2a2a] rounded-lg p-3 mb-3 border border-yellow-400/10">
                      <div className="flex items-center space-x-2 mb-2">
                        <PieChart className="w-4 h-4 text-yellow-400" />
                        <span className="text-yellow-400 text-sm font-semibold">Distribusi Komisi</span>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div className="flex items-center space-x-2">
                          <Landmark className="w-3.5 h-3.5 text-yellow-400" />
                          <div>
                            <p className="text-gray-500 text-xs">NEWME</p>
                            <p className="text-yellow-400 font-semibold">{formatCurrency(payment.commission.newmeShare || 100000)}</p>
                          </div>
                        </div>
                        {payment.commission.mitraShare > 0 && (
                          <div className="flex items-center space-x-2">
                            <Handshake className="w-3.5 h-3.5 text-purple-400" />
                            <div>
                              <p className="text-gray-500 text-xs">Mitra{payment.commission.mitraName ? ` (${payment.commission.mitraName})` : ''}</p>
                              <p className="text-purple-400 font-semibold">{formatCurrency(payment.commission.mitraShare)}</p>
                            </div>
                          </div>
                        )}
                        {payment.commission.yayasanShare > 0 && (
                          <div className="flex items-center space-x-2">
                            <Building2 className="w-3.5 h-3.5 text-blue-400" />
                            <div>
                              <p className="text-gray-500 text-xs">Yayasan{payment.commission.yayasanName ? ` (${payment.commission.yayasanName})` : ''}</p>
                              <p className="text-blue-400 font-semibold">{formatCurrency(payment.commission.yayasanShare)}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {payment.notes && (
                    <p className="text-gray-400 text-sm mb-3">Catatan: {payment.notes}</p>
                  )}

                  <div className="flex items-center space-x-3">
                    <a 
                      href={`${API_URL}${payment.paymentProofUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-yellow-400 hover:text-yellow-500 text-sm flex items-center space-x-1"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Lihat Bukti</span>
                    </a>
                    
                    {payment.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(payment)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Setujui
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleReject(payment)}
                          variant="destructive"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Tolak
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-[#2a2a2a] border-yellow-400/20">
          <DialogHeader>
            <DialogTitle className="text-white">
              {actionType === 'approve' ? 'Setujui' : 'Tolak'} Pembayaran
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {actionType === 'approve' ?
                 'Apakah Anda yakin ingin menyetujui pembayaran ini User akan mendapatkan akses ke tes.'
                : 'Berikan alasan penolakan pembayaran ini.'}
            </DialogDescription>
          </DialogHeader>
          
          {actionType === 'reject' && (
            <div className="space-y-2">
              <Label htmlFor="reason" className="text-white">Alasan Penolakan</Label>
              <Textarea
                id="reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Masukkan alasan penolakan..."
                className="bg-[#1a1a1a] border-yellow-400/30 text-white"
              />
            </div>
          )}

          <div className="flex space-x-3">
            <Button
              onClick={confirmAction}
              className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              Konfirmasi
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              className="border-yellow-400 text-yellow-400"
            >
              Batal
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Payments;
