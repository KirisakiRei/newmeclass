// @ts-nocheck
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Handshake, MessageCircle, ShieldCheck } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { useTheme } from '../../contexts/ThemeContext';
import { buildJoinMitraWhatsappMessage, buildWhatsAppUrl } from '../../lib/mitra-whatsapp';

const MitraRegister = () => {
  const { settings } = useTheme();
  const whatsappUrl = buildWhatsAppUrl(settings?.whatsapp, buildJoinMitraWhatsappMessage());

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1a1a] to-[#2a2a2a] py-10 px-4" data-testid="mitra-register-page">
      <div className="max-w-3xl mx-auto">
        <Card className="border-yellow-400/20 bg-[#2a2a2a]">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600">
              <Handshake className="h-8 w-8 text-[#1a1a1a]" />
            </div>
            <CardTitle className="text-2xl text-white">Kemitraan NEWME</CardTitle>
            <CardDescription className="mx-auto max-w-xl text-gray-400">
              Akun mitra saat ini dibuat langsung oleh admin NEWME agar proses kerja sama, onboarding, dan kapasitas yayasan tetap tertata rapi.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/10 p-5">
              <h3 className="text-lg font-semibold text-yellow-400">Ingin bergabung sebagai Mitra?</h3>
              <p className="mt-2 text-sm leading-6 text-gray-300">
                Hubungi admin NEWME untuk pembahasan kerja sama. Setelah data awal disiapkan, admin akan mengirimkan link undangan khusus
                agar Anda bisa mengaktifkan akun mitra sendiri.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button
                  asChild
                  className="bg-yellow-400 text-black hover:bg-yellow-500"
                >
                  <a href={whatsappUrl || '#'} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Bergabung Sekarang
                  </a>
                </Button>
                <Button asChild variant="outline" className="border-yellow-400/40 text-yellow-400 hover:bg-yellow-400/10">
                  <Link to="/mitra/login">Sudah punya akun? Login</Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  title: 'Dibuat Admin',
                  text: 'Akun mitra dibuat dari dashboard admin berdasarkan kerja sama yang sudah disepakati.',
                },
                {
                  title: 'Claim via Invite',
                  text: 'Mitra menerima link undangan untuk melengkapi data, mengatur email, dan membuat password.',
                },
                {
                  title: 'Operasional Lebih Aman',
                  text: 'Pengelolaan kapasitas yayasan dan riwayat perubahan dilakukan terpusat oleh admin NEWME.',
                },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-yellow-400/10 bg-[#1a1a1a] p-4">
                  <ShieldCheck className="h-5 w-5 text-yellow-400" />
                  <p className="mt-3 font-semibold text-white">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-gray-400">{item.text}</p>
                </div>
              ))}
            </div>

            <div className="text-center">
              <Link to="/" className="inline-flex items-center text-sm text-gray-400 hover:text-white">
                <ArrowLeft className="mr-1 h-4 w-4" />
                Kembali ke Beranda
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MitraRegister;
