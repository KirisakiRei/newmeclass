import { useCMS, type ServiceItem } from "../../app/components/cms/CMSContext";
import {
  CMSPageHeader, CMSSection, CMSInput, CMSTextarea, CMSToggle,
  CMSListItem, CMSAddButton, CMSSaveNotice, CMSSelect, CMSImageInput,
} from "../../app/components/cms/CMSFormComponents";
import { Badge } from "../../app/components/ui/badge";

const ICON_OPTIONS = [
  "GraduationCap", "Brain", "Users", "Telescope", "Target", "Lightbulb",
  "Heart", "Star", "Sparkles", "Network", "ImageIcon", "Award",
];

const BADGE_TONE_OPTIONS = [
  { label: "Kuning", value: "yellow" },
  { label: "Hijau", value: "emerald" },
  { label: "Biru", value: "blue" },
  { label: "Ungu", value: "purple" },
  { label: "Oranye", value: "orange" },
  { label: "Netral", value: "zinc" },
];

const ICON_TONE_OPTIONS = [
  { label: "Kuning", value: "yellow" },
  { label: "Hijau", value: "emerald" },
  { label: "Biru", value: "blue" },
  { label: "Ungu", value: "purple" },
  { label: "Oranye", value: "orange" },
];

export function ServicesSectionPage() {
  const { data, updateData } = useCMS();
  const services = data.services;

  const update = (index: number, key: keyof ServiceItem, value: any) => {
    const updated = [...services];
    updated[index] = { ...updated[index], [key]: value };
    updateData("services", updated);
  };

  const b2b = services.filter((s) => s.type === "b2b");
  const b2c = services.filter((s) => s.type === "b2c");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <CMSPageHeader
        title="Services Section"
        subtitle="Kelola layanan B2B (Yayasan) dan B2C (Individual) di landing page"
        badge="LANDING PAGE"
      >
        <CMSSaveNotice />
      </CMSPageHeader>

      <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-3">
        <p className="text-sm text-yellow-500/80">
          💡 Section ini ditampilkan dalam 2 tab: <strong>B to B (Yayasan)</strong> dan <strong>B to C (Individual)</strong>.
          Set tipe setiap layanan di bawah.
        </p>
        <div className="mt-2 flex gap-4 text-xs text-zinc-500">
          <span>B2B aktif: <strong className="text-yellow-500">{b2b.filter(s => s.enabled).length}</strong></span>
          <span>B2C aktif: <strong className="text-yellow-500">{b2c.filter(s => s.enabled).length}</strong></span>
        </div>
      </div>

      {services.map((s, i) => (
        <CMSSection
          key={s.id}
          title={`${s.title || `Service ${i + 1}`}`}
          collapsible
        >
          <div className="mb-2 flex gap-2">
            <Badge className={`text-[10px] ${s.type === "b2b" ? "border-blue-500/30 bg-blue-500/10 text-blue-400" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"}`}>
              {s.type === "b2b" ? "B2B – Yayasan" : "B2C – Individual"}
            </Badge>
            <Badge variant="outline" className={`text-[10px] ${s.enabled ? "border-green-500/30 text-green-500" : "border-zinc-500/30 text-zinc-500"}`}>
              {s.enabled ? "Aktif" : "Nonaktif"}
            </Badge>
          </div>
          <CMSListItem
            index={i}
            total={services.length}
            onDelete={() => updateData("services", services.filter((_, j) => j !== i))}
            onMoveUp={() => { const arr = [...services]; [arr[i], arr[i-1]] = [arr[i-1], arr[i]]; updateData("services", arr); }}
            onMoveDown={() => { const arr = [...services]; [arr[i], arr[i+1]] = [arr[i+1], arr[i]]; updateData("services", arr); }}
          >
            <CMSInput label="Judul" value={s.title} onChange={(v) => update(i, "title", v)} />
            <CMSInput label="Subtitle" value={s.subtitle || ""} onChange={(v) => update(i, "subtitle", v)} />
            <CMSTextarea label="Deskripsi" value={s.description} onChange={(v) => update(i, "description", v)} rows={2} />
            <div className="grid gap-3 sm:grid-cols-3">
              <CMSSelect
                label="Tipe Tab"
                value={s.type ?? "b2b"}
                onChange={(v) => update(i, "type", v as "b2b" | "b2c")}
                options={[
                  { label: "B2B – Yayasan & Institusi", value: "b2b" },
                  { label: "B2C – Individual", value: "b2c" },
                ]}
              />
              <CMSSelect
                label="Icon"
                value={s.icon}
                onChange={(v) => update(i, "icon", v)}
                options={ICON_OPTIONS.map((ic) => ({ label: ic, value: ic }))}
              />
              <CMSInput label="Link" value={s.link} onChange={(v) => update(i, "link", v)} placeholder="/services" />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <CMSInput label="Badge" value={s.badge || ""} onChange={(v) => update(i, "badge", v)} placeholder="Flagship" />
              <CMSSelect
                label="Warna Badge"
                value={s.badgeTone || "yellow"}
                onChange={(v) => update(i, "badgeTone", v)}
                options={BADGE_TONE_OPTIONS}
              />
              <CMSSelect
                label="Warna Icon"
                value={s.iconTone || "yellow"}
                onChange={(v) => update(i, "iconTone", v)}
                options={ICON_TONE_OPTIONS}
              />
            </div>
            <CMSTextarea
              label="Tags Kartu (1 per baris)"
              value={(s.tags || []).join("\n")}
              onChange={(v) => update(i, "tags", v.split("\n").map((item) => item.trim()).filter(Boolean))}
              rows={3}
            />
            <CMSImageInput label="Gambar Kartu" value={s.image || ""} onChange={(v) => update(i, "image", v)} />
            <CMSToggle label="Tampilkan di Landing Page" checked={s.enabled} onChange={(v) => update(i, "enabled", v)} />
          </CMSListItem>
        </CMSSection>
      ))}

      <CMSAddButton
        label="Tambah Layanan"
        onClick={() => updateData("services", [...services, {
          id: `s${Date.now()}`, title: "", description: "", icon: "Star",
          link: "/services", enabled: true, type: "b2b", subtitle: "", badge: "",
          badgeTone: "yellow", tags: [], image: "", iconTone: "yellow",
        }])}
      />
    </div>
  );
}
