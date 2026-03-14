// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Building2, Mail, Lock, Phone, MapPin, FileText, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useToast } from '../../hooks/use-toast';
import { yayasanAPI } from '../../services/api';
import { getApiErrorMessage } from '../../services/api-error';

const YayasanRegister = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
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
    if (localStorage.getItem('yayasan_token')) {
      navigate('/yayasan/dashboard', { replace: true });
      return;
    }
    if (mitraReferralCode) {
      setFormData((prev) => ({ ...prev, referralCode: mitraReferralCode }));
    }
  }, [mitraReferralCode, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await yayasanAPI.register({
        ...formData,
        referralCode: formData.referralCode || null,
      });
      
      if (response.data.success) {
        localStorage.setItem('yayasan_token', response.data.token);
        localStorage.setItem('yayasan_data', JSON.stringify(response.data.yayasan));
        
        toast({
          title: 'Pendaftaran Berhasil!',
          description: `Kode Referral Anda: ${response.data.yayasan.referralCode}`
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
            <form onSubmit={handleSubmit} className="space-y-4">
              {formData.referralCode && (
                <div className="bg-green-400/10 border border-green-400/30 rounded-lg p-4 text-sm">
                  <p className="text-green-400 font-medium">Terhubung ke Mitra</p>
                  <p className="text-gray-300 mt-1">
                    Kode referral mitra: <span className="font-mono text-white">{formData.referralCode}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    Setelah mendaftar, akun yayasan akan menunggu approval dari mitra sebelum link referral user aktif.
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
                disabled={loading}
                className="w-full bg-yellow-400 text-black hover:bg-yellow-500"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin mr-2"></div>
                    Memproses...
                  </span>
                ) : (
                  'Daftar Yayasan'
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
