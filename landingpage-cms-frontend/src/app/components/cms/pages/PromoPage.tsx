import { useCMS } from "../CMSContext";
import {
  CMSPageHeader, CMSSection, CMSInput, CMSTextarea, CMSImageInput,
  CMSToggle, CMSAddButton, CMSSaveNotice,
} from "../CMSFormComponents";
import { Trash2 } from "lucide-react";

export function PromoPage() {
  const { data, updateData } = useCMS();
  const promo = data.promo;
  const update = (key: string, value: any) => updateData("promo", { ...promo, [key]: value });

  const updateTest = (i: number, value: string) => {
    const tests = [...(promo.tests ?? [])];
    tests[i] = value;
    update("tests", tests);
  };

  const removeTest = (i: number) => {
    update("tests", (promo.tests ?? []).filter((_, j) => j !== i));
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <CMSPageHeader title="Promo Section" subtitle="Kelola konten promo / program unggulan di landing page" badge="LANDING PAGE">
        <CMSSaveNotice />
      </CMSPageHeader>

      <CMSSection title="Status">
        <CMSToggle
          label="Tampilkan Promo Section"
          description="Nonaktifkan untuk menyembunyikan section promo dari landing page"
          checked={promo.enabled}
          onChange={(v) => update("enabled", v)}
        />
      </CMSSection>

      <CMSSection title="Konten Utama">
        <CMSInput label="Badge" value={promo.badge} onChange={(v) => update("badge", v)} placeholder="PROGRAM UNGGULAN" />
        <CMSInput label="Title" value={promo.title} onChange={(v) => update("title", v)} placeholder="Kelas Gali Bakat NEWME" />
        <CMSInput label="Subtitle" value={promo.subtitle} onChange={(v) => update("subtitle", v)} />
        <CMSTextarea label="Deskripsi" value={promo.description} onChange={(v) => update("description", v)} rows={3} />
        <CMSImageInput label="Gambar (opsional)" value={promo.image} onChange={(v) => update("image", v)} />
        <div className="grid gap-3 sm:grid-cols-2">
          <CMSInput label="Teks Tombol CTA" value={promo.ctaText} onChange={(v) => update("ctaText", v)} placeholder="Pelajari Program" />
          <CMSInput label="Link CTA" value={promo.ctaLink} onChange={(v) => update("ctaLink", v)} placeholder="/services/personality-tests" />
        </div>
      </CMSSection>

      <CMSSection
        title="Daftar Tes (Badge Pills)"
        description="Ditampilkan sebagai badge dengan centang ✓ di bawah judul section"
      >
        <div className="space-y-2">
          {(promo.tests ?? []).map((t, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={t}
                onChange={(e) => updateTest(i, e.target.value)}
                placeholder={`Tes ${i + 1}`}
                className="flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-yellow-500/50"
              />
              <button
                onClick={() => removeTest(i)}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-zinc-500 hover:border-red-500/30 hover:text-red-400 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <CMSAddButton
          label="Tambah Tes"
          onClick={() => update("tests", [...(promo.tests ?? []), ""])}
        />
      </CMSSection>
    </div>
  );
}
