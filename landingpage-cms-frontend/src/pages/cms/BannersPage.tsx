import { useCMS, type BannerItem } from "../../app/components/cms/CMSContext";
import { CMSPageHeader, CMSSection, CMSInput, CMSImageInput, CMSToggle, CMSListItem, CMSAddButton, CMSSaveNotice } from "../../app/components/cms/CMSFormComponents";

export function BannersPage() {
  const { data, updateData } = useCMS();
  const items = data.banners;

  const update = (i: number, key: keyof BannerItem, value: any) => {
    const arr = [...items];
    arr[i] = { ...arr[i], [key]: value };
    updateData("banners", arr);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <CMSPageHeader title="Banner Slider" subtitle="Kelola banner promosi di landing page" badge="LANDING PAGE">
        <CMSSaveNotice />
      </CMSPageHeader>

      {items.map((b, i) => (
        <CMSSection key={b.id} title={b.title || `Banner ${i + 1}`} collapsible>
          <CMSListItem
            index={i} total={items.length}
            onDelete={() => updateData("banners", items.filter((_, j) => j !== i))}
            onMoveUp={() => { const arr = [...items]; [arr[i], arr[i-1]] = [arr[i-1], arr[i]]; updateData("banners", arr); }}
            onMoveDown={() => { const arr = [...items]; [arr[i], arr[i+1]] = [arr[i+1], arr[i]]; updateData("banners", arr); }}
          >
            <CMSInput label="Title" value={b.title} onChange={(v) => update(i, "title", v)} />
            <CMSInput label="Subtitle" value={b.subtitle} onChange={(v) => update(i, "subtitle", v)} />
            <CMSImageInput label="Background Image" value={b.image} onChange={(v) => update(i, "image", v)} />
            <div className="grid gap-3 sm:grid-cols-2">
              <CMSInput label="CTA Text" value={b.ctaText} onChange={(v) => update(i, "ctaText", v)} />
              <CMSInput label="CTA Link" value={b.ctaLink} onChange={(v) => update(i, "ctaLink", v)} />
            </div>
            <CMSToggle label="Aktif" checked={b.enabled} onChange={(v) => update(i, "enabled", v)} />
          </CMSListItem>
        </CMSSection>
      ))}

      <CMSAddButton label="Tambah Banner" onClick={() => updateData("banners", [...items, { id: `bn${Date.now()}`, title: "", subtitle: "", image: "", ctaText: "", ctaLink: "", enabled: true }])} />
    </div>
  );
}
