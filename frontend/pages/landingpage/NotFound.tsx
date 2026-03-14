// @ts-nocheck
import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft, Search } from 'lucide-react';
import { Button } from '../../components/ui/button';

const NotFound = () => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="relative mb-8">
          <h1 className="text-[120px] sm:text-[160px] font-bold text-yellow-400/10 leading-none select-none">
            404
          </h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 bg-yellow-400/10 rounded-full flex items-center justify-center">
              <Search className="w-10 h-10 text-yellow-400" />
            </div>
          </div>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Halaman Tidak Ditemukan</h2>
        <p className="text-gray-400 mb-8">
          Maaf, halaman yang Anda cari tidak ada atau telah dipindahkan.
        </p>
        <div className="flex gap-3 justify-center">
          <Link to="/">
            <Button className="bg-yellow-400 text-[#1a1a1a] hover:bg-yellow-500">
              <Home className="w-4 h-4 mr-2" />
              Beranda
            </Button>
          </Link>
          <Button
            variant="outline"
            className="border-yellow-400/50 text-yellow-400 hover:bg-yellow-400/10"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;


