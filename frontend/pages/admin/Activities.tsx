// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, Activity, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent } from '../../components/ui/card';
import { useToast } from '../../hooks/use-toast';
import PageHeader from '../../components/ui/page-header';
import LoadingSpinner, { CardGridSkeleton } from '../../components/ui/loading-spinner';
import SharedImageUploader from '../../components/admin/SharedImageUploader.jsx';
import { websiteContentAPI } from '../../services/api';

const EMPTY = {
  title: '', description: '', imageUrl: '', isActive: true,
};

const ActivityModal = ({ item, onSave, onClose }) => {
  const [form, setForm] = useState({ ...EMPTY, ...item });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { toast({ title: 'Judul harus diisi', variant: 'destructive' }); return; }
    if (!form.imageUrl) { toast({ title: 'Gambar harus diunggah', variant: 'destructive' }); return; }
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div className="bg-[#2a2a2a] rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl border border-yellow-400/20" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-yellow-400/20">
          <h2 className="text-white font-bold text-lg">{item._id ? 'Edit Kegiatan' : 'Tambah Kegiatan'}</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <Label className="text-white mb-2 block">Foto Kegiatan *</Label>
            <SharedImageUploader value={form.imageUrl} onChange={(url) => set('imageUrl', url)} category="activities" size="md" placeholder="Upload foto kegiatan" />
          </div>
          <div>
            <Label className="text-white mb-1.5 block">Judul *</Label>
            <Input value={form.title} onChange={(e) => set('title', e.target.value)} className="bg-[#1a1a1a] border-yellow-400/30 text-white" placeholder="Judul kegiatan" required />
          </div>
          <div>
            <Label className="text-white mb-1.5 block">Deskripsi Singkat</Label>
            <Input value={form.description} onChange={(e) => set('description', e.target.value)} className="bg-[#1a1a1a] border-yellow-400/30 text-white" placeholder="Deskripsi kegiatan" />
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

const Activities = () => {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await websiteContentAPI.getActivities();
      setItems([...(res.data || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
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
        await websiteContentAPI.updateActivity(form._id, form);
        toast({ title: 'Kegiatan diperbarui' });
      } else {
        await websiteContentAPI.createActivity({ ...form, order: items.length + 1 });
        toast({ title: 'Kegiatan ditambahkan' });
      }
      setModal(null);
      load();
    } catch {
      toast({ title: 'Gagal menyimpan', variant: 'destructive' });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus kegiatan ini')) return;
    try {
      await websiteContentAPI.deleteActivity(id);
      toast({ title: 'Kegiatan dihapus' });
      load();
    } catch {
      toast({ title: 'Gagal menghapus', variant: 'destructive' });
    }
  };

  const handleMove = async (index, direction) => {
    const arr = [...items];
    const swapIdx = direction === 'up' ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= arr.length) return;
    const tempOrder = arr[index].order ?? index + 1;
    arr[index] = { ...arr[index], order: arr[swapIdx].order ?? swapIdx + 1 };
    arr[swapIdx] = { ...arr[swapIdx], order: tempOrder };
    const reordered = [...arr].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    setItems(reordered);
    try {
      await Promise.all([
        websiteContentAPI.updateActivity(reordered[index]._id, reordered[index]),
        websiteContentAPI.updateActivity(reordered[swapIdx]._id, reordered[swapIdx]),
      ]);
    } catch {
      toast({ title: 'Gagal mengubah urutan', variant: 'destructive' });
      load();
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader icon={Activity} title="Kegiatan" description="Kelola galeri foto kegiatan yang ditampilkan di halaman beranda">
        <Button onClick={() => setModal(EMPTY)} className="bg-yellow-400 text-black hover:bg-yellow-500">
          <Plus className="w-4 h-4 mr-2" /> Tambah Kegiatan
        </Button>
      </PageHeader>

      {loading ? (
        <CardGridSkeleton cols={3} cards={6} />
      ) : items.length === 0 ? (
        <Card className="bg-[#2a2a2a] border-yellow-400/20">
          <CardContent className="p-12 text-center text-gray-400">
            <Activity className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg mb-4">Belum ada foto kegiatan</p>
            <Button onClick={() => setModal(EMPTY)} className="bg-yellow-400 text-black hover:bg-yellow-500">
              <Plus className="w-4 h-4 mr-2" /> Tambah Kegiatan Pertama
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {items.map((item, index) => (
            <Card key={item._id} className={`bg-[#2a2a2a] border-yellow-400/20 group overflow-hidden hover:border-yellow-400/40 transition-all ${!item.isActive ? 'opacity-60' : ''}`}>
              <div className="relative aspect-video bg-[#1a1a1a] overflow-hidden">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600">
                    <Activity className="w-10 h-10" />
                  </div>
                )}
                <div className="absolute top-2 left-2 flex gap-1">
                  <button onClick={() => handleMove(index, 'up')} disabled={index === 0} className="p-1 bg-black/60 hover:bg-black/80 text-white rounded disabled:opacity-30 transition-colors">
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleMove(index, 'down')} disabled={index === items.length - 1} className="p-1 bg-black/60 hover:bg-black/80 text-white rounded disabled:opacity-30 transition-colors">
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="absolute top-2 right-2 w-6 h-6 rounded bg-yellow-400/80 flex items-center justify-center">
                  <span className="text-black text-xs font-bold">{index + 1}</span>
                </div>
                {!item.isActive && (
                  <span className="absolute bottom-2 left-2 bg-gray-800/80 text-gray-400 text-xs px-2 py-0.5 rounded-full">Tersembunyi</span>
                )}
              </div>
              <CardContent className="p-4">
                <h3 className="text-white font-semibold text-sm mb-1 truncate">{item.title}</h3>
                {item.description && <p className="text-gray-400 text-xs mb-3 truncate">{item.description}</p>}
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
        <ActivityModal item={modal} onSave={handleSave} onClose={() => setModal(null)} />
      )}
    </div>
  );
};

export default Activities;

