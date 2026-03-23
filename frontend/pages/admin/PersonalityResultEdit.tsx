// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { useToast } from '../../hooks/use-toast';
import { personalityResultsAPI } from '../../services/api';
import LoadingSpinner from '../../components/ui/loading-spinner';
import { useAdminAccess } from '../../lib/admin-rbac';

const arrToText = (arr) => (arr || []).join('\n');
const textToArr = (text) => text.split('\n').map(s => s.trim()).filter(Boolean);

const inputCls = 'w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/20 placeholder:text-gray-600';

const AutoTextarea = ({ value, onChange, placeholder, minRows = 3 }) => {
  const ref = useRef(null);
  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);
  useEffect(() => { resize(); }, [value, resize]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={minRows}
      className={`${inputCls} resize-none overflow-hidden`}
      style={{ minHeight: `${minRows * 1.6}rem` }}
    />
  );
};

const Section = ({ title, defaultOpen = true, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="bg-[#2a2a2a] border-white/10">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-white/5 transition-colors rounded-t-lg"
      >
        <span className="font-semibold text-white">{title}</span>
        {open ?
           <ChevronUp className="w-4 h-4 text-gray-400" />
          : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <CardContent className="pt-0 pb-5 px-5">{children}</CardContent>}
    </Card>
  );
};

const Field = ({ label, children }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</label>
    {children}
  </div>
);

