import { useCMS } from "../CMSContext";
import { CMSPageHeader, CMSSection, CMSInput, CMSTextarea, CMSImageInput, CMSListItem, CMSAddButton, CMSSaveNotice } from "../CMSFormComponents";

export function AboutPage() {
  const { data, updateData } = useCMS();
  const about = data.about;

  const update = (key: string, value: any) => updateData("about", { ...about, [key]: value });

  const updateStat = (i: number, key: string, value: string) => {
    const stats = [...about.stats];
    stats[i] = { ...stats[i], [key]: value };
    update("stats", stats);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <CMSPageHeader title="About Section" subtitle="Konten tentang NEWME CLASS" badge="LANDING PAGE">
        <CMSSaveNotice />
      </CMSPageHeader>

      <CMSSection title="Konten Utama">
        <CMSInput label="Badge" value={about.badge} onChange={(v) => update("badge", v)} />
        <CMSInput label="Title" value={about.title} onChange={(v) => update("title", v)} />
        <CMSTextarea label="Deskripsi" value={about.description} onChange={(v) => update("description", v)} />
        <CMSImageInput label="Image" value={about.image} onChange={(v) => update("image", v)} />
      </CMSSection>

      <CMSSection title="Statistik" description="Angka-angka highlight" collapsible>
        {about.stats.map((s, i) => (
          <CMSListItem key={i} onDelete={() => update("stats", about.stats.filter((_, j) => j !== i))}>
            <div className="grid gap-3 sm:grid-cols-2">
              <CMSInput label="Label" value={s.label} onChange={(v) => updateStat(i, "label", v)} />
              <CMSInput label="Value" value={s.value} onChange={(v) => updateStat(i, "value", v)} />
            </div>
          </CMSListItem>
        ))}
        <CMSAddButton label="Tambah Statistik" onClick={() => update("stats", [...about.stats, { label: "", value: "" }])} />
      </CMSSection>
    </div>
  );
}
