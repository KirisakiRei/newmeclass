import { useCMS, type TestimonialItem } from "../CMSContext";
import { CMSPageHeader, CMSSection, CMSInput, CMSTextarea, CMSImageInput, CMSNumberInput, CMSListItem, CMSAddButton, CMSSaveNotice } from "../CMSFormComponents";
import { Star } from "lucide-react";

export function TestimonialsPage() {
  const { data, updateData } = useCMS();
  const items = data.testimonials;

  const update = (i: number, key: keyof TestimonialItem, value: any) => {
    const arr = [...items];
    arr[i] = { ...arr[i], [key]: value };
    updateData("testimonials", arr);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <CMSPageHeader title="Testimonial Slider" subtitle="Kelola testimonial yang tampil di landing page" badge="LANDING PAGE">
        <CMSSaveNotice />
      </CMSPageHeader>

      {items.map((t, i) => (
        <CMSSection key={t.id} title={t.name || `Testimonial ${i + 1}`} collapsible>
          <CMSListItem
            index={i} total={items.length}
            onDelete={() => updateData("testimonials", items.filter((_, j) => j !== i))}
            onMoveUp={() => { const arr = [...items]; [arr[i], arr[i-1]] = [arr[i-1], arr[i]]; updateData("testimonials", arr); }}
            onMoveDown={() => { const arr = [...items]; [arr[i], arr[i+1]] = [arr[i+1], arr[i]]; updateData("testimonials", arr); }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <CMSInput label="Nama" value={t.name} onChange={(v) => update(i, "name", v)} />
              <CMSInput label="Role / Jabatan" value={t.role} onChange={(v) => update(i, "role", v)} />
            </div>
            <CMSTextarea label="Testimonial" value={t.text} onChange={(v) => update(i, "text", v)} rows={3} />
            <CMSImageInput label="Avatar" value={t.avatar} onChange={(v) => update(i, "avatar", v)} />
            <div>
              <label className="mb-1.5 block text-xs text-zinc-400" style={{ fontWeight: 500 }}>Rating</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((r) => (
                  <button key={r} onClick={() => update(i, "rating", r)} className="transition-colors">
                    <Star className={`h-5 w-5 ${r <= t.rating ? "fill-yellow-500 text-yellow-500" : "text-zinc-700"}`} />
                  </button>
                ))}
              </div>
            </div>
          </CMSListItem>
        </CMSSection>
      ))}

      <CMSAddButton label="Tambah Testimonial" onClick={() => updateData("testimonials", [...items, { id: `t${Date.now()}`, name: "", role: "", text: "", avatar: "", rating: 5 }])} />
    </div>
  );
}
