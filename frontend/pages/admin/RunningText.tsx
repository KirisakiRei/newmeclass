// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Megaphone, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import EmptyState from '../../components/ui/empty-state';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import LoadingSpinner from '../../components/ui/loading-spinner';
import PageHeader from '../../components/ui/page-header';
import { Switch } from '../../components/ui/switch';
import { Textarea } from '../../components/ui/textarea';
import { useToast } from '../../hooks/use-toast';
import { useAdminAccess } from '../../lib/admin-rbac';
import { runningInfoAPI } from '../../services/api';

const EMPTY_FORM = {
  message: '',
  linkText: '',
  linkUrl: '',
  isActive: true,
};

const DEFAULT_SETTINGS = {
  enabled: true,
  durationSeconds: 28,
};

const formatDate = (value) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const normalizeSettings = (value) => {
  const duration = Number(value?.durationSeconds);
  return {
    enabled: value?.enabled === undefined ? DEFAULT_SETTINGS.enabled : Boolean(value.enabled),
    durationSeconds: Number.isFinite(duration)
      ? Math.min(120, Math.max(10, Math.round(duration)))
      : DEFAULT_SETTINGS.durationSeconds,
  };
};

const RunningText = () => {
  const { toast } = useToast();
  const adminAccess = useAdminAccess();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [settingsForm, setSettingsForm] = useState(DEFAULT_SETTINGS);

  const canEdit = adminAccess.hasPermission('settings.edit');

  const activeCount = useMemo(
    () => items.filter((item) => item.isActive).length,
    [items],
  );

  const previewItems = useMemo(() => {
    const message = String(form.message || '').trim();
    if (message) {
      return [{
        id: editingId || 'draft',
        message,
        linkText: String(form.linkText || '').trim(),
        linkUrl: String(form.linkUrl || '').trim(),
      }];
    }

    const activeItems = items.filter((item) => item.isActive);
    if (activeItems.length > 0) return activeItems;

    return [{
      id: 'placeholder',
      message: 'Pesan running text akan tampil full-width di bagian paling atas dashboard user.',
      linkText: 'Contoh link',
      linkUrl: '',
    }];
  }, [editingId, form.linkText, form.linkUrl, form.message, items]);

  const loadPageData = async () => {
    try {
      const [itemsResponse, settingsResponse] = await Promise.all([
        runningInfoAPI.getAll(),
        runningInfoAPI.getSettings(),
      ]);
      setItems(Array.isArray(itemsResponse?.data) ? itemsResponse.data : []);
      setSettingsForm(normalizeSettings(settingsResponse?.data));
    } catch (error) {
      toast({
        title: 'Gagal memuat running text',
        description: error?.response?.data?.message || 'Data running text belum bisa diambil dari server.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPageData();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canEdit || saving) return;

    const payload = {
      message: String(form.message || '').trim(),
      linkText: String(form.linkText || '').trim(),
      linkUrl: String(form.linkUrl || '').trim(),
      isActive: Boolean(form.isActive),
    };

    if (!payload.message) {
      toast({
        title: 'Pesan wajib diisi',
        description: 'Running text membutuhkan isi pesan agar bisa ditampilkan ke user.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await runningInfoAPI.update(editingId, payload);
        toast({ title: 'Running text diperbarui', description: 'Perubahan item marquee berhasil disimpan.' });
      } else {
        await runningInfoAPI.create(payload);
        toast({ title: 'Running text ditambahkan', description: 'Item baru siap tampil di dashboard user.' });
      }
      resetForm();
      await loadPageData();
    } catch (error) {
      toast({
        title: 'Gagal menyimpan running text',
        description: error?.response?.data?.message || 'Periksa kembali data yang dimasukkan.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!canEdit || savingSettings) return;
    const nextSettings = normalizeSettings(settingsForm);

    setSavingSettings(true);
    try {
      const response = await runningInfoAPI.updateSettings(nextSettings);
      setSettingsForm(normalizeSettings(response?.data));
      toast({
        title: 'Pengaturan marquee disimpan',
        description: 'Status tampil dan kecepatan running text berhasil diperbarui.',
      });
    } catch (error) {
      toast({
        title: 'Gagal menyimpan pengaturan marquee',
        description: error?.response?.data?.message || 'Pengaturan marquee belum bisa disimpan.',
        variant: 'destructive',
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setForm({
      message: item.message || '',
      linkText: item.linkText || '',
      linkUrl: item.linkUrl || '',
      isActive: Boolean(item.isActive),
    });
  };

  const handleToggle = async (item) => {
    if (!canEdit) return;
    try {
      await runningInfoAPI.update(item.id, { isActive: !item.isActive });
      toast({
        title: item.isActive ? 'Running text dinonaktifkan' : 'Running text diaktifkan',
        description: 'Status item running text berhasil diperbarui.',
      });
      await loadPageData();
    } catch (error) {
      toast({
        title: 'Gagal mengubah status',
        description: error?.response?.data?.message || 'Status running text belum bisa diubah.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (item) => {
    if (!canEdit) return;
    const confirmed = window.confirm(`Hapus running text ini?\n\n"${item.message}"`);
    if (!confirmed) return;

    try {
      await runningInfoAPI.delete(item.id);
      toast({ title: 'Running text dihapus', description: 'Item sudah dihapus dari daftar marquee.' });
      if (editingId === item.id) {
        resetForm();
      }
      await loadPageData();
    } catch (error) {
      toast({
        title: 'Gagal menghapus running text',
        description: error?.response?.data?.message || 'Item belum bisa dihapus dari server.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <LoadingSpinner size="lg" text="Memuat manajemen running text..." className="min-h-[60vh]" />;
  }

  return (
    <div className="space-y-6">
      <style>
        {`
          @keyframes admin-running-text-marquee {
            from { transform: translate3d(0, 0, 0); }
            to { transform: translate3d(-50%, 0, 0); }
          }

          .admin-running-text-track {
            animation-name: admin-running-text-marquee;
            animation-timing-function: linear;
            animation-iteration-count: infinite;
            will-change: transform;
          }

          @media (prefers-reduced-motion: reduce) {
            .admin-running-text-track {
              animation: none !important;
              transform: none !important;
              width: 100% !important;
            }

            .admin-running-text-duplicate {
              display: none !important;
            }
          }
        `}
      </style>

      <PageHeader
        icon={Megaphone}
        title="Running Text"
        description="Kelola strip running text full-width yang tampil di bagian paling atas dashboard user."
      >
        <Button
          onClick={() => void loadPageData()}
          variant="outline"
          className="border-yellow-400/50 text-yellow-400 hover:bg-yellow-400/10"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card className="border-yellow-400/20 bg-[#2a2a2a]">
            <CardHeader>
              <CardTitle className="text-white">Pengaturan Marquee</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between rounded-xl border border-yellow-400/15 bg-[#1f1f1f] px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-white">Tampilkan running text</p>
                  <p className="text-xs text-gray-400">Jika nonaktif, strip kuning tidak akan muncul di dashboard user.</p>
                </div>
                <Switch
                  checked={Boolean(settingsForm.enabled)}
                  onCheckedChange={(checked) => setSettingsForm((current) => ({ ...current, enabled: checked }))}
                  disabled={!canEdit || savingSettings}
                  className="data-[state=checked]:bg-yellow-400 data-[state=unchecked]:bg-gray-600"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="running-text-duration" className="text-gray-200">Kecepatan Marquee</Label>
                <Input
                  id="running-text-duration"
                  type="number"
                  min={10}
                  max={120}
                  value={settingsForm.durationSeconds}
                  onChange={(event) => setSettingsForm((current) => ({
                    ...current,
                    durationSeconds: event.target.value,
                  }))}
                  className="border-yellow-400/20 bg-[#1a1a1a] text-white"
                  disabled={!canEdit || savingSettings}
                />
                <p className="text-xs text-gray-400">
                  Nilai dalam detik per satu loop penuh. Semakin kecil angkanya, semakin cepat marquee berjalan.
                </p>
              </div>

              <div className="rounded-xl border border-yellow-400/15 bg-[#1f1f1f] px-4 py-3">
                <p className="text-xs uppercase tracking-[0.22em] text-yellow-400">Preview Full-Width</p>
                <div className="mt-3 overflow-hidden rounded-lg border border-yellow-300/60 bg-yellow-400 text-[#1a1a1a]">
                  {Boolean(settingsForm.enabled) ? (
                    <div
                      className="admin-running-text-track flex w-max min-w-full"
                      style={{ animationDuration: `${normalizeSettings(settingsForm).durationSeconds}s` }}
                    >
                      {Array.from({ length: 2 }).map((_, trackIndex) => (
                        <div
                          key={`preview-track-${trackIndex}`}
                          className={`inline-flex min-w-full shrink-0 items-center gap-8 px-4 py-3 text-sm font-semibold ${trackIndex === 1 ? 'admin-running-text-duplicate' : ''}`}
                        >
                          {previewItems.map((item, itemIndex) => (
                            <span key={`${item.id || item.message}-${trackIndex}-${itemIndex}`} className="inline-flex items-center gap-3">
                              <span className="h-2.5 w-2.5 rounded-full bg-[#1a1a1a]" />
                              <span>{item.message}</span>
                              {item.linkText ? (
                                <span className="font-black underline underline-offset-4">{item.linkText}</span>
                              ) : null}
                            </span>
                          ))}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-3 text-sm font-medium text-[#1a1a1a]">
                      Running text sedang nonaktif.
                    </div>
                  )}
                </div>
              </div>

              <Button
                type="button"
                className="bg-yellow-400 text-black hover:bg-yellow-500"
                disabled={!canEdit || savingSettings}
                onClick={() => void handleSaveSettings()}
              >
                {savingSettings ? 'Menyimpan...' : 'Simpan Pengaturan Marquee'}
              </Button>

              {!canEdit ? (
                <p className="text-xs text-yellow-300">
                  Akun Anda hanya punya akses lihat. Minta permission `settings.edit` jika perlu mengubah marquee.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-yellow-400/20 bg-[#2a2a2a]">
            <CardHeader>
              <CardTitle className="text-white">
                {editingId ? 'Edit Running Text' : 'Tambah Running Text'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="running-text-message" className="text-gray-200">Pesan</Label>
                  <Textarea
                    id="running-text-message"
                    value={form.message}
                    onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
                    placeholder="Contoh: Promo test premium minggu ini dapat bonus sesi konsultasi."
                    className="min-h-[120px] border-yellow-400/20 bg-[#1a1a1a] text-white"
                    disabled={!canEdit || saving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="running-text-link-text" className="text-gray-200">Teks Link</Label>
                  <Input
                    id="running-text-link-text"
                    value={form.linkText}
                    onChange={(event) => setForm((current) => ({ ...current, linkText: event.target.value }))}
                    placeholder="Pelajari lebih lanjut"
                    className="border-yellow-400/20 bg-[#1a1a1a] text-white"
                    disabled={!canEdit || saving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="running-text-link-url" className="text-gray-200">URL Link</Label>
                  <Input
                    id="running-text-link-url"
                    value={form.linkUrl}
                    onChange={(event) => setForm((current) => ({ ...current, linkUrl: event.target.value }))}
                    placeholder="https://newme.id/services/personality-tests"
                    className="border-yellow-400/20 bg-[#1a1a1a] text-white"
                    disabled={!canEdit || saving}
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl border border-yellow-400/15 bg-[#1f1f1f] px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-white">Aktifkan item ini</p>
                    <p className="text-xs text-gray-400">Jika aktif, item ini ikut tampil di strip kuning dashboard user.</p>
                  </div>
                  <Switch
                    checked={Boolean(form.isActive)}
                    onCheckedChange={(checked) => setForm((current) => ({ ...current, isActive: checked }))}
                    disabled={!canEdit || saving}
                    className="data-[state=checked]:bg-yellow-400 data-[state=unchecked]:bg-gray-600"
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    type="submit"
                    className="bg-yellow-400 text-black hover:bg-yellow-500"
                    disabled={!canEdit || saving}
                  >
                    {editingId ? <Pencil className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                    {saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Tambah Running Text'}
                  </Button>
                  {editingId ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="border-gray-600 text-gray-200 hover:bg-white/5"
                      onClick={resetForm}
                      disabled={saving}
                    >
                      Batal Edit
                    </Button>
                  ) : null}
                </div>

                {!canEdit ? (
                  <p className="text-xs text-yellow-300">
                    Akun Anda hanya punya akses lihat. Minta permission `settings.edit` jika perlu mengubah item running text.
                  </p>
                ) : null}
              </form>
            </CardContent>
          </Card>
        </div>

        <Card className="border-yellow-400/20 bg-[#2a2a2a]">
          <CardHeader>
            <CardTitle className="text-white">Daftar Running Text</CardTitle>
            <p className="text-sm text-gray-400">
              Total {items.length} item, {activeCount} aktif dan siap tampil di dashboard user.
            </p>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <EmptyState
                icon="default"
                title="Belum ada running text"
                description="Tambahkan pesan pertama untuk menampilkan strip kuning di dashboard user."
              />
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-yellow-400/15 bg-[#1a1a1a] p-4"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            item.isActive
                              ? 'bg-green-500/15 text-green-300'
                              : 'bg-gray-500/15 text-gray-300'
                          }`}>
                            {item.isActive ? 'Aktif' : 'Nonaktif'}
                          </span>
                          <span className="text-xs text-gray-500">Dibuat {formatDate(item.createdAt)}</span>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-white">{item.message}</p>
                        {item.linkText || item.linkUrl ? (
                          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-gray-300">
                            {item.linkText ? (
                              <span className="rounded-full border border-yellow-400/20 px-3 py-1 text-yellow-400">
                                {item.linkText}
                              </span>
                            ) : null}
                            {item.linkUrl ? (
                              <a
                                href={item.linkUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-blue-300 hover:text-blue-200"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                {item.linkUrl}
                              </a>
                            ) : null}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2 lg:justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          className="border-green-500/40 text-green-300 hover:bg-green-500/10"
                          onClick={() => void handleToggle(item)}
                          disabled={!canEdit}
                        >
                          {item.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="border-yellow-400/40 text-yellow-300 hover:bg-yellow-400/10"
                          onClick={() => handleEdit(item)}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="border-red-500/40 text-red-300 hover:bg-red-500/10"
                          onClick={() => void handleDelete(item)}
                          disabled={!canEdit}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Hapus
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RunningText;
