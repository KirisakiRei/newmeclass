import { type ChangeEvent, type ReactNode, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Switch } from "../ui/switch";
import {
  Trash2, Plus, GripVertical, ChevronUp, ChevronDown,
  Save, ImageIcon, Images, X, Search, Check, Link as LinkIcon,
  Upload,
} from "lucide-react";
import { useCMS } from "./CMSContext";
import { mediaAPI } from "../../../services/api";
import { resolveBackendAssetUrl } from "../../../lib/public-url";

// ─── Page Header ───
export function CMSPageHeader({ title, subtitle, badge, children }: {
  title: string; subtitle: string; badge?: string; children?: ReactNode;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        {badge && <Badge className="mb-2 border-yellow-500/30 bg-yellow-500/10 text-[10px] text-yellow-500">{badge}</Badge>}
        <h1 className="text-xl text-white sm:text-2xl" style={{ fontWeight: 700 }}>{title}</h1>
        <p className="text-sm text-zinc-500">{subtitle}</p>
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </motion.div>
  );
}

// ─── Field Group ───
export function FieldGroup({ label, children, className = "" }: {
  label?: string; children: ReactNode; className?: string;
}) {
  return (
    <div className={className}>
      {label && <label className="mb-1.5 block text-xs text-zinc-400" style={{ fontWeight: 500 }}>{label}</label>}
      {children}
    </div>
  );
}

// ─── Text Input ───
export function CMSInput({ label, value, onChange, placeholder, type = "text", className = "" }: {
  label?: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; className?: string;
}) {
  return (
    <FieldGroup label={label} className={className}>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none transition-colors focus:border-yellow-500/50"
      />
    </FieldGroup>
  );
}

// ─── Number Input ───
export function CMSNumberInput({ label, value, onChange, min, max, className = "" }: {
  label?: string; value: number; onChange: (v: number) => void; min?: number; max?: number; className?: string;
}) {
  return (
    <FieldGroup label={label} className={className}>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-zinc-200 outline-none transition-colors focus:border-yellow-500/50"
      />
    </FieldGroup>
  );
}

// ─── Textarea ───
export function CMSTextarea({ label, value, onChange, placeholder, rows = 3, className = "" }: {
  label?: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; className?: string;
}) {
  return (
    <FieldGroup label={label} className={className}>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none transition-colors focus:border-yellow-500/50 resize-y"
      />
    </FieldGroup>
  );
}

