// @ts-nocheck
import React, { useState, useRef } from 'react';
import { Upload, X, Loader2, Images } from 'lucide-react';
import axios from 'axios';
import { mediaAPI } from '../../services/api';
import MediaPickerModal from './MediaPickerModal.jsx';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * SharedImageUploader
 *  - value        : current image URL
 *  - onChange     : callback(url)
 *  - category     : media gallery category tag (default: 'general')
 *  - allowGallery : show "Pilih dari Galeri" button (default: true)
 *  - placeholder  : upload zone text
 *  - size         : 'sm' (120×120) | 'md' (w-full h-40) | 'lg' (w-full h-52)
 */
const SharedImageUploader = ({
  value,
  onChange,
  category = 'general',
  allowGallery = true,
  placeholder = 'Upload gambar',
  size = 'sm',
}) => {
  const [uploading, setUploading] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const fileInputRef = useRef(null);

  const sizeClasses = {
    sm: { preview: 'w-32 h-32', zone: 'w-32 h-32' },
    md: { preview: 'w-full h-40', zone: 'w-full h-40' },
    lg: { preview: 'w-full h-52', zone: 'w-full h-52' },
  }[size] || { preview: 'w-32 h-32', zone: 'w-32 h-32' };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowed.includes(file.type)) {
      alert('Format file harus JPG, PNG, GIF, atau WEBP');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran file maksimal 5MB');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('admin_token');
      const uploadRes = await axios.post(`${BACKEND_URL}/api/upload/image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });

      if (uploadRes.data.url) {
        const url = uploadRes.data.url;
        // Also register in media gallery
        try {
          await mediaAPI.create({ url, category, name: file.name, size: file.size });
        } catch {
          // non-fatal: gallery registration failure shouldn't block the upload
        }
        onChange(url);
      }
    } catch (err) {
      alert(err.response.data.detail || 'Gagal upload gambar');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getImageSrc = (url) => {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('/')) return url;
    return `${BACKEND_URL}${url}`;
  };

  return (
    <>
      <div className="space-y-1.5">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={handleFileSelect}
          className="hidden"
        />

        {value ? (
          <div className="relative inline-block">
            <img
              src={getImageSrc(value)}
              alt="Preview"
              className={`${sizeClasses.preview} object-cover rounded-lg border-2 border-yellow-400/30`}
              onError={(e) => { e.target.src = 'https://placehold.co/200x200?text=Error'; }}
            />
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors shadow-lg"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current.click()}
              className="absolute bottom-1 right-1 bg-black/60 hover:bg-black/80 text-white text-xs px-2 py-0.5 rounded flex items-center gap-1 transition-colors"
            >
              <Upload className="w-3 h-3" /> Ganti
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current.click()}
            disabled={uploading}
            className={`${sizeClasses.zone} border-2 border-dashed border-yellow-400/30 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-yellow-400 hover:text-yellow-400 transition-all bg-[#1a1a1a] disabled:opacity-60`}
          >
            {uploading ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : (
              <>
                <Upload className="w-7 h-7 mb-1.5" />
                <span className="text-xs text-center px-2 leading-tight">{placeholder}</span>
              </>
            )}
          </button>
        )}

        {allowGallery && (
          <button
            type="button"
            onClick={() => setShowGallery(true)}
            className="flex items-center gap-1.5 text-xs text-yellow-400/70 hover:text-yellow-400 transition-colors"
          >
            <Images className="w-3.5 h-3.5" />
            Pilih dari Galeri
          </button>
        )}
      </div>

      {showGallery && (
        <MediaPickerModal
          defaultCategory={category}
          onSelect={(url) => {
            onChange(url);
            setShowGallery(false);
          }}
          onClose={() => setShowGallery(false)}
        />
      )}
    </>
  );
};

export default SharedImageUploader;


