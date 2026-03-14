// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, ShoppingBag } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent } from '../../components/ui/card';
import { useToast } from '../../hooks/use-toast';
import PageHeader from '../../components/ui/page-header';
import LoadingSpinner, { CardGridSkeleton } from '../../components/ui/loading-spinner';
import SharedImageUploader from '../../components/admin/SharedImageUploader.jsx';
import { websiteContentAPI } from '../../services/api';

const EMPTY_PRODUCT = {
  title: '', subtitle: '', imageUrl: '', link: '/', badge: '', isActive: true,
};

const ProductModal = ({ product, onSave, onClose }) => {
  const [form, setForm] = useState({ ...EMPTY_PRODUCT, ...product });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { toast({ title: 'Nama produk harus diisi', variant: 'destructive' }); return; }
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div className="bg-[#2a2a2a] rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl border border-yellow-400/20" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-yellow-400/20">
          <h2 className="text-white font-bold text-lg">{product._id ? 'Edit Produk Homepage' : 'Tambah Produk Homepage'}</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <Label className="text-white mb-2 block">Gambar Produk</Label>
            <SharedImageUploader value={form.imageUrl} onChange={(url) => set('imageUrl', url)} category="products-home" size="md" placeholder="Upload gambar produk" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-white mb-1.5 block">Nama Produk *</Label>
              <Input value={form.title} onChange={(e) => set('title', e.target.value)} className="bg-[#1a1a1a] border-yellow-400/30 text-white" placeholder="Nama produk" required />
            </div>
            <div>
              <Label className="text-white mb-1.5 block">Subtitle</Label>
              <Input value={form.subtitle} onChange={(e) => set('subtitle', e.target.value)} className="bg-[#1a1a1a] border-yellow-400/30 text-white" placeholder="Deskripsi singkat" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-white mb-1.5 block">Link</Label>
              <Input value={form.link} onChange={(e) => set('link', e.target.value)} className="bg-[#1a1a1a] border-yellow-400/30 text-white" placeholder="/shop" />
            </div>
            <div>
              <Label className="text-white mb-1.5 block">Badge</Label>
              <Input value={form.badge} onChange={(e) => set('badge', e.target.value)} className="bg-[#1a1a1a] border-yellow-400/30 text-white" placeholder="Populer" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => set('isActive', !form.isActive)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.isActive ? 'bg-yellow-400' : 'bg-gray-600'}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
            <span className="text-gray-300 text-sm">{form.isActive ? 'Tampil di Homepage' : 'Disembunyikan'}</span>
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

const HomepageProducts = () => {
  const { toast } = useToast();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await websiteContentAPI.getProducts();
      setProducts(res.data || []);
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
        await websiteContentAPI.updateProduct(form._id, form);
        toast({ title: 'Produk diperbarui' });
      } else {
        await websiteContentAPI.createProduct({ ...form, order: products.length + 1 });
        toast({ title: 'Produk ditambahkan' });
      }
      setModal(null);
      load();
    } catch {
      toast({ title: 'Gagal menyimpan', variant: 'destructive' });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus produk ini dari homepage')) return;
    try {
      await websiteContentAPI.deleteProduct(id);
      toast({ title: 'Produk dihapus' });
      load();
    } catch {
      toast({ title: 'Gagal menghapus', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader icon={ShoppingBag} title="Produk Homepage" description="Produk yang ditampilkan sebagai showcase di halaman beranda">
        <Button onClick={() => setModal(EMPTY_PRODUCT)} className="bg-yellow-400 text-black hover:bg-yellow-500">
          <Plus className="w-4 h-4 mr-2" /> Tambah Produk
        </Button>
      </PageHeader>

      {loading ? (
        <CardGridSkeleton cols={3} cards={6} />
      ) : products.length === 0 ? (
        <Card className="bg-[#2a2a2a] border-yellow-400/20">
          <CardContent className="p-12 text-center text-gray-400">
            <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg mb-4">Belum ada produk homepage</p>
            <Button onClick={() => setModal(EMPTY_PRODUCT)} className="bg-yellow-400 text-black hover:bg-yellow-500">
              <Plus className="w-4 h-4 mr-2" /> Tambah Produk Pertama
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {products.map((product) => (
            <Card key={product._id} className={`bg-[#2a2a2a] border-yellow-400/20 group overflow-hidden transition-all hover:border-yellow-400/40 ${!product.isActive ? 'opacity-50' : ''}`}>
              <div className="relative aspect-video bg-[#1a1a1a] overflow-hidden">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600">
                    <ShoppingBag className="w-10 h-10" />
                  </div>
                )}
                {product.badge && (
                  <span className="absolute top-2 left-2 bg-yellow-400 text-black text-xs font-bold px-2 py-0.5 rounded-full">{product.badge}</span>
                )}
                {!product.isActive && (
                  <span className="absolute top-2 right-2 bg-gray-800/80 text-gray-400 text-xs px-2 py-0.5 rounded-full">Tersembunyi</span>
                )}
              </div>
              <CardContent className="p-4">
                <h3 className="text-white font-semibold text-sm mb-1 truncate">{product.title}</h3>
                <p className="text-gray-400 text-xs mb-3 truncate">{product.subtitle}</p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setModal(product)} variant="outline" className="border-yellow-400/40 text-yellow-400 flex-1 h-8">
                    <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                  </Button>
                  <Button size="sm" onClick={() => handleDelete(product._id)} variant="outline" className="border-red-400/40 text-red-400 h-8 w-8 p-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {modal !== null && (
        <ProductModal product={modal} onSave={handleSave} onClose={() => setModal(null)} />
      )}
    </div>
  );
};

export default HomepageProducts;



