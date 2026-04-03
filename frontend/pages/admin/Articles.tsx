// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FileText, Plus, Edit2, Trash2, Eye, EyeOff, Search, Bold, Italic, Underline as UnderlineIcon, Strikethrough, AlignLeft, AlignCenter, AlignRight, List, ListOrdered, Quote, Undo2, Redo2, Link2, ImagePlus, Upload, Loader2, X, Heading1, Heading2, Heading3, LayoutGrid, BookOpen } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExt from '@tiptap/extension-underline';
import TextAlignExt from '@tiptap/extension-text-align';
import ImageExt from '@tiptap/extension-image';
import LinkExt from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useToast } from '../../hooks/use-toast';
import { articlesAPI } from '../../services/api';
import PageHeader from '../../components/ui/page-header';
import StatsGrid from '../../components/ui/stats-grid';
import LoadingSpinner from '../../components/ui/loading-spinner';
import EmptyState from '../../components/ui/empty-state';
import { getApiErrorMessage } from '../../services/api-error';
import { sanitizeHtml } from '../../lib/safe-html';
import SharedImageUploader from '../../components/admin/SharedImageUploader.tsx';
import { resolveBackendAssetUrl, uploadAdminImage } from '../../lib/admin-media';
import { useAdminAccess } from '../../lib/admin-rbac';

