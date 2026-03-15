// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { CreditCard, Globe, GraduationCap, Landmark, Save, Settings as SettingsIcon, ShieldCheck, Upload } from 'lucide-react';
import { settingsAPI } from '../../services/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
import { useToast } from '../../hooks/use-toast';
import { useTheme } from '../../contexts/ThemeContext';
import LoadingSpinner from '../../components/ui/loading-spinner';
import PageHeader from '../../components/ui/page-header';
import { DEFAULT_SITE_SETTINGS } from '../../lib/site-settings';
import { formatCurrency } from '../../lib/utils';

const fmt = formatCurrency;

function SummaryCard({ icon: Icon, label, value, note, color = 'text-white' }) {
  return (
    <Card className="border-yellow-400/20 bg-[#2a2a2a]">
      <CardContent className="flex items-start gap-3 p-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1a1a1a]">
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div>
          <p className="text-xs text-gray-400">{label}</p>
          <p className={`mt-1 text-lg font-bold ${color}`}>{value}</p>
          {note ? <p className="mt-1 text-xs text-gray-500">{note}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

function assetUrl(value) {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  const backend = String(process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '');
  return value.startsWith('/uploads/') && backend ? `${backend}${value}` : value;
}

export default function Settings() {
  const { toast } = useToast();
  const { reloadSettings, applyTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState('');
  const [savingJenjang, setSavingJenjang] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SITE_SETTINGS);
  const [jenjangConfig, setJenjangConfig] = useState(null);
  const [systemSummary, setSystemSummary] = useState(null);

  useEffect(() => {
    void bootstrap();
  }, []);

  const bootstrap = async () => {
    try {
      const [settingsRes, jenjangRes, summaryRes] = await Promise.all([
        settingsAPI.get(),
        settingsAPI.getJenjangConfig(),
        settingsAPI.getSystemSummary(),
      ]);
      setSettings(settingsRes.data || DEFAULT_SITE_SETTINGS);
      setJenjangConfig(jenjangRes.data || null);
      setSystemSummary(summaryRes.data || null);
    } catch (error) {
      toast({ title: 'Gagal memuat pengaturan', description: 'Halaman pengaturan belum bisa mengambil konfigurasi terbaru dari backend.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsAPI.update(settings);
      applyTheme(settings);
      await reloadSettings();
      const latestSummary = await settingsAPI.getSystemSummary();
      setSystemSummary(latestSummary.data || null);
      toast({ title: 'Pengaturan tersimpan', description: 'Konfigurasi website sudah diselaraskan dengan backend terbaru.' });
    } catch (error) {
      toast({ title: 'Gagal menyimpan', description: 'Perubahan belum berhasil disimpan ke backend.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveJenjang = async () => {
    if (!jenjangConfig) return;
    setSavingJenjang(true);
    try {
      await settingsAPI.updateJenjangConfig(jenjangConfig);
      toast({ title: 'Jenjang tersimpan', description: 'Konfigurasi jenjang tes berhasil diperbarui.' });
    } catch (error) {
      toast({ title: 'Gagal menyimpan jenjang', description: 'Konfigurasi jenjang belum berhasil disimpan.', variant: 'destructive' });
    } finally {
      setSavingJenjang(false);
    }
  };

  const handleJenjangChange = (key, field, value) => {
    setJenjangConfig((current) => ({
      ...current,
      [key]: {
        ...current[key],
        [field]: field === 'label' ? value : Number(value),
      },
    }));
  };

  const handleFileUpload = async (assetType, file) => {
    setUploading(assetType);
    try {
      const response = await settingsAPI.uploadAsset(assetType, file);
      const uploadedUrl = response.data?.url || '';
      if (assetType === 'logo') {
        handleChange('logoUrl', uploadedUrl);
      }
      if (assetType === 'favicon') {
        handleChange('faviconUrl', uploadedUrl);
      }
      toast({ title: 'Upload berhasil', description: `Asset ${assetType} berhasil diunggah.` });
    } catch (error) {
      toast({ title: 'Upload gagal', description: 'Asset belum berhasil diunggah ke backend.', variant: 'destructive' });
    } finally {
      setUploading('');
    }
  };

  const referralSummary = useMemo(() => ({
    totalPrice: systemSummary?.pricing?.referralTotalPrice || 250000,
    shareBudget: systemSummary?.pricing?.referralShareBudget || 150000,
  }), [systemSummary]);

  if (loading) {
    return <LoadingSpinner size="lg" text="Memuat pengaturan website..." className="min-h-[60vh]" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <PageHeader icon={SettingsIcon} title="Pengaturan Website" />
        <Button onClick={() => void handleSave()} disabled={saving} className="bg-yellow-400 text-black hover:bg-yellow-500">
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={CreditCard} label="Gateway Aktif" value={systemSummary?.paymentGateway?.activeProvider || 'MIDTRANS'} note={`Mode ${systemSummary?.paymentGateway?.mode || 'sandbox'}`} color="text-yellow-400" />
        <SummaryCard icon={Landmark} label="Harga Test Premium" value={fmt(systemSummary?.pricing?.testPrice || settings.paymentAmount || 100000)} note="Dipakai backend payment service" color="text-green-400" />
        <SummaryCard icon={ShieldCheck} label="Developer Fee" value={`${systemSummary?.developerFee?.percent ?? settings.devFeePercent ?? 5}%`} note="Dipakai backend finance report" color="text-cyan-400" />
        <SummaryCard icon={GraduationCap} label="Skema Referral Yayasan" value={fmt(referralSummary.totalPrice)} note={`Budget share ${fmt(referralSummary.shareBudget)}`} color="text-purple-400" />
      </div>

      <Card className="border-yellow-400/20 bg-[#2a2a2a]">
        <CardHeader>
          <CardTitle className="text-white">Status Integrasi Backend</CardTitle>
          <CardDescription className="text-gray-400">Bagian ini menunjukkan konfigurasi yang benar-benar dibaca oleh backend saat ini.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl bg-[#1a1a1a] p-4">
            <p className="text-xs text-gray-400">Payment Gateway</p>
            <p className="mt-1 font-semibold text-white">{systemSummary?.paymentGateway?.isConfigured ? 'Midtrans siap dipakai' : 'Midtrans belum lengkap'}</p>
            <p className="mt-2 text-xs text-gray-500">PayDisini masih disimpan sebagai data legacy, tetapi alur pembayaran backend aktif sekarang memakai Midtrans berbasis environment variable.</p>
          </div>
          <div className="rounded-xl bg-[#1a1a1a] p-4">
            <p className="text-xs text-gray-400">Pricing Engine</p>
            <p className="mt-1 font-semibold text-white">Harga user individu dari `paymentAmount`</p>
            <p className="mt-2 text-xs text-gray-500">Jalur yayasan memakai total tetap {fmt(referralSummary.totalPrice)} dan pembagiannya dikunci oleh approval mitra + review admin.</p>
          </div>
          <div className="rounded-xl bg-[#1a1a1a] p-4">
            <p className="text-xs text-gray-400">Feature Flags</p>
            <p className="mt-1 font-semibold text-white">
              Registrasi {systemSummary?.featureFlags?.allowRegistration ? 'aktif' : 'dinonaktifkan'} • Pembayaran {systemSummary?.featureFlags?.requirePayment ? 'wajib' : 'opsional'}
            </p>
            <p className="mt-2 text-xs text-gray-500">Mode maintenance saat ini {systemSummary?.featureFlags?.maintenanceMode ? 'aktif' : 'nonaktif'}.</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <Card className="border-yellow-400/20 bg-[#2a2a2a]">
            <CardHeader>
              <CardTitle className="text-white">Pricing & Revenue</CardTitle>
              <CardDescription className="text-gray-400">Pengaturan yang terhubung langsung ke payment service dan finance report.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <Label className="text-gray-300">Harga Test Premium</Label>
                <Input type="number" value={settings.paymentAmount || 100000} onChange={(event) => handleChange('paymentAmount', Number(event.target.value || 0))} className="bg-[#1a1a1a] text-white" />
              </div>
              <div>
                <Label className="text-gray-300">Developer Fee Percent</Label>
                <Input type="number" value={settings.devFeePercent || 5} onChange={(event) => handleChange('devFeePercent', Number(event.target.value || 0))} className="bg-[#1a1a1a] text-white" />
              </div>
              <div className="md:col-span-2 rounded-lg border border-yellow-400/10 bg-[#1a1a1a] p-4 text-sm text-gray-400">
                Harga jalur yayasan tidak diinput manual di sini. Backend menghitung jalur yayasan dari total tetap {fmt(referralSummary.totalPrice)} lalu membaginya ke yayasan dan mitra sesuai approval flow.
              </div>
            </CardContent>
          </Card>

          <Card className="border-yellow-400/20 bg-[#2a2a2a]">
            <CardHeader>
              <CardTitle className="text-white">Payment & Bank Transfer</CardTitle>
              <CardDescription className="text-gray-400">Instruksi transfer manual dan metadata gateway yang masih disimpan di setting.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <Label className="text-gray-300">Nama Bank</Label>
                <Input value={settings.bankName || ''} onChange={(event) => handleChange('bankName', event.target.value)} className="bg-[#1a1a1a] text-white" />
              </div>
              <div>
                <Label className="text-gray-300">Nomor Rekening</Label>
                <Input value={settings.bankAccountNumber || ''} onChange={(event) => handleChange('bankAccountNumber', event.target.value)} className="bg-[#1a1a1a] text-white" />
              </div>
              <div>
                <Label className="text-gray-300">Atas Nama Rekening</Label>
                <Input value={settings.bankAccountName || ''} onChange={(event) => handleChange('bankAccountName', event.target.value)} className="bg-[#1a1a1a] text-white" />
              </div>
              <div>
                <Label className="text-gray-300">PayDisini API ID</Label>
                <Input value={settings.paydisiniApiId || ''} onChange={(event) => handleChange('paydisiniApiId', event.target.value)} className="bg-[#1a1a1a] text-white" />
              </div>
              <div className="md:col-span-2">
                <Label className="text-gray-300">Instruksi Pembayaran</Label>
                <Textarea value={settings.paymentInstructions || ''} onChange={(event) => handleChange('paymentInstructions', event.target.value)} className="min-h-[120px] bg-[#1a1a1a] text-white" />
              </div>
              <div className="md:col-span-2 rounded-lg border border-cyan-400/20 bg-cyan-400/10 p-4 text-sm text-cyan-100">
                Gateway aktif backend sekarang adalah Midtrans. Field PayDisini hanya disimpan sebagai data lama dan tidak dipakai oleh payment controller terbaru.
              </div>
            </CardContent>
          </Card>

          <Card className="border-yellow-400/20 bg-[#2a2a2a]">
            <CardHeader>
              <CardTitle className="text-white">Developer Disbursement</CardTitle>
              <CardDescription className="text-gray-400">Dipakai oleh halaman laporan pendapatan dan uang keluar saat membuat pencairan developer.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div>
                <Label className="text-gray-300">Bank Developer</Label>
                <Input value={settings.devBankName || ''} onChange={(event) => handleChange('devBankName', event.target.value)} className="bg-[#1a1a1a] text-white" />
              </div>
              <div>
                <Label className="text-gray-300">Rekening Developer</Label>
                <Input value={settings.devBankAccount || ''} onChange={(event) => handleChange('devBankAccount', event.target.value)} className="bg-[#1a1a1a] text-white" />
              </div>
              <div>
                <Label className="text-gray-300">Atas Nama</Label>
                <Input value={settings.devAccountName || ''} onChange={(event) => handleChange('devAccountName', event.target.value)} className="bg-[#1a1a1a] text-white" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-yellow-400/20 bg-[#2a2a2a]">
            <CardHeader>
              <CardTitle className="text-white">Konfigurasi Jenjang Tes</CardTitle>
              <CardDescription className="text-gray-400">Konfigurasi ini dibaca backend dari endpoint `jenjang-config`.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(jenjangConfig || {}).map(([key, value]) => (
                <div key={key} className="grid gap-3 rounded-xl border border-yellow-400/10 bg-[#1a1a1a] p-4 md:grid-cols-3">
                  <div>
                    <Label className="text-gray-300">Label</Label>
                    <Input value={value.label} onChange={(event) => handleJenjangChange(key, 'label', event.target.value)} className="bg-[#121212] text-white" />
                  </div>
                  <div>
                    <Label className="text-gray-300">Usia Minimum</Label>
                    <Input type="number" value={value.min} onChange={(event) => handleJenjangChange(key, 'min', event.target.value)} className="bg-[#121212] text-white" />
                  </div>
                  <div>
                    <Label className="text-gray-300">Usia Maksimum</Label>
                    <Input type="number" value={value.max} onChange={(event) => handleJenjangChange(key, 'max', event.target.value)} className="bg-[#121212] text-white" />
                  </div>
                </div>
              ))}
              <Button onClick={() => void handleSaveJenjang()} disabled={savingJenjang} variant="outline" className="border-yellow-400/30 text-yellow-400">
                {savingJenjang ? 'Menyimpan...' : 'Simpan Jenjang'}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-yellow-400/20 bg-[#2a2a2a]">
            <CardHeader>
              <CardTitle className="text-white">Identitas Website</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-gray-300">Nama Situs</Label>
                <Input value={settings.siteName || ''} onChange={(event) => handleChange('siteName', event.target.value)} className="bg-[#1a1a1a] text-white" />
              </div>
              <div>
                <Label className="text-gray-300">Email Kontak</Label>
                <Input value={settings.email || ''} onChange={(event) => handleChange('email', event.target.value)} className="bg-[#1a1a1a] text-white" />
              </div>
              <div>
                <Label className="text-gray-300">WhatsApp</Label>
                <Input value={settings.whatsapp || ''} onChange={(event) => handleChange('whatsapp', event.target.value)} className="bg-[#1a1a1a] text-white" />
              </div>
              <div>
                <Label className="text-gray-300">Alamat</Label>
                <Textarea value={settings.address || ''} onChange={(event) => handleChange('address', event.target.value)} className="min-h-[100px] bg-[#1a1a1a] text-white" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-yellow-400/20 bg-[#2a2a2a]">
            <CardHeader>
              <CardTitle className="text-white">Logo & Favicon</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-yellow-400/10 bg-[#1a1a1a] p-4">
                <Label className="text-gray-300">Upload Logo</Label>
                <Input type="file" accept="image/*" onChange={(event) => event.target.files?.[0] && handleFileUpload('logo', event.target.files[0])} className="mt-2 bg-[#121212] text-white" />
                {assetUrl(settings.logoUrl) ? <img src={assetUrl(settings.logoUrl)} alt="Logo" className="mt-4 h-16 rounded bg-white/5 p-2" /> : null}
              </div>
              <div className="rounded-xl border border-yellow-400/10 bg-[#1a1a1a] p-4">
                <Label className="text-gray-300">Upload Favicon</Label>
                <Input type="file" accept="image/*" onChange={(event) => event.target.files?.[0] && handleFileUpload('favicon', event.target.files[0])} className="mt-2 bg-[#121212] text-white" />
                {assetUrl(settings.faviconUrl) ? <img src={assetUrl(settings.faviconUrl)} alt="Favicon" className="mt-4 h-10 rounded bg-white/5 p-2" /> : null}
              </div>
              {uploading ? (
                <div className="rounded-lg bg-yellow-400/10 p-3 text-xs text-yellow-200">
                  <Upload className="mr-2 inline h-4 w-4" />
                  Uploading {uploading}...
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-yellow-400/20 bg-[#2a2a2a]">
            <CardHeader>
              <CardTitle className="text-white">Feature Flags</CardTitle>
              <CardDescription className="text-gray-400">Field ini disimpan di settings dan dibaca oleh bagian frontend maupun backend yang masih relevan.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-[#1a1a1a] p-4">
                <div>
                  <p className="text-sm font-medium text-white">Izinkan Registrasi Umum</p>
                  <p className="text-xs text-gray-500">Catatan: registrasi yayasan tetap dikunci via invite link mitra di backend.</p>
                </div>
                <Switch checked={!!settings.allowRegistration} onCheckedChange={(checked) => handleChange('allowRegistration', checked)} />
              </div>
              <div className="flex items-center justify-between rounded-xl bg-[#1a1a1a] p-4">
                <div>
                  <p className="text-sm font-medium text-white">Wajib Pembayaran</p>
                  <p className="text-xs text-gray-500">Digunakan untuk gating test premium pada alur website terbaru.</p>
                </div>
                <Switch checked={!!settings.requirePayment} onCheckedChange={(checked) => handleChange('requirePayment', checked)} />
              </div>
              <div className="flex items-center justify-between rounded-xl bg-[#1a1a1a] p-4">
                <div>
                  <p className="text-sm font-medium text-white">Maintenance Mode</p>
                  <p className="text-xs text-gray-500">Dipakai untuk menampilkan mode pemeliharaan bila diperlukan.</p>
                </div>
                <Switch checked={!!settings.maintenanceMode} onCheckedChange={(checked) => handleChange('maintenanceMode', checked)} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-yellow-400/20 bg-[#2a2a2a]">
            <CardHeader>
              <CardTitle className="text-white">SEO Ringkas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-gray-300">Meta Description</Label>
                <Textarea value={settings.seoMetaDescription || ''} onChange={(event) => handleChange('seoMetaDescription', event.target.value)} className="min-h-[120px] bg-[#1a1a1a] text-white" />
              </div>
              <div>
                <Label className="text-gray-300">SEO Keywords</Label>
                <Input value={settings.seoKeywords || ''} onChange={(event) => handleChange('seoKeywords', event.target.value)} className="bg-[#1a1a1a] text-white" />
              </div>
              <div className="rounded-xl border border-yellow-400/10 bg-[#1a1a1a] p-4 text-xs text-gray-500">
                Jika kamu perlu pengaturan yang benar-benar dipakai backend payment/config, prioritaskan bagian pricing, developer fee, jenjang, dan ringkasan integrasi di atas.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
