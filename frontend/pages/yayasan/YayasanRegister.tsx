// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Building2, Eye, EyeOff, FileText, Lock, Mail, Phone, ShieldCheck } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '../../components/ui/input-otp';
import { Label } from '../../components/ui/label';
import { useToast } from '../../hooks/use-toast';
import { getApiErrorMessage } from '../../services/api-error';
import { setSessionPresence, yayasanAPI } from '../../services/api';

const STORAGE_KEY = 'newme:yayasan-registration';

const readStoredSession = () => {
  if (typeof window === 'undefined') return null;
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || 'null');
    if (!parsed?.registrationToken) return null;
    if (parsed.expiresAt && new Date(parsed.expiresAt).getTime() <= Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
};

const YayasanRegister = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const storedSession = readStoredSession();
  const [step, setStep] = useState(storedSession ? 2 : 1);
  const [registrationSession, setRegistrationSession] = useState(storedSession);
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState('');
  const [referralStatus, setReferralStatus] = useState(null);
  const [loadingReferral, setLoadingReferral] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: storedSession?.fullName || '',
    email: storedSession?.email || '',
    password: '',
    phone: '',
    address: '',
    description: '',
    referralCode: ''
  });

  const mitraReferralCode = useMemo(
    () => searchParams.get('mitra') || searchParams.get('ref') || storedSession?.referralCode || '',
    [searchParams, storedSession?.referralCode],
  );

  useEffect(() => {
    let active = true;
    yayasanAPI.getSession().then((response) => {
      if (!active) return;
      const payload = response?.data || response;
      if (!payload?.authenticated) return;
      setSessionPresence('yayasan_token', true, payload?.viewer || null, payload?.session || null);
      navigate('/yayasan/dashboard', { replace: true });
    }).catch(() => undefined);
    return () => { active = false; };
  }, [navigate]);

  useEffect(() => {
    if (mitraReferralCode) {
      setFormData((prev) => ({ ...prev, referralCode: mitraReferralCode }));
    }
  }, [mitraReferralCode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!registrationSession) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return;
    }
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...registrationSession, referralCode: mitraReferralCode }));
  }, [mitraReferralCode, registrationSession]);

  useEffect(() => {
    if (!registrationSession?.resendAvailableAt) return;
    const timer = window.setInterval(() => {
      setCountdown(Math.max(new Date(registrationSession.resendAvailableAt).getTime() - Date.now(), 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [registrationSession?.resendAvailableAt]);

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
        setReferralStatus({ error: getApiErrorMessage(error, 'Link undangan mitra tidak tersedia.') });
      } finally {
        setLoadingReferral(false);
      }
    };

    void loadReferralStatus();
  }, [mitraReferralCode]);

  const clearSession = () => {
    setRegistrationSession(null);
    setOtp('');
    setStep(1);
    if (typeof window !== 'undefined') window.sessionStorage.removeItem(STORAGE_KEY);
  };

  const handleStart = async (event) => {
    event.preventDefault();
    if (!mitraReferralCode) {
      return toast({ title: 'Link undangan wajib', description: 'Pendaftaran yayasan hanya bisa dilakukan melalui link undangan mitra.', variant: 'destructive' });
    }
    setLoading('start');
    try {
      const response = await yayasanAPI.registerStart({
        fullName: formData.name,
        email: formData.email,
        password: formData.password,
        referralCode: mitraReferralCode,
      });
      setRegistrationSession({
        registrationToken: response?.data?.registrationToken || response?.registrationToken,
        email: response?.data?.email || response?.email || formData.email,
        maskedEmail: response?.data?.maskedEmail || response?.maskedEmail || formData.email,
        fullName: response?.data?.fullName || response?.fullName || formData.name,
        verified: Boolean(response?.data?.verified ?? response?.verified),
        resendAvailableAt: response?.data?.resendAvailableAt || response?.resendAvailableAt,
        expiresAt: response?.data?.expiresAt || response?.expiresAt,
      });
      setFormData((prev) => ({ ...prev, password: '' }));
      setStep(2);
      toast({ title: 'OTP terkirim', description: 'Cek email yayasan untuk kode verifikasi.' });
    } catch (error) {
      toast({ title: 'Registrasi Gagal', description: getApiErrorMessage(error, 'Terjadi kesalahan'), variant: 'destructive' });
    } finally {
      setLoading('');
    }
  };

  const handleVerifyOtp = async () => {
    if (!registrationSession?.registrationToken || otp.length !== 6) return;
    setLoading('verify');
    try {
      const response = await yayasanAPI.verifyRegisterOtp({ registrationToken: registrationSession.registrationToken, otp });
      setRegistrationSession((prev) => prev ? { ...prev, verified: Boolean(response?.data?.verified ?? response?.verified ?? true) } : prev);
      toast({ title: 'Email terverifikasi', description: 'Sekarang lengkapi biodata yayasan.' });
    } catch (error) {
      toast({ title: 'OTP salah', description: getApiErrorMessage(error, 'OTP tidak valid'), variant: 'destructive' });
    } finally {
      setLoading('');
    }
  };

  const handleResendOtp = async () => {
    if (!registrationSession?.registrationToken) return;
    setLoading('resend');
    try {
      const response = await yayasanAPI.resendRegisterOtp({ registrationToken: registrationSession.registrationToken });
      setRegistrationSession((prev) => prev ? { ...prev, resendAvailableAt: response?.data?.resendAvailableAt || response?.resendAvailableAt || prev.resendAvailableAt } : prev);
      setOtp('');
      toast({ title: 'OTP baru terkirim', description: 'Silakan cek email yayasan lagi.' });
    } catch (error) {
      toast({ title: 'Gagal resend OTP', description: getApiErrorMessage(error, 'Terjadi kesalahan'), variant: 'destructive' });
    } finally {
      setLoading('');
    }
  };

  const handleComplete = async (event) => {
    event.preventDefault();
    if (!registrationSession?.verified) {
      return toast({ title: 'Verifikasi email dulu', description: 'OTP harus berhasil diverifikasi sebelum registrasi diselesaikan.', variant: 'destructive' });
    }
    setLoading('complete');
    try {
      const response = await yayasanAPI.completeRegister({
        registrationToken: registrationSession.registrationToken,
        phone: formData.phone,
        address: formData.address,
        description: formData.description,
        institutionName: formData.name,
        referralCode: mitraReferralCode,
      });
      const payload = response?.data || response;
      clearSession();
      if (payload?.success) {
        setSessionPresence('yayasan_token', true, payload?.yayasan || payload?.user || null, payload?.session || null);
        toast({ title: 'Pendaftaran Berhasil!', description: `Kode Referral Anda: ${payload?.yayasan?.referralCode || '-'}` });
        navigate('/yayasan/dashboard');
      }
    } catch (error) {
      toast({ title: 'Pendaftaran Gagal', description: getApiErrorMessage(error, 'Terjadi kesalahan'), variant: 'destructive' });
    } finally {
      setLoading('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1a1a] to-[#2a2a2a] py-8 px-4" data-testid="yayasan-register-page">
      <div className="max-w-xl mx-auto">
        <Card className="bg-[#2a2a2a] border-yellow-400/20">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4"><Building2 className="w-8 h-8 text-[#1a1a1a]" /></div>
            <CardTitle className="text-white text-2xl">Daftar Yayasan</CardTitle>
            <CardDescription className="text-gray-400">Registrasi yayasan dengan verifikasi email OTP</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {!mitraReferralCode && <div className="rounded-lg border border-red-400/30 bg-red-400/10 p-4 text-sm text-gray-300">Registrasi yayasan hanya tersedia melalui link undangan mitra.</div>}
            {mitraReferralCode && loadingReferral && <div className="rounded-lg border border-yellow-400/20 bg-yellow-400/10 p-4 text-sm text-gray-300">Memeriksa status link mitra...</div>}
            {mitraReferralCode && referralStatus?.error && <div className="rounded-lg border border-red-400/30 bg-red-400/10 p-4 text-sm text-gray-300">{referralStatus.error}</div>}

            {step === 1 ? (
              <form onSubmit={handleStart} className="space-y-4">
                <div><Label className="text-gray-400">Nama Yayasan *</Label><div className="relative"><Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="pl-10 bg-[#1a1a1a] border-yellow-400/20 text-white" required /></div></div>
                <div><Label className="text-gray-400">Email *</Label><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="pl-10 bg-[#1a1a1a] border-yellow-400/20 text-white" required /></div></div>
                <div><Label className="text-gray-400">Password *</Label><div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><Input type={showPassword ? 'text' : 'password'} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="pl-10 pr-10 bg-[#1a1a1a] border-yellow-400/20 text-white" required minLength={8} /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">{showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button></div></div>
                <Button type="submit" disabled={loading === 'start' || !mitraReferralCode || loadingReferral || referralStatus?.isCapacityFull || !!referralStatus?.error} className="w-full bg-yellow-400 text-black hover:bg-yellow-500">{loading === 'start' ? 'Mengirim OTP...' : 'Lanjut Verifikasi Email'}</Button>
              </form>
            ) : (
              <form onSubmit={handleComplete} className="space-y-4">
                <div className="rounded-lg border border-yellow-400/30 bg-yellow-400/10 p-4 text-sm text-gray-300">
                  <p className="font-medium text-yellow-400">{registrationSession?.fullName}</p>
                  <p>{registrationSession?.email}</p>
                  <button type="button" onClick={clearSession} className="mt-2 text-xs text-yellow-300 hover:underline">Ganti email</button>
                </div>
                <div className="rounded-lg border border-white/10 bg-[#1a1a1a] p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm text-yellow-400"><ShieldCheck className="w-4 h-4" /> Verifikasi OTP</div>
                  <p className="mb-3 text-xs text-gray-400">Masukkan 6 digit OTP yang dikirim ke email yayasan Anda.</p>
                  <div className="mb-3">
                    <InputOTP
                      maxLength={6}
                      value={otp}
                      onChange={(value) => setOtp(String(value || '').replace(/\D/g, '').slice(0, 6))}
                      disabled={registrationSession?.verified}
                    >
                      <InputOTPGroup>
                        {Array.from({ length: 6 }).map((_, index) => (
                          <InputOTPSlot key={index} index={index} />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" onClick={handleVerifyOtp} disabled={loading === 'verify' || registrationSession?.verified} className="bg-yellow-400 text-black hover:bg-yellow-500">{registrationSession?.verified ? 'Terverifikasi' : 'Verifikasi OTP'}</Button>
                    <Button type="button" variant="outline" onClick={handleResendOtp} disabled={loading === 'resend' || countdown > 0} className="border-yellow-400/20 text-white">{countdown > 0 ? `Kirim ulang ${Math.ceil(countdown / 1000)}s` : 'Kirim Ulang'}</Button>
                  </div>
                </div>
                <div className={!registrationSession?.verified ? 'pointer-events-none opacity-55 space-y-4' : 'space-y-4'}>
                  <div><Label className="text-gray-400">Nomor Telepon *</Label><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="pl-10 bg-[#1a1a1a] border-yellow-400/20 text-white" required /></div></div>
                  <div><Label className="text-gray-400">Alamat</Label><Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="bg-[#1a1a1a] border-yellow-400/20 text-white" /></div>
                  <div><Label className="text-gray-400">Deskripsi Yayasan</Label><div className="relative"><FileText className="absolute left-3 top-3 w-5 h-5 text-gray-400" /><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full pl-10 pr-4 py-2 bg-[#1a1a1a] border border-yellow-400/20 rounded-md text-white min-h-[88px] resize-none" /></div></div>
                </div>
                <Button type="submit" disabled={loading === 'complete' || !registrationSession?.verified} className="w-full bg-yellow-400 text-black hover:bg-yellow-500">{loading === 'complete' ? 'Memproses...' : 'Daftar Yayasan'}</Button>
              </form>
            )}
            <div className="mt-4 text-center space-y-2">
              <p className="text-gray-400 text-sm">Sudah punya akun yayasan <Link to="/yayasan/login" className="text-yellow-400 hover:underline">Login Disini</Link></p>
              <Link to="/" className="text-gray-400 text-sm hover:text-white inline-flex items-center"><ArrowLeft className="w-4 h-4 mr-1" /> Kembali ke Beranda</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default YayasanRegister;
