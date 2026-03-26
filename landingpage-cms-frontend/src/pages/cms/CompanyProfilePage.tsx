import { useCMS } from "../../app/components/cms/CMSContext";
import { CMSPageHeader, CMSSection, CMSInput, CMSTextarea, CMSImageInput, CMSListItem, CMSAddButton, CMSSaveNotice } from "../../app/components/cms/CMSFormComponents";

export function CMSCompanyProfilePage() {
  const { data, updateData } = useCMS();
  const cp = data.companyProfile;
  const update = (key: string, value: any) => updateData("companyProfile", { ...cp, [key]: value });

  const updateMember = (i: number, key: string, value: string) => {
    const arr = [...cp.teamMembers];
    arr[i] = { ...arr[i], [key]: value };
    update("teamMembers", arr);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <CMSPageHeader title="Profil Perusahaan" subtitle="Kelola informasi profil perusahaan" badge="COMPANY">
        <CMSSaveNotice />
      </CMSPageHeader>

      <CMSSection title="Informasi Dasar">
        <div className="grid gap-4 sm:grid-cols-2">
          <CMSInput label="Nama Brand" value={cp.name} onChange={(v) => update("name", v)} />
          <CMSInput label="Nama Legal / PT" value={cp.legalName} onChange={(v) => update("legalName", v)} />
        </div>
        <CMSInput label="Tahun Berdiri" value={cp.foundedYear} onChange={(v) => update("foundedYear", v)} />
        <CMSTextarea label="Deskripsi Perusahaan" value={cp.description} onChange={(v) => update("description", v)} />
      </CMSSection>

      <CMSSection title="Visi & Misi Perusahaan">
        <CMSTextarea label="Visi" value={cp.vision} onChange={(v) => update("vision", v)} rows={2} />
        {cp.mission.map((m, i) => (
          <CMSListItem key={i} onDelete={() => update("mission", cp.mission.filter((_, j) => j !== i))}>
            <CMSInput label={`Misi ${i + 1}`} value={m} onChange={(v) => { const arr = [...cp.mission]; arr[i] = v; update("mission", arr); }} />
          </CMSListItem>
        ))}
        <CMSAddButton label="Tambah Misi" onClick={() => update("mission", [...cp.mission, ""])} />
      </CMSSection>

      <CMSSection title="Tim / Team Members" description="Kelola anggota tim yang tampil di halaman profil" collapsible>
        {cp.teamMembers.map((m, i) => (
          <CMSListItem key={m.id} onDelete={() => update("teamMembers", cp.teamMembers.filter((_, j) => j !== i))}>
            <div className="grid gap-3 sm:grid-cols-2">
              <CMSInput label="Nama" value={m.name} onChange={(v) => updateMember(i, "name", v)} />
              <CMSInput label="Jabatan" value={m.role} onChange={(v) => updateMember(i, "role", v)} />
            </div>
            <CMSTextarea label="Bio" value={m.bio} onChange={(v) => updateMember(i, "bio", v)} rows={2} />
            <CMSImageInput label="Foto" value={m.image} onChange={(v) => updateMember(i, "image", v)} />
          </CMSListItem>
        ))}
        <CMSAddButton label="Tambah Anggota Tim" onClick={() => update("teamMembers", [...cp.teamMembers, { id: `tm${Date.now()}`, name: "", role: "", image: "", bio: "" }])} />
      </CMSSection>
    </div>
  );
}
