// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Handshake, Mail, Lock, Eye, EyeOff, ArrowLeft, LogIn } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { useToast } from '../../hooks/use-toast';
import { mitraAPI } from '../../services/api';
import { getApiErrorMessage } from '../../services/api-error';

const MitraLogin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });

  useEffect(() => {
    if (localStorage.getItem('mitra_token')) {
      navigate('/mitra/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await mitraAPI.login(formData);

      if (response.data.success) {
        localStorage.setItem('mitra_token', response.data.token);
        localStorage.setItem('mitra_data', JSON.stringify(response.data.mitra));

        toast({
          title: 'Login Berhasil',
          description: `Selamat datang, ${response.data.mitra.name}!`
        });

        navigate('/mitra/dashboard');
      }
    } catch (error) {
      toast({
        title: 'Login Gagal',
        description: getApiErrorMessage(error, 'Email atau password salah'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1a1a] to-[#2a2a2a] flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md bg-[#2a2a2a] border-yellow-400/20">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Handshake className="w-8 h-8 text-[#1a1a1a]" />
          </div>
          <CardTitle className="text-white text-2xl">Login Mitra</CardTitle>
          <CardDescription className="text-gray-400">Masuk ke dashboard Mitra (Master Agent)</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-gray-400 text-sm" htmlFor="mitra-email">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                <Input
                  id="mitra-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  placeholder="email@mitra.com"
                  autoComplete="email"
                  className="pl-10 bg-[#1a1a1a] border-yellow-400/20 text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-gray-400 text-sm" htmlFor="mitra-password">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                <Input
                  id="mitra-password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  placeholder="Masukkan password"
                  autoComplete="current-password"
                  className="pl-10 pr-10 bg-[#1a1a1a] border-yellow-400/20 text-white"
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
                <span className="flex items-center">
                  <LogIn className="w-4 h-4 mr-2" /> Login
                </span>
              )}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Link to="/forgot-password" className="text-yellow-400/80 text-sm hover:text-yellow-400 hover:underline">
              Lupa Password
            </Link>
          </div>

          <div className="mt-4 text-center space-y-2">
            <p className="text-gray-400 text-sm">
              Ingin bergabung sebagai mitra{' '}
              <Link to="/mitra/register" className="text-yellow-400 hover:underline">
                Lihat informasinya
              </Link>
            </p>
            <Link to="/" className="text-gray-400 text-sm hover:text-white inline-flex items-center">
              <ArrowLeft className="w-4 h-4 mr-1" /> Kembali ke Beranda
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MitraLogin;
