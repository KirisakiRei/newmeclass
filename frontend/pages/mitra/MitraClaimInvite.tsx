// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Handshake, Lock, Mail, Phone, User } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useToast } from '../../hooks/use-toast';
import { getApiErrorMessage } from '../../services/api-error';
import { mitraAPI } from '../../services/api';

const MitraClaimInvite = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [inviteData, setInviteData] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    description: '',
  });

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const loadInvite = async () => {
      try {
        const response = await mitraAPI.validateInvite(token);
        setInviteData(response.data);
        setFormData((current) => ({
          ...current,
          fullName: response.data?.mitra?.fullName || '',
          email: response.data?.mitra?.email || '',
          phone: response.data?.mitra?.phone || '',
          address: response.data?.mitra?.address || '',
          description: response.data?.mitra?.description || '',
        }));
      } catch (error) {
        toast({
          title: 'Link tidak aktif',
          description: getApiErrorMessage(error, 'Link undangan mitra sudah tidak aktif.'),
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    void loadInvite();
  }, [toast, token]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const response = await mitraAPI.claimInvite({
        token,
        ...formData,
      });
      localStorage.setItem('mitra_token', response.data.token);
      localStorage.setItem('mitra_data', JSON.stringify(response.data.mitra));
      toast({
        title: 'Akun Mitra Aktif',
        description: 'Selamat datang di dashboard mitra NEWME.',
      });
      navigate('/mitra/dashboard', { replace: true });
    } catch (error) {
      toast({
        title: 'Claim akun gagal',
        description: getApiErrorMessage(error, 'Gagal mengaktifkan akun mitra.'),
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1a1a] to-[#2a2a2a] py-10 px-4">
      <div className="mx-auto max-w-xl">
        <Card className="border-yellow-400/20 bg-[#2a2a2a]">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600">
              <Handshake className="h-8 w-8 text-[#1a1a1a]" />
            </div>
            <CardTitle className="text-2xl text-white">Aktivasi Akun Mitra</CardTitle>
            <CardDescription className="text-gray-400">
              Lengkapi data berikut untuk mengaktifkan akun mitra NEWME Anda.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!token ? (
              <div className="rounded-lg border border-red-400/30 bg-red-400/10 p-4 text-sm text-gray-200">
                Token undangan tidak ditemukan. Minta admin NEWME mengirimkan link aktivasi yang valid.
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center py-10 text-gray-400">Memvalidasi undangan...</div>
            ) : !inviteData?.valid ? (
              <div className="rounded-lg border border-red-400/30 bg-red-400/10 p-4 text-sm text-gray-200">
                Link aktivasi tidak tersedia atau sudah kedaluwarsa.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="rounded-lg border border-green-400/30 bg-green-400/10 p-4 text-sm">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-400" />
                    <div>
                      <p className="font-medium text-green-400">Undangan mitra aktif</p>
                      <p className="mt-1 text-gray-300">
                        Undangan ini dibuat untuk <span className="font-semibold text-white">{inviteData?.mitra?.fullName || 'Mitra NEWME'}</span>.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-gray-400">Nama Mitra *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                    <Input
                      value={formData.fullName}
                      onChange={(event) => setFormData({ ...formData, fullName: event.target.value })}
                      className="bg-[#1a1a1a] pl-10 text-white border-yellow-400/20"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-gray-400">Email Login *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                      className="bg-[#1a1a1a] pl-10 text-white border-yellow-400/20"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-gray-400">Password *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(event) => setFormData({ ...formData, password: event.target.value })}
                      className="bg-[#1a1a1a] pl-10 pr-10 text-white border-yellow-400/20"
                      minLength={8}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <Label className="text-gray-400">No. HP *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                    <Input
                      value={formData.phone}
                      onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
                      className="bg-[#1a1a1a] pl-10 text-white border-yellow-400/20"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-gray-400">Alamat</Label>
                  <textarea
                    value={formData.address}
                    onChange={(event) => setFormData({ ...formData, address: event.target.value })}
                    className="min-h-[84px] w-full rounded-md border border-yellow-400/20 bg-[#1a1a1a] px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <Label className="text-gray-400">Deskripsi Singkat</Label>
                  <textarea
                    value={formData.description}
                    onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                    className="min-h-[84px] w-full rounded-md border border-yellow-400/20 bg-[#1a1a1a] px-3 py-2 text-white"
                  />
                </div>

                <Button type="submit" disabled={submitting} className="w-full bg-yellow-400 text-black hover:bg-yellow-500">
                  {submitting ? 'Mengaktifkan akun...' : 'Aktifkan Akun Mitra'}
                </Button>
              </form>
            )}

            <div className="mt-6 text-center">
              <Link to="/mitra/login" className="inline-flex items-center text-sm text-gray-400 hover:text-white">
                <ArrowLeft className="mr-1 h-4 w-4" />
                Kembali ke Login Mitra
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MitraClaimInvite;
