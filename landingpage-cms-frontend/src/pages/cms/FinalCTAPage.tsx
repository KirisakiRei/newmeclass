import { useCMS } from "../../app/components/cms/CMSContext";
import { CMSPageHeader, CMSSection, CMSInput, CMSSaveNotice } from "../../app/components/cms/CMSFormComponents";

export function FinalCTAPage() {
  const { data, updateData } = useCMS();
  const cta = data.finalCta;
  const update = (key: string, value: string) => updateData("finalCta", { ...cta, [key]: value });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <CMSPageHeader title="Final CTA" subtitle="Kelola section call-to-action terakhir di landing page" badge="LANDING PAGE">
        <CMSSaveNotice />
      </CMSPageHeader>

      <CMSSection title="Konten CTA">
        <CMSInput label="Title" value={cta.title} onChange={(v) => update("title", v)} />
        <CMSInput label="Subtitle" value={cta.subtitle} onChange={(v) => update("subtitle", v)} />
        <div className="grid gap-3 sm:grid-cols-2">
          <CMSInput label="CTA Button Text" value={cta.ctaText} onChange={(v) => update("ctaText", v)} />
          <CMSInput label="CTA Link" value={cta.ctaLink} onChange={(v) => update("ctaLink", v)} />
        </div>
      </CMSSection>
    </div>
  );
}
