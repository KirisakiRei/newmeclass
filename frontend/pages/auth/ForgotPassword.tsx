// @ts-nocheck
import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

const ForgotPassword = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1a1a] to-[#2a2a2a] flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md bg-[#2a2a2a] border-yellow-400/20">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-[#1a1a1a]" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">Reset Password Belum Tersedia</CardTitle>
          <p className="text-gray-400">Fitur email reset password kami nonaktifkan sementara.</p>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-yellow-400/20 bg-[#1a1a1a] p-4 text-center">
            <p className="text-sm font-medium text-white">Infrastruktur email produksi belum aktif.</p>
            <p className="mt-2 text-sm text-gray-400">
              Untuk sementara, hubungi tim support atau administrator NEWME bila Anda membutuhkan bantuan perubahan password.
            </p>
          </div>

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
