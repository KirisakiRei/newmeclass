// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Users, Briefcase, Handshake } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useToast } from '../../hooks/use-toast';
import PageHeader from '../../components/ui/page-header';
import LoadingSpinner from '../../components/ui/loading-spinner';
import { DEFAULT_SITE_SETTINGS, normalizeSiteSettings } from '../../lib/site-settings';
import SharedImageUploader from '../../components/admin/SharedImageUploader.tsx';
import { resolveBackendAssetUrl } from '../../lib/admin-media';
import { settingsAPI } from '../../services/api';
import { useAdminAccess } from '../../lib/admin-rbac';

const TeamManagement = () => {
  const { toast } = useToast();
  const adminAccess = useAdminAccess();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(DEFAULT_SITE_SETTINGS);
  const [activeTab, setActiveTab] = useState('bod'); // 'bod', 'team', 'partners'
  
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    position: '',
    photo: '',
    description: ''
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await settingsAPI.getTeamManagement();
      setSettings(normalizeSiteSettings(response.data));
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal memuat data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const getCurrentList = () => {
    if (!settings) return [];
    switch (activeTab) {
      case 'bod':
        return settings.boardOfDirectors || [];
      case 'team':
        return settings.teamSupport || [];
      case 'partners':
        return settings.partners || [];
      default:
        return [];
    }
  };

  const getFieldName = () => {
    switch (activeTab) {
      case 'bod': return 'boardOfDirectors';
      case 'team': return 'teamSupport';
      case 'partners': return 'partners';
      default: return '';
    }
  };

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({ name: '', position: '', photo: '', description: '' });
    setShowModal(true);
  };

  const handleEdit = (item, index) => {
    setEditingItem(index);
    setFormData({ ...item });
    setShowModal(true);
  };

  const handleDelete = async (index) => {
    if (!adminAccess.hasPermission('team_management.delete')) {
      toast({ title: 'Akses ditolak', description: 'Permission hapus Team & Mitra belum diaktifkan.', variant: 'destructive' });
      return;
    }
    if (!window.confirm('Yakin ingin menghapus')) return;

    try {
      const currentList = getCurrentList();
      const newList = currentList.filter((_, i) => i !== index);

      await settingsAPI.updateTeamManagementSection(getFieldName(), newList);

      await loadSettings();
      toast({ title: 'Sukses', description: 'Data berhasil dihapus' });
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal menghapus data', variant: 'destructive' });
    }
  };

  const handleSave = async () => {
    const requiredPermission = editingItem !== null ? 'team_management.edit' : 'team_management.create';
    if (!adminAccess.hasPermission(requiredPermission)) {
      toast({ title: 'Akses ditolak', description: 'Permission simpan Team & Mitra belum diaktifkan.', variant: 'destructive' });
      return;
    }

    if (!formData.name || !formData.position) {
      toast({ title: 'Error', description: 'Nama dan posisi wajib diisi', variant: 'destructive' });
      return;
    }

    try {
      const currentList = getCurrentList();
      let newList;
      
      if (editingItem !== null) {
        // Edit existing
        newList = currentList.map((item, i) => i === editingItem ? formData : item);
      } else {
        // Add new
        newList = [...currentList, formData];
      }

      await settingsAPI.updateTeamManagementSection(getFieldName(), newList);

      await loadSettings();
      setShowModal(false);
      toast({ title: 'Sukses', description: 'Data berhasil disimpan' });
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal menyimpan data', variant: 'destructive' });
    }
  };

  const tabs = [
    { id: 'bod', label: 'Board of Directors', icon: Briefcase, color: 'yellow' },
    { id: 'team', label: 'Team Support', icon: Users, color: 'blue' },
    { id: 'partners', label: 'Mitra Yayasan & Korporasi', icon: Handshake, color: 'green' }
  ];
  const canCreateItems = adminAccess.hasPermission('team_management.create');
  const canEditItems = adminAccess.hasPermission('team_management.edit');
  const canDeleteItems = adminAccess.hasPermission('team_management.delete');

  if (loading) {
    return <LoadingSpinner size="lg" text="Memuat data tim..." className="min-h-[60vh]" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader icon={Users} title="Team Management" description="Kelola BOD, Tim Support, dan Mitra" />

      {/* Tabs */}
      <div className="flex gap-2 border-b border-yellow-400/20">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === tab.id ?
                   'border-yellow-400 text-yellow-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Add Button */}
      <div className="flex justify-end">
        <Button onClick={handleAdd} className="bg-yellow-400 text-black hover:bg-yellow-500" disabled={!canCreateItems}>
          <Plus className="w-4 h-4 mr-2" />
          Tambah {activeTab === 'bod' ? 'BOD' : activeTab === 'team' ? 'Team' : 'Mitra'}
        </Button>
      </div>

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {getCurrentList().map((item, index) => (
          <Card key={index} className="bg-[#2a2a2a] border-yellow-400/20">
            <CardContent className="p-6">
              {item.photo && (
                <div className="mb-4">
                  <img
                    src={resolveBackendAssetUrl(item.photo)}
                    alt={item.name}
                    className="w-full h-48 object-cover rounded-lg"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/300x200?text=No+Image';
                    }}
                  />
                </div>
              )}
              <h3 className="text-xl font-bold text-white mb-1">{item.name}</h3>
              <p className="text-yellow-400 mb-2">{item.position}</p>
              {item.description && (
                <p className="text-gray-400 text-sm mb-4 line-clamp-3">{item.description}</p>
              )}
              <div className="flex gap-2">
                {canEditItems ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEdit(item, index)}
                    className="flex-1 text-yellow-400 hover:bg-yellow-400/10"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                ) : null}
                {canDeleteItems ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(index)}
                    className="flex-1 text-red-400 hover:bg-red-400/10"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Hapus
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}

        {getCurrentList().length === 0 && (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-400">Belum ada data. Klik "Tambah" untuk menambah.</p>
          </div>
        )}
      </div>

      {!canCreateItems && !canEditItems && !canDeleteItems ? (
        <Card className="bg-yellow-400/10 border-yellow-400/30">
          <CardContent className="p-4 text-sm text-yellow-100">
            Permission Team & Mitra Anda saat ini hanya mengizinkan mode lihat. Aksi tambah, edit, dan hapus akan muncul jika role Anda diberi izin yang sesuai.
          </CardContent>
        </Card>
      ) : null}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl bg-[#2a2a2a] border-yellow-400/20 max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="text-white">
                {editingItem !== null ? 'Edit' : 'Tambah'} {activeTab === 'bod' ? 'BOD' : activeTab === 'team' ? 'Team' : 'Mitra'}
              </CardTitle>
              <CardDescription className="text-gray-400">
                Isi form di bawah untuk {editingItem !== null ? 'mengubah' : 'menambah'} data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-white">Nama *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nama lengkap"
                  className="bg-[#1a1a1a] text-white border-yellow-400/20"
                />
              </div>

              <div>
                <Label className="text-white">Posisi / Jabatan *</Label>
                <Input
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  placeholder="CEO, Manager, Partner, dll"
                  className="bg-[#1a1a1a] text-white border-yellow-400/20"
                />
              </div>

              <div>
                <Label className="text-white">Deskripsi (opsional)</Label>
                <Input
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Deskripsi singkat"
                  className="bg-[#1a1a1a] text-white border-yellow-400/20"
                />
              </div>

              <div>
                <Label className="text-white">Foto</Label>
                {formData.photo && (
                  <div className="mb-2">
                    <img
                      src={resolveBackendAssetUrl(formData.photo)}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  </div>
                )}
                <SharedImageUploader
                  value={formData.photo || ''}
                  onChange={(url) => setFormData((prev) => ({ ...prev, photo: url }))}
                  category="team"
                  size="md"
                  placeholder="Upload foto tim atau mitra"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Atau paste URL gambar langsung di field Photo URL
                </p>
                <Input
                  value={formData.photo || ''}
                  onChange={(e) => setFormData({ ...formData, photo: e.target.value })}
                  placeholder="https://example.com/photo.jpg"
                  className="bg-[#1a1a1a] text-white border-yellow-400/20 mt-2"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleSave}
                  className="flex-1 bg-yellow-400 text-black hover:bg-yellow-500"
                  disabled={editingItem !== null ? !canEditItems : !canCreateItems}
                >
                  Simpan
                </Button>
                <Button
                  onClick={() => setShowModal(false)}
                  variant="outline"
                  className="flex-1 border-yellow-400/20 text-gray-400"
                >
                  Batal
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default TeamManagement;
