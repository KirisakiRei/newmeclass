// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Save, Upload, Palette, Mail, Phone, Globe, Settings as SettingsIcon, GraduationCap } from 'lucide-react';
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
import axios from 'axios';
import { DEFAULT_SITE_SETTINGS, normalizeSiteSettings } from '../../lib/site-settings';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Settings = () => {
  const { toast } = useToast();
  const { reloadSettings, applyTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(DEFAULT_SITE_SETTINGS);
  const [uploading, setUploading] = useState(false);
  const [jenjangConfig, setJenjangConfig] = useState(null);
  const [savingJenjang, setSavingJenjang] = useState(false);

  useEffect(() => {
    loadSettings();
    settingsAPI.getJenjangConfig()
      .then(res => setJenjangConfig(res.data))
      .catch(() => {});
  }, []);

  const loadSettings = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/settings`);
      setSettings(normalizeSiteSettings(response.data));
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Gagal memuat settings',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings({ ...settings, [field]: value });
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      await axios.put(`${API_URL}/api/settings`, settings, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Apply theme immediately after save
      applyTheme(settings);
      
      // Reload settings from server
      await reloadSettings();
      
      toast({
        title: 'Berhasil!',
        description: 'Settings berhasil disimpan',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Gagal menyimpan settings',
        variant: 'destructive'
      });
    }
  };

  const handleSaveJenjang = async () => {
    if (!jenjangConfig) return;
    try {
      setSavingJenjang(true);
      await settingsAPI.updateJenjangConfig(jenjangConfig);
      toast({ title: 'Berhasil!', description: 'Konfigurasi jenjang berhasil disimpan' });
    } catch {
      toast({ title: 'Error', description: 'Gagal menyimpan konfigurasi jenjang', variant: 'destructive' });
    } finally {
      setSavingJenjang(false);
    }
  };

  const handleJenjangChange = (key, field, value) => {
    setJenjangConfig(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: field === 'label' ? value : Number(value) },
    }));
  };

  const handleFileUpload = async (type, file) => {
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('admin_token');
      const response = await axios.post(
        `${API_URL}/api/settings/upload/${type}`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      toast({
        title: 'Berhasil!',
        description: `${type} berhasil diupload`,
      });

      loadSettings();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Gagal upload file',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner size="lg" text="Memuat pengaturan..." className="min-h-[60vh]" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader icon={SettingsIcon} title="Settings" />
        <Button onClick={handleSave} className="bg-yellow-400 hover:bg-yellow-500 text-[#1a1a1a]">
          <Save className="w-4 h-4 mr-2" />
          Simpan Semua
        </Button>
      </div>

      {/* Test Price Settings - NEW */}
      <Card className="bg-[#2a2a2a] border-green-400/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <span className="text-2xl">💰</span>
            <span>Harga Test Premium</span>
          </CardTitle>
          <CardDescription className="text-gray-400">Atur harga test berbayar untuk user</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-white">Harga Test Premium (IDR)</Label>
              <Input
                type="number"
                value={settings.paymentAmount || 50000}
                onChange={(e) => handleChange('paymentAmount', parseInt(e.target.value) || 0)}
                className="bg-[#1a1a1a] text-white text-lg font-bold"
                placeholder="50000"
              />
              <p className="text-gray-400 text-xs mt-1">
                Format: Rp {(settings.paymentAmount || 50000).toLocaleString('id-ID')}
              </p>
            </div>
            <div className="flex items-end">
              <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 w-full">
                <p className="text-green-400 text-sm">Harga akan berlaku untuk semua user baru</p>
                <p className="text-white font-bold text-xl mt-1">
                  Rp {(settings.paymentAmount || 50000).toLocaleString('id-ID')}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Site Info */}
      <Card className="bg-[#2a2a2a] border-yellow-400/20">
        <CardHeader>
          <CardTitle className="text-white">Informasi Situs</CardTitle>
          <CardDescription className="text-gray-400">Pengaturan dasar website</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-white">Nama Situs</Label>
              <Input
                value={settings.siteName || ''}
                onChange={(e) => handleChange('siteName', e.target.value)}
                className="bg-[#1a1a1a] text-white"
              />
            </div>
            <div>
              <Label className="text-white">Site Title</Label>
              <Input
                value={settings.siteTitle || ''}
                onChange={(e) => handleChange('siteTitle', e.target.value)}
                className="bg-[#1a1a1a] text-white"
              />
            </div>
          </div>
          <div>
            <Label className="text-white">Site Description</Label>
            <Textarea
              value={settings.siteDescription || ''}
              onChange={(e) => handleChange('siteDescription', e.target.value)}
              className="bg-[#1a1a1a] text-white"
            />
          </div>
        </CardContent>
      </Card>

      {/* Contact Info */}
      <Card className="bg-[#2a2a2a] border-yellow-400/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Phone className="w-5 h-5" />
            <span>Informasi Kontak</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-white">Email</Label>
              <Input
                value={settings.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
                className="bg-[#1a1a1a] text-white"
              />
            </div>
            <div>
              <Label className="text-white">Phone</Label>
              <Input
                value={settings.phone || ''}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="bg-[#1a1a1a] text-white"
              />
            </div>
            <div>
              <Label className="text-white">WhatsApp (dengan 62)</Label>
              <Input
                value={settings.whatsapp || ''}
                onChange={(e) => handleChange('whatsapp', e.target.value)}
                placeholder="6289502671691"
                className="bg-[#1a1a1a] text-white"
              />
            </div>
            <div>
              <Label className="text-white">Instagram</Label>
              <Input
                value={settings.instagram || ''}
                onChange={(e) => handleChange('instagram', e.target.value)}
                placeholder="@newmeclass"
                className="bg-[#1a1a1a] text-white"
              />
            </div>
          </div>
          <div>
            <Label className="text-white">Alamat</Label>
            <Textarea
              value={settings.address || ''}
              onChange={(e) => handleChange('address', e.target.value)}
              className="bg-[#1a1a1a] text-white"
            />
          </div>
        </CardContent>
      </Card>

      {/* Theme Colors */}
      <Card className="bg-[#2a2a2a] border-yellow-400/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Palette className="w-5 h-5" />
            <span>Tema & Warna</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-white">Primary Color</Label>
              <div className="flex items-center space-x-2">
                <Input
                  type="color"
                  value={settings.primaryColor || '#FFD700'}
                  onChange={(e) => handleChange('primaryColor', e.target.value)}
                  className="w-16 h-10"
                />
                <Input
                  value={settings.primaryColor || ''}
                  onChange={(e) => handleChange('primaryColor', e.target.value)}
                  className="bg-[#1a1a1a] text-white"
                />
              </div>
            </div>
            <div>
              <Label className="text-white">Secondary Color</Label>
              <div className="flex items-center space-x-2">
                <Input
                  type="color"
                  value={settings.secondaryColor || '#1a1a1a'}
                  onChange={(e) => handleChange('secondaryColor', e.target.value)}
                  className="w-16 h-10"
                />
                <Input
                  value={settings.secondaryColor || ''}
                  onChange={(e) => handleChange('secondaryColor', e.target.value)}
                  className="bg-[#1a1a1a] text-white"
                />
              </div>
            </div>
            <div>
              <Label className="text-white">Background Color</Label>
              <div className="flex items-center space-x-2">
                <Input
                  type="color"
                  value={settings.backgroundColor || '#1a1a1a'}
                  onChange={(e) => handleChange('backgroundColor', e.target.value)}
                  className="w-16 h-10"
                />
                <Input
                  value={settings.backgroundColor || ''}
                  onChange={(e) => handleChange('backgroundColor', e.target.value)}
                  className="bg-[#1a1a1a] text-white"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assets Upload */}
      <Card className="bg-[#2a2a2a] border-yellow-400/20">
        <CardHeader>
          <CardTitle className="text-white">Logo & Favicon</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-white">Upload Logo</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files[0] && handleFileUpload('logo', e.target.files[0])}
                className="bg-[#1a1a1a] text-white"
              />
              {settings.logoUrl && (
                <img src={`${API_URL}${settings.logoUrl}`} alt="Logo" className="mt-2 h-16" />
              )}
            </div>
            <div>
              <Label className="text-white">Upload Favicon</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files[0] && handleFileUpload('favicon', e.target.files[0])}
                className="bg-[#1a1a1a] text-white"
              />
              {settings.faviconUrl && (
                <img src={`${API_URL}${settings.faviconUrl}`} alt="Favicon" className="mt-2 h-8" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SEO */}
      <Card className="bg-[#2a2a2a] border-yellow-400/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Globe className="w-5 h-5" />
            <span>SEO Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-white">SEO Keywords (pisahkan dengan koma)</Label>
            <Input
              value={settings.seoKeywords || ''}
              onChange={(e) => handleChange('seoKeywords', e.target.value)}
              placeholder="newme class, talent development, bakat alami"
              className="bg-[#1a1a1a] text-white"
            />
          </div>
          <div>
            <Label className="text-white">Meta Description</Label>
            <Textarea
              value={settings.seoMetaDescription || ''}
              onChange={(e) => handleChange('seoMetaDescription', e.target.value)}
              className="bg-[#1a1a1a] text-white"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-white">Google Analytics ID</Label>
              <Input
                value={settings.googleAnalyticsId || ''}
                onChange={(e) => handleChange('googleAnalyticsId', e.target.value)}
                placeholder="G-XXXXXXXXXX"
                className="bg-[#1a1a1a] text-white"
              />
            </div>
            <div>
              <Label className="text-white">Facebook Pixel ID</Label>
              <Input
                value={settings.facebookPixelId || ''}
                onChange={(e) => handleChange('facebookPixelId', e.target.value)}
                className="bg-[#1a1a1a] text-white"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Site Features */}
      <Card className="bg-[#2a2a2a] border-yellow-400/20">
        <CardHeader>
          <CardTitle className="text-white">Pengaturan Fitur</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-white">Maintenance Mode</Label>
              <p className="text-gray-400 text-sm">Aktifkan untuk menonaktifkan akses publik</p>
            </div>
            <Switch
              checked={settings.maintenanceMode || false}
              onCheckedChange={(checked) => handleChange('maintenanceMode', checked)}
            />
          </div>
          {settings.maintenanceMode && (
            <div>
              <Label className="text-white">Pesan Maintenance</Label>
              <Input
                value={settings.maintenanceMessage || ''}
                onChange={(e) => handleChange('maintenanceMessage', e.target.value)}
                className="bg-[#1a1a1a] text-white"
              />
            </div>
          )}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-white">Izinkan Registrasi</Label>
              <p className="text-gray-400 text-sm">Buka/tutup pendaftaran user baru</p>
            </div>
            <Switch
              checked={settings.allowRegistration !== false}
              onCheckedChange={(checked) => handleChange('allowRegistration', checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-white">Aktifkan Popup Banner</Label>
              <p className="text-gray-400 text-sm">Tampilkan popup promosi di halaman utama</p>
            </div>
            <Switch
              checked={settings.popupEnabled !== false}
              onCheckedChange={(checked) => handleChange('popupEnabled', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Payment Settings for Test */}
      <Card className="bg-[#2a2a2a] border-yellow-400/20">
        <CardHeader>
          <CardTitle className="text-white">Pengaturan Pembayaran Test</CardTitle>
          <CardDescription className="text-gray-400">Pengaturan pembayaran untuk NEWME Test</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-white">Wajib Pembayaran</Label>
              <p className="text-gray-400 text-sm">User harus bayar sebelum bisa test</p>
            </div>
            <Switch
              checked={settings.requirePayment !== false}
              onCheckedChange={(checked) => handleChange('requirePayment', checked)}
            />
          </div>
          {settings.requirePayment !== false && (
            <>
              <div>
                <Label className="text-white">Harga Test (IDR)</Label>
                <Input
                  type="number"
                  value={settings.paymentAmount || 50000}
                  onChange={(e) => handleChange('paymentAmount', parseFloat(e.target.value))}
                  className="bg-[#1a1a1a] text-white"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-white">Nama Bank</Label>
                  <Input
                    value={settings.bankName || ''}
                    onChange={(e) => handleChange('bankName', e.target.value)}
                    placeholder="BCA, Mandiri, BNI, dll"
                    className="bg-[#1a1a1a] text-white"
                  />
                </div>
                <div>
                  <Label className="text-white">No. Rekening</Label>
                  <Input
                    value={settings.bankAccountNumber || ''}
                    onChange={(e) => handleChange('bankAccountNumber', e.target.value)}
                    placeholder="1234567890"
                    className="bg-[#1a1a1a] text-white"
                  />
                </div>
                <div>
                  <Label className="text-white">Atas Nama</Label>
                  <Input
                    value={settings.bankAccountName || ''}
                    onChange={(e) => handleChange('bankAccountName', e.target.value)}
                    placeholder="PT NEWME CLASS"
                    className="bg-[#1a1a1a] text-white"
                  />
                </div>
              </div>
              <div>
                <Label className="text-white">Instruksi Pembayaran</Label>
                <Textarea
                  value={settings.paymentInstructions || ''}
                  onChange={(e) => handleChange('paymentInstructions', e.target.value)}
                  placeholder="Transfer ke rekening di atas lalu upload bukti pembayaran..."
                  className="bg-[#1a1a1a] text-white"
                  rows={4}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* PayDisini Settings */}
      <Card className="bg-[#2a2a2a] border-yellow-400/20">
        <CardHeader>
          <CardTitle className="text-white">Pengaturan PayDisini</CardTitle>
          <CardDescription className="text-gray-400">Konfigurasi payment gateway PayDisini untuk pembayaran</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-white">API ID</Label>
              <Input
                value={settings.paydisiniApiId || '3463'}
                onChange={(e) => handleChange('paydisiniApiId', e.target.value)}
                placeholder="API ID PayDisini"
                className="bg-[#1a1a1a] text-white"
                data-testid="paydisini-api-id-input"
              />
            </div>
            <div>
              <Label className="text-white">API Key</Label>
              <Input
                type="password"
                value={settings.paydisiniApiKey || ''}
                onChange={(e) => handleChange('paydisiniApiKey', e.target.value)}
                placeholder="API Key PayDisini"
                className="bg-[#1a1a1a] text-white"
                data-testid="paydisini-api-key-input"
              />
            </div>
          </div>
          <div className="bg-[#1a1a1a] p-4 rounded-lg">
            <p className="text-gray-400 text-sm">
              <strong className="text-yellow-400">PayDisini Production:</strong> API ID: 3463 sudah terkonfigurasi.{' '}
              <a href="https://paydisini.co.id" target="_blank" rel="noopener noreferrer" className="text-yellow-400 underline">
                PayDisini Dashboard
              </a>
              {' '}untuk informasi lebih lanjut.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Board of Directors */}
      <Card className="bg-[#2a2a2a] border-yellow-400/20">
        <CardHeader>
          <CardTitle className="text-white">Board of Directors (BOD)</CardTitle>
          <CardDescription className="text-gray-400">Dewan Direksi Perusahaan</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={JSON.stringify(settings.boardOfDirectors || [], null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                handleChange('boardOfDirectors', parsed);
              } catch (err) {
                // Invalid JSON, don't update
              }
            }}
            placeholder='[{"name": "John Doe", "position": "CEO", "photo": "/uploads/team/ceo.jpg"}]'
            className="bg-[#1a1a1a] text-white font-mono text-sm"
            rows={6}
          />
          <p className="text-gray-400 text-xs">Format JSON: Array of objects dengan fields: name, position, photo</p>
        </CardContent>
      </Card>

      {/* Team Support */}
      <Card className="bg-[#2a2a2a] border-yellow-400/20">
        <CardHeader>
          <CardTitle className="text-white">Team Support</CardTitle>
          <CardDescription className="text-gray-400">Tim Pendukung & Staff</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={JSON.stringify(settings.teamSupport || [], null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                handleChange('teamSupport', parsed);
              } catch (err) {
                // Invalid JSON, don't update
              }
            }}
            placeholder='[{"name": "Jane Smith", "position": "Support Manager", "photo": "/uploads/team/manager.jpg"}]'
            className="bg-[#1a1a1a] text-white font-mono text-sm"
            rows={6}
          />
          <p className="text-gray-400 text-xs">Format JSON: Array of objects dengan fields: name, position, photo</p>
        </CardContent>
      </Card>

      {/* Konfigurasi Jenjang Tes */}
      <Card className="bg-[#2a2a2a] border-yellow-400/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-yellow-400" />
            Konfigurasi Jenjang Tes
          </CardTitle>
          <CardDescription className="text-gray-400">
            Batas usia untuk setiap jenjang — menentukan versi teks pertanyaan yang ditampilkan kepada peserta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {jenjangConfig ? (
            <>
              {Object.entries(jenjangConfig).map(([key, cfg]) => (
                <div key={key} className="grid grid-cols-[1fr_80px_80px] gap-2 items-end">
                  <div>
                    <Label className="text-gray-400 text-xs mb-1 block">Label ({key.toUpperCase()})</Label>
                    <Input
                      value={cfg.label}
                      onChange={e => handleJenjangChange(key, 'label', e.target.value)}
                      className="bg-[#1a1a1a] text-white border-yellow-400/20"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400 text-xs mb-1 block">Usia min</Label>
                    <Input
                      type="number" min={0} max={99}
                      value={cfg.min}
                      onChange={e => handleJenjangChange(key, 'min', e.target.value)}
                      className="bg-[#1a1a1a] text-white border-yellow-400/20"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400 text-xs mb-1 block">Usia max</Label>
                    <Input
                      type="number" min={0} max={99}
                      value={cfg.max}
                      onChange={e => handleJenjangChange(key, 'max', e.target.value)}
                      className="bg-[#1a1a1a] text-white border-yellow-400/20"
                    />
                  </div>
                </div>
              ))}
              <Button onClick={handleSaveJenjang} disabled={savingJenjang} className="bg-yellow-400 text-black hover:bg-yellow-300">
                {savingJenjang ? 'Menyimpan...' : 'Simpan Konfigurasi Jenjang'}
              </Button>
            </>
          ) : (
            <p className="text-gray-500 text-sm">Memuat konfigurasi...</p>
          )}
        </CardContent>
      </Card>

      {/* Developer Fee Configuration */}
      <Card className="bg-[#2a2a2a] border-yellow-400/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-yellow-400" />
            Konfigurasi Developer Fee
          </CardTitle>
          <CardDescription className="text-gray-400">
            Persentase dev maintenance fee yang dipotong dari setiap pembayaran NEWME
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-xs">
            <Label className="text-white">Dev Fee (%)</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={settings.devFeePercent ?? 5}
                onChange={e => handleChange('devFeePercent', parseFloat(e.target.value))}
                className="bg-[#1a1a1a] text-white border-yellow-400/20"
                placeholder="5"
              />
              <span className="text-gray-400 text-sm">%</span>
            </div>
            <p className="text-gray-500 text-xs mt-1">
              Default: 5% — berlaku untuk semua transaksi individu dan porsi NEWME dari transaksi yayasan
            </p>
          </div>
          <Button onClick={handleSave} disabled={loading} className="bg-yellow-400 text-black hover:bg-yellow-300">
            <Save className="w-4 h-4 mr-2" />
            Simpan Dev Fee
          </Button>
        </CardContent>
      </Card>

      {/* Developer Bank Account */}
      <Card className="bg-[#2a2a2a] border-yellow-400/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-yellow-400" />
            Rekening Pencairan Developer
          </CardTitle>
          <CardDescription className="text-gray-400">
            Rekening bank tujuan pencairan dev maintenance fee — digunakan otomatis di form cairkan dev fee
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-white">Nama Bank</Label>
              <Input
                value={settings.devBankName || ''}
                onChange={e => handleChange('devBankName', e.target.value)}
                placeholder="BCA, Mandiri, BNI, dll"
                className="bg-[#1a1a1a] text-white border-yellow-400/20 mt-1"
              />
            </div>
            <div>
              <Label className="text-white">No. Rekening</Label>
              <Input
                value={settings.devBankAccount || ''}
                onChange={e => handleChange('devBankAccount', e.target.value)}
                placeholder="0987654321"
                className="bg-[#1a1a1a] text-white border-yellow-400/20 mt-1"
              />
            </div>
            <div>
              <Label className="text-white">Atas Nama</Label>
              <Input
                value={settings.devAccountName || ''}
                onChange={e => handleChange('devAccountName', e.target.value)}
                placeholder="NEWME Tech"
                className="bg-[#1a1a1a] text-white border-yellow-400/20 mt-1"
              />
            </div>
          </div>
          <Button onClick={handleSave} disabled={loading} className="bg-yellow-400 text-black hover:bg-yellow-300">
            <Save className="w-4 h-4 mr-2" />
            Simpan Rekening Developer
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
