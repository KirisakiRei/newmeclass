// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, Package, ToggleLeft, ToggleRight, Tag } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Card, CardContent } from '../../components/ui/card';
import { useToast } from '../../hooks/use-toast';
import PageHeader from '../../components/ui/page-header';
import LoadingSpinner, { CardGridSkeleton } from '../../components/ui/loading-spinner';
import SharedImageUploader from '../../components/admin/SharedImageUploader.jsx';
import { productsAPI } from '../../services/api';
import { useAdminAccess } from '../../lib/admin-rbac';

const CATEGORIES = ['Tes', 'Buku', 'Coaching', 'Workshop', 'Merchandise'];

const EMPTY_PRODUCT = {
  name: '', description: '', price: '', originalPrice: '',
  imageUrl: '', category: 'Tes', stock: 999, isActive: true, features: [],
};

const formatRupiah = (val) => {
  const num = parseInt(String(val).replace(/\D/g, ''), 10);
  if (isNaN(num)) return '';
  return num.toLocaleString('id-ID');
};

const parseRupiah = (str) => parseInt(String(str).replace(/\D/g, ''), 10) || 0;

const ProductModal = ({ product, onSave, onClose }) => {
  const [form, setForm] = useState({
    ...EMPTY_PRODUCT, ...product,
    features: Array.isArray(product.features) ? [...product.features] : [],
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const addFeature = () => set('features', [...form.features, '']);
  const updateFeature = (i, v) => set('features', form.features.map((f, idx) => idx === i ? v : f));
  const removeFeature = (i) => set('features', form.features.filter((_, idx) => idx !== i));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast({ title: 'Nama produk harus diisi', variant: 'destructive' }); return; }
    if (!form.price) { toast({ title: 'Harga harus diisi', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      await onSave({
        ...form,
        price: parseRupiah(form.price),
        originalPrice: parseRupiah(form.originalPrice),
        stock: parseInt(form.stock, 10) || 0,
        features: form.features.filter((f) => f.trim()),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div className="bg-[#2a2a2a] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-yellow-400/20" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-yellow-400/20">
          <h2 className="text-white font-bold text-lg">{product._id ? 'Edit Produk Shop' : 'Tambah Produk Shop'}</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Image */}
          <div>
            <Label className="text-white mb-2 block">Gambar Produk</Label>
            <SharedImageUploader value={form.imageUrl} onChange={(url) => set('imageUrl', url)} category="products-shop" size="md" placeholder="Upload gambar produk" />
          </div>

          {/* Name */}
          <div>
            <Label className="text-white mb-1.5 block">Nama Produk *</Label>
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} className="bg-[#1a1a1a] border-yellow-400/30 text-white" placeholder="Nama produk" required />
          </div>

          {/* Description */}
          <div>
            <Label className="text-white mb-1.5 block">Deskripsi</Label>
            <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} className="bg-[#1a1a1a] border-yellow-400/30 text-white resize-none" rows={3} placeholder="Deskripsi produk" />
          </div>

          {/* Price & Stock */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-white mb-1.5 block">Harga *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">Rp</span>
                <Input value={formatRupiah(form.price)} onChange={(e) => set('price', parseRupiah(e.target.value))} className="bg-[#1a1a1a] border-yellow-400/30 text-white pl-9" placeholder="150.000" />
              </div>
            </div>
            <div>
              <Label className="text-white mb-1.5 block">Harga Asli</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">Rp</span>
                <Input value={formatRupiah(form.originalPrice)} onChange={(e) => set('originalPrice', parseRupiah(e.target.value))} className="bg-[#1a1a1a] border-yellow-400/30 text-white pl-9" placeholder="200.000" />
              </div>
            </div>
            <div>
              <Label className="text-white mb-1.5 block">Stok</Label>
              <Input type="number" value={form.stock} onChange={(e) => set('stock', e.target.value)} className="bg-[#1a1a1a] border-yellow-400/30 text-white" placeholder="999" min="0" />
            </div>
          </div>

          {/* Category */}
          <div>
            <Label className="text-white mb-1.5 block">Kategori</Label>
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map((cat) => (
                <button key={cat} type="button" onClick={() => set('category', cat)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${form.category === cat ? 'bg-yellow-400 text-black' : 'bg-[#1a1a1a] border border-yellow-400/20 text-gray-300 hover:border-yellow-400/50'}`}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Features */}
          <div>
            <Label className="text-white mb-2 block">Fitur / Keunggulan</Label>
            <div className="space-y-2">
              {form.features.map((feat, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <span className="text-yellow-400 text-xs w-4 shrink-0">✓</span>
                  <Input value={feat} onChange={(e) => updateFeature(i, e.target.value)} className="bg-[#1a1a1a] border-yellow-400/20 text-white flex-1 h-8 text-sm" placeholder={`Fitur ${i + 1}`} />
                  <button type="button" onClick={() => removeFeature(i)} className="p-1 text-red-400 hover:text-red-300 shrink-0"><X className="w-3.5 h-3.5" /></button>
                </div>
              ))}
              <button type="button" onClick={addFeature} className="flex items-center gap-1.5 text-xs text-yellow-400 hover:text-yellow-300 border border-dashed border-yellow-400/30 rounded px-2.5 py-1.5 w-full justify-center">
                <Plus className="w-3.5 h-3.5" /> Tambah Fitur
              </button>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => set('isActive', !form.isActive)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.isActive ? 'bg-yellow-400' : 'bg-gray-600'}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
            <span className="text-gray-300 text-sm">{form.isActive ? 'Produk Aktif' : 'Produk Nonaktif'}</span>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={saving} className="bg-yellow-400 text-black hover:bg-yellow-500 flex-1">
              {saving ? 'Menyimpan...' : <><Save className="w-4 h-4 mr-2" /> Simpan Produk</>}
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

const ShopProducts = () => {
  const { toast } = useToast();
  const adminAccess = useAdminAccess();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [filterCategory, setFilterCategory] = useState('');
  const canCreateProduct = adminAccess.hasPermission('shop_products.create');
  const canEditProduct = adminAccess.hasPermission('shop_products.edit');
  const canDeleteProduct = adminAccess.hasPermission('shop_products.delete');
  const canManageProduct = adminAccess.hasPermission('shop_products.manage');

  const load = async () => {
    setLoading(true);
    try {
      const res = await productsAPI.getAll();
      setProducts(res.data || []);
    } catch {
      toast({ title: 'Gagal memuat data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (form) => {
    if (form._id ? !canEditProduct : !canCreateProduct) return;
    try {
      if (form._id) {
        await productsAPI.update(form._id, form);
        toast({ title: 'Produk diperbarui' });
      } else {
        await productsAPI.create(form);
        toast({ title: 'Produk ditambahkan' });
      }
      setModal(null);
      load();
    } catch {
      toast({ title: 'Gagal menyimpan', variant: 'destructive' });
    }
  };

  const handleDelete = async (id) => {
    if (!canDeleteProduct) return;
    if (!window.confirm('Hapus produk ini')) return;
    try {
      await productsAPI.delete(id);
      toast({ title: 'Produk dihapus' });
      load();
    } catch {
      toast({ title: 'Gagal menghapus', variant: 'destructive' });
    }
  };

  const handleToggleActive = async (product) => {
    if (!canManageProduct) return;
    try {
      const updated = { ...product, isActive: !product.isActive };
      await productsAPI.update(product._id, updated);
      setProducts((prev) => prev.map((p) => (p._id === product._id ? updated : p)));
      toast({ title: `Produk ${updated.isActive ? 'diaktifkan' : 'dinonaktifkan'}` });
    } catch {
      toast({ title: 'Gagal update status', variant: 'destructive' });
    }
  };

  const filtered = filterCategory ? products.filter((p) => p.category === filterCategory) : products;
  const activeCount = products.filter((p) => p.isActive).length;

  return (
    <div className="space-y-6">
      <PageHeader icon={Package} title="Produk Shop" description="Kelola katalog produk untuk halaman toko">
        {canCreateProduct ? <Button onClick={() => setModal(EMPTY_PRODUCT)} className="bg-yellow-400 text-black hover:bg-yellow-500">
          <Plus className="w-4 h-4 mr-2" /> Tambah Produk
        </Button> : null}
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Produk', value: products.length, color: 'text-white' },
          { label: 'Aktif', value: activeCount, color: 'text-green-400' },
          { label: 'Nonaktif', value: products.length - activeCount, color: 'text-gray-400' },
          { label: 'Kategori', value: [...new Set(products.map((p) => p.category))].length, color: 'text-yellow-400' },
        ].map((stat) => (
          <Card key={stat.label} className="bg-[#2a2a2a] border-yellow-400/20">
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-gray-400 text-xs mt-1">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilterCategory('')} className={`px-3 py-1.5 rounded-full text-sm transition-colors ${!filterCategory ? 'bg-yellow-400 text-black font-bold' : 'bg-[#2a2a2a] border border-yellow-400/20 text-gray-300 hover:border-yellow-400/50'}`}>
          Semua
        </button>
        {CATEGORIES.map((cat) => (
          <button key={cat} onClick={() => setFilterCategory(cat)} className={`px-3 py-1.5 rounded-full text-sm transition-colors ${filterCategory === cat ? 'bg-yellow-400 text-black font-bold' : 'bg-[#2a2a2a] border border-yellow-400/20 text-gray-300 hover:border-yellow-400/50'}`}>
            <Tag className="w-3 h-3 inline mr-1" />{cat}
          </button>
        ))}
      </div>

      {loading ? (
        <CardGridSkeleton cols={3} cards={6} />
      ) : filtered.length === 0 ? (
        <Card className="bg-[#2a2a2a] border-yellow-400/20">
          <CardContent className="p-12 text-center text-gray-400">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg mb-4">{filterCategory ? `Tidak ada produk kategori "${filterCategory}"` : 'Belum ada produk shop'}</p>
            {!filterCategory && canCreateProduct ? (
              <Button onClick={() => setModal(EMPTY_PRODUCT)} className="bg-yellow-400 text-black hover:bg-yellow-500">
                <Plus className="w-4 h-4 mr-2" /> Tambah Produk Pertama
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {filtered.map((product) => (
            <Card key={product._id} className={`bg-[#2a2a2a] border-yellow-400/20 group overflow-hidden hover:border-yellow-400/40 transition-all ${!product.isActive ? 'opacity-60' : ''}`}>
              <div className="relative aspect-video bg-[#1a1a1a] overflow-hidden">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600">
                    <Package className="w-12 h-12" />
                  </div>
                )}
                <span className="absolute top-2 left-2 bg-[#1a1a1a]/80 text-yellow-400 text-xs px-2 py-0.5 rounded-full border border-yellow-400/30">{product.category}</span>
                {!product.isActive && (
                  <span className="absolute top-2 right-2 bg-gray-800/80 text-gray-400 text-xs px-2 py-0.5 rounded-full">Nonaktif</span>
                )}
              </div>
              <CardContent className="p-4">
                <h3 className="text-white font-semibold text-sm mb-1 truncate">{product.name}</h3>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-yellow-400 font-bold text-sm">Rp {product.price.toLocaleString('id-ID')}</span>
                  {product.originalPrice > product.price && (
                    <span className="text-gray-500 text-xs line-through">Rp {product.originalPrice.toLocaleString('id-ID')}</span>
                  )}
                </div>
                <p className="text-gray-500 text-xs mb-3">Stok: {product.stock}</p>
                <div className="flex gap-2">
                  {canManageProduct ? <button onClick={() => handleToggleActive(product)} className={`p-1.5 rounded border transition-colors ${product.isActive ? 'border-green-400/30 text-green-400 hover:bg-green-400/10' : 'border-gray-500/30 text-gray-500 hover:bg-gray-500/10'}`} title={product.isActive ? 'Nonaktifkan' : 'Aktifkan'}>
                    {product.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                  </button> : null}
                  {canEditProduct ? <Button size="sm" onClick={() => setModal(product)} variant="outline" className="border-yellow-400/40 text-yellow-400 flex-1 h-8">
                    <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                  </Button> : null}
                  {canDeleteProduct ? <Button size="sm" onClick={() => handleDelete(product._id)} variant="outline" className="border-red-400/40 text-red-400 h-8 w-8 p-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button> : null}
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

export default ShopProducts;
