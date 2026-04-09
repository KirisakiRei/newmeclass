// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Crop,
  ImagePlus,
  Loader2,
  RotateCcw,
  RotateCw,
  Trash2,
  Upload,
} from 'lucide-react';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

const FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const OUTPUT_PRESETS = {
  background: { width: 1600, height: 900 },
  logo: { width: 720, height: 720 },
  signature: { width: 1200, height: 420 },
  productionBadge: { width: 720, height: 720 },
};
const FIT_MODE_BY_ASSET = {
  background: 'cover',
  logo: 'contain',
  signature: 'contain',
  productionBadge: 'contain',
};

const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const loadImage = (src) => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = reject;
  image.src = src;
});

const blobFromCanvas = (canvas, type = 'image/png', quality = 0.92) => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => {
    if (blob) resolve(blob);
    else reject(new Error('Gagal membuat file gambar'));
  }, type, quality);
});

const normalizeFileName = (baseName, file) => {
  const extension = file?.type === 'image/jpeg' ? 'jpg' : 'png';
  return `${baseName}-${Date.now()}.${extension}`;
};

export default function CertificateAssetUploader({
  title,
  description,
  assetType,
  value,
  previewClassName = '',
  onUpload,
  onRemove,
}) {
  const fileInputRef = useRef(null);
  const [localValue, setLocalValue] = useState(value || null);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editorSource, setEditorSource] = useState('');
  const [editorFile, setEditorFile] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  useEffect(() => {
    setLocalValue(value || null);
  }, [value]);

  const outputSize = useMemo(
    () => OUTPUT_PRESETS[assetType] || OUTPUT_PRESETS.logo,
    [assetType],
  );
  const fitMode = useMemo(
    () => FIT_MODE_BY_ASSET[assetType] || 'contain',
    [assetType],
  );

  const aspectRatio = `${outputSize.width} / ${outputSize.height}`;

  const resetEditor = () => {
    setRotation(0);
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
  };

  const openEditorFromFile = async (file) => {
    if (!file) return;
    if (!FILE_TYPES.includes(file.type)) {
      throw new Error('Format file harus JPG, PNG, atau WEBP');
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Ukuran file maksimal 5MB');
    }

    const source = await fileToDataUrl(file);
    resetEditor();
    setEditorFile(file);
    setEditorSource(String(source));
    setDialogOpen(true);
  };

  const openEditorFromExisting = async () => {
    if (!localValue) return;
    const response = await fetch(localValue);
    if (!response.ok) {
      throw new Error('Gagal memuat gambar yang sudah diupload');
    }
    const blob = await response.blob();
    const name = localValue.split('/').pop() || `${assetType}.png`;
    const file = new File([blob], name, { type: blob.type || 'image/png' });
    await openEditorFromFile(file);
  };

  const handleSelectFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      await openEditorFromFile(file);
    } catch (error) {
      alert(error.message || 'Gagal membuka editor gambar');
    }
  };

  const handleApplyUpload = async () => {
    if (!editorSource || !editorFile) return;

    setUploading(true);
    try {
      const image = await loadImage(editorSource);
      const canvas = document.createElement('canvas');
      canvas.width = outputSize.width;
      canvas.height = outputSize.height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Editor gambar tidak tersedia');
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const preserveTransparency = assetType !== 'background' && editorFile.type !== 'image/jpeg';
      if (!preserveTransparency) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      const radians = (rotation * Math.PI) / 180;
      const rotationTurns = Math.abs(Math.round(rotation / 90)) % 2;
      const sourceWidth = rotationTurns === 1 ? image.height : image.width;
      const sourceHeight = rotationTurns === 1 ? image.width : image.height;
      const baseScale = fitMode === 'cover'
        ? Math.max(canvas.width / sourceWidth, canvas.height / sourceHeight)
        : Math.min(canvas.width / sourceWidth, canvas.height / sourceHeight);
      const drawScale = baseScale * zoom;

      ctx.save();
      ctx.translate(canvas.width / 2 + offsetX * 2, canvas.height / 2 + offsetY * 2);
      ctx.rotate(radians);
      ctx.drawImage(
        image,
        (-image.width * drawScale) / 2,
        (-image.height * drawScale) / 2,
        image.width * drawScale,
        image.height * drawScale,
      );
      ctx.restore();

      const blobType = !preserveTransparency && editorFile.type === 'image/jpeg'
        ? 'image/jpeg'
        : 'image/png';
      const blob = await blobFromCanvas(canvas, blobType, 0.94);
      const editedFile = new File([blob], normalizeFileName(assetType, editorFile), { type: blobType });
      const nextUrl = await onUpload(assetType, editedFile);
      setLocalValue(nextUrl);
      setDialogOpen(false);
    } catch (error) {
      alert(error.message || 'Gagal memproses gambar');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setLocalValue(null);
    onRemove();
  };

  return (
    <>
      <div className="rounded-2xl border border-yellow-400/20 bg-[#1a1a1a] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-white">{title}</h4>
            <p className="mt-1 text-xs leading-relaxed text-gray-400">{description}</p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="border-yellow-400/30 bg-transparent text-yellow-400 hover:bg-yellow-400/10"
          >
            <Upload className="h-3.5 w-3.5" />
            Upload
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleSelectFile}
        />

        <div className="mt-4 rounded-2xl border border-dashed border-yellow-400/20 bg-[#111111] p-3">
          {localValue ? (
            <div className="space-y-3">
              <div className={`overflow-hidden rounded-xl bg-black/20 ${previewClassName}`}>
                <img src={localValue} alt={title} className="h-full w-full object-contain" />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="border-yellow-400/30 bg-transparent text-yellow-400 hover:bg-yellow-400/10"
                >
                  <ImagePlus className="h-3.5 w-3.5" />
                  Ganti
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={openEditorFromExisting}
                  className="border-yellow-400/30 bg-transparent text-white hover:bg-yellow-400/10"
                >
                  <Crop className="h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleRemove}
                  className="border-red-400/30 bg-transparent text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Hapus
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-yellow-400/20 bg-[#161616] px-4 py-8 text-center transition hover:border-yellow-400/40 hover:bg-[#1b1b1b] ${previewClassName}`}
            >
              <ImagePlus className="mb-3 h-8 w-8 text-yellow-400" />
              <p className="text-sm font-medium text-white">Pilih gambar untuk diunggah</p>
              <p className="mt-1 text-xs text-gray-400">JPG, PNG, WEBP. Maksimal 5MB.</p>
            </button>
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl border-yellow-400/20 bg-[#171717] text-white">
          <DialogHeader>
            <DialogTitle>Edit Gambar</DialogTitle>
            <DialogDescription className="text-gray-400">
              Atur posisi gambar sebelum dipakai pada sertifikat. PNG transparan akan tetap transparan.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
            <div className="rounded-2xl border border-yellow-400/20 bg-[#0f0f0f] p-4">
              <div
                className={`relative mx-auto overflow-hidden rounded-[28px] ${assetType === 'background' ? 'bg-[#d9d9d9]' : 'bg-[linear-gradient(45deg,#1b1b1b_25%,#242424_25%,#242424_50%,#1b1b1b_50%,#1b1b1b_75%,#242424_75%,#242424_100%)] bg-[length:20px_20px]'}`}
                style={{ aspectRatio, maxHeight: '420px' }}
              >
                {editorSource ? (
                  <img
                    src={editorSource}
                    alt="Editor"
                    className={`absolute inset-0 h-full w-full select-none ${fitMode === 'cover' ? 'object-cover' : 'object-contain'}`}
                    style={{
                      transform: `translate(${offsetX}px, ${offsetY}px) scale(${zoom}) rotate(${rotation}deg)`,
                      transformOrigin: 'center center',
                    }}
                    draggable={false}
                  />
                ) : null}
              </div>
            </div>

            <div className="space-y-5 rounded-2xl border border-yellow-400/20 bg-[#111111] p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-yellow-400">Zoom</p>
                <input
                  type="range"
                  min={fitMode === 'cover' ? '1' : '0.6'}
                  max="2.6"
                  step="0.01"
                  value={zoom}
                  onChange={(event) => setZoom(Number(event.target.value))}
                  className="mt-3 w-full accent-yellow-400"
                />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-yellow-400">Posisi Horizontal</p>
                <input
                  type="range"
                  min="-120"
                  max="120"
                  step="1"
                  value={offsetX}
                  onChange={(event) => setOffsetX(Number(event.target.value))}
                  className="mt-3 w-full accent-yellow-400"
                />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-yellow-400">Posisi Vertikal</p>
                <input
                  type="range"
                  min="-120"
                  max="120"
                  step="1"
                  value={offsetY}
                  onChange={(event) => setOffsetY(Number(event.target.value))}
                  className="mt-3 w-full accent-yellow-400"
                />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-yellow-400">Rotasi</p>
                <div className="mt-3 flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setRotation((current) => current - 90)}
                    className="flex-1 border-yellow-400/30 bg-transparent text-white hover:bg-yellow-400/10"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Kiri
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setRotation((current) => current + 90)}
                    className="flex-1 border-yellow-400/30 bg-transparent text-white hover:bg-yellow-400/10"
                  >
                    <RotateCw className="h-4 w-4" />
                    Kanan
                  </Button>
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                onClick={resetEditor}
                className="w-full text-gray-300 hover:bg-white/5 hover:text-white"
              >
                Reset Pengaturan
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="border-white/15 bg-transparent text-gray-300 hover:bg-white/5 hover:text-white"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleApplyUpload}
              disabled={uploading}
              className="bg-yellow-400 text-black hover:bg-yellow-500"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Terapkan ke Sertifikat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
