// @ts-nocheck
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, Send } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { useToast } from '../../hooks/use-toast';
import { mitraAPI } from '../../services/api';
import { getApiErrorMessage } from '../../services/api-error';

export default function MitraForgotPassword() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await mitraAPI.forgotPassword(email);
      setSent(true);
      toast({
        title: 'Email reset diproses',
        description: 'Jika email terdaftar, kami telah mengirimkan link reset password ke inbox Anda.',
      });
    } catch (error) {
      toast({
        title: 'Belum bisa mengirim email',
        description: getApiErrorMessage(error, 'Terjadi kendala saat mengirim email reset password.'),
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
            <Mail className="w-8 h-8 text-[#1a1a1a]" />
          </div>
          <CardTitle className="text-white text-2xl">Reset Password Mitra</CardTitle>
          <CardDescription className="text-gray-400">
            Masukkan email mitra Anda. Kami akan mengirim link untuk membuat password baru.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-gray-400 text-sm" htmlFor="mitra-forgot-email">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                <Input
                  id="mitra-forgot-email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="email@mitra.com"
                  autoComplete="email"
                  className="pl-10 bg-[#1a1a1a] border-yellow-400/20 text-white"
                />
              </div>
            </div>

            {sent ? (
              <div className="rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-100">
                Jika email terdaftar, link reset password telah dikirim. Silakan cek inbox atau folder spam Anda.
              </div>
            ) : null}

            <Button type="submit" disabled={loading} className="w-full bg-yellow-400 text-black hover:bg-yellow-500">
              {loading ? 'Mengirim...' : <span className="flex items-center justify-center"><Send className="w-4 h-4 mr-2" />Kirim Link Reset</span>}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/mitra/login" className="text-gray-400 text-sm hover:text-white inline-flex items-center">
              <ArrowLeft className="w-4 h-4 mr-1" /> Kembali ke Login Mitra
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
