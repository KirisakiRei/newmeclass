// @ts-nocheck
import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Lock } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { useToast } from '../../hooks/use-toast';
import { yayasanAPI } from '../../services/api';
import { getApiErrorMessage } from '../../services/api-error';

export default function YayasanResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({ password: '', confirmPassword: '' });

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: 'Konfirmasi password belum sama',
        description: 'Pastikan password baru dan konfirmasi password sama persis.',
        variant: 'destructive',
      });
      return;
    }

    if (formData.password.length < 8) {
      toast({
        title: 'Password terlalu pendek',
        description: 'Password baru minimal 8 karakter.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      await yayasanAPI.resetPassword(token, formData.password);
      toast({
        title: 'Password berhasil diperbarui',
        description: 'Silakan login kembali menggunakan password baru Anda.',
      });
      navigate('/yayasan/login', { replace: true });
    } catch (error) {
      toast({
        title: 'Gagal reset password',
        description: getApiErrorMessage(error, 'Token reset password tidak valid atau sudah kedaluwarsa.'),
        variant: 'destructive',
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
            <Lock className="w-8 h-8 text-[#1a1a1a]" />
          </div>
          <CardTitle className="text-white text-2xl">Password Baru Yayasan</CardTitle>
          <CardDescription className="text-gray-400">
            Buat password baru untuk akun yayasan Anda.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-gray-400 text-sm" htmlFor="yayasan-reset-password">Password Baru</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                <Input
                  id="yayasan-reset-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={formData.password}
                  onChange={(event) => setFormData({ ...formData, password: event.target.value })}
                  autoComplete="new-password"
                  placeholder="Minimal 8 karakter"
                  className="pl-10 pr-10 bg-[#1a1a1a] border-yellow-400/20 text-white"
                />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-gray-400 text-sm" htmlFor="yayasan-reset-confirm-password">Konfirmasi Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                <Input
                  id="yayasan-reset-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={formData.confirmPassword}
                  onChange={(event) => setFormData({ ...formData, confirmPassword: event.target.value })}
                  autoComplete="new-password"
                  placeholder="Ulangi password baru"
                  className="pl-10 pr-10 bg-[#1a1a1a] border-yellow-400/20 text-white"
                />
                <button type="button" onClick={() => setShowConfirmPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full bg-yellow-400 text-black hover:bg-yellow-500">
              {loading ? 'Menyimpan...' : 'Simpan Password Baru'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/yayasan/login" className="text-gray-400 text-sm hover:text-white inline-flex items-center">
              <ArrowLeft className="w-4 h-4 mr-1" /> Kembali ke Login Yayasan
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
