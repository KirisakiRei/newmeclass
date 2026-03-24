import { useCMS } from "../CMSContext";
import { CMSPageHeader, CMSSection, CMSInput, CMSTextarea, CMSListItem, CMSAddButton, CMSSaveNotice } from "../CMSFormComponents";

export function VisiMisiPage() {
  const { data, updateData } = useCMS();
  const vm = data.visiMisi;
  const update = (key: string, value: any) => updateData("visiMisi", { ...vm, [key]: value });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <CMSPageHeader title="Visi & Misi" subtitle="Kelola visi, misi, dan values NEWME CLASS" badge="LANDING PAGE">
        <CMSSaveNotice />
      </CMSPageHeader>

      <CMSSection title="Visi">
        <CMSTextarea label="Visi" value={vm.visi} onChange={(v) => update("visi", v)} rows={3} />
      </CMSSection>

      <CMSSection title="Misi" collapsible>
        {vm.misi.map((m, i) => (
          <CMSListItem key={i} onDelete={() => update("misi", vm.misi.filter((_, j) => j !== i))}
            index={i} total={vm.misi.length}
            onMoveUp={() => { const arr = [...vm.misi]; [arr[i], arr[i-1]] = [arr[i-1], arr[i]]; update("misi", arr); }}
            onMoveDown={() => { const arr = [...vm.misi]; [arr[i], arr[i+1]] = [arr[i+1], arr[i]]; update("misi", arr); }}
          >
            <CMSInput label={`Misi ${i + 1}`} value={m} onChange={(v) => { const arr = [...vm.misi]; arr[i] = v; update("misi", arr); }} />
          </CMSListItem>
        ))}
        <CMSAddButton label="Tambah Misi" onClick={() => update("misi", [...vm.misi, ""])} />
      </CMSSection>

      <CMSSection title="Core Values" collapsible>
        {vm.values.map((v, i) => (
          <CMSListItem key={i} onDelete={() => update("values", vm.values.filter((_, j) => j !== i))}>
            <CMSInput label="Judul" value={v.title} onChange={(val) => { const arr = [...vm.values]; arr[i] = { ...arr[i], title: val }; update("values", arr); }} />
            <CMSTextarea label="Deskripsi" value={v.desc} onChange={(val) => { const arr = [...vm.values]; arr[i] = { ...arr[i], desc: val }; update("values", arr); }} rows={2} />
          </CMSListItem>
        ))}
        <CMSAddButton label="Tambah Value" onClick={() => update("values", [...vm.values, { title: "", desc: "" }])} />
      </CMSSection>
    </div>
  );
}
