import { useCMS, type ActivityItem } from "../CMSContext";
import { CMSPageHeader, CMSSection, CMSInput, CMSTextarea, CMSImageInput, CMSListItem, CMSAddButton, CMSSaveNotice } from "../CMSFormComponents";
import { Badge } from "../../ui/badge";

export function ActivitiesPage() {
  const { data, updateData } = useCMS();
  const items = data.activities;

  const update = (i: number, key: keyof ActivityItem, value: any) => {
    const arr = [...items];
    arr[i] = { ...arr[i], [key]: value };
    updateData("activities", arr);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <CMSPageHeader title="Activities Section" subtitle="Kelola foto kegiatan dan event NEWME CLASS di landing page" badge="LANDING PAGE">
        <CMSSaveNotice />
      </CMSPageHeader>

      <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-3 text-sm text-yellow-500/80">
        💡 Item pertama ditampilkan <strong>besar (2×2)</strong>, sisanya berukuran normal. Caption tampil saat hover.
      </div>

      {items.map((a, i) => (
        <CMSSection key={a.id} title={a.title || `Activity ${i + 1}`} collapsible>
          <div className="mb-2 flex gap-2">
            {i === 0 && <Badge className="border-yellow-500/30 bg-yellow-500/10 text-[10px] text-yellow-500">Featured (2×2)</Badge>}
          </div>
          <CMSListItem
            index={i}
            total={items.length}
            onDelete={() => updateData("activities", items.filter((_, j) => j !== i))}
            onMoveUp={() => { const arr = [...items]; [arr[i], arr[i-1]] = [arr[i-1], arr[i]]; updateData("activities", arr); }}
            onMoveDown={() => { const arr = [...items]; [arr[i], arr[i+1]] = [arr[i+1], arr[i]]; updateData("activities", arr); }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <CMSInput label="Judul Kegiatan" value={a.title} onChange={(v) => update(i, "title", v)} />
              <CMSInput label="Caption (teks hover)" value={a.caption ?? a.title} onChange={(v) => update(i, "caption", v)} placeholder="Teks yang muncul saat hover" />
            </div>
            <CMSInput label="Tanggal" value={a.date} onChange={(v) => update(i, "date", v)} type="date" />
            <CMSTextarea label="Deskripsi" value={a.description} onChange={(v) => update(i, "description", v)} rows={2} />
            <CMSImageInput label="Gambar" value={a.image} onChange={(v) => update(i, "image", v)} />
          </CMSListItem>
        </CMSSection>
      ))}

      <CMSAddButton
        label="Tambah Kegiatan"
        onClick={() => updateData("activities", [...items, {
          id: `a${Date.now()}`, title: "", caption: "", date: "", image: "", description: "",
        }])}
      />
    </div>
  );
}