// ─── Toggle ───
export function CMSToggle({ label, checked, onChange, description }: {
  label: string; checked: boolean; onChange: (v: boolean) => void; description?: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
      <div>
        <p className="text-sm text-zinc-300">{label}</p>
        {description && <p className="text-[11px] text-zinc-600">{description}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

// ─── Media Picker Modal ───
function MediaPickerModal({ onSelect, onClose }: {
  onSelect: (url: string) => void;
  onClose: () => void;
}) {
  const { data, updateData } = useCMS();
  const [tab, setTab] = useState<"library" | "url">("library");
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("Semua");
  const [urlInput, setUrlInput] = useState("");
  const [urlName, setUrlName] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const categories = ["Semua", ...Array.from(new Set(data.mediaLibrary.map((m) => m.category)))];
  const filtered = data.mediaLibrary.filter((m) =>
    (filterCat === "Semua" || m.category === filterCat) &&
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  const addToLibrary = async () => {
    if (!urlInput.trim()) return;
    try {
      setSubmitting(true);
      const created = await mediaAPI.create({
        url: urlInput.trim(),
        name: urlName.trim() || "Gambar Baru",
        category: "general",
      });
      const item = {
        id: String(created?.id || `ml${Date.now()}`),
        url: String(created?.url || urlInput.trim()),
        name: String(created?.name || urlName.trim() || "Gambar Baru"),
        category: String(created?.category || "general"),
        addedAt: String(created?.createdAt || new Date().toISOString()),
      };
      updateData("mediaLibrary", [item, ...data.mediaLibrary]);
      setSelected(item.url);
      setUrlInput("");
      setUrlName("");
      setTab("library");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = () => {
    if (selected) { onSelect(selected); onClose(); }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative flex h-[85vh] w-full max-w-4xl flex-col rounded-2xl border border-white/10 bg-[#111113] shadow-2xl"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <Images className="h-5 w-5 text-yellow-500" />
            <h2 className="text-base text-white" style={{ fontWeight: 600 }}>Media Library</h2>
            <Badge className="border-yellow-500/20 bg-yellow-500/10 text-[10px] text-yellow-500">{data.mediaLibrary.length} foto</Badge>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex shrink-0 gap-1 border-b border-white/10 px-5">
          <button
            onClick={() => setTab("library")}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm transition-colors ${tab === "library" ? "border-yellow-500 text-yellow-500" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}
          >
            <Images className="h-3.5 w-3.5" /> Library
          </button>
          <button
            onClick={() => setTab("url")}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm transition-colors ${tab === "url" ? "border-yellow-500 text-yellow-500" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}
          >
            <LinkIcon className="h-3.5 w-3.5" /> Tambah via URL
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          {tab === "library" ? (
            <div className="flex h-full flex-col">
              {/* Filters */}
              <div className="flex shrink-0 gap-3 border-b border-white/5 px-5 py-3">
                <div className="flex flex-1 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
                  <Search className="h-3.5 w-3.5 shrink-0 text-zinc-600" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari gambar..."
                    className="flex-1 bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 outline-none"
                  />
                </div>
                <select
                  value={filterCat}
                  onChange={(e) => setFilterCat(e.target.value)}
                  className="rounded-lg border border-white/10 bg-[#18181b] px-3 py-2 text-sm text-zinc-300 outline-none"
                >
                  {categories.map((c) => <option key={c} value={c} className="bg-[#18181b]">{c}</option>)}
                </select>
              </div>

              {/* Grid */}
              <div className="flex-1 overflow-y-auto p-4">
                {filtered.length === 0 ? (
                  <div className="flex h-40 items-center justify-center text-sm text-zinc-600">Tidak ada gambar ditemukan</div>
                ) : (
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
                    {filtered.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setSelected(item.url)}
                        className={`group relative aspect-square overflow-hidden rounded-xl border-2 transition-all ${selected === item.url ? "border-yellow-500 shadow-[0_0_20px_-4px_rgba(234,179,8,0.4)]" : "border-white/10 hover:border-yellow-500/40"}`}
                      >
                        <img src={resolveBackendAssetUrl(item.url, item.url)} alt={item.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                        <div className={`absolute inset-0 flex items-end bg-gradient-to-t from-black/70 to-transparent transition-opacity ${selected === item.url ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                          <p className="p-2 text-[10px] text-white" style={{ fontWeight: 500 }}>{item.name}</p>
                        </div>
                        {selected === item.url && (
                          <div className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-yellow-500">
                            <Check className="h-3 w-3 text-black" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-5 space-y-4">
              <p className="text-sm text-zinc-400">Tambahkan gambar baru ke library via URL, lalu gunakan di halaman CMS manapun.</p>
              <div className="space-y-3">
                <FieldGroup label="URL Gambar">
                  <input
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-yellow-500/50"
                  />
                </FieldGroup>
                <FieldGroup label="Nama Gambar">
                  <input
                    value={urlName}
                    onChange={(e) => setUrlName(e.target.value)}
                    placeholder="Nama deskriptif gambar"
                    className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-yellow-500/50"
                  />
                </FieldGroup>
                {urlInput && (
                  <div className="h-40 w-56 overflow-hidden rounded-xl border border-white/10">
                    <img src={urlInput} alt="Preview" className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }} />
                  </div>
                )}
                <Button onClick={() => void addToLibrary()} disabled={submitting} className="bg-yellow-500 text-black hover:bg-yellow-400 disabled:opacity-50">
                  <Plus className="mr-1 h-4 w-4" /> Tambah ke Library & Gunakan
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {tab === "library" && (
          <div className="flex shrink-0 items-center justify-between border-t border-white/10 px-5 py-3">
            <p className="text-xs text-zinc-500">{selected ? "1 gambar dipilih" : "Pilih gambar dari library"}</p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onClose} className="text-zinc-400 hover:text-white">Batal</Button>
              <Button size="sm" onClick={handleConfirm} disabled={!selected} className="bg-yellow-500 text-black hover:bg-yellow-400 disabled:opacity-40">
                Gunakan Gambar
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─── Image URL Input (with Media Library picker) ───
export function CMSImageInput({ label, value, onChange, className = "" }: {
  label?: string; value: string; onChange: (v: string) => void; className?: string;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { data, updateData } = useCMS();

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const uploaded = await mediaAPI.uploadImage(file, {
        category: "general",
        folder: "content",
        prefix: "cms-image",
        name: file.name,
        registerInMedia: true,
      });

      if (uploaded?.asset) {
        const nextAsset = {
          id: String(uploaded.asset.id || uploaded.asset._id || `ml${Date.now()}`),
          url: String(uploaded.asset.url || uploaded.url || ""),
          name: String(uploaded.asset.name || file.name),
          category: String(uploaded.asset.category || "general"),
          addedAt: String(uploaded.asset.createdAt || new Date().toISOString()),
        };
        updateData(
          "mediaLibrary",
          [nextAsset, ...data.mediaLibrary.filter((item) => item.id !== nextAsset.id)],
        );
      }

      onChange(String(uploaded?.url || uploaded?.asset?.url || ""));
    } finally {
      setUploading(false);
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  return (
    <FieldGroup label={label} className={className}>
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://images.unsplash.com/..."
            className="flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none transition-colors focus:border-yellow-500/50"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="h-auto shrink-0 border-emerald-500/30 bg-emerald-500/5 px-3 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 disabled:opacity-60"
          >
            <Upload className="mr-1 h-3.5 w-3.5" />
            <span className="hidden sm:inline">{uploading ? "Uploading..." : "Upload"}</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowPicker(true)}
            className="h-auto shrink-0 border-yellow-500/30 bg-yellow-500/5 px-3 text-yellow-500 hover:bg-yellow-500/10 hover:text-yellow-400"
          >
            <Images className="mr-1 h-3.5 w-3.5" />
            <span className="hidden sm:inline">Library</span>
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(event) => { void handleFileChange(event); }}
        />
        {value && (
          <div className="relative h-24 w-36 overflow-hidden rounded-xl border border-white/10">
            <img
              src={resolveBackendAssetUrl(value, value)}
              alt=""
              className="h-full w-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <button
              onClick={() => onChange("")}
              className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-red-500/80 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
      <AnimatePresence>
        {showPicker && (
          <MediaPickerModal
            onSelect={(url) => { onChange(url); setShowPicker(false); }}
            onClose={() => setShowPicker(false)}
          />
        )}
      </AnimatePresence>
    </FieldGroup>
  );
}

// ─── Select ───
export function CMSSelect({ label, value, onChange, options, className = "" }: {
  label?: string; value: string; onChange: (v: string) => void; options: { label: string; value: string }[]; className?: string;
}) {
  return (
    <FieldGroup label={label} className={className}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-zinc-200 outline-none transition-colors focus:border-yellow-500/50"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-[#18181b]">{o.label}</option>
        ))}
      </select>
    </FieldGroup>
  );
}

// ─── Section Card ───
export function CMSSection({ title, description, children, collapsible = false }: {
  title: string; description?: string; children: ReactNode; collapsible?: boolean;
}) {
  const [open, setOpen] = useState(true);
  return (
    <Card className="border-white/10 bg-[#18181b]">
      <CardContent className="p-5">
        <div
          className={`flex items-center justify-between ${collapsible ? "cursor-pointer" : ""}`}
          onClick={collapsible ? () => setOpen(!open) : undefined}
        >
          <div>
            <h3 className="text-sm text-white" style={{ fontWeight: 600 }}>{title}</h3>
            {description && <p className="text-[11px] text-zinc-500">{description}</p>}
          </div>
          {collapsible && (open ? <ChevronUp className="h-4 w-4 text-zinc-500" /> : <ChevronDown className="h-4 w-4 text-zinc-500" />)}
        </div>
        {open && <div className="mt-4 space-y-4">{children}</div>}
      </CardContent>
    </Card>
  );
}

// ─── List Item Card ───
export function CMSListItem({ children, onDelete, index, onMoveUp, onMoveDown, total }: {
  children: ReactNode; onDelete?: () => void; index?: number; onMoveUp?: () => void; onMoveDown?: () => void; total?: number;
}) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
      <div className="flex gap-3">
        {(onMoveUp || onMoveDown) && (
          <div className="flex flex-col items-center gap-0.5 pt-1">
            <button onClick={onMoveUp} disabled={index === 0} className="text-zinc-600 hover:text-zinc-300 disabled:opacity-30">
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <GripVertical className="h-3.5 w-3.5 text-zinc-700" />
            <button onClick={onMoveDown} disabled={index === (total ?? 0) - 1} className="text-zinc-600 hover:text-zinc-300 disabled:opacity-30">
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <div className="flex-1 space-y-3">{children}</div>
        {onDelete && (
          <button onClick={onDelete} className="shrink-0 text-zinc-600 hover:text-red-400 transition-colors self-start mt-1">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Add Button ───
export function CMSAddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/10 py-3 text-sm text-zinc-500 transition-colors hover:border-yellow-500/30 hover:text-yellow-500"
    >
      <Plus className="h-4 w-4" /> {label}
    </button>
  );
}

// ─── Save Notice ───
export function CMSSaveNotice() {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/5 px-3 py-2">
      <Save className="h-3.5 w-3.5 text-green-500" />
      <span className="text-xs text-green-400">Perubahan tersimpan otomatis</span>
    </div>
  );
}
