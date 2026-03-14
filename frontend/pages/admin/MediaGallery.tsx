// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { Upload, Trash2, Copy, Check, RefreshCw, Images, X, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { useToast } from '../../hooks/use-toast';
import PageHeader from '../../components/ui/page-header';
import LoadingSpinner, { CardGridSkeleton } from '../../components/ui/loading-spinner';
import { mediaAPI } from '../../services/api';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const MEDIA_CATEGORIES = [
  { value: '', label: 'Semua' },
  { value: 'hero-slides', label: 'Hero Slides' },
  { value: 'banners', label: 'Banners' },
  { value: 'products-home', label: 'Produk Homepage' },
  { value: 'products-shop', label: 'Produk Shop' },
  { value: 'testimonials', label: 'Testimonial' },
  { value: 'activities', label: 'Kegiatan' },
  { value: 'articles', label: 'Artikel' },
  { value: 'team', label: 'Tim & Mitra' },
  { value: 'general', label: 'Umum' },
];

const UploadModal = ({ onUploaded, onClose }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [category, setCategory] = useState('general');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(f.type)) {
      toast({ title: 'Format harus JPG, PNG, GIF, atau WEBP', variant: 'destructive' });
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast({ title: 'Ukuran file maksimal 5MB', variant: 'destructive' });
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleUpload = async () => {
    if (!file) { toast({ title: 'Pilih file terlebih dahulu', variant: 'destructive' }); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('admin_token');
      const uploadRes = await axios.post(`${BACKEND_URL}/api/upload/image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` },
      });
      if (uploadRes.data.url) {
        const item = await mediaAPI.create({
          url: uploadRes.data.url,
          category,
          name: file.name,
          size: file.size,
        });
        toast({ title: 'Gambar berhasil diunggah' });
        onUploaded(item.data);
      }
    } catch (err) {
      toast({ title: err.response.data.detail || 'Gagal upload', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div className="bg-[#2a2a2a] rounded-2xl w-full max-w-md shadow-2xl border border-yellow-400/20" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-yellow-400/20">
          <h2 className="text-white font-bold text-lg">Upload Gambar Baru</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          {/* Drop zone */}
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleFileChange} className="hidden" />
          {preview ? (
            <div className="relative w-full aspect-video rounded-lg overflow-hidden border-2 border-yellow-400/30">
              <img src={preview} alt="Preview" className="w-full h-full object-cover" />
              <button onClick={() => { setFile(null); setPreview(''); }} className="absolute top-2 right-2 p-1 bg-red-500 rounded-full text-white hover:bg-red-600">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button onClick={() => fileInputRef.current.click()} className="w-full aspect-video border-2 border-dashed border-yellow-400/30 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-yellow-400 hover:text-yellow-400 transition-all bg-[#1a1a1a]">
              <Upload className="w-10 h-10 mb-2" />
              <span className="text-sm">Klik untuk pilih gambar</span>
              <span className="text-xs mt-1">JPG, PNG, GIF, WEBP · Maks 5MB</span>
            </button>
          )}

          {/* Category */}
          <div>
            <Label className="text-white mb-2 block">Kategori</Label>
            <div className="grid grid-cols-3 gap-2">
              {MEDIA_CATEGORIES.filter((c) => c.value).map((cat) => (
                <button key={cat.value} type="button" onClick={() => setCategory(cat.value)}
                  className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${category === cat.value ? 'bg-yellow-400 text-black' : 'bg-[#1a1a1a] border border-yellow-400/20 text-gray-400 hover:border-yellow-400/50 hover:text-yellow-400'}`}>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleUpload} disabled={uploading || !file} className="bg-yellow-400 text-black hover:bg-yellow-500 flex-1">
              {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</> : <><Upload className="w-4 h-4 mr-2" /> Upload</>}
            </Button>
            <Button onClick={onClose} variant="outline" className="border-gray-500 text-gray-300">Batal</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const MediaGallery = () => {
  const { toast } = useToast();
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [copied, setCopied] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params = category ? { category } : {};
      const res = await mediaAPI.getAll(params);
      setMedia(res.data || []);
    } catch {
      toast({ title: 'Gagal memuat media', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [category]);

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus gambar ini dari galeri')) return;
    try {
      await mediaAPI.delete(id);
      setMedia((prev) => prev.filter((m) => m._id !== id));
      toast({ title: 'Gambar dihapus' });
    } catch {
      toast({ title: 'Gagal menghapus', variant: 'destructive' });
    }
  };

  const handleCopy = (url, id) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(id);
      toast({ title: 'URL disalin ke clipboard' });
      setTimeout(() => setCopied((prev) => (prev === id ? '' : prev)), 2000);
    });
  };

  const handleUploaded = (item) => {
    setMedia((prev) => [item, ...prev]);
    setShowUpload(false);
  };

  const catLabel = MEDIA_CATEGORIES.find((c) => c.value === category).label || 'Semua';
  const totalSize = media.reduce((sum, m) => sum + (m.size || 0), 0);
  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <PageHeader icon={Images} title="Media Gallery" description="Semua gambar yang diunggah ke sistem, terorganisir per kategori">
        <Button onClick={() => setShowUpload(true)} className="bg-yellow-400 text-black hover:bg-yellow-500">
          <Upload className="w-4 h-4 mr-2" /> Upload Gambar
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Gambar', value: media.length, color: 'text-white' },
          { label: 'Kategori', value: catLabel, color: 'text-yellow-400' },
          { label: 'Total Ukuran', value: formatSize(totalSize), color: 'text-blue-400' },
        ].map((stat) => (
          <Card key={stat.label} className="bg-[#2a2a2a] border-yellow-400/20">
            <CardContent className="p-4 text-center">
              <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-gray-400 text-xs mt-1">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        {MEDIA_CATEGORIES.map((cat) => (
          <button key={cat.value} onClick={() => setCategory(cat.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${category === cat.value ? 'bg-yellow-400 text-black font-bold' : 'bg-[#2a2a2a] border border-yellow-400/20 text-gray-300 hover:border-yellow-400/50'}`}>
            {cat.label}
          </button>
        ))}
        <button onClick={load} className="ml-auto p-1.5 text-gray-400 hover:text-yellow-400 transition-colors" title="Refresh">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <CardGridSkeleton cols={4} cards={8} />
      ) : media.length === 0 ? (
        <Card className="bg-[#2a2a2a] border-yellow-400/20">
          <CardContent className="p-12 text-center text-gray-400">
            <Images className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg mb-4">
              {category ? `Belum ada gambar di kategori "${catLabel}"` : 'Galeri masih kosong'}
            </p>
            <Button onClick={() => setShowUpload(true)} className="bg-yellow-400 text-black hover:bg-yellow-500">
              <Upload className="w-4 h-4 mr-2" /> Upload Gambar Pertama
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {media.map((item) => (
            <div key={item._id} className="group relative rounded-xl overflow-hidden bg-[#2a2a2a] border border-yellow-400/10 hover:border-yellow-400/40 transition-all">
              {/* Image */}
              <div className="aspect-square overflow-hidden">
                <img
                  src={item.url}
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => { e.target.src = 'https://placehold.co/200x200?text=Error'; }}
                />
              </div>
              {/* Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                <button
                  onClick={() => handleCopy(item.url, item._id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-400 text-black text-xs font-semibold rounded-lg hover:bg-yellow-300 transition-colors"
                >
                  {copied === item._id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied === item._id ? 'Disalin!' : 'Salin URL'}
                </button>
                <button
                  onClick={() => handleDelete(item._id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/80 text-white text-xs font-semibold rounded-lg hover:bg-red-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Hapus
                </button>
              </div>
              {/* Caption */}
              <div className="p-2 border-t border-yellow-400/10">
                <p className="text-white text-xs truncate" title={item.name}>{item.name}</p>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-yellow-400/60 text-[10px]">{MEDIA_CATEGORIES.find((c) => c.value === item.category).label || item.category}</span>
                  {item.size > 0 && <span className="text-gray-600 text-[10px]">{formatSize(item.size)}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showUpload && <UploadModal onUploaded={handleUploaded} onClose={() => setShowUpload(false)} />}
    </div>
  );
};

export default MediaGallery;


