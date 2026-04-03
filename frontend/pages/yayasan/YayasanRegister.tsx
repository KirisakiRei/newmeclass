// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Building2, Mail, Lock, Phone, MapPin, FileText, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useToast } from '../../hooks/use-toast';
import { setSessionPresence, yayasanAPI } from '../../services/api';
import { getApiErrorMessage } from '../../services/api-error';

const YayasanRegister = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [referralStatus, setReferralStatus] = useState(null);
  const [loadingReferral, setLoadingReferral] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    description: '',
    referralCode: ''
  });

  const mitraReferralCode = useMemo(
    () => searchParams.get('mitra') || searchParams.get('ref') || '',
    [searchParams],
  );

  useEffect(() => {
    let active = true;
    const bootstrap = async () => {
      try {
        const response = await yayasanAPI.getSession();
        if (!active) return;
        const payload = response?.data || response;
        if (!payload?.authenticated) {
          if (active && mitraReferralCode) {
            setFormData((prev) => ({ ...prev, referralCode: mitraReferralCode }));
          }
          return;
        }
        setSessionPresence('yayasan_token', true, payload?.viewer || null, payload?.session || null);
        navigate('/yayasan/dashboard', { replace: true });
      } catch {
        if (active && mitraReferralCode) {
          setFormData((prev) => ({ ...prev, referralCode: mitraReferralCode }));
        }
      }
    };
    void bootstrap();
    return () => {
      active = false;
    };
  }, [mitraReferralCode, navigate]);

  useEffect(() => {
    if (!mitraReferralCode) {
      setReferralStatus(null);
      return;
    }

    const loadReferralStatus = async () => {
      setLoadingReferral(true);
      try {
        const response = await yayasanAPI.getMitraReferralStatus(mitraReferralCode);
        setReferralStatus(response.data || null);
      } catch (error) {
        setReferralStatus({
          error: getApiErrorMessage(error, 'Link undangan mitra tidak tersedia.'),
        });
      } finally {
        setLoadingReferral(false);
      }
    };

    void loadReferralStatus();
  }, [mitraReferralCode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!mitraReferralCode) {
      toast({
        title: 'Link undangan wajib',
        description: 'Pendaftaran yayasan hanya bisa dilakukan melalui link undangan mitra.',
        variant: 'destructive',
      });
      return;
    }
    if (referralStatus?.isCapacityFull) {
      toast({
        title: 'Kapasitas penuh',
        description: 'Mitra pengundang sedang mencapai batas pengelolaan yayasan. Silakan hubungi admin NEWME.',
        variant: 'destructive',
      });
      return;
    }
    setLoading(true);

    try {
      const response = await yayasanAPI.register({
        ...formData,
        referralCode: formData.referralCode || null,
      });
      const payload = response?.data || response;
      if (payload?.success) {
        setSessionPresence('yayasan_token', true, payload?.yayasan || payload?.user || null, payload?.session || null);
        
        toast({
          title: 'Pendaftaran Berhasil!',
          description: `Kode Referral Anda: ${payload?.yayasan?.referralCode}`
        });
        
        navigate('/yayasan/dashboard');
      }
    } catch (error) {
      toast({
        title: 'Pendaftaran Gagal',
        description: getApiErrorMessage(error, 'Terjadi kesalahan'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1a1a] to-[#2a2a2a] py-8 px-4" data-testid="yayasan-register-page">
      <div className="max-w-xl mx-auto">
        <Card className="bg-[#2a2a2a] border-yellow-400/20">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-[#1a1a1a]" />
            </div>
            <CardTitle className="text-white text-2xl">Daftar Yayasan</CardTitle>
            <CardDescription className="text-gray-400">
              Daftarkan yayasan Anda untuk bergabung di jaringan mitra NEWME
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!mitraReferralCode && (
              <div className="mb-6 rounded-lg border border-red-400/30 bg-red-400/10 p-4 text-sm">
                <p className="font-medium text-red-300">Registrasi yayasan dikunci melalui invite link mitra.</p>
                <p className="mt-2 text-gray-300">
                  Minta link undangan dari mitra NEWME terlebih dahulu, lalu buka kembali halaman ini melalui link tersebut.
                </p>
              </div>
            )}
            {mitraReferralCode && loadingReferral && (
              <div className="mb-6 rounded-lg border border-yellow-400/20 bg-yellow-400/10 p-4 text-sm text-gray-300">
                Memeriksa status link mitra...
              </div>
            )}
            {mitraReferralCode && referralStatus?.error && (
              <div className="mb-6 rounded-lg border border-red-400/30 bg-red-400/10 p-4 text-sm">
                <p className="font-medium text-red-300">Link undangan tidak aktif</p>
                <p className="mt-2 text-gray-300">{referralStatus.error}</p>
              </div>
            )}
            {mitraReferralCode && referralStatus && !referralStatus.error && (
              <div className={`mb-6 rounded-lg border p-4 text-sm ${referralStatus.isCapacityFull ? 'border-red-400/30 bg-red-400/10' : 'border-green-400/30 bg-green-400/10'}`}>
                <p className={`font-medium ${referralStatus.isCapacityFull ? 'text-red-300' : 'text-green-400'}`}>
                  {referralStatus.isCapacityFull ? 'Pendaftaran sementara tidak tersedia' : 'Link undangan valid'}
                </p>
                <p className="mt-2 text-gray-300">
                  {referralStatus.isCapacityFull
                    ? 'Pendaftaran yayasan baru melalui link ini sedang ditutup sementara. Silakan hubungi admin NEWME untuk bantuan lebih lanjut.'
                    : 'Anda dapat melanjutkan pendaftaran yayasan melalui link undangan ini.'}
                </p>
                {referralStatus.isCapacityFull && (
                  <p className="mt-2 text-gray-400">
                    Informasi detail mitra dan kapasitas tidak ditampilkan pada halaman publik.
                  </p>
                )}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              {formData.referralCode && (
                <div className="bg-green-400/10 border border-green-400/30 rounded-lg p-4 text-sm">
                  <p className="text-green-400 font-medium">Undangan mitra terdeteksi</p>
                  <p className="text-gray-300 mt-1">
                    Pendaftaran ini akan terhubung ke mitra pengundang setelah proses verifikasi selesai.
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    Setelah mendaftar, akun yayasan akan menunggu approval sebelum link referral user aktif.
                  </p>
                </div>
              )}

              <div>
                <Label className="text-gray-400">Nama Yayasan *</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Nama Yayasan"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="pl-10 bg-[#1a1a1a] border-yellow-400/20 text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <Label className="text-gray-400">Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="email"
                    placeholder="email@yayasan.com"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="pl-10 bg-[#1a1a1a] border-yellow-400/20 text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <Label className="text-gray-400">Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="pl-10 pr-10 bg-[#1a1a1a] border-yellow-400/20 text-white"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <Label className="text-gray-400">Nomor Telepon *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="tel"
                    placeholder="08xxxxxxxxxx"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="pl-10 bg-[#1a1a1a] border-yellow-400/20 text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <Label className="text-gray-400">Alamat</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <textarea
                    placeholder="Alamat lengkap yayasan"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className="w-full pl-10 pr-4 py-2 bg-[#1a1a1a] border border-yellow-400/20 rounded-md text-white min-h-[80px] resize-none"
                  />
                </div>
              </div>

              <div>
                <Label className="text-gray-400">Deskripsi Yayasan</Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <textarea
                    placeholder="Deskripsi singkat tentang yayasan"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full pl-10 pr-4 py-2 bg-[#1a1a1a] border border-yellow-400/20 rounded-md text-white min-h-[80px] resize-none"
                  />
                </div>
              </div>

              <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-4 text-sm">
                <p className="text-yellow-400 font-medium mb-2">Alur Aktivasi Yayasan:</p>
                <ul className="text-gray-300 space-y-1 list-disc list-inside">
                  <li>Yayasan terhubung ke mitra pengundang</li>
                  <li>Status awal menunggu approval dari mitra</li>
                  <li>Komisi yayasan akan aktif setelah approval</li>
                  <li>Dashboard khusus untuk memantau pengguna dan hasil test</li>
                </ul>
              </div>

              <Button
                type="submit"
                disabled={loading || !mitraReferralCode || loadingReferral || referralStatus?.isCapacityFull || !!referralStatus?.error}
                className="w-full bg-yellow-400 text-black hover:bg-yellow-500"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin mr-2"></div>
                    Memproses...
                  </span>
                ) : (
                  referralStatus?.isCapacityFull ? 'Kuota Mitra Penuh' : (mitraReferralCode ? 'Daftar Yayasan' : 'Butuh Link Undangan Mitra')
                )}
              </Button>
            </form>

            <div className="mt-6 text-center space-y-2">
              <p className="text-gray-400 text-sm">
                Sudah punya akun yayasan{' '}
                <Link to="/yayasan/login" className="text-yellow-400 hover:underline">
                  Login Disini
                </Link>
              </p>
              <Link to="/" className="text-gray-400 text-sm hover:text-white inline-flex items-center">
                <ArrowLeft className="w-4 h-4 mr-1" /> Kembali ke Beranda
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default YayasanRegister;
