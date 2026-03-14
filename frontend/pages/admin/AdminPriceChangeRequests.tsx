// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { CheckCircle, Clock, Handshake, Loader2, XCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { useToast } from '../../hooks/use-toast';
import PageHeader from '../../components/ui/page-header';
import LoadingSpinner from '../../components/ui/loading-spinner';
import { mitraAPI } from '../../services/api';
import { getApiErrorMessage } from '../../services/api-error';
import { formatCurrency } from '../../lib/utils';

export default function AdminPriceChangeRequests() {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [reviewForm, setReviewForm] = useState({ status: 'APPROVED', reviewNote: '' });

  useEffect(() => {
    void loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const response = await mitraAPI.getAdminPriceChangeRequests();
      setItems(response.data || []);
    } catch (error) {
      toast({ title: 'Gagal memuat data', description: getApiErrorMessage(error, 'Permintaan ubah harga belum bisa dimuat.'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const openReview = (item, status) => {
    setSelected(item);
    setReviewForm({ status, reviewNote: '' });
    setReviewOpen(true);
  };

  const submitReview = async () => {
    if (!selected) return;
    setReviewing(true);
    try {
      await mitraAPI.reviewAdminPriceChangeRequest(selected._id, reviewForm);
      toast({ title: 'Review tersimpan', description: 'Status permintaan berhasil diperbarui.' });
      setReviewOpen(false);
      await loadItems();
    } catch (error) {
      toast({ title: 'Gagal menyimpan review', description: getApiErrorMessage(error, 'Review belum bisa disimpan.'), variant: 'destructive' });
    } finally {
      setReviewing(false);
    }
  };

  if (loading) return <LoadingSpinner size="lg" text="Memuat permintaan ubah harga..." className="min-h-[60vh]" />;

  return (
    <div className="space-y-6">
      <PageHeader icon={Handshake} title="Permintaan Ubah Harga" description="Review permintaan revisi komisi yayasan dari mitra." />
      <Card className="bg-[#2a2a2a] border-yellow-400/20">
        <CardContent className="p-0">
          {items.length === 0 ? (
            <p className="py-12 text-center text-gray-400">Belum ada permintaan ubah harga.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-yellow-400/20 text-gray-400">
                    <th className="px-4 py-3 text-left">Mitra</th>
                    <th className="px-4 py-3 text-left">Yayasan</th>
                    <th className="px-4 py-3 text-left">Komisi Saat Ini</th>
                    <th className="px-4 py-3 text-left">Komisi Usulan</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item._id} className="border-b border-yellow-400/10 hover:bg-[#333]">
                      <td className="px-4 py-3"><p className="text-white">{item.mitraName}</p><p className="text-xs text-gray-400">{item.mitraEmail}</p></td>
                      <td className="px-4 py-3"><p className="text-white">{item.yayasanName}</p><p className="text-xs text-gray-400">{item.yayasanEmail}</p></td>
                      <td className="px-4 py-3 text-gray-300">{formatCurrency(item.currentYayasanShare || 0)} / {formatCurrency(item.currentMitraShare || 0)}</td>
                      <td className="px-4 py-3 text-yellow-400">{formatCurrency(item.requestedYayasanShare || 0)} / {formatCurrency(item.requestedMitraShare || 0)}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-1 text-xs ${item.status === 'approved' ? 'bg-green-400/15 text-green-400' : item.status === 'rejected' ? 'bg-red-400/15 text-red-400' : 'bg-yellow-400/15 text-yellow-400'}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {item.status === 'pending' ? (
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" className="bg-green-500 text-white hover:bg-green-600" onClick={() => openReview(item, 'APPROVED')}><CheckCircle className="mr-2 h-4 w-4" />Approve</Button>
                            <Button size="sm" variant="outline" className="border-red-400/40 text-red-400" onClick={() => openReview(item, 'REJECTED')}><XCircle className="mr-2 h-4 w-4" />Reject</Button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Sudah direview</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="bg-[#2a2a2a] border-yellow-400/20 max-w-xl">
          <DialogHeader><DialogTitle className="text-white">Review Permintaan Ubah Harga</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="rounded-lg bg-[#1a1a1a] p-4 text-sm text-gray-300">
                <p>Mitra: <span className="text-white">{selected.mitraName}</span></p>
                <p>Yayasan: <span className="text-white">{selected.yayasanName}</span></p>
                <p>Komisi saat ini: <span className="text-white">{formatCurrency(selected.currentYayasanShare || 0)} / {formatCurrency(selected.currentMitraShare || 0)}</span></p>
                <p>Komisi usulan: <span className="text-yellow-400">{formatCurrency(selected.requestedYayasanShare || 0)} / {formatCurrency(selected.requestedMitraShare || 0)}</span></p>
                <p className="mt-3 text-xs text-gray-400">Alasan: {selected.reason || '-'}</p>
              </div>
              <div>
                <Label className="text-gray-400">Status Review</Label>
                <Input readOnly value={reviewForm.status} className="mt-1 border-yellow-400/20 bg-[#1a1a1a] text-white" />
              </div>
              <div>
                <Label className="text-gray-400">Catatan Review</Label>
                <Textarea value={reviewForm.reviewNote} onChange={(event) => setReviewForm((prev) => ({ ...prev, reviewNote: event.target.value }))} className="mt-1 min-h-[120px] border-yellow-400/30 bg-[#1a1a1a] text-white" />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" className="border-yellow-400/30 text-yellow-400" onClick={() => setReviewOpen(false)}>Batal</Button>
                <Button onClick={() => void submitReview()} disabled={reviewing} className={reviewForm.status === 'APPROVED' ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-red-500 text-white hover:bg-red-600'}>
                  {reviewing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Clock className="mr-2 h-4 w-4" />}
                  Simpan Review
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
