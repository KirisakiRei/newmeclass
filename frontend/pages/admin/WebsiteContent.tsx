// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Plus, Save, X,
  RefreshCw, Layout, Upload, Loader2,
  GripVertical, Eye, EyeOff, Pencil, ChevronRight
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { useToast } from '../../hooks/use-toast';
import axios from 'axios';
import PageHeader from '../../components/ui/page-header';
import LoadingSpinner, { CardGridSkeleton } from '../../components/ui/loading-spinner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Image Upload Component
const ImageUploader = ({ value, onChange, placeholder = 'Upload gambar', size = 'sm' }) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const previewClass = size === 'lg' ? 'w-full max-w-xs h-48' : 'w-32 h-32';
  const zoneClass = size === 'lg' ? 'w-full max-w-xs h-48' : 'w-32 h-32';

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
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
      const response = await axios.post(`${BACKEND_URL}/api/upload/image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.url) {
        onChange(response.data.url);
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
    if (url.startsWith('http')) return url;
    return `${BACKEND_URL}${url}`;
  };

  return (
    <div className="space-y-2">
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
            className={`${previewClass} object-cover rounded-lg border-2 border-yellow-400/30`}
          />
          <button
            onClick={() => onChange('')}
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            onClick={() => fileInputRef.current.click()}
            type="button"
            className="absolute bottom-1 right-1 bg-black/60 hover:bg-black/80 text-white text-xs px-2 py-0.5 rounded flex items-center gap-1"
          >
            <Upload className="w-3 h-3" /> Ganti
          </button>
        </div>
      ) : (
        <button
          onClick={() => fileInputRef.current.click()}
          disabled={uploading}
          type="button"
          className={`${zoneClass} border-2 border-dashed border-yellow-400/30 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-yellow-400 hover:text-yellow-400 transition bg-[#1a1a1a]`}
        >
          {uploading ? (
            <Loader2 className="w-8 h-8 animate-spin" />
          ) : (
            <>
              <Upload className="w-8 h-8 mb-2" />
              <span className="text-xs text-center px-2">{placeholder}</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};

// ── BulletListEditor ── visual form editor for string arrays and object arrays
const BulletListEditor = ({ label, value, onChange, schema }) => {
  // schema: 'strings' | [{key, placeholder}]
  const isStrings = schema === 'strings';
  const arr = Array.isArray(value) ? value : [];

  const updateItem = (idx, newVal) => {
    const next = [...arr];
    next[idx] = newVal;
    onChange(next);
  };
  const updateField = (idx, field, newVal) => {
    const next = arr.map((item, i) => i === idx ? { ...item, [field]: newVal } : item);
    onChange(next);
  };
  const addItem = () => {
    if (isStrings) onChange([...arr, '']);
    else onChange([...arr, schema.reduce((acc, f) => ({ ...acc, [f.key]: '' }), {})]);
  };
  const removeItem = (idx) => onChange(arr.filter((_, i) => i !== idx));

  return (
    <div className="space-y-2">
      <label className="text-gray-400 text-xs capitalize block">{label}</label>
      {arr.map((item, idx) => (
        <div key={idx} className="flex gap-2 items-start">
          <span className="text-gray-600 text-xs mt-2.5 shrink-0 w-4">{idx + 1}.</span>
          {isStrings ? (
            <input
              value={item}
              onChange={e => updateItem(idx, e.target.value)}
              className="flex-1 bg-[#1a1a1a] border border-yellow-400/20 rounded px-2.5 py-1.5 text-white text-sm"
            />
          ) : (
            <div className="flex-1 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${schema.length}, 1fr)` }}>
              {schema.map(f => (
                <input
                  key={f.key}
                  value={item[f.key] || ''}
                  onChange={e => updateField(idx, f.key, e.target.value)}
                  placeholder={f.placeholder}
                  className="bg-[#1a1a1a] border border-yellow-400/20 rounded px-2.5 py-1.5 text-white text-sm"
                />
              ))}
            </div>
          )}
          <button onClick={() => removeItem(idx)} className="mt-1.5 p-1 text-red-400 hover:text-red-300 shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <button
        onClick={addItem}
        className="flex items-center gap-1.5 text-xs text-yellow-400 hover:text-yellow-300 border border-dashed border-yellow-400/30 rounded px-2.5 py-1.5 w-full justify-center"
      >
        <Plus className="w-3.5 h-3.5" /> Tambah
      </button>
    </div>
  );
};

// ── SortableSection ── single draggable card in Layout Manager
const SortableSection = ({ sec, index, total, onEdit, onToggle, onNavigate, editingSection, onSave, onCancelEdit, setEditingSection }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sec._id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  // Map section key → route
  const NAV_MAP = {
    hero:         { label: 'Hero Slides',     route: '/admin/hero-slides' },
    products:     { label: 'Produk Homepage', route: '/admin/homepage-products' },
    testimonials: { label: 'Testimonial',     route: '/admin/testimonials' },
    activities:   { label: 'Kegiatan',        route: '/admin/activities' },
    banners:      { label: 'Banners',         route: '/admin/banners' },
  };
  const navInfo = NAV_MAP[sec.key];

  return (
    <div ref={setNodeRef} style={style}>
      <div className={`border rounded-lg transition-all ${
        sec.visible ? 'bg-[#2a2a2a] border-yellow-400/20' : 'bg-[#1e1e1e] border-gray-600/30'
      }`}>
        <div className="p-4">
          <div className="flex items-center gap-3">
            {/* Drag handle */}
            <button
              {...attributes}
              {...listeners}
              className="p-1 text-gray-500 hover:text-yellow-400 cursor-grab active:cursor-grabbing shrink-0 touch-none"
              title="Drag untuk atur urutan"
            >
              <GripVertical className="w-4 h-4" />
            </button>

            {/* Order badge */}
            <div className="w-6 h-6 rounded bg-yellow-400/20 flex items-center justify-center shrink-0">
              <span className="text-yellow-400 text-xs font-bold">{index + 1}</span>
            </div>

            {/* Section info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className={`font-semibold text-sm ${
                  sec.visible ? 'text-white' : 'text-gray-500'
                }`}>{sec.label}</h3>
                {!sec.visible && (
                  <span className="px-1.5 py-0.5 bg-gray-600/40 text-gray-400 text-xs rounded">Tersembunyi</span>
                )}
              </div>
              <p className="text-gray-500 text-xs mt-0.5">{sec.description}</p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {sec.editable && (
                <button
                  onClick={() => onEdit(sec)}
                  className="p-1.5 rounded border border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/10 transition-colors"
                  title="Edit konten"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
              {!sec.editable && navInfo && (
                <button
                  onClick={() => onNavigate(navInfo)}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-yellow-400 border border-yellow-400/30 rounded hover:bg-yellow-400/10 transition-colors"
                  title={`Kelola ${navInfo.label}`}
                >
                  {navInfo.label} <ChevronRight className="w-3 h-3" />
                </button>
              )}
              <button
                onClick={() => onToggle(sec)}
                className={`p-1.5 rounded border transition-colors ${
                  sec.visible ?
                     'border-green-400/30 text-green-400 hover:bg-green-400/10'
                    : 'border-gray-500/30 text-gray-500 hover:bg-gray-500/10'
                }`}
                title={sec.visible ? 'Sembunyikan' : 'Tampilkan'}
              >
                {sec.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Inline Content Editor */}
          {editingSection._id === sec._id && (
            <SectionContentEditor
              editingSection={editingSection}
              setEditingSection={setEditingSection}
              onSave={onSave}
              onCancel={onCancelEdit}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// ── SectionContentEditor ── the inline form editor for each editable section
const ARRAY_SCHEMAS = {
  stats: [{ key: 'label', placeholder: 'Label (cth: Peserta)' }, { key: 'value', placeholder: 'Nilai (cth: 10.000+)' }],
  benefits: [{ key: 'icon', placeholder: '🧬' }, { key: 'title', placeholder: 'Judul' }, { key: 'desc', placeholder: 'Deskripsi' }],
  bulletPoints: 'strings',
  misi: 'strings',
};

const SectionContentEditor = ({ editingSection, setEditingSection, onSave, onCancel }) => {
  const updateContent = (key, val) =>
    setEditingSection(prev => ({ ...prev, content: { ...prev.content, [key]: val } }));

  return (
    <div className="mt-4 pt-4 border-t border-yellow-400/10 space-y-3">
      <p className="text-yellow-400 text-xs font-semibold uppercase tracking-wide">Edit Konten — {editingSection.label}</p>
      {Object.entries(editingSection.content).map(([key, val]) => {
        const arraySchema = ARRAY_SCHEMAS[key];
        if (arraySchema) {
          return (
            <BulletListEditor
              key={key}
              label={key === 'bulletPoints' ? 'Bullet Points' : key === 'misi' ? 'Misi (list)' : key}
              value={val}
              onChange={newVal => updateContent(key, newVal)}
              schema={arraySchema}
            />
          );
        }
        if (key === 'imageUrl') {
          return (
            <div key={key}>
              <label className="text-gray-400 text-xs block mb-1">Gambar Section</label>
              <ImageUploader
                value={val}
                onChange={url => updateContent(key, url)}
                placeholder="Upload gambar section"
                size="lg"
              />
            </div>
          );
        }
        const isLong = typeof val === 'string' && val.length > 80;
        return (
          <div key={key}>
            <label className="text-gray-400 text-xs capitalize block mb-1">
              {key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
            </label>
            {isLong ? (
              <textarea
                value={val}
                onChange={e => updateContent(key, e.target.value)}
                rows={3}
                className="w-full bg-[#1a1a1a] border border-yellow-400/20 rounded px-3 py-1.5 text-white text-sm resize-y"
              />
            ) : (
              <input
                value={val}
                onChange={e => updateContent(key, e.target.value)}
                className="w-full bg-[#1a1a1a] border border-yellow-400/20 rounded px-3 py-1.5 text-white text-sm"
              />
            )}
          </div>
        );
      })}
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onSave(editingSection)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded"
        >
          <Save className="w-3.5 h-3.5" /> Simpan
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-500 text-gray-300 hover:text-white text-sm rounded"
        >
          <X className="w-3.5 h-3.5" /> Batal
        </button>
      </div>
    </div>
  );
};

const WebsiteContent = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Layout Manager state
  const [pageSections, setPageSections] = useState([]);
  const [editingSection, setEditingSection] = useState(null); // section being content-edited

  useEffect(() => {
    loadSections();
  }, []);

  const loadSections = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${BACKEND_URL}/api/website-content/sections`);
      setPageSections([...(res.data || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
    } catch (error) {
      console.error('Failed to load sections:', error);
    } finally {
      setLoading(false);
    }
  };

  // Layout Manager — dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = pageSections.findIndex(s => s._id === active.id);
    const newIndex = pageSections.findIndex(s => s._id === over.id);
    const reordered = arrayMove(pageSections, oldIndex, newIndex).map((s, i) => ({ ...s, order: i + 1 }));
    setPageSections(reordered);
    try {
      await axios.put(`${BACKEND_URL}/api/website-content/sections/reorder`, {
        sections: reordered.map(s => ({ _id: s._id, order: s.order }))
      });
      toast({ title: 'Berhasil', description: 'Urutan section diperbarui' });
    } catch {
      toast({ title: 'Error', description: 'Gagal menyimpan urutan', variant: 'destructive' });
    }
  };

  // Layout Manager handlers (arrow fallback)
  const moveSectionOrder = async (index, direction) => {
    const sorted = [...pageSections];
    const swapIdx = direction === 'up' ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const tempOrder = sorted[index].order;
    sorted[index] = { ...sorted[index], order: sorted[swapIdx].order };
    sorted[swapIdx] = { ...sorted[swapIdx], order: tempOrder };
    const reordered = [...sorted].sort((a, b) => a.order - b.order);
    setPageSections(reordered);
    try {
      await axios.put(`${BACKEND_URL}/api/website-content/sections/reorder`, {
        sections: reordered.map(s => ({ _id: s._id, order: s.order }))
      });
      toast({ title: 'Berhasil', description: 'Urutan section diperbarui' });
    } catch {
      toast({ title: 'Error', description: 'Gagal menyimpan urutan', variant: 'destructive' });
    }
  };

  const toggleSectionVisible = async (sec) => {
    const updated = { ...sec, visible: !sec.visible };
    setPageSections(prev => prev.map(s => s._id === sec._id ? updated : s));
    try {
      await axios.put(`${BACKEND_URL}/api/website-content/sections/${sec._id}`, updated);
      toast({ title: 'Berhasil', description: `Section ${updated.visible ? 'diaktifkan' : 'disembunyikan'}` });
    } catch {
      toast({ title: 'Error', description: 'Gagal update visibility', variant: 'destructive' });
    }
  };

  const saveSectionContent = async (sec) => {
    try {
      await axios.put(`${BACKEND_URL}/api/website-content/sections/${sec._id}`, sec);
      setPageSections(prev => prev.map(s => s._id === sec._id ? sec : s));
      setEditingSection(null);
      toast({ title: 'Berhasil', description: `Konten "${sec.label}" berhasil disimpan` });
    } catch {
      toast({ title: 'Error', description: 'Gagal menyimpan konten', variant: 'destructive' });
    }
  };

  const seedDefaults = async () => {
    try {
      const response = await axios.post(`${BACKEND_URL}/api/website-content/seed-defaults`);
      toast({ title: 'Berhasil', description: response.data.message });
      loadSections();
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal seed data', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6" data-testid="website-content-page">
      <PageHeader icon={Layout} title="Layout Website" description="Atur urutan dan visibilitas section di halaman beranda">
        <div className="flex gap-2">
          <Button onClick={loadSections} variant="outline" className="border-yellow-400 text-yellow-400">
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
          <Button onClick={seedDefaults} className="bg-yellow-400 text-black hover:bg-yellow-500">
            Seed Default Data
          </Button>
        </div>
      </PageHeader>

      {loading && <CardGridSkeleton cols={2} cards={4} />}

      <div className="space-y-4">
        <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-4 text-sm text-yellow-400">
          <strong>Layout Manager</strong> — Drag kartu untuk mengubah urutan section di halaman beranda. Section yang disembunyikan tidak akan tampil di website.
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={pageSections.map(s => s._id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {pageSections.map((sec, index) => (
                <SortableSection
                  key={sec._id}
                  sec={sec}
                  index={index}
                  total={pageSections.length}
                  editingSection={editingSection}
                  setEditingSection={setEditingSection}
                  onEdit={s => setEditingSection(editingSection._id === s._id ? null : { ...s, content: { ...s.content } })}
                  onToggle={toggleSectionVisible}
                  onNavigate={nav => navigate(nav.route)}
                  onSave={saveSectionContent}
                  onCancelEdit={() => setEditingSection(null)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
};

export default WebsiteContent;
