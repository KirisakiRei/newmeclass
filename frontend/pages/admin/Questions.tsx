// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, HelpCircle, GripVertical, X, Star, Lock, Tag, BarChart2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { useToast } from '../../hooks/use-toast';
import { questionsAPI } from '../../services/api';
import PageHeader from '../../components/ui/page-header';
import StatsGrid from '../../components/ui/stats-grid';
import { TableSkeleton } from '../../components/ui/loading-spinner';
import { useAdminAccess } from '../../lib/admin-rbac';

const ELEMENTS = ['KAYU', 'API', 'TANAH', 'LOGAM', 'AIR'];
const ELEMENT_COLORS = { KAYU: 'text-green-400', API: 'text-orange-400', TANAH: 'text-yellow-400', LOGAM: 'text-gray-400', AIR: 'text-blue-400' };

const LIKERT_OPTIONS = [
  { text: 'Sangat Setuju (SS)', value: 'SS', baseScore: 5 },
  { text: 'Setuju (S)', value: 'S', baseScore: 4 },
  { text: 'Netral (N)', value: 'N', baseScore: 3 },
  { text: 'Tidak Setuju (TS)', value: 'TS', baseScore: 2 },
  { text: 'Sangat Tidak Setuju (STS)', value: 'STS', baseScore: 1 },
];

const DEFAULT_FORM = {
  text: '',
  type: 'multiple_choice',
  category: 'KAYU',
  testType: 'free',
  // for likert:
  targetElement: 'KAYU',
  socialDimension: 'none',
  // for multiple_choice:
  options: [
    { text: '', value: 'A', scores: { kayu: 0, api: 0, tanah: 0, logam: 0, air: 0 } },
    { text: '', value: 'B', scores: { kayu: 0, api: 0, tanah: 0, logam: 0, air: 0 } },
  ],
  isRequired: true,
  order: 0,
  // jenjang variants (hanya teks pertanyaan, opsi jawaban tetap sama)
  variants: { sd: '', smp: '', sma: '' },
};

const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Pilihan Ganda (Multi-Skor)' },
  { value: 'likert', label: 'Likert 5-Skala (SS - STS)' },
  { value: 'text', label: 'Jawaban Teks' },
  { value: 'yes_no', label: 'Ya/Tidak' },
];

const CORE_STAGE_LABELS = {
  TES_A: 'Core Tes A',
  TES_B: 'Core Tes B',
  TES_C: 'Core Tes C',
};

const CORE_ANSWER_TYPE_LABELS = {
  boolean: 'Ya / Tidak',
  multiple_choice: 'Pilihan Tetap',
  likert: 'Likert 4 Skala',
};