const PersonalityResultEdit = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const adminAccess = useAdminAccess();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [original, setOriginal] = useState(null);
  const canEditResult = adminAccess.hasPermission('personality_results.edit');

  const [form, setForm] = useState({
    label: '',
    color: '#888888',
    aiPersonalityType: '',
    aiSummary: '',
    aiStrengths: '',
    aiAreasToImprove: '',
    aiCareerRecommendations: '',
    insPersonalityLabel: '',
    insElementDescription: '',
    insKarakter: '',
    insCiriKhas: '',
    insRekomendasiKarir: '',
    insDibutuhkanPadaProfesi: '',
    kjTipe: '',
    kjKehidupan: '',
    kjKesehatan: '',
    kjKontribusi: '',
    kjKekhasan: '',
    kjKharisma: '',
    kaGayaBelajar: '',
    kaGayaKomunikasi: '',
    kaGayaKepemimpinan: '',
    kaGayaKerja: '',
    kaGayaKonflik: '',
  });

  useEffect(() => {
    personalityResultsAPI.getByCode(code)
      .then(res => {
        const d = res.data;
        const aiAnalysis = d.aiAnalysis || {};
        const insights = d.insights || {};
        const kekuatanJatidiri = insights.kekuatanJatidiri || {};
        const kompilasiAdaptasi = insights.kompilasiAdaptasi || {};
        setOriginal(d);
        setForm({
          label: d.label || '',
          color: d.color || '#888888',
          aiPersonalityType: aiAnalysis.personalityType || '',
          aiSummary: aiAnalysis.summary || '',
          aiStrengths: arrToText(aiAnalysis.strengths),
          aiAreasToImprove: arrToText(aiAnalysis.areasToImprove),
          aiCareerRecommendations: arrToText(aiAnalysis.careerRecommendations),
          insPersonalityLabel: insights.personalityLabel || '',
          insElementDescription: arrToText(insights.elementDescription),
          insKarakter: arrToText(insights.karakter),
          insCiriKhas: arrToText(insights.ciriKhas),
          insRekomendasiKarir: insights.rekomendasiKarir || '',
          insDibutuhkanPadaProfesi: insights.dibutuhkanPadaProfesi || '',
          kjTipe: kekuatanJatidiri.tipe || '',
          kjKehidupan: kekuatanJatidiri.kehidupan || '',
          kjKesehatan: kekuatanJatidiri.kesehatan || '',
          kjKontribusi: kekuatanJatidiri.kontribusi || '',
          kjKekhasan: kekuatanJatidiri.kekhasan || '',
          kjKharisma: kekuatanJatidiri.kharisma || '',
          kaGayaBelajar: kompilasiAdaptasi.gayaBelajar || '',
          kaGayaKomunikasi: kompilasiAdaptasi.gayaKomunikasi || '',
          kaGayaKepemimpinan: kompilasiAdaptasi.gayaKepemimpinan || '',
          kaGayaKerja: kompilasiAdaptasi.gayaKerja || '',
          kaGayaKonflik: kompilasiAdaptasi.gayaKonflik || '',
        });
      })
      .catch(() => toast({ title: 'Error', description: 'Gagal memuat data', variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, [code]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!canEditResult) return;
    setSaving(true);
    try {
      const payload = {
        ...original,
        label: form.label,
        color: form.color,
        aiAnalysis: {
          ...original.aiAnalysis,
          personalityType: form.aiPersonalityType,
          summary: form.aiSummary,
          strengths: textToArr(form.aiStrengths),
          areasToImprove: textToArr(form.aiAreasToImprove),
          careerRecommendations: textToArr(form.aiCareerRecommendations),
        },
        insights: {
          ...original.insights,
          personalityLabel: form.insPersonalityLabel,
          elementDescription: textToArr(form.insElementDescription),
          karakter: textToArr(form.insKarakter),
          ciriKhas: textToArr(form.insCiriKhas),
          rekomendasiKarir: form.insRekomendasiKarir,
          dibutuhkanPadaProfesi: form.insDibutuhkanPadaProfesi,
          kekuatanJatidiri: {
            tipe: form.kjTipe,
            kehidupan: form.kjKehidupan,
            kesehatan: form.kjKesehatan,
            kontribusi: form.kjKontribusi,
            kekhasan: form.kjKekhasan,
            kharisma: form.kjKharisma,
          },
          kompilasiAdaptasi: {
            gayaBelajar: form.kaGayaBelajar,
            gayaKomunikasi: form.kaGayaKomunikasi,
            gayaKepemimpinan: form.kaGayaKepemimpinan,
            gayaKerja: form.kaGayaKerja,
            gayaKonflik: form.kaGayaKonflik,
          },
        },
      };
      await personalityResultsAPI.update(code, payload);
      toast({ title: 'Berhasil', description: `Data ${code.toUpperCase()} berhasil disimpan.` });
    } catch {
      toast({ title: 'Error', description: 'Gagal menyimpan data', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div className="space-y-6 pb-10">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-[#1a1a1a]/95 backdrop-blur border-b border-white/10 -mx-6 px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => navigate('/admin/personality-results')}
            className="text-gray-400 hover:text-white transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ backgroundColor: form.color }}
          >
            {code.toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="text-white font-semibold text-base leading-tight truncate">
              {form.label || code}
            </h1>
            <p className="text-gray-500 text-xs">
              {original.element.toUpperCase()} · {original.socialType}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !canEditResult}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-black text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 flex-shrink-0"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Menyimpan...' : 'Simpan'}
        </button>
      </div>

      {/* Basic Info */}
      <Section title="Informasi Dasar">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Label / Nama Kepribadian">
            <input
              className={inputCls}
              value={form.label}
              onChange={e => set('label', e.target.value)}
              placeholder="Si Kreatif Ekspresif"
            />
          </Field>
          <Field label="Warna Identitas">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.color}
                onChange={e => set('color', e.target.value)}
                className="w-10 h-10 rounded-lg border border-white/10 bg-transparent cursor-pointer"
              />
              <input
                className={`${inputCls} flex-1`}
                value={form.color}
                onChange={e => set('color', e.target.value)}
                placeholder="#4CAF50"
              />
            </div>
          </Field>
        </div>
      </Section>

      {/* Analysis */}
      <Section title="Ringkasan Hasil (ditampilkan di Dashboard User)">
        <div className="space-y-4">
          <Field label="Tipe Kepribadian (heading)">
            <input
              className={inputCls}
              value={form.aiPersonalityType}
              onChange={e => set('aiPersonalityType', e.target.value)}
            />
          </Field>
          <Field label="Ringkasan / Summary">
            <AutoTextarea
              value={form.aiSummary}
              onChange={e => set('aiSummary', e.target.value)}
              minRows={5}
            />
          </Field>
          <Field label="Kekuatan (Strengths) — satu item per baris">
            <AutoTextarea
              value={form.aiStrengths}
              onChange={e => set('aiStrengths', e.target.value)}
              minRows={4}
            />
          </Field>
          <Field label="Area yang Perlu Dikembangkan — satu item per baris">
            <AutoTextarea
              value={form.aiAreasToImprove}
              onChange={e => set('aiAreasToImprove', e.target.value)}
              minRows={4}
            />
          </Field>
          <Field label="Rekomendasi Karir — satu item per baris">
            <AutoTextarea
              value={form.aiCareerRecommendations}
              onChange={e => set('aiCareerRecommendations', e.target.value)}
              minRows={3}
            />
          </Field>
        </div>
      </Section>

      {/* Insights */}
      <Section title="Insights (ditampilkan di Hasil Tes & Sertifikat)">
        <div className="space-y-4">
          <Field label="Label Kepribadian (Sertifikat)">
            <input
              className={inputCls}
              value={form.insPersonalityLabel}
              onChange={e => set('insPersonalityLabel', e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Deskripsi Elemen — satu item per baris">
              <AutoTextarea
                value={form.insElementDescription}
                onChange={e => set('insElementDescription', e.target.value)}
                minRows={4}
              />
            </Field>
            <Field label="Ciri Khas — satu item per baris">
              <AutoTextarea
                value={form.insCiriKhas}
                onChange={e => set('insCiriKhas', e.target.value)}
                minRows={4}
              />
            </Field>
          </div>
          <Field label="Karakter — satu item per baris">
            <AutoTextarea
              value={form.insKarakter}
              onChange={e => set('insKarakter', e.target.value)}
              minRows={4}
            />
          </Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Rekomendasi Karir (ringkas, koma-pisah)">
              <input
                className={inputCls}
                value={form.insRekomendasiKarir}
                onChange={e => set('insRekomendasiKarir', e.target.value)}
              />
            </Field>
            <Field label="Dibutuhkan pada Profesi">
              <input
                className={inputCls}
                value={form.insDibutuhkanPadaProfesi}
                onChange={e => set('insDibutuhkanPadaProfesi', e.target.value)}
              />
            </Field>
          </div>
        </div>
      </Section>

      {/* Kekuatan Jatidiri */}
      <Section title="Kekuatan Jatidiri">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            ['kjTipe', 'Tipe'],
            ['kjKehidupan', 'Kehidupan'],
            ['kjKesehatan', 'Kesehatan'],
            ['kjKontribusi', 'Kontribusi'],
            ['kjKekhasan', 'Kekhasan'],
            ['kjKharisma', 'Kharisma'],
          ].map(([key, label]) => (
            <Field key={key} label={label}>
              <input
                className={inputCls}
                value={form[key]}
                onChange={e => set(key, e.target.value)}
              />
            </Field>
          ))}
        </div>
      </Section>

      {/* Kompilasi Adaptasi */}
      <Section title="Kompilasi Adaptasi">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            ['kaGayaBelajar', 'Gaya Belajar'],
            ['kaGayaKomunikasi', 'Gaya Komunikasi'],
            ['kaGayaKepemimpinan', 'Gaya Kepemimpinan'],
            ['kaGayaKerja', 'Gaya Kerja'],
            ['kaGayaKonflik', 'Gaya Konflik'],
          ].map(([key, label]) => (
            <Field key={key} label={label}>
              <input
                className={inputCls}
                value={form[key]}
                onChange={e => set(key, e.target.value)}
              />
            </Field>
          ))}
        </div>
      </Section>
    </div>
  );
};

export default PersonalityResultEdit;
