// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Handshake, Mail, Lock, Phone, MapPin, FileText, ArrowLeft, Eye, EyeOff, User } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useToast } from '../../hooks/use-toast';
import { mitraAPI } from '../../services/api';
import { getApiErrorMessage } from '../../services/api-error';

const MitraRegister = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    description: ''
  });

  useEffect(() => {
    if (localStorage.getItem('mitra_token')) {
      navigate('/mitra/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await mitraAPI.register(formData);

      if (response.data.success) {
        localStorage.setItem('mitra_token', response.data.token);
        localStorage.setItem('mitra_data', JSON.stringify(response.data.mitra));

        toast({
          title: 'Pendaftaran Berhasil!',
          description: 'Akun mitra Anda sedang diverifikasi oleh admin.'
        });

        navigate('/mitra/dashboard');
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
    <div className="min-h-screen bg-gradient-to-b from-[#1a1a1a] to-[#2a2a2a] py-8 px-4" data-testid="mitra-register-page">
      <div className="max-w-xl mx-auto">
        <Card className="bg-[#2a2a2a] border-yellow-400/20">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Handshake className="w-8 h-8 text-[#1a1a1a]" />
            </div>
            <CardTitle className="text-white text-2xl">Daftar Mitra</CardTitle>
            <CardDescription className="text-gray-400">
              Daftarkan diri Anda sebagai Mitra (Master Agent) NEWME
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-gray-400">Nama Lengkap / Bisnis *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Nama Mitra"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                    placeholder="email@mitra.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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
                    placeholder="Alamat lengkap"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 bg-[#1a1a1a] border border-yellow-400/20 rounded-md text-white min-h-[80px] resize-none"
                  />
                </div>
              </div>

              <div>
                <Label className="text-gray-400">Deskripsi Bisnis</Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <textarea
                    placeholder="Ceritakan tentang bisnis Anda"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 bg-[#1a1a1a] border border-yellow-400/20 rounded-md text-white min-h-[80px] resize-none"
                  />
                </div>
              </div>

              <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-4">
                <h4 className="text-yellow-400 font-medium text-sm mb-2">Informasi Mitra</h4>
                <ul className="text-gray-400 text-xs space-y-1">
                  <li>- Akun mitra harus diverifikasi oleh admin sebelum aktif.</li>
                  <li>- Anda dapat mengundang yayasan untuk bergabung di bawah Anda.</li>
                  <li>- Harga pengguna referral yayasan selalu Rp 250.000.</li>
                  <li>- Pembagian komisi mitra dan yayasan diatur dari jatah Rp 150.000.</li>
                </ul>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-yellow-400 text-black hover:bg-yellow-500"
              >
                {loading ? (
                  <span className="flex items-center">
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin mr-2"></div>
                    Memproses...
                  </span>
                ) : (
                  'Daftar Sebagai Mitra'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center space-y-2">
              <p className="text-gray-400 text-sm">
                Sudah punya akun{' '}
                <Link to="/mitra/login" className="text-yellow-400 hover:underline">
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

export default MitraRegister;

