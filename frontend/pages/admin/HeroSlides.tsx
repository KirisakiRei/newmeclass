// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, ArrowUp, ArrowDown, Eye, EyeOff, Layers } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { useToast } from '../../hooks/use-toast';
import PageHeader from '../../components/ui/page-header';
import LoadingSpinner, { CardGridSkeleton } from '../../components/ui/loading-spinner';
import SharedImageUploader from '../../components/admin/SharedImageUploader.jsx';
import { websiteContentAPI } from '../../services/api';
import { useAdminAccess } from '../../lib/admin-rbac';

const EMPTY_SLIDE = {
  title: '', subtitle: '', description: '', badge: '',
  imageUrl: '', ctaText: '', ctaLink: '/', isActive: true,
};

const SlideModal = ({ slide, onSave, onClose }) => {
  const [form, setForm] = useState({ ...EMPTY_SLIDE, ...slide });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { toast({ title: 'Judul harus diisi', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div className="bg-[#2a2a2a] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-yellow-400/20" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-yellow-400/20">
          <h2 className="text-white font-bold text-lg">{slide._id ? 'Edit Hero Slide' : 'Tambah Hero Slide'}</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Image */}
          <div>
            <Label className="text-white mb-2 block">Gambar Slide</Label>
            <SharedImageUploader value={form.imageUrl} onChange={(url) => set('imageUrl', url)} category="hero-slides" size="md" placeholder="Upload gambar hero (1200×600px)" />
          </div>
          {/* Title & Subtitle */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-white mb-1.5 block">Judul *</Label>
              <Input value={form.title} onChange={(e) => set('title', e.target.value)} className="bg-[#1a1a1a] border-yellow-400/30 text-white" placeholder="Judul slide" required />
            </div>
            <div>
              <Label className="text-white mb-1.5 block">Subtitle</Label>
              <Input value={form.subtitle} onChange={(e) => set('subtitle', e.target.value)} className="bg-[#1a1a1a] border-yellow-400/30 text-white" placeholder="Subtitle" />
            </div>
          </div>
          {/* Description */}
          <div>
            <Label className="text-white mb-1.5 block">Deskripsi</Label>
            <Input value={form.description} onChange={(e) => set('description', e.target.value)} className="bg-[#1a1a1a] border-yellow-400/30 text-white" placeholder="Deskripsi singkat" />
          </div>
          {/* Badge, CTA */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-white mb-1.5 block">Badge</Label>
              <Input value={form.badge} onChange={(e) => set('badge', e.target.value)} className="bg-[#1a1a1a] border-yellow-400/30 text-white" placeholder="🔥 Hot" />
            </div>
            <div>
              <Label className="text-white mb-1.5 block">Teks Tombol</Label>
              <Input value={form.ctaText} onChange={(e) => set('ctaText', e.target.value)} className="bg-[#1a1a1a] border-yellow-400/30 text-white" placeholder="Mulai Sekarang" />
            </div>
            <div>
              <Label className="text-white mb-1.5 block">Link Tombol</Label>
              <Input value={form.ctaLink} onChange={(e) => set('ctaLink', e.target.value)} className="bg-[#1a1a1a] border-yellow-400/30 text-white" placeholder="/newme-test" />
            </div>
          </div>
          {/* Status */}
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => set('isActive', !form.isActive)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.isActive ? 'bg-yellow-400' : 'bg-gray-600'}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
            <span className="text-gray-300 text-sm">{form.isActive ? 'Aktif' : 'Nonaktif'}</span>
          </div>
          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={saving} className="bg-yellow-400 text-black hover:bg-yellow-500 flex-1">
              {saving ? 'Menyimpan...' : <><Save className="w-4 h-4 mr-2" /> Simpan Slide</>}
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

const HeroSlides = () => {
  const { toast } = useToast();
  const adminAccess = useAdminAccess();
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalSlide, setModalSlide] = useState(null); // null = closed, {} = add, {...slide} = edit
  const canCreateSlide = adminAccess.hasPermission('hero_slides.create');
  const canEditSlide = adminAccess.hasPermission('hero_slides.edit');
  const canDeleteSlide = adminAccess.hasPermission('hero_slides.delete');
  const canManageSlide = adminAccess.hasPermission('hero_slides.manage');

  const load = async () => {
    setLoading(true);
    try {
      const res = await websiteContentAPI.getHeroSlides();
      setSlides([...(res.data || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
    } catch {
      toast({ title: 'Gagal memuat data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (form) => {
    if (form._id ? !canEditSlide : !canCreateSlide) return;
    try {
      if (form._id) {
        await websiteContentAPI.updateHeroSlide(form._id, form);
        toast({ title: 'Slide diperbarui' });
      } else {
        await websiteContentAPI.createHeroSlide({ ...form, order: slides.length + 1 });
        toast({ title: 'Slide ditambahkan' });
      }
      setModalSlide(null);
      load();
    } catch {
      toast({ title: 'Gagal menyimpan', variant: 'destructive' });
    }
  };

  const handleDelete = async (id) => {
    if (!canDeleteSlide) return;
    if (!window.confirm('Hapus slide ini')) return;
    try {
      await websiteContentAPI.deleteHeroSlide(id);
      toast({ title: 'Slide dihapus' });
      load();
    } catch {
      toast({ title: 'Gagal menghapus', variant: 'destructive' });
    }
  };

  const handleToggleActive = async (slide) => {
    if (!canManageSlide) return;
    try {
      const updated = { ...slide, isActive: !slide.isActive };
      await websiteContentAPI.updateHeroSlide(slide._id, updated);
      setSlides((prev) => prev.map((s) => (s._id === slide._id ? updated : s)));
      toast({ title: `Slide ${updated.isActive ? 'diaktifkan' : 'dinonaktifkan'}` });
    } catch {
      toast({ title: 'Gagal update status', variant: 'destructive' });
    }
  };

  const handleMove = async (index, direction) => {
    if (!canManageSlide) return;
    const sorted = [...slides];
    const swapIdx = direction === 'up' ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const tempOrder = sorted[index].order ?? index + 1;
    sorted[index] = { ...sorted[index], order: sorted[swapIdx].order ?? swapIdx + 1 };
    sorted[swapIdx] = { ...sorted[swapIdx], order: tempOrder };
    const reordered = [...sorted].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    setSlides(reordered);
    try {
      await Promise.all([
        websiteContentAPI.updateHeroSlide(reordered[index]._id, reordered[index]),
        websiteContentAPI.updateHeroSlide(reordered[swapIdx]._id, reordered[swapIdx]),
      ]);
    } catch {
      toast({ title: 'Gagal mengubah urutan', variant: 'destructive' });
      load();
    }
  };

  const activeCount = slides.filter((s) => s.isActive).length;

  return (
    <div className="space-y-6">
      <PageHeader icon={Layers} title="Hero Slides" description="Kelola slide carousel utama di halaman beranda">
        {canCreateSlide ? <Button onClick={() => setModalSlide(EMPTY_SLIDE)} className="bg-yellow-400 text-black hover:bg-yellow-500">
          <Plus className="w-4 h-4 mr-2" /> Tambah Slide
        </Button> : null}
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Slide', value: slides.length, color: 'text-white' },
          { label: 'Aktif', value: activeCount, color: 'text-green-400' },
          { label: 'Nonaktif', value: slides.length - activeCount, color: 'text-gray-400' },
        ].map((stat) => (
          <Card key={stat.label} className="bg-[#2a2a2a] border-yellow-400/20">
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-gray-400 text-xs mt-1">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading ? (
        <CardGridSkeleton cols={2} cards={4} />
      ) : slides.length === 0 ? (
        <Card className="bg-[#2a2a2a] border-yellow-400/20">
          <CardContent className="p-12 text-center text-gray-400">
            <Layers className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg mb-4">Belum ada hero slide</p>
            {canCreateSlide ? <Button onClick={() => setModalSlide(EMPTY_SLIDE)} className="bg-yellow-400 text-black hover:bg-yellow-500">
              <Plus className="w-4 h-4 mr-2" /> Tambah Slide Pertama
            </Button> : null}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {slides.map((slide, index) => (
            <Card key={slide._id} className={`border transition-all ${slide.isActive ? 'bg-[#2a2a2a] border-yellow-400/20' : 'bg-[#1e1e1e] border-gray-600/20 opacity-60'}`}>
              <CardContent className="p-4 flex items-center gap-4">
                {/* Order controls */}
                <div className="flex flex-col items-center gap-1 shrink-0">
                  {canManageSlide ? <button onClick={() => handleMove(index, 'up')} disabled={index === 0} className="p-1 text-gray-500 hover:text-yellow-400 disabled:opacity-30 transition-colors">
                    <ArrowUp className="w-4 h-4" />
                  </button> : <div className="h-6" />}
                  <div className="w-7 h-7 rounded bg-yellow-400/20 flex items-center justify-center">
                    <span className="text-yellow-400 text-xs font-bold">{index + 1}</span>
                  </div>
                  {canManageSlide ? <button onClick={() => handleMove(index, 'down')} disabled={index === slides.length - 1} className="p-1 text-gray-500 hover:text-yellow-400 disabled:opacity-30 transition-colors">
                    <ArrowDown className="w-4 h-4" />
                  </button> : <div className="h-6" />}
                </div>

                {/* Thumbnail */}
                <div className="w-24 h-16 rounded-lg overflow-hidden bg-[#1a1a1a] shrink-0 border border-yellow-400/10">
                  {slide.imageUrl ? (
                    <img src={slide.imageUrl} alt={slide.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                      <Layers className="w-6 h-6" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-white font-semibold text-sm truncate">{slide.title || '(Tanpa judul)'}</h3>
                    {slide.badge && <span className="bg-yellow-400/20 text-yellow-400 text-xs px-2 py-0.5 rounded-full shrink-0">{slide.badge}</span>}
                  </div>
                  <p className="text-gray-400 text-xs truncate">{slide.subtitle}</p>
                  {slide.ctaText && <p className="text-yellow-400/70 text-xs mt-0.5">CTA: {slide.ctaText} → {slide.ctaLink}</p>}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {canManageSlide ? <button onClick={() => handleToggleActive(slide)} className={`p-1.5 rounded transition-colors ${slide.isActive ? 'text-green-400 hover:text-green-300' : 'text-gray-500 hover:text-gray-400'}`} title={slide.isActive ? 'Nonaktifkan' : 'Aktifkan'}>
                    {slide.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button> : null}
                  {canEditSlide ? <Button size="sm" onClick={() => setModalSlide(slide)} variant="outline" className="border-yellow-400/40 text-yellow-400 h-8 w-8 p-0">
                    <Edit className="w-3.5 h-3.5" />
                  </Button> : null}
                  {canDeleteSlide ? <Button size="sm" onClick={() => handleDelete(slide._id)} variant="outline" className="border-red-400/40 text-red-400 h-8 w-8 p-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button> : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {modalSlide !== null && (
        <SlideModal
          slide={modalSlide}
          onSave={handleSave}
          onClose={() => setModalSlide(null)}
        />
      )}
    </div>
  );
};

export default HeroSlides;