const Questions = () => {
  const { toast } = useToast();
  const adminAccess = useAdminAccess();
  const [activeTab, setActiveTab] = useState('questions'); // 'questions' | 'categories'
  const [questions, setQuestions] = useState([]);
  const [categories, setCategories] = useState(['KAYU', 'API', 'TANAH', 'LOGAM', 'AIR']);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [activeTestType, setActiveTestType] = useState('all');
  const [formData, setFormData] = useState({ ...DEFAULT_FORM });
  // Category management state
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryIdx, setEditingCategoryIdx] = useState(null);
  const [editingCategoryValue, setEditingCategoryValue] = useState('');
  const canCreateQuestion = adminAccess.hasPermission('questions.create');
  const canEditQuestion = adminAccess.hasPermission('questions.edit');
  const canDeleteQuestion = adminAccess.hasPermission('questions.delete');
  const canManageQuestion = adminAccess.hasPermission('questions.manage');
  const getCoreMeta = (question) => question?.coreScoringMetadata || question?.variants?.coreScoring || null;
  const isProtectedCoreQuestion = (question) => Boolean(getCoreMeta(question));
  const isPremiumCoreQuestion = (question) => isProtectedCoreQuestion(question);
  const isFreeActiveQuestion = (question) => question?.testType === 'free';
  const isLegacyPaidQuestion = (question) => question?.testType === 'paid' && !isProtectedCoreQuestion(question);
  const isCurrentlyUsedQuestion = (question) => isFreeActiveQuestion(question) || isPremiumCoreQuestion(question);
  const getQuestionGroupLabel = (question) => {
    const coreMeta = getCoreMeta(question);
    if (!coreMeta) return question.category || 'Lainnya';
    if (coreMeta.stage === 'TES_C' && coreMeta.groupElement) {
      return `${CORE_STAGE_LABELS[coreMeta.stage]} - ${coreMeta.groupElement}`;
    }
    return CORE_STAGE_LABELS[coreMeta.stage] || 'Core Scoring';
  };
  const getQuestionTypeLabel = (question) => {
    const coreMeta = getCoreMeta(question);
    if (coreMeta?.answerType) {
      return CORE_ANSWER_TYPE_LABELS[coreMeta.answerType] || coreMeta.answerType;
    }
    return typeLabel(question.type);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [qRes, cRes] = await Promise.all([
        questionsAPI.getAll(),
        questionsAPI.getCategories(),
      ]);
      setQuestions(qRes.data || []);
      if (Array.isArray(cRes.data) && cRes.data.length > 0) {
        setCategories(cRes.data.filter((category) => category && category !== 'CORE_SCORING_PREMIUM_V1'));
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Gagal memuat data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // ---- Question CRUD ----

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingQuestion ? !canEditQuestion : !canCreateQuestion) return;
    try {
      let payload = { ...formData, order: editingQuestion ? formData.order : questions.length };

      if (formData.type === 'likert') {
        // Build 5 auto-options with score on target element
        payload.options = LIKERT_OPTIONS.map(opt => ({
          text: opt.text,
          value: opt.value,
          scores: ELEMENTS.reduce((acc, el) => {
            acc[el.toLowerCase()] = el === formData.targetElement ? opt.baseScore : 0;
            return acc;
          }, {}),
        }));
      }

      if (editingQuestion) {
        await questionsAPI.update(editingQuestion._id, payload);
        toast({ title: 'Sukses', description: 'Pertanyaan berhasil diupdate' });
      } else {
        await questionsAPI.create(payload);
        toast({ title: 'Sukses', description: 'Pertanyaan berhasil ditambahkan' });
      }
      setShowModal(false);
      resetForm();
      loadAll();
    } catch (err) {
      toast({ title: 'Error', description: 'Gagal menyimpan pertanyaan', variant: 'destructive' });
    }
  };

  const handleEdit = (question) => {
    if (!canEditQuestion) return;
    setEditingQuestion(question);
    const opts = question.options.length
      ? question.options.map(o => ({
          text: o.text || '',
          value: o.value || '',
          scores: o.scores || { kayu: 0, api: 0, tanah: 0, logam: 0, air: 0 },
        }))
      : DEFAULT_FORM.options;
    setFormData({
      text: question.text || question.question || '',
      type: question.type || 'multiple_choice',
      category: question.category || 'KAYU',
      testType: question.testType || 'free',
      targetElement: question.targetElement || 'KAYU',
      socialDimension: question.socialDimension || 'none',
      options: opts,
      isRequired: question.isRequired !== false,
      order: question.order || 0,
      variants: {
        sd: question.variants?.sd || '',
        smp: question.variants?.smp || '',
        sma: question.variants?.sma || '',
      },
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!canDeleteQuestion) return;
    const targetQuestion = questions.find((item) => item._id === id || item.id === id);
    if (isProtectedCoreQuestion(targetQuestion)) {
      toast({ title: 'Dikunci Sistem', description: 'Pertanyaan core scoring premium tidak dapat dihapus.', variant: 'destructive' });
      return;
    }
    if (!window.confirm('Yakin ingin menghapus pertanyaan ini')) return;
    try {
      await questionsAPI.delete(id);
      toast({ title: 'Sukses', description: 'Pertanyaan berhasil dihapus' });
      loadAll();
    } catch (err) {
      toast({ title: 'Error', description: 'Gagal menghapus pertanyaan', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setFormData({ ...DEFAULT_FORM });
    setEditingQuestion(null);
  };

  const addOption = () => {
    const letters = 'ABCDEFGHIJ';
    setFormData(prev => ({
      ...prev,
      options: [...prev.options, { text: '', value: letters[prev.options.length] || String(prev.options.length + 1), scores: { kayu: 0, api: 0, tanah: 0, logam: 0, air: 0 } }],
    }));
  };

  const removeOption = (index) => {
    setFormData(prev => ({ ...prev, options: prev.options.filter((_, i) => i !== index) }));
  };

  const updateOptionText = (index, val) => {
    const newOpts = [...formData.options];
    newOpts[index] = { ...newOpts[index], text: val };
    setFormData(prev => ({ ...prev, options: newOpts }));
  };

  const updateOptionScore = (index, element, val) => {
    const newOpts = [...formData.options];
    newOpts[index] = { ...newOpts[index], scores: { ...newOpts[index].scores, [element.toLowerCase()]: parseInt(val) || 0 } };
    setFormData(prev => ({ ...prev, options: newOpts }));
  };

  // ---- Category CRUD ----
  const addCategory = () => {
    if (!canManageQuestion) return;
    const name = newCategoryName.trim().toUpperCase();
    if (!name || categories.includes(name)) return;
    setCategories(prev => [...prev, name]);
    setNewCategoryName('');
    toast({ title: 'Sukses', description: `Kategori "${name}" ditambahkan` });
  };

  const deleteCategory = (idx) => {
    if (!canManageQuestion) return;
    const name = categories[idx];
    if (ELEMENTS.includes(name)) {
      toast({ title: 'Tidak bisa', description: 'Kategori elemen bawaan tidak dapat dihapus', variant: 'destructive' });
      return;
    }
    setCategories(prev => prev.filter((_, i) => i !== idx));
    toast({ title: 'Sukses', description: `Kategori "${name}" dihapus` });
  };

  const startEditCategory = (idx) => {
    if (!canManageQuestion) return;
    setEditingCategoryIdx(idx);
    setEditingCategoryValue(categories[idx]);
  };

  const saveEditCategory = () => {
    if (!canManageQuestion) return;
    const name = editingCategoryValue.trim().toUpperCase();
    if (!name) return;
    setCategories(prev => prev.map((c, i) => i === editingCategoryIdx ? name : c));
    setEditingCategoryIdx(null);
  };

  // ---- Derived values ----
  const typeLabel = (type) => QUESTION_TYPES.find(t => t.value === type).label || type;
  const activeQuestions = questions.filter((question) => isCurrentlyUsedQuestion(question));
  const legacyPaidCount = questions.filter((question) => isLegacyPaidQuestion(question)).length;
  const filteredQuestions = activeTestType === 'all'
    ? activeQuestions
    : activeTestType === 'premium'
      ? questions.filter((question) => isPremiumCoreQuestion(question))
      : questions.filter((question) => isFreeActiveQuestion(question));
  const freeCount = questions.filter((question) => isFreeActiveQuestion(question)).length;
  const coreCount = questions.filter((question) => isPremiumCoreQuestion(question)).length;
  const groupedQuestions = filteredQuestions.reduce((acc, q) => {
    const key = getQuestionGroupLabel(q);
    if (!acc[key]) acc[key] = [];
    acc[key].push(q);
    return acc;
  }, {});
  const editingCoreMeta = editingQuestion ? getCoreMeta(editingQuestion) : null;
  const isEditingProtectedCore = Boolean(editingCoreMeta);

  return (
    <div>
      <PageHeader icon={HelpCircle} title="Pertanyaan" description="Kelola pertanyaan dan kategori untuk NEWME Test">
        {activeTab === 'questions' && canCreateQuestion && (
          <Button onClick={() => { resetForm(); setShowModal(true); }} className="bg-yellow-400 text-black hover:bg-yellow-500">
            <Plus className="w-4 h-4 mr-2" /> Tambah Pertanyaan
          </Button>
        )}
      </PageHeader>

      <StatsGrid className="mb-6" stats={[
        { label: 'Total Aktif', value: activeQuestions.length },
        { label: 'Test Gratis', value: freeCount, icon: Star, iconBg: 'bg-green-400/10', iconColor: 'text-green-400', valueColor: 'text-green-400' },
        { label: 'Premium Core', value: coreCount, icon: Lock, iconBg: 'bg-yellow-400/10', iconColor: 'text-yellow-400', valueColor: 'text-yellow-400' },
        { label: 'Legacy Nonaktif', value: legacyPaidCount, icon: BarChart2, iconBg: 'bg-gray-400/10', iconColor: 'text-gray-400', valueColor: 'text-gray-400' },
        { label: 'Kategori', value: categories.length, icon: Tag, iconBg: 'bg-blue-400/10', iconColor: 'text-blue-400', valueColor: 'text-blue-400' },
      ]} />

      {/* Tab Nav */}
      <div className="flex gap-2 mb-6 border-b border-yellow-400/20">
        <button
          onClick={() => setActiveTab('questions')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'questions' ? 'border-yellow-400 text-yellow-400' : 'border-transparent text-gray-400 hover:text-white'}`}
        >
          <HelpCircle className="w-4 h-4 inline mr-1" /> Pertanyaan
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'categories' ? 'border-yellow-400 text-yellow-400' : 'border-transparent text-gray-400 hover:text-white'}`}
        >
          <Tag className="w-4 h-4 inline mr-1" /> Kategori
        </button>
      </div>

      {/* ======= QUESTIONS TAB ======= */}
      {activeTab === 'questions' && (
        <>
          {/* Filter */}
          <div className="flex gap-2 mb-6">
            {[['all', `Semua Aktif (${activeQuestions.length})`], ['free', `Gratis (${freeCount})`], ['premium', `Premium (${coreCount})`]].map(([val, lbl]) => (
              <Button key={val} variant={activeTestType === val ? 'default' : 'outline'} onClick={() => setActiveTestType(val)}
                className={activeTestType === val ? 'bg-yellow-400 text-black' : 'border-yellow-400/50 text-yellow-400 text-sm'}>
                {lbl}
              </Button>
            ))}
          </div>

          {legacyPaidCount > 0 && (
            <Card className="mb-6 bg-[#2a2a2a] border-gray-500/20">
              <CardContent className="p-4">
                <p className="text-sm text-gray-300">
                  Flow aktif saat ini hanya memakai <span className="text-green-400 font-semibold">Gratis</span> dan <span className="text-yellow-400 font-semibold">Premium Core</span>.
                  {' '}Masih ada <span className="font-semibold text-gray-100">{legacyPaidCount}</span> pertanyaan berbayar lama yang tersimpan di database, tetapi tidak dipakai lagi oleh user test.
                </p>
              </CardContent>
            </Card>
          )}

          {loading ? (
            <TableSkeleton rows={6} cols={4} />
          ) : filteredQuestions.length === 0 ? (
            <div className="text-center py-10"><p className="text-gray-400">Tidak ada pertanyaan</p></div>
          ) : (
            <div className="space-y-6">
              {Object.keys(groupedQuestions).map(category => (
                <div key={category}>
                  <h2 className="text-lg font-semibold text-yellow-400 mb-3 capitalize">{category}</h2>
                  <div className="space-y-2">
                    {groupedQuestions[category].sort((a, b) => a.order - b.order).map((question, idx) => (
                      <Card key={question._id} className="bg-[#2a2a2a] border-yellow-400/20">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <GripVertical className="w-4 h-4 text-gray-500 mt-1 shrink-0" />
                            <div className="flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="text-white font-medium">{idx + 1}. {question.question || question.text}</p>
                                  <div className="flex flex-wrap gap-1.5 mt-1">
                                    <span className="text-xs px-2 py-0.5 bg-yellow-400/20 text-yellow-400 rounded">{getQuestionTypeLabel(question)}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded ${isFreeActiveQuestion(question) ? 'bg-green-400/20 text-green-400' : 'bg-yellow-400/20 text-yellow-400'}`}>
                                      {isFreeActiveQuestion(question) ? 'Gratis' : 'Premium'}
                                    </span>
                                    {isProtectedCoreQuestion(question) && (
                                      <span className="text-xs px-2 py-0.5 bg-purple-400/10 text-purple-300 rounded">
                                        Core Scoring Protected
                                      </span>
                                    )}
                                    {getCoreMeta(question)?.stage && (
                                      <span className="text-xs px-2 py-0.5 bg-purple-400/10 text-purple-400 rounded">
                                        {CORE_STAGE_LABELS[getCoreMeta(question).stage] || getCoreMeta(question).stage}
                                      </span>
                                    )}
                                    {question.targetElement && (
                                      <span className={`text-xs px-2 py-0.5 bg-blue-400/10 rounded ${ELEMENT_COLORS[question.targetElement] || 'text-blue-400'}`}>
                                        Elemen: {question.targetElement}
                                      </span>
                                    )}
                                    {getCoreMeta(question)?.questionKey && (
                                      <span className="text-xs px-2 py-0.5 bg-gray-700 text-gray-300 rounded font-mono">
                                        {getCoreMeta(question).questionKey}
                                      </span>
                                    )}
                                    {question.socialDimension && question.socialDimension !== 'none' && (
                                      <span className="text-xs px-2 py-0.5 bg-purple-400/10 text-purple-400 rounded">{question.socialDimension}</span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex gap-1 shrink-0">
                                  {canEditQuestion ? <Button size="sm" variant="ghost" className="text-yellow-400 p-1" onClick={() => handleEdit(question)}><Edit className="w-4 h-4" /></Button> : null}
                                  {canDeleteQuestion && !isProtectedCoreQuestion(question) ? <Button size="sm" variant="ghost" className="text-red-400 p-1" onClick={() => handleDelete(question._id)}><Trash2 className="w-4 h-4" /></Button> : null}
                                </div>
                              </div>
                              {question.type === 'likert' && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {LIKERT_OPTIONS.map(o => (
                                    <span key={o.value} className="text-xs px-2 py-0.5 bg-gray-700 text-gray-300 rounded">{o.value}={o.baseScore}</span>
                                  ))}
                                </div>
                              )}
                              {question.type === 'multiple_choice' && question.options.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {question.options.map((opt, i) => (
                                    <div key={i} className="text-gray-400 text-sm pl-2 flex items-start gap-2">
                                      <span className="shrink-0">• {opt.text}</span>
                                      {!isProtectedCoreQuestion(question) && opt.scores && (
                                        <span className="text-xs text-gray-600">
                                          [{ELEMENTS.map(el => `${el.slice(0,1)}${opt.scores[el.toLowerCase()] ?? 0}`).join(' ')}]
                                        </span>
                                      )}
                                      {isProtectedCoreQuestion(question) && (
                                        <span className="text-xs text-gray-600 font-mono">
                                          ({opt.value})
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ======= CATEGORIES TAB ======= */}
      {activeTab === 'categories' && (
        <div className="max-w-lg space-y-4">
          <Card className="bg-[#2a2a2a] border-yellow-400/20">
            <CardContent className="p-4">
              <h3 className="text-white font-semibold mb-3">Tambah Kategori Baru</h3>
              <div className="flex gap-2">
                <Input value={newCategoryName} onChange={e => setNewCategoryName(e.target.value.toUpperCase())}
                  placeholder="Nama kategori (huruf kapital)" className="flex-1 bg-[#1a1a1a] border-yellow-400/20 text-white"
                  onKeyDown={e => e.key === 'Enter' && addCategory()} disabled={!canManageQuestion} />
                {canManageQuestion ? <Button onClick={addCategory} className="bg-yellow-400 text-black hover:bg-yellow-500"><Plus className="w-4 h-4" /></Button> : null}
              </div>
              <p className="text-gray-600 text-xs mt-2">Kategori 5 Elemen bawaan (KAYU, API, TANAH, LOGAM, AIR) tidak dapat dihapus.</p>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {categories.map((cat, idx) => (
              <Card key={cat} className="bg-[#2a2a2a] border-yellow-400/20">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${ELEMENTS.includes(cat) ? 'bg-yellow-400' : 'bg-gray-500'}`} />
                  {editingCategoryIdx === idx ? (
                    <Input value={editingCategoryValue} onChange={e => setEditingCategoryValue(e.target.value.toUpperCase())}
                      className="flex-1 bg-[#1a1a1a] border-yellow-400/20 text-white h-8"
                      onKeyDown={e => e.key === 'Enter' && saveEditCategory()} autoFocus />
                  ) : (
                    <span className="flex-1 text-white font-mono text-sm">{cat}</span>
                  )}
                  <div className="flex gap-1">
                    {editingCategoryIdx === idx && canManageQuestion ? (
                      <>
                        <Button size="sm" className="bg-yellow-400 text-black h-7 px-2 text-xs" onClick={saveEditCategory}>Simpan</Button>
                        <Button size="sm" variant="ghost" className="text-gray-400 h-7 px-2" onClick={() => setEditingCategoryIdx(null)}>Batal</Button>
                      </>
                    ) : (
                      <>
                        {canManageQuestion ? <Button size="sm" variant="ghost" className="text-yellow-400 p-1 h-7" onClick={() => startEditCategory(idx)}><Edit className="w-3.5 h-3.5" /></Button> : null}
                        {!ELEMENTS.includes(cat) && canManageQuestion ? (
                          <Button size="sm" variant="ghost" className="text-red-400 p-1 h-7" onClick={() => deleteCategory(idx)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        ) : null}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ======= QUESTION MODAL ======= */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#2a2a2a] rounded-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#2a2a2a] p-4 border-b border-yellow-400/20 flex justify-between items-center z-10">
              <h2 className="text-lg font-bold text-white">{editingQuestion ? 'Edit Pertanyaan' : 'Tambah Pertanyaan'}</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* Question Text */}
              <div>
                <label className="text-gray-400 text-sm block mb-1">Teks Pertanyaan <span className="text-red-400">*</span></label>
                <textarea value={formData.text} onChange={e => setFormData({ ...formData, text: e.target.value })} required
                  rows={3} className="w-full bg-[#1a1a1a] border border-yellow-400/20 rounded-md p-2 text-white text-sm" />
              </div>

              {isEditingProtectedCore && (
                <div className="bg-purple-400/10 border border-purple-400/20 rounded-lg p-3 space-y-2">
                  <p className="text-purple-300 text-xs font-semibold uppercase tracking-wider">Core Scoring Protected</p>
                  <p className="text-gray-300 text-sm">
                    Pertanyaan ini dipakai langsung oleh engine scoring premium. Yang bisa diubah dari dashboard admin hanya teks pertanyaan, label opsi, dan variasi copy untuk UI.
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded bg-purple-400/10 text-purple-300">{CORE_STAGE_LABELS[editingCoreMeta?.stage] || editingCoreMeta?.stage}</span>
                    <span className="px-2 py-0.5 rounded bg-yellow-400/10 text-yellow-300">{CORE_ANSWER_TYPE_LABELS[editingCoreMeta?.answerType] || editingCoreMeta?.answerType}</span>
                    {editingCoreMeta?.questionKey && <span className="px-2 py-0.5 rounded bg-gray-700 text-gray-200 font-mono">{editingCoreMeta.questionKey}</span>}
                    {editingCoreMeta?.groupElement && <span className="px-2 py-0.5 rounded bg-blue-400/10 text-blue-300">Elemen: {editingCoreMeta.groupElement}</span>}
                  </div>
                </div>
              )}

              {/* Type + Category + TestType */}
              {!isEditingProtectedCore && (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-gray-400 text-xs block mb-1">Tipe Soal</label>
                    <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}
                      className="w-full bg-[#1a1a1a] border border-yellow-400/20 rounded-md p-2 text-white text-sm">
                      {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs block mb-1">Kategori</label>
                    <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}
                      className="w-full bg-[#1a1a1a] border border-yellow-400/20 rounded-md p-2 text-white text-sm">
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs block mb-1">Jenis Test</label>
                    <select value={formData.testType} onChange={e => setFormData({ ...formData, testType: e.target.value })}
                      className="w-full bg-[#1a1a1a] border border-yellow-400/20 rounded-md p-2 text-white text-sm">
                      <option value="free">Test Gratis</option>
                      <option value="paid">Test Berbayar</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Likert: Target Element + Social Dimension */}
              {!isEditingProtectedCore && formData.type === 'likert' && (
                <div className="bg-blue-400/5 border border-blue-400/20 rounded-lg p-3 space-y-3">
                  <p className="text-blue-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-1">
                    <BarChart2 className="w-3.5 h-3.5" /> Konfigurasi Likert
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-gray-400 text-xs block mb-1">Target Elemen (skor SS=5 &rarr; STS=1)</label>
                      <select value={formData.targetElement} onChange={e => setFormData({ ...formData, targetElement: e.target.value })}
                        className="w-full bg-[#1a1a1a] border border-yellow-400/20 rounded-md p-2 text-white text-sm">
                        {ELEMENTS.map(el => <option key={el} value={el}>{el}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-gray-400 text-xs block mb-1">Dimensi Sosial (opsional)</label>
                      <select value={formData.socialDimension} onChange={e => setFormData({ ...formData, socialDimension: e.target.value })}
                        className="w-full bg-[#1a1a1a] border border-yellow-400/20 rounded-md p-2 text-white text-sm">
                        <option value="none">-- Tidak ada --</option>
                        <option value="extrovert">Extrovert (E)</option>
                        <option value="introvert">Introvert (I)</option>
                        <option value="ambivert">Ambivert (A)</option>
                      </select>
                    </div>
                  </div>
                  <div className="text-gray-500 text-xs">
                    Jawaban akan dibuat otomatis: SS=5 &middot; S=4 &middot; N=3 &middot; TS=2 &middot; STS=1 untuk elemen <span className="text-yellow-400 font-mono">{formData.targetElement}</span>.
                  </div>
                </div>
              )}

              {/* Multiple Choice with per-element scores */}
              {isEditingProtectedCore ? (
                <div className="bg-yellow-400/5 border border-yellow-400/20 rounded-lg p-3 space-y-3">
                  <label className="text-gray-300 text-xs block font-medium">
                    Label Opsi Jawaban
                    <span className="text-gray-500 ml-1 font-normal">(nilai opsi, bobot, dan urutan slot dikunci oleh engine)</span>
                  </label>
                  <div className="space-y-2">
                    {formData.options.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="w-12 text-gray-500 text-sm font-mono text-center">{opt.value}</div>
                        <input
                          value={opt.text}
                          onChange={e => updateOptionText(idx, e.target.value)}
                          placeholder={`Opsi ${opt.value}`}
                          className="flex-1 bg-[#1a1a1a] border border-yellow-400/20 rounded-md p-2 text-white text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : formData.type === 'multiple_choice' && (
                <div>
                  <label className="text-gray-400 text-xs block mb-2 font-medium">
                    Opsi Jawaban — Skor per Elemen
                    <span className="text-gray-600 ml-1 font-normal">(berapa poin tiap elemen yang diperoleh jika opsi ini dipilih)</span>
                  </label>
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-center gap-2 px-1">
                      <div className="w-6 text-gray-600 text-xs">Val</div>
                      <div className="flex-1 text-gray-600 text-xs">Teks Opsi</div>
                      {ELEMENTS.map(el => <div key={el} className={`w-10 text-xs text-center font-mono ${ELEMENT_COLORS[el]}`}>{el.slice(0, 3)}</div>)}
                      <div className="w-7" />
                    </div>
                    {formData.options.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="w-6 text-gray-500 text-sm font-mono text-center">{opt.value}</div>
                        <input value={opt.text} onChange={e => updateOptionText(idx, e.target.value)}
                          placeholder={`Opsi ${opt.value}`}
                          className="flex-1 bg-[#1a1a1a] border border-yellow-400/20 rounded-md p-1.5 text-white text-sm" />
                        {ELEMENTS.map(el => (
                          <input key={el} type="number" min="0" max="9"
                            value={opt.scores?.[el.toLowerCase()] ?? 0}
                            onChange={e => updateOptionScore(idx, el, e.target.value)}
                            className="w-10 bg-[#1a1a1a] border border-yellow-400/20 rounded p-1 text-white text-xs text-center" />
                        ))}
                        {formData.options.length > 1 && (
                          <Button type="button" size="sm" variant="ghost" className="text-red-400 p-1 w-7" onClick={() => removeOption(idx)}><X className="w-3.5 h-3.5" /></Button>
                        )}
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={addOption} className="border-yellow-400/50 text-yellow-400 text-xs">
                      <Plus className="w-3 h-3 mr-1" /> Tambah Opsi
                    </Button>
                  </div>
                </div>
              )}

              {/* Jenjang Variants */}
              <div className="bg-purple-400/5 border border-purple-400/20 rounded-lg p-3 space-y-2">
                <p className="text-purple-300 text-xs font-semibold uppercase tracking-wider">
                  Variasi Teks per Jenjang <span className="text-gray-500 font-normal normal-case tracking-normal">(opsional — kosongkan = pakai teks Dewasa di atas)</span>
                </p>
                {[['sd', 'SD (Kelas 4–6)'], ['smp', 'SMP'], ['sma', 'SMA']].map(([key, lbl]) => (
                  <div key={key}>
                    <label className="text-gray-500 text-xs block mb-0.5">{lbl}</label>
                    <textarea
                      value={formData.variants?.[key] || ''}
                      onChange={e => setFormData(prev => ({ ...prev, variants: { ...prev.variants, [key]: e.target.value } }))}
                      rows={2}
                      placeholder={`Versi ${lbl}...`}
                      className="w-full bg-[#1a1a1a] border border-purple-400/20 rounded-md p-2 text-white text-sm resize-y"
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" checked={formData.isRequired} id="isRequired"
                  onChange={e => setFormData({ ...formData, isRequired: e.target.checked })} className="rounded" disabled={isEditingProtectedCore} />
                <label htmlFor="isRequired" className="text-gray-400 text-sm cursor-pointer">Pertanyaan wajib dijawab</label>
              </div>

              <div className="flex gap-2 pt-2 border-t border-yellow-400/20">
                <Button type="button" variant="outline" onClick={() => { setShowModal(false); resetForm(); }} className="flex-1 border-gray-600 text-gray-400">Batal</Button>
                <Button type="submit" disabled={editingQuestion ? !canEditQuestion : !canCreateQuestion} className="flex-1 bg-yellow-400 text-black hover:bg-yellow-500">Simpan</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Questions;
