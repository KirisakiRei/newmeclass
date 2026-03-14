// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, MessageSquare, Star } from 'lucide-react';
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
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

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
    if (!window.confirm('Hapus testimonial ini')) return;
    try {
      await websiteContentAPI.deleteTestimonial(id);
      toast({ title: 'Testimonial dihapus' });
      load();
    } catch {
      toast({ title: 'Gagal menghapus', variant: 'destructive' });
    }
  };

  const renderStars = (rating = 5) =>
    Array.from({ length: 5 }, (_, i) => (
      <Star key={i} className={`w-3.5 h-3.5 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} />
    ));

  return (
    <div className="space-y-6">
      <PageHeader icon={MessageSquare} title="Testimonial" description="Kelola testimoni pelanggan yang ditampilkan di halaman beranda">
        <Button onClick={() => setModal(EMPTY)} className="bg-yellow-400 text-black hover:bg-yellow-500">
          <Plus className="w-4 h-4 mr-2" /> Tambah Testimonial
        </Button>
      </PageHeader>

      {loading ? (
        <CardGridSkeleton cols={3} cards={3} />
      ) : items.length === 0 ? (
        <Card className="bg-[#2a2a2a] border-yellow-400/20">
          <CardContent className="p-12 text-center text-gray-400">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg mb-4">Belum ada testimonial</p>
            <Button onClick={() => setModal(EMPTY)} className="bg-yellow-400 text-black hover:bg-yellow-500">
              <Plus className="w-4 h-4 mr-2" /> Tambah Testimonial Pertama
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((item) => (
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
                  <Button size="sm" onClick={() => setModal(item)} variant="outline" className="border-yellow-400/40 text-yellow-400 flex-1 h-8">
                    <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                  </Button>
                  <Button size="sm" onClick={() => handleDelete(item._id)} variant="outline" className="border-red-400/40 text-red-400 h-8 w-8 p-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
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



