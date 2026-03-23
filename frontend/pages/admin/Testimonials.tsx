// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, MessageSquare, Star, ArrowUp, ArrowDown, Eye, EyeOff } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Card, CardContent } from '../../components/ui/card';
import { useToast } from '../../hooks/use-toast';
import PageHeader from '../../components/ui/page-header';
import LoadingSpinner, { CardGridSkeleton } from '../../components/ui/loading-spinner';
import SharedImageUploader from '../../components/admin/SharedImageUploader.jsx';
import { websiteContentAPI } from '../../services/api';
import { useAdminAccess } from '../../lib/admin-rbac';

const EMPTY = {
  name: '', organization: '', role: '', imageUrl: '',
  text: '', rating: 5, isActive: true,
};

const StarRating = ({ value, onChange }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map((star) => (
      <button key={star} type="button" onClick={() => onChange(star)}>
        <Star className={`w-5 h-5 transition-colors ${star <= value ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} />
      </button>
    ))}
  </div>
);

const TestimonialModal = ({ item, onSave, onClose }) => {
  const [form, setForm] = useState({ ...EMPTY, ...item });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast({ title: 'Nama harus diisi', variant: 'destructive' }); return; }
    if (!form.text.trim()) { toast({ title: 'Testimoni harus diisi', variant: 'destructive' }); return; }
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div className="bg-[#2a2a2a] rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl border border-yellow-400/20" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-yellow-400/20">
          <h2 className="text-white font-bold text-lg">{item._id ? 'Edit Testimonial' : 'Tambah Testimonial'}</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex gap-4 items-start">
            <div>
              <Label className="text-white mb-2 block">Foto</Label>
              <SharedImageUploader value={form.imageUrl} onChange={(url) => set('imageUrl', url)} category="testimonials" size="sm" placeholder="Upload foto" />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <Label className="text-white mb-1.5 block">Nama *</Label>
                <Input value={form.name} onChange={(e) => set('name', e.target.value)} className="bg-[#1a1a1a] border-yellow-400/30 text-white" placeholder="Nama lengkap" required />
              </div>
              <div>
                <Label className="text-white mb-1.5 block">Role / Jabatan</Label>
                <Input value={form.role} onChange={(e) => set('role', e.target.value)} className="bg-[#1a1a1a] border-yellow-400/30 text-white" placeholder="Mahasiswa, Guru, dll" />
              </div>
              <div>
                <Label className="text-white mb-1.5 block">Organisasi / Instansi</Label>
                <Input value={form.organization} onChange={(e) => set('organization', e.target.value)} className="bg-[#1a1a1a] border-yellow-400/30 text-white" placeholder="Universitas, Sekolah, Perusahaan" />
              </div>
            </div>
          </div>

          <div>
            <Label className="text-white mb-1.5 block">Isi Testimoni *</Label>
            <Textarea value={form.text} onChange={(e) => set('text', e.target.value)} className="bg-[#1a1a1a] border-yellow-400/30 text-white resize-none" rows={4} placeholder="Tuliskan testimoni..." required />
          </div>

          <div>
            <Label className="text-white mb-2 block">Rating</Label>
            <StarRating value={form.rating} onChange={(v) => set('rating', v)} />
          </div>

          <div className="flex items-center gap-3">
            <button type="button" onClick={() => set('isActive', !form.isActive)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.isActive ? 'bg-yellow-400' : 'bg-gray-600'}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
            <span className="text-gray-300 text-sm">{form.isActive ? 'Tampil di Website' : 'Disembunyikan'}</span>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={saving} className="bg-yellow-400 text-black hover:bg-yellow-500 flex-1">
              {saving ? 'Menyimpan...' : <><Save className="w-4 h-4 mr-2" /> Simpan</>}
            </Button>
            <Button type="button" onClick={onClose} variant="outline" className="border-gray-500 text-gray-300">
              <X className="w-4 h-4 mr-2" /> Batal
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Testimonials = () => {
  const { toast } = useToast();
  const adminAccess = useAdminAccess();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const canCreateTestimonial = adminAccess.hasPermission('testimonials.create');
  const canEditTestimonial = adminAccess.hasPermission('testimonials.edit');
  const canDeleteTestimonial = adminAccess.hasPermission('testimonials.delete');
  const canManageTestimonial = adminAccess.hasPermission('testimonials.manage');

  const load = async () => {
    setLoading(true);
    try {
      const res = await websiteContentAPI.getTestimonials();
      setItems(res.data || []);
    } catch {
      toast({ title: 'Gagal memuat data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (form) => {
    if (form._id ? !canEditTestimonial : !canCreateTestimonial) return;
    try {
      if (form._id) {
        await websiteContentAPI.updateTestimonial(form._id, form);
        toast({ title: 'Testimonial diperbarui' });
      } else {
        await websiteContentAPI.createTestimonial({ ...form, order: items.length + 1 });
        toast({ title: 'Testimonial ditambahkan' });
      }
      setModal(null);
      load();
    } catch {
      toast({ title: 'Gagal menyimpan', variant: 'destructive' });
    }
  };

  const handleDelete = async (id) => {
    if (!canDeleteTestimonial) return;
    if (!window.confirm('Hapus testimonial ini')) return;
    try {
      await websiteContentAPI.deleteTestimonial(id);
      toast({ title: 'Testimonial dihapus' });
      load();
    } catch {
      toast({ title: 'Gagal menghapus', variant: 'destructive' });
    }
  };

  const handleToggleActive = async (item) => {
    if (!canManageTestimonial) return;
    try {
      const updated = { ...item, isActive: !item.isActive };
      await websiteContentAPI.updateTestimonial(item._id, updated);
      setItems((prev) => prev.map((row) => (row._id === item._id ? updated : row)));
      toast({ title: `Testimonial ${updated.isActive ? 'ditampilkan' : 'disembunyikan'}` });
    } catch {
      toast({ title: 'Gagal mengubah visibilitas', variant: 'destructive' });
    }
  };

  const handleMove = async (index, direction) => {
    if (!canManageTestimonial) return;
    const arr = [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const swapIdx = direction === 'up' ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= arr.length) return;
    const tempOrder = arr[index].order ?? index + 1;
    arr[index] = { ...arr[index], order: arr[swapIdx].order ?? swapIdx + 1 };
    arr[swapIdx] = { ...arr[swapIdx], order: tempOrder };
    const reordered = [...arr].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    setItems(reordered);
    try {
      await Promise.all([
        websiteContentAPI.updateTestimonial(reordered[index]._id, reordered[index]),
        websiteContentAPI.updateTestimonial(reordered[swapIdx]._id, reordered[swapIdx]),
      ]);
    } catch {
      toast({ title: 'Gagal mengubah urutan', variant: 'destructive' });
      load();
    }
  };

  const renderStars = (rating = 5) =>
    Array.from({ length: 5 }, (_, i) => (
      <Star key={i} className={`w-3.5 h-3.5 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} />
    ));

  return (
    <div className="space-y-6">
      <PageHeader icon={MessageSquare} title="Testimonial" description="Kelola testimoni pelanggan yang ditampilkan di halaman beranda">
        {canCreateTestimonial ? <Button onClick={() => setModal(EMPTY)} className="bg-yellow-400 text-black hover:bg-yellow-500">
          <Plus className="w-4 h-4 mr-2" /> Tambah Testimonial
        </Button> : null}
      </PageHeader>

      {loading ? (
        <CardGridSkeleton cols={3} cards={3} />
      ) : items.length === 0 ? (
        <Card className="bg-[#2a2a2a] border-yellow-400/20">
          <CardContent className="p-12 text-center text-gray-400">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg mb-4">Belum ada testimonial</p>
            {canCreateTestimonial ? <Button onClick={() => setModal(EMPTY)} className="bg-yellow-400 text-black hover:bg-yellow-500">
              <Plus className="w-4 h-4 mr-2" /> Tambah Testimonial Pertama
            </Button> : null}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((item, index) => (
            <Card key={item._id} className={`bg-[#2a2a2a] border-yellow-400/20 hover:border-yellow-400/40 transition-all ${!item.isActive ? 'opacity-60' : ''}`}>
              <CardContent className="p-5">
                {/* Header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-[#1a1a1a] border border-yellow-400/20 shrink-0">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-yellow-400 font-bold text-lg">
                        {item.name?.[0].toUpperCase() || ''}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-white font-semibold text-sm truncate">{item.name}</h3>
                    <p className="text-gray-400 text-xs truncate">{item.role}{item.organization ? ` · ${item.organization}` : ''}</p>
                  </div>
                </div>
                {/* Stars */}
                <div className="flex gap-0.5 mb-3">{renderStars(item.rating)}</div>
                {/* Text */}
                <p className="text-gray-300 text-sm leading-relaxed line-clamp-4 mb-4">"{item.text}"</p>
                {/* Actions */}
                <div className="flex gap-2">
                  {canManageTestimonial ? <Button size="sm" onClick={() => handleMove(index, 'up')} variant="outline" className="border-gray-500/40 text-gray-300 h-8 w-8 p-0" disabled={index === 0}>
                    <ArrowUp className="w-3.5 h-3.5" />
                  </Button> : null}
                  {canManageTestimonial ? <Button size="sm" onClick={() => handleMove(index, 'down')} variant="outline" className="border-gray-500/40 text-gray-300 h-8 w-8 p-0" disabled={index === items.length - 1}>
                    <ArrowDown className="w-3.5 h-3.5" />
                  </Button> : null}
                  {canEditTestimonial ? <Button size="sm" onClick={() => setModal(item)} variant="outline" className="border-yellow-400/40 text-yellow-400 flex-1 h-8">
                    <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                  </Button> : null}
                  {canManageTestimonial ? <Button size="sm" onClick={() => handleToggleActive(item)} variant="outline" className="border-gray-400/40 text-gray-300 h-8 w-8 p-0">
                    {item.isActive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </Button> : null}
                  {canDeleteTestimonial ? <Button size="sm" onClick={() => handleDelete(item._id)} variant="outline" className="border-red-400/40 text-red-400 h-8 w-8 p-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button> : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {modal !== null && (
        <TestimonialModal item={modal} onSave={handleSave} onClose={() => setModal(null)} />
      )}
    </div>
  );
};

export default Testimonials;