// ── RichTextEditor Toolbar ──
const ToolbarButton = ({ active, onClick, title, children }) => (
  <button type="button" title={title} onClick={onClick}
    className={`p-1.5 rounded text-sm transition-colors ${active ? 'bg-yellow-400 text-black' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}>
    {children}
  </button>
);

const RichTextEditor = ({ content, onChange }) => {
  const fileInputRef = useRef(null);
  const [uploadingInline, setUploadingInline] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      UnderlineExt,
      TextAlignExt.configure({ types: ['heading', 'paragraph'] }),
      ImageExt.configure({ inline: false }),
      LinkExt.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Tulis konten artikel di sini...' }),
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: { class: 'prose prose-invert prose-sm max-w-none min-h-[300px] focus:outline-none p-4 text-gray-200' },
    },
  });

  const handleInlineImage = async (file) => {
    if (!file || !editor) return;
    setUploadingInline(true);
    try {
      const res = await uploadAdminImage(file, {
        category: 'articles',
        name: file.name,
      });
      if (res?.url) {
        editor.chain().focus().setImage({ src: res.url }).run();
      }
    } catch {
      const url = URL.createObjectURL(file);
      editor.chain().focus().setImage({ src: url }).run();
    } finally { setUploadingInline(false); }
  };

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes('link').href;
    const url = window.prompt('URL Link:', prev);
    if (url === null) return;
    if (url === '') { editor.chain().focus().unsetLink().run(); return; }
    editor.chain().focus().setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="border border-yellow-400/20 rounded-xl overflow-hidden bg-[#1a1a1a]">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-0.5 p-2 border-b border-yellow-400/20 bg-[#222] items-center">
        <ToolbarButton active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold"><Bold className="w-3.5 h-3.5" /></ToolbarButton>
        <ToolbarButton active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic"><Italic className="w-3.5 h-3.5" /></ToolbarButton>
        <ToolbarButton active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline"><UnderlineIcon className="w-3.5 h-3.5" /></ToolbarButton>
        <ToolbarButton active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough"><Strikethrough className="w-3.5 h-3.5" /></ToolbarButton>
        <div className="w-px h-5 bg-gray-600 mx-1" />
        <ToolbarButton active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="H1"><Heading1 className="w-3.5 h-3.5" /></ToolbarButton>
        <ToolbarButton active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="H2"><Heading2 className="w-3.5 h-3.5" /></ToolbarButton>
        <ToolbarButton active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="H3"><Heading3 className="w-3.5 h-3.5" /></ToolbarButton>
        <div className="w-px h-5 bg-gray-600 mx-1" />
        <ToolbarButton active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()} title="Align Left"><AlignLeft className="w-3.5 h-3.5" /></ToolbarButton>
        <ToolbarButton active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()} title="Align Center"><AlignCenter className="w-3.5 h-3.5" /></ToolbarButton>
        <ToolbarButton active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()} title="Align Right"><AlignRight className="w-3.5 h-3.5" /></ToolbarButton>
        <div className="w-px h-5 bg-gray-600 mx-1" />
        <ToolbarButton active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet List"><List className="w-3.5 h-3.5" /></ToolbarButton>
        <ToolbarButton active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Ordered List"><ListOrdered className="w-3.5 h-3.5" /></ToolbarButton>
        <ToolbarButton active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Blockquote"><Quote className="w-3.5 h-3.5" /></ToolbarButton>
        <div className="w-px h-5 bg-gray-600 mx-1" />
        <ToolbarButton active={editor.isActive('link')} onClick={setLink} title="Link"><Link2 className="w-3.5 h-3.5" /></ToolbarButton>
        <ToolbarButton active={false} onClick={() => fileInputRef.current.click()} title="Insert Image">
          {uploadingInline ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
        </ToolbarButton>
        <div className="w-px h-5 bg-gray-600 mx-1" />
        <ToolbarButton active={false} onClick={() => editor.chain().focus().undo().run()} title="Undo"><Undo2 className="w-3.5 h-3.5" /></ToolbarButton>
        <ToolbarButton active={false} onClick={() => editor.chain().focus().redo().run()} title="Redo"><Redo2 className="w-3.5 h-3.5" /></ToolbarButton>
      </div>
      <EditorContent editor={editor} />
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleInlineImage(e.target.files[0])} />
    </div>
  );
};

const Articles = () => {
  const { toast } = useToast();
  const adminAccess = useAdminAccess();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewMode, setPreviewMode] = useState('edit'); // 'edit' | 'card' | 'article'
  const [formData, setFormData] = useState({
    title: '', content: '', excerpt: '', category: 'berita', tags: '', isPublished: true, imageUrl: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const canCreateArticle = adminAccess.hasPermission('articles.create');
  const canEditArticle = adminAccess.hasPermission('articles.edit');
  const canDeleteArticle = adminAccess.hasPermission('articles.delete');
  const canManageArticle = adminAccess.hasPermission('articles.manage');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [articlesRes, statsRes] = await Promise.all([articlesAPI.getAll(), articlesAPI.getStats()]);
      setArticles(articlesRes.data);
      setStats(statsRes.data);
    } catch {
      toast({ title: 'Error', description: 'Gagal memuat data artikel', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const handleOpenCreate = () => {
    if (!canCreateArticle) return;
    setEditingArticle(null);
    setFormData({ title: '', content: '', excerpt: '', category: 'berita', tags: '', isPublished: true, imageUrl: '' });
    setPreviewMode('edit');
    setShowModal(true);
  };

  const handleOpenEdit = (article) => {
    if (!canEditArticle) return;
    setEditingArticle(article);
    setFormData({
      title: article.title, content: article.content, excerpt: article.excerpt || '',
      category: article.category, tags: article.tags.join(', ') || '',
      isPublished: article.isPublished, imageUrl: article.featuredImage || '',
    });
    setPreviewMode('edit');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingArticle ? !canEditArticle : !canCreateArticle) return;
    setSubmitting(true);
    try {
      const payload = {
        title: formData.title, content: formData.content, excerpt: formData.excerpt,
        category: formData.category, tags: formData.tags, isPublished: formData.isPublished,
        featuredImage: formData.imageUrl,
      };
      if (editingArticle) {
        await articlesAPI.update(editingArticle._id, payload);
        toast({ title: 'Berhasil', description: 'Artikel berhasil diupdate' });
      } else {
        await articlesAPI.create(payload);
        toast({ title: 'Berhasil', description: 'Artikel berhasil dibuat' });
      }
      setShowModal(false);
      loadData();
    } catch (error) {
      toast({ title: 'Error', description: getApiErrorMessage(error, 'Gagal menyimpan artikel'), variant: 'destructive' });
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (article) => {
    if (!canDeleteArticle) return;
    if (!window.confirm(`Hapus artikel "${article.title}"`)) return;
    try {
      await articlesAPI.delete(article._id);
      toast({ title: 'Berhasil', description: 'Artikel berhasil dihapus' });
      loadData();
    } catch { toast({ title: 'Error', description: 'Gagal menghapus artikel', variant: 'destructive' }); }
  };

  const togglePublish = async (article) => {
    if (!canManageArticle) return;
    try {
      await articlesAPI.update(article._id, { ...article, isPublished: !article.isPublished });
      toast({ title: 'Berhasil', description: `Artikel ${!article.isPublished ? 'dipublikasikan' : 'disembunyikan'}` });
      loadData();
    } catch { toast({ title: 'Error', description: 'Gagal mengubah status', variant: 'destructive' }); }
  };

  const filteredArticles = articles.filter(article =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const previewImgSrc = resolveBackendAssetUrl(formData.imageUrl);
  const safeStats = stats || {};

  if (loading) return <LoadingSpinner size="lg" text="Memuat artikel..." className="min-h-[60vh]" />;

  return (
    <div className="space-y-6">
      <PageHeader icon={FileText} title="Artikel & Berita" description="Kelola artikel untuk halaman berita">
        {canCreateArticle ? <Button onClick={handleOpenCreate} className="bg-yellow-400 text-black hover:bg-yellow-500"><Plus className="w-4 h-4 mr-2" /> Tambah Artikel</Button> : null}
      </PageHeader>

      <StatsGrid stats={[
        { label: 'Total Artikel', value: safeStats.total || 0 },
        { label: 'Dipublikasikan', value: safeStats.published || 0, valueColor: 'text-green-400' },
        { label: 'Draft', value: safeStats.draft || 0, valueColor: 'text-yellow-400' },
        { label: 'Total Views', value: safeStats.totalViews || 0, valueColor: 'text-blue-400' },
      ]} />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input placeholder="Cari artikel..." value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-[#2a2a2a] border-yellow-400/20 text-white" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredArticles.map((article) => {
          const imgSrc = resolveBackendAssetUrl(article.featuredImage);
          return (
            <Card key={article._id} className="bg-[#2a2a2a] border-yellow-400/20 overflow-hidden">
              {imgSrc && <img src={imgSrc} alt={article.title} className="w-full h-40 object-cover" />}
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded text-xs ${article.isPublished ? 'bg-green-400/20 text-green-400' : 'bg-yellow-400/20 text-yellow-400'}`}>
                    {article.isPublished ? 'Published' : 'Draft'}
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs bg-blue-400/20 text-blue-400">{article.category}</span>
                </div>
                <h3 className="text-white font-semibold mb-2 line-clamp-2">{article.title}</h3>
                <p className="text-gray-400 text-sm line-clamp-2">{article.excerpt}</p>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-gray-500 text-xs">{article.viewCount || 0} views</span>
                  <div className="flex gap-1">
                    {canManageArticle ? <Button size="sm" variant="ghost" onClick={() => togglePublish(article)} className="text-gray-400 hover:text-white">
                      {article.isPublished ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button> : null}
                    {canEditArticle ? <Button size="sm" variant="ghost" onClick={() => handleOpenEdit(article)} className="text-yellow-400 hover:text-yellow-300">
                      <Edit2 className="w-4 h-4" />
                    </Button> : null}
                    {canDeleteArticle ? <Button size="sm" variant="ghost" onClick={() => handleDelete(article)} className="text-red-400 hover:text-red-300">
                      <Trash2 className="w-4 h-4" />
                    </Button> : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredArticles.length === 0 && (
        <EmptyState icon={FileText} title="Belum ada artikel" description="Mulai buat artikel pertama Anda" />
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-[#2a2a2a] rounded-xl w-full max-w-5xl my-4 shadow-2xl">
            {/* Header */}
            <div className="p-5 border-b border-yellow-400/20 flex justify-between items-center sticky top-0 bg-[#2a2a2a] rounded-t-xl z-10">
              <h2 className="text-xl font-bold text-white">{editingArticle ? 'Edit Artikel' : 'Tambah Artikel Baru'}</h2>
              <div className="flex items-center gap-3">
                {/* Preview toggle */}
                <div className="flex bg-[#1a1a1a] rounded-lg p-1 gap-1">
                  <button type="button" onClick={() => setPreviewMode('edit')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${previewMode === 'edit' ? 'bg-yellow-400 text-black' : 'text-gray-400 hover:text-white'}`}>
                    <Edit2 className="w-3 h-3" /> Edit
                  </button>
                  <button type="button" onClick={() => setPreviewMode('card')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${previewMode === 'card' ? 'bg-yellow-400 text-black' : 'text-gray-400 hover:text-white'}`}>
                    <LayoutGrid className="w-3 h-3" /> Preview Card
                  </button>
                  <button type="button" onClick={() => setPreviewMode('article')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${previewMode === 'article' ? 'bg-yellow-400 text-black' : 'text-gray-400 hover:text-white'}`}>
                    <BookOpen className="w-3 h-3" /> Preview Artikel
                  </button>
                </div>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Edit mode */}
            {previewMode === 'edit' && (
              <form onSubmit={handleSubmit} className="p-5 space-y-5">
                {/* Gambar Utama */}
                <div>
                  <Label className="text-white mb-2 block">Gambar Utama</Label>
                  <SharedImageUploader
                    value={formData.imageUrl}
                    onChange={url => setFormData(f => ({ ...f, imageUrl: url }))}
                    category="articles"
                    size="md"
                    placeholder="Upload gambar artikel"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label className="text-white mb-1.5 block">Judul Artikel *</Label>
                    <Input value={formData.title} onChange={e => setFormData(f => ({ ...f, title: e.target.value }))} required
                      placeholder="Judul artikel yang menarik" className="bg-[#1a1a1a] border-yellow-400/20 text-white" />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-white mb-1.5 block">Excerpt / Ringkasan</Label>
                    <Input value={formData.excerpt} onChange={e => setFormData(f => ({ ...f, excerpt: e.target.value }))}
                      placeholder="Ringkasan singkat artikel (tampil di card)" className="bg-[#1a1a1a] border-yellow-400/20 text-white" />
                  </div>
                  <div>
                    <Label className="text-white mb-1.5 block">Kategori</Label>
                    <select value={formData.category} onChange={e => setFormData(f => ({ ...f, category: e.target.value }))}
                      className="w-full bg-[#1a1a1a] border border-yellow-400/20 rounded-lg p-2.5 text-white">
                      <option value="berita">Berita</option>
                      <option value="tips">Tips & Trik</option>
                      <option value="pengumuman">Pengumuman</option>
                      <option value="edukasi">Edukasi</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-white mb-1.5 block">Tags</Label>
                    <Input value={formData.tags} onChange={e => setFormData(f => ({ ...f, tags: e.target.value }))}
                      placeholder="Pisahkan dengan koma" className="bg-[#1a1a1a] border-yellow-400/20 text-white" />
                  </div>
                </div>

                <div>
                  <Label className="text-white mb-1.5 block">Konten Artikel *</Label>
                  <RichTextEditor
                    key={editingArticle._id || 'new'}
                    content={formData.content}
                    onChange={html => setFormData(f => ({ ...f, content: html }))}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input type="checkbox" id="isPublished" checked={formData.isPublished}
                    onChange={e => setFormData(f => ({ ...f, isPublished: e.target.checked }))} className="rounded" />
                  <label htmlFor="isPublished" className="text-gray-300 text-sm cursor-pointer">Publikasikan langsung</label>
                </div>

                <div className="flex gap-3 pt-2 border-t border-yellow-400/20">
                  <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="flex-1 border-gray-600 text-gray-300">Batal</Button>
                  <Button type="submit" disabled={submitting || (editingArticle ? !canEditArticle : !canCreateArticle)} className="flex-1 bg-yellow-400 text-black hover:bg-yellow-500">
                    {submitting ? 'Menyimpan...' : editingArticle ? 'Simpan Perubahan' : 'Terbitkan Artikel'}
                  </Button>
                </div>
              </form>
            )}

            {/* Preview Card */}
            {previewMode === 'card' && (
              <div className="p-8">
                <p className="text-gray-400 text-sm mb-6 text-center">Preview tampilan card artikel di halaman daftar artikel</p>
                <div className="max-w-xs mx-auto">
                  <Card className="bg-[#1e1e1e] border-yellow-400/20 overflow-hidden shadow-xl">
                    {previewImgSrc ?
                       <img src={previewImgSrc} alt={formData.title} className="w-full h-44 object-cover" />
                      : <div className="w-full h-44 bg-[#111] flex items-center justify-center text-gray-600 text-sm">Belum ada gambar</div>
                    }
                    <CardContent className="p-4">
                      <div className="flex gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${formData.isPublished ? 'bg-green-400/20 text-green-400' : 'bg-yellow-400/20 text-yellow-400'}`}>
                          {formData.isPublished ? 'Published' : 'Draft'}
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs bg-blue-400/20 text-blue-400">{formData.category}</span>
                      </div>
                      <h3 className="text-white font-semibold text-sm mb-2 line-clamp-2">{formData.title || 'Judul Artikel'}</h3>
                      <p className="text-gray-400 text-xs line-clamp-3">{formData.excerpt || 'Excerpt / ringkasan singkat artikel...'}</p>
                      <div className="mt-3 flex justify-between items-center">
                        <span className="text-gray-500 text-xs">0 views</span>
                        <span className="text-yellow-400 text-xs">Baca →</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Preview Artikel */}
            {previewMode === 'article' && (
              <div className="p-6 overflow-y-auto max-h-[75vh]">
                <p className="text-gray-400 text-sm mb-6 text-center">Preview tampilan halaman artikel lengkap</p>
                <div className="max-w-2xl mx-auto">
                  {previewImgSrc && (
                    <img src={previewImgSrc} alt={formData.title} className="w-full h-72 object-cover rounded-xl mb-6" />
                  )}
                  <div className="flex gap-2 mb-3">
                    <span className="px-2 py-0.5 rounded text-xs bg-blue-400/20 text-blue-400">{formData.category}</span>
                    {formData.tags && formData.tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                      <span key={tag} className="px-2 py-0.5 rounded text-xs bg-yellow-400/10 text-yellow-400">#{tag}</span>
                    ))}
                  </div>
                  <h1 className="text-2xl font-bold text-white mb-3">{formData.title || 'Judul Artikel'}</h1>
                  {formData.excerpt && <p className="text-gray-400 italic mb-6 border-l-4 border-yellow-400/50 pl-4">{formData.excerpt}</p>}
                  <div
                    className="prose prose-invert prose-sm max-w-none text-gray-200 prose-headings:text-yellow-400 prose-a:text-yellow-400 prose-blockquote:border-yellow-400/50"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(formData.content || '<p class="text-gray-500">Konten artikel akan tampil di sini...</p>') }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Articles;
