// @ts-nocheck
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { useToast } from '../../hooks/use-toast';
import axios from 'axios';
import { getApiErrorMessage } from '../../services/api-error';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const ForgotPassword = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [accountType, setAccountType] = useState('user');
  const [email, setEmail] = useState('');

  const accountTypes = [
    { id: 'user', label: 'User' },
    { id: 'yayasan', label: 'Yayasan' },
    { id: 'mitra', label: 'Mitra' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(`${BACKEND_URL}/api/auth/forgot-password`, {
        email,
        accountType
      });
      setSent(true);
      toast({
        title: 'Email Terkirim',
        description: 'Link reset password telah dikirim ke email Anda'
      });
    } catch (error) {
      toast({
        title: 'Gagal',
        description: getApiErrorMessage(error, 'Terjadi kesalahan, coba lagi'),
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
            <Mail className="w-8 h-8 text-[#1a1a1a]" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">Lupa Password</CardTitle>
          <p className="text-gray-400">Masukkan email untuk menerima link reset password</p>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                <Mail className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-white font-semibold">Email Terkirim!</h3>
              <p className="text-gray-400 text-sm">
                Kami telah mengirim link reset password ke <span className="text-yellow-400">{email}</span>. 
                Silakan cek inbox atau folder spam Anda.
              </p>
              <Button
                onClick={() => { setSent(false); setEmail(''); }}
                variant="outline"
                className="border-yellow-400 text-yellow-400 hover:bg-yellow-400/10"
              >
                Kirim Ulang
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Account Type Selector */}
              <div>
                <label className="text-gray-400 text-sm block mb-2">Tipe Akun</label>
                <div className="flex gap-2">
                  {accountTypes.map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setAccountType(type.id)}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                        accountType === type.id ?
                           'bg-yellow-400 text-[#1a1a1a]'
                          : 'bg-[#1a1a1a] text-gray-400 border border-yellow-400/20 hover:border-yellow-400/50'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-gray-400 text-sm" htmlFor="forgot-email">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                  <Input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="email@example.com"
                    autoComplete="email"
                    className="pl-10 bg-[#1a1a1a] border-yellow-400/20 text-white"
                  />
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
                    Mengirim...
                  </span>
                ) : (
                  'Kirim Link Reset'
                )}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link to="/login" className="text-gray-400 text-sm hover:text-white inline-flex items-center">
              <ArrowLeft className="w-4 h-4 mr-1" /> Kembali ke Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;

