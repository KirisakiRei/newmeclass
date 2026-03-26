import { useCMS } from "../../app/components/cms/CMSContext";
import { CMSPageHeader, CMSSection, CMSInput, CMSTextarea, CMSListItem, CMSAddButton, CMSSaveNotice } from "../../app/components/cms/CMSFormComponents";

export function CMSPrivacyPolicyPage() {
  const { data, updateData } = useCMS();
  const pp = data.privacyPolicy;
  const update = (key: string, value: any) => updateData("privacyPolicy", { ...pp, [key]: value });

  const updateSection = (i: number, key: string, value: string) => {
    const sections = [...pp.sections];
    sections[i] = { ...sections[i], [key]: value };
    update("sections", sections);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <CMSPageHeader title="Privacy Policy Editor" subtitle="Kelola konten halaman kebijakan privasi" badge="PRIVACY">
        <CMSSaveNotice />
      </CMSPageHeader>

      <CMSSection title="Informasi">
        <CMSInput label="Terakhir Diperbarui" value={pp.lastUpdated} onChange={(v) => update("lastUpdated", v)} type="date" />
      </CMSSection>

      <CMSSection title="Sections" description="Kelola bagian-bagian kebijakan privasi">
        {pp.sections.map((s, i) => (
          <CMSListItem
            key={s.id}
            index={i}
            total={pp.sections.length}
            onDelete={() => update("sections", pp.sections.filter((_, j) => j !== i))}
            onMoveUp={() => { const arr = [...pp.sections]; [arr[i], arr[i-1]] = [arr[i-1], arr[i]]; update("sections", arr); }}
            onMoveDown={() => { const arr = [...pp.sections]; [arr[i], arr[i+1]] = [arr[i+1], arr[i]]; update("sections", arr); }}
          >
            <CMSInput label="Judul Section" value={s.title} onChange={(v) => updateSection(i, "title", v)} />
            <CMSTextarea label="Konten" value={s.content} onChange={(v) => updateSection(i, "content", v)} rows={4} />
          </CMSListItem>
        ))}
        <CMSAddButton label="Tambah Section" onClick={() => update("sections", [...pp.sections, { id: `pp${Date.now()}`, title: "", content: "" }])} />
      </CMSSection>
    </div>
  );
}
