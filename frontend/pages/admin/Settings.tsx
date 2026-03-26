// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { CreditCard, GraduationCap, Landmark, Save, Settings as SettingsIcon, ShieldCheck } from 'lucide-react';
import { settingsAPI } from '../../services/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { useToast } from '../../hooks/use-toast';
import { useTheme } from '../../contexts/ThemeContext';
import LoadingSpinner from '../../components/ui/loading-spinner';
import PageHeader from '../../components/ui/page-header';
import { DEFAULT_SITE_SETTINGS } from '../../lib/site-settings';
import { formatCurrency } from '../../lib/utils';
import { useAdminAccess } from '../../lib/admin-rbac';

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

export default function Settings() {
  const { toast } = useToast();
  const adminAccess = useAdminAccess();
  const { reloadSettings, applyTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingJenjang, setSavingJenjang] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [settings, setSettings] = useState(DEFAULT_SITE_SETTINGS);
  const [savedPricing, setSavedPricing] = useState({ paymentAmount: DEFAULT_SITE_SETTINGS.paymentAmount, devFeePercent: DEFAULT_SITE_SETTINGS.devFeePercent });
  const [jenjangConfig, setJenjangConfig] = useState(null);
  const [systemSummary, setSystemSummary] = useState(null);
  const canEditSettings = adminAccess.hasPermission('settings.edit');
  const canManageSettings = adminAccess.hasPermission('settings.manage');

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
      setSavedPricing({
        paymentAmount: Number(settingsRes.data?.paymentAmount || DEFAULT_SITE_SETTINGS.paymentAmount),
        devFeePercent: Number(settingsRes.data?.devFeePercent ?? DEFAULT_SITE_SETTINGS.devFeePercent),
      });
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

  const persistSettings = async (confirmation = '') => {
    setSaving(true);
    try {
      await settingsAPI.update({
        ...settings,
        ...(confirmation ? { confirmationText: confirmation } : {}),
      });
      applyTheme(settings);
      await reloadSettings();
      const latestSummary = await settingsAPI.getSystemSummary();
      setSystemSummary(latestSummary.data || null);
      setSavedPricing({
        paymentAmount: Number(settings.paymentAmount || DEFAULT_SITE_SETTINGS.paymentAmount),
        devFeePercent: Number(settings.devFeePercent ?? DEFAULT_SITE_SETTINGS.devFeePercent),
      });
      setConfirmationText('');
      setConfirmOpen(false);
      toast({ title: 'Pengaturan tersimpan', description: 'Konfigurasi website sudah diselaraskan dengan backend terbaru.' });
    } catch (error) {
      toast({ title: 'Gagal menyimpan', description: 'Perubahan belum berhasil disimpan ke backend.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const hasPricingChange =
    Number(settings.paymentAmount || 0) !== Number(savedPricing.paymentAmount || 0)
    || Number(settings.devFeePercent || 0) !== Number(savedPricing.devFeePercent || 0);

  const handleSave = async () => {
    if (!canEditSettings) return;
    if (hasPricingChange) {
      setConfirmationText('');
      setConfirmOpen(true);
      return;
    }
    await persistSettings();
  };

  const handleSaveJenjang = async () => {
    if (!canManageSettings || !jenjangConfig) return;
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
        <PageHeader icon={SettingsIcon} title="Pengaturan Operasional" />
        <Button onClick={() => void handleSave()} disabled={saving || !canEditSettings} className="bg-yellow-400 text-black hover:bg-yellow-500">
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Menyimpan...' : canEditSettings ? 'Simpan Pengaturan' : 'Read Only'}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={CreditCard} label="Gateway Aktif" value={systemSummary?.paymentGateway?.activeProvider || 'MIDTRANS'} note={`Mode ${systemSummary?.paymentGateway?.mode || 'sandbox'}`} color="text-yellow-400" />
        <SummaryCard icon={Landmark} label="Harga Test Premium" value={fmt(systemSummary?.pricing?.testPrice || settings.paymentAmount || DEFAULT_SITE_SETTINGS.paymentAmount)} note="Harga dasar test premium individu" color="text-green-400" />
        <SummaryCard icon={ShieldCheck} label="Fee Pengembang" value={`${systemSummary?.developerFee?.percent ?? settings.devFeePercent ?? 5}%`} note="Dipakai untuk pembagian pendapatan" color="text-cyan-400" />
        <SummaryCard icon={GraduationCap} label="Skema Referral Yayasan" value={fmt(referralSummary.totalPrice)} note={`Budget share ${fmt(referralSummary.shareBudget)}`} color="text-purple-400" />
      </div>

      <div className="space-y-6">
        <Card className="border-yellow-400/20 bg-[#2a2a2a]">
          <CardHeader>
            <CardTitle className="text-white">Pricing & Revenue</CardTitle>
            <CardDescription className="text-gray-400">Atur harga test premium individu dan persentase pembagian pendapatan.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-gray-300">Harga Test Premium</Label>
              <Input type="number" value={settings.paymentAmount || DEFAULT_SITE_SETTINGS.paymentAmount} onChange={(event) => handleChange('paymentAmount', Number(event.target.value || 0))} className="bg-[#1a1a1a] text-white" />
            </div>
            <div>
              <Label className="text-gray-300">Developer Fee Percent</Label>
              <Input type="number" value={settings.devFeePercent || 5} onChange={(event) => handleChange('devFeePercent', Number(event.target.value || 0))} className="bg-[#1a1a1a] text-white" />
            </div>
            <div className="md:col-span-2 rounded-lg border border-yellow-400/10 bg-[#1a1a1a] p-4 text-sm text-gray-400">
              Harga jalur yayasan tidak diatur manual di sini. Jalur yayasan tetap mengikuti skema referral yang sudah berjalan, yaitu total {fmt(referralSummary.totalPrice)} dengan budget share {fmt(referralSummary.shareBudget)}.
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-400/20 bg-[#2a2a2a]">
          <CardHeader>
            <CardTitle className="text-white">Pencairan Fee Pengembang</CardTitle>
            <CardDescription className="text-gray-400">Atur rekening tujuan untuk pencairan fee pengembang.</CardDescription>
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
            <CardDescription className="text-gray-400">Atur pembagian jenjang usia untuk test yang tersedia di sistem.</CardDescription>
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
            <Button onClick={() => void handleSaveJenjang()} disabled={savingJenjang || !canManageSettings} variant="outline" className="border-yellow-400/30 text-yellow-400">
              {savingJenjang ? 'Menyimpan...' : 'Simpan Jenjang'}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-yellow-400/20 bg-[#2a2a2a]">
          <CardHeader>
            <CardTitle className="text-white">Feature Flags</CardTitle>
            <CardDescription className="text-gray-400">Kontrol perilaku sistem yang tetap berada di dashboard admin.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-[#1a1a1a] p-4">
              <div>
                <p className="text-sm font-medium text-white">Izinkan Registrasi Umum</p>
                <p className="text-xs text-gray-500">Registrasi umum dapat dibuka atau ditutup sesuai kebutuhan.</p>
              </div>
              <Switch checked={!!settings.allowRegistration} onCheckedChange={(checked) => handleChange('allowRegistration', checked)} />
            </div>
            <div className="flex items-center justify-between rounded-xl bg-[#1a1a1a] p-4">
              <div>
                <p className="text-sm font-medium text-white">Wajib Pembayaran</p>
                <p className="text-xs text-gray-500">Gunakan jika akses ke layanan premium harus melalui pembayaran.</p>
              </div>
              <Switch checked={!!settings.requirePayment} onCheckedChange={(checked) => handleChange('requirePayment', checked)} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-400/20 bg-[#2a2a2a]">
          <CardHeader>
            <CardTitle className="text-white">Boundary Pengelolaan</CardTitle>
            <CardDescription className="text-gray-400">Pisahkan pengaturan operasional dashboard dengan pengaturan konten publik.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-300">
            <div className="rounded-xl border border-yellow-400/10 bg-[#1a1a1a] p-4">
              Branding publik, logo, favicon, SEO, navigation website, dan profil company sekarang dikelola dari Landing CMS agar sumber datanya tunggal.
            </div>
            <div className="rounded-xl border border-yellow-400/10 bg-[#1a1a1a] p-4">
              Dashboard admin ini difokuskan untuk pricing, pembagian fee, pencairan, jenjang tes, dan flag operasional aplikasi.
            </div>
          </CardContent>
        </Card>
      </div>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-lg border-yellow-400/20 bg-[#2a2a2a]">
          <DialogHeader>
            <DialogTitle className="text-white">Konfirmasi Perubahan Pricing</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-xl border border-yellow-400/10 bg-[#1a1a1a] p-4 text-sm text-gray-300">
              <p className="font-medium text-white">Perubahan ini akan memengaruhi transaksi baru</p>
              <p className="mt-2 text-gray-400">Ketik <span className="font-semibold text-yellow-300">KONFIRMASI</span> untuk menyimpan perubahan harga premium dan fee developer.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg bg-[#1a1a1a] p-3">
                <p className="text-xs text-gray-500">Harga Premium Baru</p>
                <p className="mt-1 text-lg font-bold text-green-400">{fmt(settings.paymentAmount || 0)}</p>
              </div>
              <div className="rounded-lg bg-[#1a1a1a] p-3">
                <p className="text-xs text-gray-500">Fee Developer Baru</p>
                <p className="mt-1 text-lg font-bold text-cyan-400">{Number(settings.devFeePercent || 0)}%</p>
              </div>
            </div>
            <div>
              <Label className="text-gray-300">Ketik KONFIRMASI</Label>
              <Input value={confirmationText} onChange={(event) => setConfirmationText(event.target.value)} className="mt-2 bg-[#1a1a1a] text-white" />
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => void persistSettings(confirmationText)}
                disabled={saving || confirmationText.trim().toUpperCase() !== 'KONFIRMASI'}
                className="bg-yellow-400 text-black hover:bg-yellow-500"
              >
                {saving ? 'Menyimpan...' : 'Konfirmasi & Simpan'}
              </Button>
              <Button variant="outline" className="border-yellow-400/30 text-yellow-300" onClick={() => setConfirmOpen(false)}>
                Batal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
