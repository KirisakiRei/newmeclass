import { useCMS, type EcosystemItem } from "../../app/components/cms/CMSContext";
import {
  CMSPageHeader, CMSSection, CMSInput, CMSTextarea, CMSImageInput,
  CMSToggle, CMSListItem, CMSAddButton, CMSSaveNotice,
} from "../../app/components/cms/CMSFormComponents";
import { Badge } from "../../app/components/ui/badge";

export function ProductsPage() {
  const { data, updateData } = useCMS();
  const items = data.ecosystemItems;

  const update = (index: number, key: keyof EcosystemItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [key]: value };
    updateData("ecosystemItems", updated);
  };

  const add = () => {
    updateData("ecosystemItems", [...items, {
      id: `eco${Date.now()}`,
      title: "NEWME BARU",
      subtitle: "Subtitle",
      desc: "",
      badge: "",
      icon: "Star",
      image: "",
      href: "/services",
      color: "from-yellow-500/20 to-amber-600/20",
      enabled: true,
    }]);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <CMSPageHeader
        title="Ekosistem NEWME"
        subtitle="Kelola 5 pilar ekosistem NEWME yang tampil di landing page (TEST, CLINIC, CLASS, GALLERY, NET)"
        badge="LANDING PAGE"
      >
        <CMSSaveNotice />
      </CMSPageHeader>

      <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-3 text-sm text-yellow-500/80">
        💡 Section ini menampilkan kartu ekosistem NEWME di landing page. 2 item pertama tampil besar (featured), 3 berikutnya tampil kecil.
      </div>

      {items.map((p, i) => (
        <CMSSection key={p.id} title={`${p.title || "Item Baru"} — ${p.subtitle}`} collapsible>
          <div className="mb-2 flex gap-2">
            {p.badge && <Badge className="border-yellow-500/30 bg-yellow-500/10 text-[10px] text-yellow-500">{p.badge}</Badge>}
            <Badge variant="outline" className={`text-[10px] ${p.enabled ? "border-green-500/30 text-green-500" : "border-zinc-500/30 text-zinc-500"}`}>
              {i < 2 ? "Featured (Besar)" : "Regular"} · {p.enabled ? "Aktif" : "Nonaktif"}
            </Badge>
          </div>
          <CMSListItem
            index={i}
            total={items.length}
            onDelete={() => updateData("ecosystemItems", items.filter((_, j) => j !== i))}
            onMoveUp={() => { const arr = [...items]; [arr[i], arr[i-1]] = [arr[i-1], arr[i]]; updateData("ecosystemItems", arr); }}
            onMoveDown={() => { const arr = [...items]; [arr[i], arr[i+1]] = [arr[i+1], arr[i]]; updateData("ecosystemItems", arr); }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <CMSInput label="Judul (e.g. NEWME TEST)" value={p.title} onChange={(v) => update(i, "title", v)} />
              <CMSInput label="Subtitle (e.g. Asesmen Digital)" value={p.subtitle} onChange={(v) => update(i, "subtitle", v)} />
            </div>
            <CMSTextarea label="Deskripsi" value={p.desc} onChange={(v) => update(i, "desc", v)} rows={2} />
            <div className="grid gap-3 sm:grid-cols-3">
              <CMSInput label="Badge" value={p.badge} onChange={(v) => update(i, "badge", v)} placeholder="Fitur Utama" />
              <CMSInput label="Icon (Lucide)" value={p.icon} onChange={(v) => update(i, "icon", v)} placeholder="TestTube" />
              <CMSInput label="Link URL" value={p.href} onChange={(v) => update(i, "href", v)} placeholder="/services/personality-tests" />
            </div>
            <CMSInput label="Gradient Color Class" value={p.color} onChange={(v) => update(i, "color", v)} placeholder="from-yellow-500/20 to-amber-600/20" />
            <CMSImageInput label="Gambar" value={p.image} onChange={(v) => update(i, "image", v)} />
            <CMSToggle label="Tampilkan di Landing Page" checked={p.enabled} onChange={(v) => update(i, "enabled", v)} />
          </CMSListItem>
        </CMSSection>
      ))}

      <CMSAddButton label="Tambah Item Ekosistem" onClick={add} />
    </div>
  );
}
