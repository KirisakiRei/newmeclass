// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { X, Search, RefreshCw } from 'lucide-react';
import { mediaAPI } from '../../services/api';
import { MEDIA_CATEGORIES, resolveBackendAssetUrl } from '../../lib/admin-media';

const MediaPickerModal = ({ onSelect, onClose, defaultCategory = '' }) => {
  const [media, setMedia] = useState([]);
  const [category, setCategory] = useState(defaultCategory || '');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadMedia();
  }, [category]);

  const loadMedia = async () => {
    setLoading(true);
    try {
      const params = category ? { category } : {};
      const res = await mediaAPI.getAll(params);
      setMedia(res.data || []);
    } catch {
      setMedia([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = search ?
     media.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()))
    : media;

  const resolveImageSrc = (url) => resolveBackendAssetUrl(url, 'https://placehold.co/200x200?text=No+Image');

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75"
      onClick={onClose}
    >
      <div
        className="bg-[#2a2a2a] rounded-2xl w-full max-w-3xl max-h-[80vh] flex flex-col shadow-2xl border border-yellow-400/20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-yellow-400/20">
          <h2 className="text-white font-bold text-base">Pilih Gambar dari Galeri</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white transition-colors rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="px-5 py-3 border-b border-yellow-400/10 flex items-center gap-2 flex-wrap">
          {MEDIA_CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                category === c.value ?
                   'bg-yellow-400 text-black'
                  : 'bg-[#1a1a1a] text-gray-300 hover:bg-yellow-400/20 hover:text-yellow-400'
              }`}
            >
              {c.label}
            </button>
          ))}
          <div className="flex items-center gap-1.5 ml-auto bg-[#1a1a1a] border border-yellow-400/20 rounded-lg px-2 py-1">
            <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama..."
              className="bg-transparent text-white text-xs w-28 outline-none"
            />
          </div>
          <button onClick={loadMedia} className="p-1.5 text-gray-400 hover:text-yellow-400 transition-colors" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center h-36 text-gray-400 text-sm gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" /> Memuat...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-36 text-gray-500 text-sm gap-2">
              <span>Belum ada gambar{category ? ` di kategori ini` : ''}</span>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {filtered.map((item) => (
                <button
                  key={item._id}
                  onClick={() => onSelect(item.url)}
                  className="group relative aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-yellow-400 transition-all focus:outline-none focus:border-yellow-400"
                  title={item.name}
                >
                  <img
                    src={resolveImageSrc(item.url)}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.src = 'https://placehold.co/200x200?text=Error'; }}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-end justify-center pb-2">
                    <span className="text-white text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity px-1 text-center line-clamp-2 leading-tight">
                      {item.name}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-yellow-400/10 flex items-center justify-between">
          <span className="text-gray-500 text-xs">{filtered.length} gambar</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-gray-500 text-gray-300 hover:text-white text-sm transition-colors"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
};

export default MediaPickerModal;
