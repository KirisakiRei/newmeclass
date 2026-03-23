// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Eye, EyeOff, Monitor, Maximize2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useToast } from '../../hooks/use-toast';
import { bannersAPI } from '../../services/api';
import PageHeader from '../../components/ui/page-header';
import LoadingSpinner, { CardGridSkeleton } from '../../components/ui/loading-spinner';
import EmptyState from '../../components/ui/empty-state';
import SharedImageUploader from '../../components/admin/SharedImageUploader.tsx';
import { resolveBackendAssetUrl } from '../../lib/admin-media';
import { useAdminAccess } from '../../lib/admin-rbac';

// ── BannerPreviewModal ── full-screen preview
const BannerPreviewModal = ({ banner, onClose }) => {
  if (!banner) return null;
  const isSlider = banner.type === 'slider';
  const imgSrc = resolveBackendAssetUrl(banner.imageUrl);

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 flex flex-col">
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <Monitor className="w-4 h-4 text-yellow-400" />
          <span className="text-white text-sm font-medium">Preview: {isSlider ? 'Slider Banner' : 'Popup Banner'}</span>
          <span className="px-2 py-0.5 text-xs rounded bg-yellow-400/20 text-yellow-400">{banner.title}</span>
        </div>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-auto flex items-center justify-center p-8">
        {isSlider ? (
          <div className="w-full max-w-5xl rounded-2xl overflow-hidden bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] shadow-2xl" style={{ minHeight: 380 }}>
            <div className="flex" style={{ minHeight: 380 }}>
              <div className="flex-1 flex flex-col justify-center px-12 py-10 space-y-4">
                <span className="inline-block px-3 py-1 bg-yellow-400/20 text-yellow-400 text-xs font-semibold rounded-full w-fit">SLIDER BANNER</span>
                <h2 className="text-4xl font-bold text-white leading-tight">{banner.title || 'Judul Banner'}</h2>
                {banner.description && <p className="text-gray-300 text-lg leading-relaxed max-w-md">{banner.description}</p>}
                {banner.link && (
                  <div className="pt-2">
                    <span className="inline-block px-6 py-3 bg-yellow-400 text-black font-bold rounded-xl text-sm">Pelajari Lebih Lanjut →</span>
                  </div>
                )}
                <p className="text-gray-600 text-xs pt-2">Link: {banner.link || '(tidak ada)'}</p>
              </div>
              <div className="w-2/5 shrink-0 relative">
                {imgSrc ? (
                  <img src={imgSrc} alt={banner.title} className="w-full h-full object-cover" style={{ minHeight: 380 }} />
                ) : (
                  <div className="w-full h-full bg-[#333] flex items-center justify-center" style={{ minHeight: 380 }}>
                    <span className="text-gray-500 text-sm">No image</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-[#1a1a1a] to-transparent w-20" />
              </div>
            </div>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute inset-0 -m-16 bg-black/40 rounded-2xl" />
            <div className="relative z-10 w-96 rounded-2xl overflow-hidden bg-[#1a1a1a] shadow-2xl border border-yellow-400/20">
              <button className="absolute top-3 right-3 z-20 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center text-white">
                <X className="w-4 h-4" />
              </button>
              <div className="h-56 relative">
                {imgSrc ? (
                  <img src={imgSrc} alt={banner.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#333] flex items-center justify-center">
                    <span className="text-gray-500 text-sm">No image</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] to-transparent" />
              </div>
              <div className="px-6 pb-6 pt-3 space-y-3">
                <span className="inline-block px-2.5 py-1 bg-yellow-400/20 text-yellow-400 text-xs font-semibold rounded-full">PROMO</span>
                <h3 className="text-xl font-bold text-white">{banner.title || 'Judul Popup'}</h3>
                {banner.description && <p className="text-gray-400 text-sm">{banner.description}</p>}
                {banner.link && (
                  <span className="block w-full text-center py-2.5 bg-yellow-400 text-black font-bold rounded-xl text-sm cursor-pointer">
                    Lihat Selengkapnya →
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="px-6 py-3 border-t border-white/10 text-center">
        <p className="text-gray-500 text-xs">Preview estimasi. Tampilan aktual dapat sedikit berbeda sesuai layout website.</p>
      </div>
    </div>
  );
};

const Banners = () => {
  const { toast } = useToast();
  const adminAccess = useAdminAccess();
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [previewBanner, setPreviewBanner] = useState(null);
  const [formData, setFormData] = useState({
    title: '', description: '', link: '', type: 'slider', order: 0, imageUrl: '',
  });
  const [activeTab, setActiveTab] = useState('slider');
  const canCreateBanner = adminAccess.hasPermission('banners.create');
  const canEditBanner = adminAccess.hasPermission('banners.edit');
  const canDeleteBanner = adminAccess.hasPermission('banners.delete');
  const canManageBanner = adminAccess.hasPermission('banners.manage');

  useEffect(() => { loadBanners(); }, []);

  const loadBanners = async () => {
    try {
      const res = await bannersAPI.getAll();
      setBanners(res.data);
    } catch {
      toast({ title: 'Error', description: 'Gagal memuat banner', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingBanner ? !canEditBanner : !canCreateBanner) return;
    if (!formData.imageUrl && !editingBanner) {
      toast({ title: 'Error', description: 'Upload gambar terlebih dahulu', variant: 'destructive' });
      return;
    }
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        link: formData.link,
        type: formData.type,
        order: Number(formData.order),
        imageUrl: formData.imageUrl,
      };
      if (editingBanner) {
        await bannersAPI.update(editingBanner._id, payload);
        toast({ title: 'Sukses', description: 'Banner berhasil diupdate' });
      } else {
        await bannersAPI.create(payload);
        toast({ title: 'Sukses', description: 'Banner berhasil ditambahkan' });
      }
      setShowModal(false);
      resetForm();
      loadBanners();
    } catch {
      toast({ title: 'Error', description: 'Gagal menyimpan banner', variant: 'destructive' });
    }
  };

  const handleEdit = (banner) => {
    if (!canEditBanner) return;
    setEditingBanner(banner);
    setFormData({
      title: banner.title, description: banner.description || '',
      link: banner.link || '', type: banner.type,
      order: banner.order, imageUrl: banner.imageUrl || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!canDeleteBanner) return;
    if (!window.confirm('Yakin ingin menghapus banner ini')) return;
    try {
      await bannersAPI.delete(id);
      toast({ title: 'Sukses', description: 'Banner berhasil dihapus' });
      loadBanners();
    } catch { toast({ title: 'Error', description: 'Gagal menghapus banner', variant: 'destructive' }); }
  };

  const toggleStatus = async (banner) => {
    if (!canManageBanner) return;
    try {
      await bannersAPI.update(banner._id, { ...banner, isActive: !banner.isActive });
      loadBanners();
    } catch { toast({ title: 'Error', description: 'Gagal mengubah status', variant: 'destructive' }); }
  };

  const resetForm = () => {
    setFormData({ title: '', description: '', link: '', type: 'slider', order: 0, imageUrl: '' });
    setEditingBanner(null);
  };

  const openCreate = () => {
    if (!canCreateBanner) return;
    resetForm();
    setFormData(f => ({ ...f, type: activeTab }));
    setShowModal(true);
  };
  const filteredBanners = banners.filter(b => b.type === activeTab);

  return (
    <div>
      {previewBanner && <BannerPreviewModal banner={previewBanner} onClose={() => setPreviewBanner(null)} />}

      <PageHeader icon={Monitor} title="Banners" description="Kelola banner slider dan popup website">
        {canCreateBanner ? <Button onClick={openCreate} className="bg-yellow-400 text-black hover:bg-yellow-500">
          <Plus className="w-4 h-4 mr-2" /> Tambah Banner
        </Button> : null}
      </PageHeader>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {['slider', 'popup'].map(type => (
          <Button key={type}
            variant={activeTab === type ? 'default' : 'outline'}
            onClick={() => setActiveTab(type)}
            className={activeTab === type ? 'bg-yellow-400 text-black' : 'border-yellow-400/50 text-yellow-400'}
          >
            {type === 'slider' ? '🖼 Slider' : '🎯 Popup'} ({banners.filter(b => b.type === type).length})
          </Button>
        ))}
      </div>

      {loading ? (
        <CardGridSkeleton cols={3} cards={6} />
      ) : filteredBanners.length === 0 ? (
        <EmptyState icon={Monitor} title={`Belum ada banner ${activeTab}`} description={canCreateBanner ? 'Klik Tambah Banner untuk menambahkan' : 'Belum ada banner yang bisa ditampilkan.'} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredBanners.sort((a, b) => a.order - b.order).map(banner => {
            const imgSrc = resolveBackendAssetUrl(banner.imageUrl);
            return (
              <Card key={banner._id} className="bg-[#2a2a2a] border-yellow-400/20 overflow-hidden group">
                {/* Visual mockup area */}
                <div className={`relative overflow-hidden ${activeTab === 'slider' ? 'aspect-video' : 'h-56'}`}>
                  {imgSrc ? (
                    <img src={imgSrc} alt={banner.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-[#1a1a1a] flex items-center justify-center">
                      <Monitor className="w-12 h-12 text-gray-600" />
                    </div>
                  )}
                  {activeTab === 'slider' && (
                    <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent flex flex-col justify-center pl-5 pr-20">
                      <h4 className="text-white font-bold text-sm line-clamp-2">{banner.title}</h4>
                      {banner.description && <p className="text-gray-300 text-xs mt-1 line-clamp-1">{banner.description}</p>}
                      <div className="mt-2 inline-block px-2.5 py-1 bg-yellow-400 text-black text-xs font-bold rounded w-fit">CTA →</div>
                    </div>
                  )}
                  {activeTab === 'popup' && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3">
                      <h4 className="text-white font-bold text-xs line-clamp-1">{banner.title}</h4>
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${banner.isActive ? 'bg-green-400 text-black' : 'bg-gray-500 text-white'}`}>
                      {banner.isActive ? 'Aktif' : 'Non-aktif'}
                    </span>
                  </div>
                  <button
                    onClick={() => setPreviewBanner(banner)}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl text-white text-sm font-medium border border-white/20">
                      <Maximize2 className="w-4 h-4" /> Lihat Preview
                    </div>
                  </button>
                </div>

                <CardContent className="p-4 space-y-3">
                  <div>
                    <h3 className="text-white font-semibold text-sm">{banner.title}</h3>
                    {banner.description && <p className="text-gray-400 text-xs mt-0.5 line-clamp-2">{banner.description}</p>}
                    {banner.link && <p className="text-yellow-400/70 text-xs mt-1 truncate">🔗 {banner.link}</p>}
                  </div>
                  <div className="flex gap-2">
                    {canEditBanner ? <Button size="sm" variant="outline" className="flex-1 border-yellow-400/50 text-yellow-400 h-8" onClick={() => handleEdit(banner)}>
                      <Edit className="w-3 h-3 mr-1" /> Edit
                    </Button> : null}
                    <Button size="sm" variant="outline" className="border-blue-400/50 text-blue-400 h-8 px-2" onClick={() => setPreviewBanner(banner)}>
                      <Maximize2 className="w-3 h-3" />
                    </Button>
                    {canManageBanner ? <Button size="sm" variant="outline" className="border-gray-400/50 text-gray-400 h-8 px-2" onClick={() => toggleStatus(banner)}>
                      {banner.isActive ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </Button> : null}
                    {canDeleteBanner ? <Button size="sm" variant="outline" className="border-red-400/50 text-red-400 h-8 px-2" onClick={() => handleDelete(banner._id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button> : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit / Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#2a2a2a] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-5 border-b border-yellow-400/20 flex justify-between items-center sticky top-0 bg-[#2a2a2a] z-10">
              <h2 className="text-xl font-bold text-white">{editingBanner ? 'Edit Banner' : 'Tambah Banner Baru'}</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-5">
              <div>
                <Label className="text-white mb-2 block">Gambar Banner {!editingBanner && '*'}</Label>
                <SharedImageUploader
                  value={formData.imageUrl}
                  onChange={url => setFormData(f => ({ ...f, imageUrl: url }))}
                  category="banners"
                  size="md"
                  placeholder="Klik untuk upload gambar banner"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white mb-1.5 block">Tipe Banner</Label>
                  <select value={formData.type} onChange={e => setFormData(f => ({ ...f, type: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-yellow-400/20 rounded-lg p-2.5 text-white">
                    <option value="slider">🖼 Slider</option>
                    <option value="popup">🎯 Popup</option>
                  </select>
                </div>
                <div>
                  <Label className="text-white mb-1.5 block">Urutan</Label>
                  <Input type="number" min={0} value={formData.order}
                    onChange={e => setFormData(f => ({ ...f, order: parseInt(e.target.value) || 0 }))}
                    className="bg-[#1a1a1a] border-yellow-400/20 text-white" />
                </div>
              </div>

              <div>
                <Label className="text-white mb-1.5 block">Judul *</Label>
                <Input value={formData.title} onChange={e => setFormData(f => ({ ...f, title: e.target.value }))} required
                  placeholder="Judul yang tampil di banner" className="bg-[#1a1a1a] border-yellow-400/20 text-white" />
              </div>

              <div>
                <Label className="text-white mb-1.5 block">Deskripsi</Label>
                <textarea value={formData.description} onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                  rows={3} placeholder="Teks deskripsi / subtitle banner"
                  className="w-full bg-[#1a1a1a] border border-yellow-400/20 rounded-lg p-2.5 text-white resize-none" />
              </div>

              <div>
                <Label className="text-white mb-1.5 block">Link Tujuan</Label>
                <Input value={formData.link} onChange={e => setFormData(f => ({ ...f, link: e.target.value }))}
                  placeholder="/halaman-tujuan atau https://..."
                  className="bg-[#1a1a1a] border-yellow-400/20 text-white" />
              </div>

              {formData.imageUrl && (
                <div className="border border-yellow-400/20 rounded-lg p-3 bg-[#1a1a1a]">
                  <p className="text-xs text-gray-400 mb-2 flex items-center gap-1.5">
                    <Monitor className="w-3 h-3" /> Preview mini
                  </p>
                  <div className={`relative overflow-hidden rounded ${formData.type === 'slider' ? 'aspect-video' : 'h-40 w-32'}`}>
                    <img
                      src={resolveBackendAssetUrl(formData.imageUrl)}
                      alt="preview" className="w-full h-full object-cover"
                    />
                    {formData.type === 'slider' && (
                      <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent flex flex-col justify-center pl-3">
                        <p className="text-white text-xs font-bold line-clamp-1">{formData.title || 'Judul Banner'}</p>
                        {formData.description && <p className="text-gray-300 text-xs line-clamp-1 mt-0.5">{formData.description}</p>}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2 border-t border-yellow-400/20">
                <Button type="button" variant="outline" onClick={() => { setShowModal(false); resetForm(); }}
                  className="flex-1 border-gray-600 text-gray-300">Batal</Button>
                <Button type="submit" className="flex-1 bg-yellow-400 text-black hover:bg-yellow-500">
                  {editingBanner ? 'Simpan Perubahan' : 'Tambah Banner'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Banners;
