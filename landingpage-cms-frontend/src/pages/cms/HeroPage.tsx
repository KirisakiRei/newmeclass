import { useCMS, type HeroSlide } from "../../app/components/cms/CMSContext";
import { CMSPageHeader, CMSSection, CMSInput, CMSTextarea, CMSImageInput, CMSListItem, CMSAddButton, CMSSaveNotice } from "../../app/components/cms/CMSFormComponents";

export function HeroPage() {
  const { data, updateData } = useCMS();
  const slides = data.hero;

  const update = (index: number, key: keyof HeroSlide, value: string) => {
    const updated = [...slides];
    updated[index] = { ...updated[index], [key]: value };
    updateData("hero", updated);
  };

  const add = () => {
    updateData("hero", [...slides, { id: `h${Date.now()}`, subtitle: "", title: "", desc: "", image: "", ctaText: "Mulai Sekarang", ctaLink: "/services" }]);
  };

  const remove = (i: number) => updateData("hero", slides.filter((_, j) => j !== i));

  const move = (i: number, dir: number) => {
    const arr = [...slides];
    [arr[i], arr[i + dir]] = [arr[i + dir], arr[i]];
    updateData("hero", arr);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <CMSPageHeader title="Hero Carousel" subtitle="Manage slides yang tampil di hero section" badge="LANDING PAGE">
        <CMSSaveNotice />
      </CMSPageHeader>

      {slides.map((slide, i) => (
        <CMSSection key={slide.id} title={`Slide ${i + 1}: ${slide.title || "Untitled"}`} collapsible>
          <CMSListItem
            index={i}
            total={slides.length}
            onDelete={() => remove(i)}
            onMoveUp={() => move(i, -1)}
            onMoveDown={() => move(i, 1)}
          >
            <CMSInput label="Subtitle" value={slide.subtitle} onChange={(v) => update(i, "subtitle", v)} />
            <CMSInput label="Title" value={slide.title} onChange={(v) => update(i, "title", v)} />
            <CMSTextarea label="Deskripsi" value={slide.desc} onChange={(v) => update(i, "desc", v)} rows={2} />
            <CMSImageInput label="Background Image" value={slide.image} onChange={(v) => update(i, "image", v)} />
            <div className="grid gap-3 sm:grid-cols-2">
              <CMSInput label="CTA Text" value={slide.ctaText} onChange={(v) => update(i, "ctaText", v)} />
              <CMSInput label="CTA Link" value={slide.ctaLink} onChange={(v) => update(i, "ctaLink", v)} />
            </div>
          </CMSListItem>
        </CMSSection>
      ))}

      <CMSAddButton label="Tambah Slide" onClick={add} />
    </div>
  );
}
