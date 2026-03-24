import { useCMS, type BenefitItem } from "../CMSContext";
import { CMSPageHeader, CMSSection, CMSInput, CMSTextarea, CMSListItem, CMSAddButton, CMSSaveNotice } from "../CMSFormComponents";

export function BenefitsPage() {
  const { data, updateData } = useCMS();
  const items = data.benefits;

  const update = (i: number, key: keyof BenefitItem, value: any) => {
    const arr = [...items];
    arr[i] = { ...arr[i], [key]: value };
    updateData("benefits", arr);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <CMSPageHeader title="Benefits Section" subtitle="Kelola benefits/keunggulan NEWME CLASS" badge="LANDING PAGE">
        <CMSSaveNotice />
      </CMSPageHeader>

      {items.map((b, i) => (
        <CMSSection key={b.id} title={b.title || `Benefit ${i + 1}`} collapsible>
          <CMSListItem
            index={i} total={items.length}
            onDelete={() => updateData("benefits", items.filter((_, j) => j !== i))}
            onMoveUp={() => { const arr = [...items]; [arr[i], arr[i-1]] = [arr[i-1], arr[i]]; updateData("benefits", arr); }}
            onMoveDown={() => { const arr = [...items]; [arr[i], arr[i+1]] = [arr[i+1], arr[i]]; updateData("benefits", arr); }}
          >
            <CMSInput label="Judul" value={b.title} onChange={(v) => update(i, "title", v)} />
            <CMSTextarea label="Deskripsi" value={b.description} onChange={(v) => update(i, "description", v)} rows={2} />
            <CMSInput label="Icon (Lucide name)" value={b.icon} onChange={(v) => update(i, "icon", v)} placeholder="e.g. Award, Users, Infinity" />
          </CMSListItem>
        </CMSSection>
      ))}

      <CMSAddButton label="Tambah Benefit" onClick={() => updateData("benefits", [...items, { id: `b${Date.now()}`, title: "", description: "", icon: "Star" }])} />
    </div>
  );
}
