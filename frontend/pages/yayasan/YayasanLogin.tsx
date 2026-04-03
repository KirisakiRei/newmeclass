// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, Mail, Lock, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useToast } from '../../hooks/use-toast';
import { setSessionPresence, yayasanAPI } from '../../services/api';
import { getApiErrorMessage } from '../../services/api-error';

const YayasanLogin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  useEffect(() => {
    let active = true;
    const bootstrap = async () => {
      try {
        const response = await yayasanAPI.getSession();
        if (!active) return;
        const payload = response?.data || response;
        if (!payload?.authenticated) {
          return;
        }
        setSessionPresence('yayasan_token', true, payload?.viewer || null, payload?.session || null);
        navigate('/yayasan/dashboard', { replace: true });
      } catch {
        // Stay on login page when no valid yayasan cookie exists.
      }
    };
    void bootstrap();
    return () => {
      active = false;
    };
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await yayasanAPI.login(formData);
      const payload = response?.data || response;
      if (payload?.success) {
        setSessionPresence('yayasan_token', true, payload?.yayasan || payload?.user || null, payload?.session || null);
        toast({
          title: 'Login Berhasil',
          description: `Selamat datang, ${payload?.yayasan?.name || 'Yayasan'}!`
        });
        
        navigate('/yayasan/dashboard');
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
    <div className="min-h-screen bg-gradient-to-b from-[#1a1a1a] to-[#2a2a2a] flex items-center justify-center px-4" data-testid="yayasan-login-page">
      <Card className="w-full max-w-md bg-[#2a2a2a] border-yellow-400/20">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-[#1a1a1a]" />
          </div>
          <CardTitle className="text-white text-2xl">Login Yayasan</CardTitle>
          <CardDescription className="text-gray-400">
            Masuk ke dashboard yayasan Anda
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-gray-400">Email</Label>
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
              <div className="flex items-center justify-between">
                <Label className="text-gray-400">Password</Label>
                <Link to="/yayasan/forgot-password" className="text-xs text-yellow-400 hover:text-yellow-300 hover:underline">
                  Lupa password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="pl-10 pr-10 bg-[#1a1a1a] border-yellow-400/20 text-white"
                  required
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
                'Login'
              )}
            </Button>
          </form>
          <div className="mt-4 text-center space-y-2">
            <p className="text-gray-400 text-sm">
              Belum punya akun yayasan{' '}
              <Link to="/yayasan/register" className="text-yellow-400 hover:underline">
                Daftar Disini
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

export default YayasanLogin;
