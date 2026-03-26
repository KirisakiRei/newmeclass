import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useCMS, type MediaItem } from "../../app/components/cms/CMSContext";
import { CMSPageHeader, CMSSaveNotice } from "../../app/components/cms/CMSFormComponents";
import { Badge } from "../../app/components/ui/badge";
import { Button } from "../../app/components/ui/button";
import { Images, Plus, Trash2, Search, X, Edit3, Check, Upload, Link as LinkIcon, Grid3X3, List } from "lucide-react";
import { mediaAPI } from "../../services/api";
import { resolveBackendAssetUrl } from "../../lib/public-url";

const CATEGORY_OPTIONS = ["Hero", "About", "Layanan", "Aktivitas", "Artikel", "Gallery", "Shop", "Lainnya"];

export function MediaLibraryPage() {
  const { data, updateData } = useCMS();
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("Semua");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("Lainnya");
  const [newFile, setNewFile] = useState<File | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const categories = ["Semua", ...Array.from(new Set(data.mediaLibrary.map((m) => m.category)))];

  const filtered = data.mediaLibrary.filter((m) =>
    (filterCat === "Semua" || m.category === filterCat) &&
    (m.name.toLowerCase().includes(search.toLowerCase()) || m.url.toLowerCase().includes(search.toLowerCase()))
  );

  const addMedia = async () => {
    if (!newFile && !newUrl.trim()) return;
    try {
      setSubmitting(true);
      let saved: any;
      if (newFile) {
        const uploaded = await mediaAPI.uploadImage(newFile, {
          category: newCategory,
          folder: "landing",
          prefix: "landing-media",
          name: newName.trim() || newFile.name,
          registerInMedia: true,
        });
        saved = uploaded?.asset || {
          id: uploaded?.asset?.id || uploaded?.fileName || `ml${Date.now()}`,
          url: uploaded?.url || "",
          name: newName.trim() || newFile.name,
          category: newCategory,
          createdAt: new Date().toISOString(),
        };
      } else {
        saved = await mediaAPI.create({
          url: newUrl.trim(),
          name: newName.trim() || "Gambar Baru",
          category: newCategory,
        });
      }
      const item: MediaItem = {
        id: String(saved?.id || saved?._id || `ml${Date.now()}`),
        url: String(saved?.url || ""),
        name: String(saved?.name || newName.trim() || "Gambar Baru"),
        category: String(saved?.category || newCategory),
        addedAt: String(saved?.createdAt || new Date().toISOString()),
      };
      updateData("mediaLibrary", [item, ...data.mediaLibrary]);
      setNewUrl("");
      setNewName("");
      setNewCategory("Lainnya");
      setNewFile(null);
      setShowAdd(false);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteMedia = async (id: string) => {
    await mediaAPI.delete(id);
    updateData("mediaLibrary", data.mediaLibrary.filter((m) => m.id !== id));
    setSelected((prev) => { const s = new Set(prev); s.delete(id); return s; });
  };

  const deleteSelected = async () => {
    await Promise.all(Array.from(selected).map((id) => mediaAPI.delete(id)));
    updateData("mediaLibrary", data.mediaLibrary.filter((m) => !selected.has(m.id)));
    setSelected(new Set());
  };

  const startEdit = (item: MediaItem) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditCategory(item.category);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const updated = await mediaAPI.update(editingId, {
      name: editName,
      category: editCategory,
    });
    updateData("mediaLibrary", data.mediaLibrary.map((m) =>
      m.id === editingId
        ? {
            ...m,
            name: String(updated?.name || editName),
            category: String(updated?.category || editCategory),
            url: String(updated?.url || m.url),
          }
        : m
    ));
    setEditingId(null);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <CMSPageHeader
        title="Media Library"
        subtitle={`${data.mediaLibrary.length} gambar tersimpan — digunakan di seluruh halaman CMS`}
        badge="MEDIA"
      >
        <CMSSaveNotice />
      </CMSPageHeader>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-[#18181b] px-3 py-2.5">
            <Search className="h-4 w-4 shrink-0 text-zinc-600" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari gambar..."
              className="flex-1 bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 outline-none"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-zinc-600 hover:text-zinc-300">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            className="rounded-xl border border-white/10 bg-[#18181b] px-3 py-2 text-sm text-zinc-300 outline-none min-w-[120px]"
          >
            {categories.map((c) => <option key={c} value={c} className="bg-[#18181b]">{c}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={deleteSelected}
              className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
            >
              <Trash2 className="mr-1 h-4 w-4" />
              Hapus ({selected.size})
            </Button>
          )}
          <div className="flex rounded-lg border border-white/10 bg-[#18181b] p-0.5">
            <button onClick={() => setViewMode("grid")} className={`rounded-md p-1.5 transition-colors ${viewMode === "grid" ? "bg-yellow-500/20 text-yellow-500" : "text-zinc-500 hover:text-zinc-300"}`}>
              <Grid3X3 className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setViewMode("list")} className={`rounded-md p-1.5 transition-colors ${viewMode === "list" ? "bg-yellow-500/20 text-yellow-500" : "text-zinc-500 hover:text-zinc-300"}`}>
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
          <Button onClick={() => setShowAdd(!showAdd)} className="bg-yellow-500 text-black hover:bg-yellow-400">
            <Plus className="mr-1 h-4 w-4" /> Tambah Gambar
          </Button>
        </div>
      </div>

      {/* Add Form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-2xl border border-yellow-500/20 bg-[#18181b] p-5"
          >
            <div className="mb-4 flex items-center gap-2">
              <Upload className="h-4 w-4 text-yellow-500" />
              <h3 className="text-sm text-white" style={{ fontWeight: 600 }}>Tambah Gambar Baru</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs text-zinc-400" style={{ fontWeight: 500 }}>URL Gambar *</label>
                <input
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-yellow-500/50"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-zinc-400" style={{ fontWeight: 500 }}>Nama</label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nama deskriptif"
                  className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-yellow-500/50"
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="mb-1.5 block text-xs text-zinc-400" style={{ fontWeight: 500 }}>Atau Upload File</label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={(e) => setNewFile(e.target.files?.[0] || null)}
                className="block w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-zinc-200 file:mr-3 file:rounded-md file:border-0 file:bg-yellow-500 file:px-3 file:py-1.5 file:text-black"
              />
            </div>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div>
                <label className="mb-1.5 block text-xs text-zinc-400" style={{ fontWeight: 500 }}>Kategori</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-zinc-200 outline-none"
                >
                  {CATEGORY_OPTIONS.map((c) => <option key={c} value={c} className="bg-[#18181b]">{c}</option>)}
                </select>
              </div>
              {(newUrl || newFile) && (
                <div className="h-16 w-24 overflow-hidden rounded-lg border border-white/10">
                  <img src={newFile ? URL.createObjectURL(newFile) : newUrl} alt="" className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }} />
                </div>
              )}
              <div className="flex gap-2 sm:ml-auto">
                <Button variant="ghost" onClick={() => setShowAdd(false)} className="text-zinc-400 hover:text-white">Batal</Button>
                <Button onClick={addMedia} disabled={submitting} className="bg-yellow-500 text-black hover:bg-yellow-400">
                  <Plus className="mr-1 h-4 w-4" /> {submitting ? "Menyimpan..." : "Tambah ke Library"}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats row */}
      <div className="flex flex-wrap gap-2">
        {categories.slice(1).map((cat) => {
          const count = data.mediaLibrary.filter((m) => m.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setFilterCat(filterCat === cat ? "Semua" : cat)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors ${filterCat === cat ? "border-yellow-500/40 bg-yellow-500/10 text-yellow-500" : "border-white/10 bg-white/[0.02] text-zinc-500 hover:border-yellow-500/20 hover:text-zinc-300"}`}
            >
              {cat} <span className="rounded-full bg-white/10 px-1.5">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Media Grid */}
      {filtered.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10">
          <Images className="h-10 w-10 text-zinc-700" />
          <p className="text-sm text-zinc-600">Tidak ada gambar ditemukan</p>
          <Button onClick={() => setShowAdd(true)} variant="ghost" className="text-yellow-500 hover:bg-yellow-500/10">
            <Plus className="mr-1 h-4 w-4" /> Tambah gambar pertama
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="group relative"
            >
              {/* Selection checkbox */}
              <button
                onClick={() => toggleSelect(item.id)}
                className={`absolute top-2 left-2 z-10 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${selected.has(item.id) ? "border-yellow-500 bg-yellow-500" : "border-white/40 bg-black/40 opacity-0 group-hover:opacity-100"}`}
              >
                {selected.has(item.id) && <Check className="h-3 w-3 text-black" />}
              </button>

              {editingId === item.id ? (
                <div className="rounded-xl border border-yellow-500/30 bg-[#18181b] p-3 space-y-2">
                  <img src={resolveBackendAssetUrl(item.url)} alt="" className="h-24 w-full rounded-lg object-cover" />
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded border border-white/10 bg-white/[0.03] px-2 py-1 text-xs text-zinc-200 outline-none"
                  />
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full rounded border border-white/10 bg-[#0a0a0a] px-2 py-1 text-xs text-zinc-200 outline-none"
                  >
                    {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <div className="flex gap-1">
                    <Button size="sm" onClick={saveEdit} className="h-7 flex-1 bg-yellow-500 text-[11px] text-black hover:bg-yellow-400">Simpan</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-7 text-[11px] text-zinc-400">Batal</Button>
                  </div>
                </div>
              ) : (
                <div className={`overflow-hidden rounded-xl border-2 transition-all ${selected.has(item.id) ? "border-yellow-500" : "border-white/10 hover:border-white/20"}`}>
                  <div className="relative aspect-square overflow-hidden bg-white/5">
                    <img src={resolveBackendAssetUrl(item.url)} alt={item.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      <div className="flex gap-1 p-2">
                        <button onClick={() => startEdit(item)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white backdrop-blur hover:bg-yellow-500/20 hover:text-yellow-500 transition-colors">
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => deleteMedia(item.id)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white backdrop-blur hover:bg-red-500/20 hover:text-red-400 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => { navigator.clipboard.writeText(item.url); }}
                          className="flex h-7 flex-1 items-center justify-center gap-1 rounded-lg bg-white/10 text-[10px] text-white backdrop-blur hover:bg-yellow-500/20 hover:text-yellow-500 transition-colors"
                        >
                          <LinkIcon className="h-3 w-3" /> Copy URL
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="bg-[#18181b] px-2.5 py-2">
                    <p className="truncate text-[11px] text-zinc-300" style={{ fontWeight: 500 }}>{item.name}</p>
                    <div className="mt-1 flex items-center justify-between">
                      <Badge className="border-yellow-500/20 bg-yellow-500/8 text-[9px] text-yellow-600">{item.category}</Badge>
                      <span className="text-[9px] text-zinc-700">{item.addedAt}</span>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="space-y-2">
          {filtered.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-4 rounded-xl border border-white/10 bg-[#18181b] p-3 hover:border-white/20 transition-colors"
            >
              <button onClick={() => toggleSelect(item.id)} className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-all ${selected.has(item.id) ? "border-yellow-500 bg-yellow-500" : "border-white/30"}`}>
                {selected.has(item.id) && <Check className="h-2.5 w-2.5 text-black" />}
              </button>
              <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg border border-white/10">
                <img src={resolveBackendAssetUrl(item.url)} alt={item.name} className="h-full w-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm text-white" style={{ fontWeight: 500 }}>{item.name}</p>
                <p className="truncate text-xs text-zinc-600">{item.url}</p>
              </div>
              <Badge className="shrink-0 border-yellow-500/20 bg-yellow-500/8 text-[10px] text-yellow-600">{item.category}</Badge>
              <span className="shrink-0 text-xs text-zinc-600">{item.addedAt}</span>
              <div className="flex gap-1">
                <button onClick={() => startEdit(item)} className="rounded-lg p-1.5 text-zinc-500 hover:bg-yellow-500/10 hover:text-yellow-500 transition-colors">
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => deleteMedia(item.id)} className="rounded-lg p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-400 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Count footer */}
      {filtered.length > 0 && (
        <p className="text-center text-xs text-zinc-600">
          Menampilkan {filtered.length} dari {data.mediaLibrary.length} gambar
          {selected.size > 0 && ` · ${selected.size} dipilih`}
        </p>
      )}
    </div>
  );
}
