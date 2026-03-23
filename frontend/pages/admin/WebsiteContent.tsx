// @ts-nocheck
import React, { useState, useEffect } from 'react';
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
  RefreshCw, Layout,
  GripVertical, Eye, EyeOff, Pencil, ChevronRight
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { useToast } from '../../hooks/use-toast';
import PageHeader from '../../components/ui/page-header';
import LoadingSpinner, { CardGridSkeleton } from '../../components/ui/loading-spinner';
import { websiteContentAPI } from '../../services/api';
import { mergeWithDefaultSections } from '../../lib/website-sections';
import SharedImageUploader from '../../components/admin/SharedImageUploader.tsx';
import { useAdminAccess } from '../../lib/admin-rbac';

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
const SortableSection = ({ sec, index, total, onEdit, onToggle, onNavigate, editingSection, onSave, onCancelEdit, setEditingSection, canEdit, canManage }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sec.id });
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
        sec.isVisible ? 'bg-[#2a2a2a] border-yellow-400/20' : 'bg-[#1e1e1e] border-gray-600/30'
      }`}>
        <div className="p-4">
          <div className="flex items-center gap-3">
            {/* Drag handle */}
            {canManage ? (
              <button
                {...attributes}
                {...listeners}
                className="p-1 text-gray-500 hover:text-yellow-400 cursor-grab active:cursor-grabbing shrink-0 touch-none"
                title="Drag untuk atur urutan"
              >
                <GripVertical className="w-4 h-4" />
              </button>
            ) : (
              <div className="p-1 text-gray-700 shrink-0">
                <GripVertical className="w-4 h-4" />
              </div>
            )}

            {/* Order badge */}
            <div className="w-6 h-6 rounded bg-yellow-400/20 flex items-center justify-center shrink-0">
              <span className="text-yellow-400 text-xs font-bold">{index + 1}</span>
            </div>

            {/* Section info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className={`font-semibold text-sm ${
                  sec.isVisible ? 'text-white' : 'text-gray-500'
                }`}>{sec.title}</h3>
                {!sec.isVisible && (
                  <span className="px-1.5 py-0.5 bg-gray-600/40 text-gray-400 text-xs rounded">Tersembunyi</span>
                )}
              </div>
              <p className="text-gray-500 text-xs mt-0.5">{sec.description}</p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {sec.editable && (
                canEdit ? (
                <button
                  onClick={() => onEdit(sec)}
                  className="p-1.5 rounded border border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/10 transition-colors"
                  title="Edit konten"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                ) : null
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
              {canManage ? (
                <button
                  onClick={() => onToggle(sec)}
                  className={`p-1.5 rounded border transition-colors ${
                    sec.isVisible ?
                       'border-green-400/30 text-green-400 hover:bg-green-400/10'
                      : 'border-gray-500/30 text-gray-500 hover:bg-gray-500/10'
                  }`}
                  title={sec.isVisible ? 'Sembunyikan' : 'Tampilkan'}
                >
                  {sec.isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
              ) : null}
            </div>
          </div>

          {/* Inline Content Editor */}
          {editingSection?.id === sec.id && (
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
              <SharedImageUploader
                value={val}
                onChange={url => updateContent(key, url)}
                category="general"
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
  const adminAccess = useAdminAccess();
  const [loading, setLoading] = useState(false);

  // Layout Manager state
  const [pageSections, setPageSections] = useState([]);
  const [editingSection, setEditingSection] = useState(null); // section being content-edited
  const canEditContent = adminAccess.hasPermission('website_content.edit');
  const canManageContent = adminAccess.hasPermission('website_content.manage');

  useEffect(() => {
    loadSections();
  }, []);

  const loadSections = async () => {
    setLoading(true);
    try {
      const res = await websiteContentAPI.getSections();
      setPageSections(mergeWithDefaultSections(res.data));
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
    if (!canManageContent) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = pageSections.findIndex(s => s.id === active.id);
    const newIndex = pageSections.findIndex(s => s.id === over.id);
    const reordered = arrayMove(pageSections, oldIndex, newIndex).map((s, i) => ({ ...s, order: i + 1 }));
    setPageSections(reordered);
    try {
      await websiteContentAPI.reorderSections(reordered.map((s) => ({ id: s.id, order: s.order })));
      toast({ title: 'Berhasil', description: 'Urutan section diperbarui' });
    } catch {
      toast({ title: 'Error', description: 'Gagal menyimpan urutan', variant: 'destructive' });
    }
  };

  // Layout Manager handlers (arrow fallback)
  const moveSectionOrder = async (index, direction) => {
    if (!canManageContent) return;
    const sorted = [...pageSections];
    const swapIdx = direction === 'up' ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const tempOrder = sorted[index].order;
    sorted[index] = { ...sorted[index], order: sorted[swapIdx].order };
    sorted[swapIdx] = { ...sorted[swapIdx], order: tempOrder };
    const reordered = [...sorted].sort((a, b) => a.order - b.order);
    setPageSections(reordered);
    try {
      await websiteContentAPI.reorderSections(reordered.map((s) => ({ id: s.id, order: s.order })));
      toast({ title: 'Berhasil', description: 'Urutan section diperbarui' });
    } catch {
      toast({ title: 'Error', description: 'Gagal menyimpan urutan', variant: 'destructive' });
    }
  };

  const toggleSectionVisible = async (sec) => {
    if (!canManageContent) return;
    const updated = { ...sec, isVisible: !sec.isVisible, visible: !sec.isVisible };
    setPageSections(prev => prev.map(s => s.id === sec.id ? updated : s));
    try {
      await websiteContentAPI.updateSection(sec.id, updated);
      toast({ title: 'Berhasil', description: `Section ${updated.isVisible ? 'diaktifkan' : 'disembunyikan'}` });
    } catch {
      toast({ title: 'Error', description: 'Gagal update visibility', variant: 'destructive' });
    }
  };

  const saveSectionContent = async (sec) => {
    if (!canEditContent) return;
    try {
      await websiteContentAPI.updateSection(sec.id, sec);
      setPageSections(prev => prev.map(s => s.id === sec.id ? sec : s));
      setEditingSection(null);
      toast({ title: 'Berhasil', description: `Konten "${sec.title}" berhasil disimpan` });
    } catch {
      toast({ title: 'Error', description: 'Gagal menyimpan konten', variant: 'destructive' });
    }
  };

  const seedDefaults = async () => {
    if (!canManageContent) return;
    try {
      const response = await websiteContentAPI.seedDefaults();
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
          {canManageContent ? <Button onClick={seedDefaults} className="bg-yellow-400 text-black hover:bg-yellow-500">
            Sinkronkan 12 Section
          </Button> : null}
        </div>
      </PageHeader>

      {loading && <CardGridSkeleton cols={2} cards={4} />}

      <div className="space-y-4">
        <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-4 text-sm text-yellow-400">
          <strong>Layout Manager</strong> — Halaman ini mengatur seluruh 12 section landing page. Drag kartu untuk mengubah urutan tampil, gunakan ikon mata untuk menampilkan/menyembunyikan section, dan tombol edit untuk section teks yang dikelola langsung dari sini.
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={pageSections.map(s => s.id).filter(Boolean)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {pageSections.map((sec, index) => (
                <SortableSection
                  key={sec.id}
                  sec={sec}
                  index={index}
                  total={pageSections.length}
                  editingSection={editingSection}
                  setEditingSection={setEditingSection}
                  onEdit={s => setEditingSection(editingSection?.id === s.id ? null : { ...s, content: { ...(s.content || {}) } })}
                  onToggle={toggleSectionVisible}
                  onNavigate={nav => navigate(nav.route)}
                  onSave={saveSectionContent}
                  onCancelEdit={() => setEditingSection(null)}
                  canEdit={canEditContent}
                  canManage={canManageContent}
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
