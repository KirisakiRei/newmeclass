import { useParams } from "react-router";
import { useCMS } from "../../app/components/cms/CMSContext";
import {
  CMSPageHeader, CMSSection, CMSInput, CMSTextarea, CMSImageInput,
  CMSToggle, CMSListItem, CMSAddButton, CMSSaveNotice, CMSNumberInput, CMSSelect,
} from "../../app/components/cms/CMSFormComponents";
import { Badge } from "../../app/components/ui/badge";

const CONSULT_THEME_OPTIONS = [
  { label: "Emerald", value: "emerald" },
  { label: "Yellow", value: "yellow" },
  { label: "Blue", value: "blue" },
  { label: "Purple", value: "purple" },
  { label: "Orange", value: "orange" },
];

const SERVICE_ICON_OPTIONS = [
  { label: "Sparkles", value: "Sparkles" },
  { label: "Stethoscope", value: "Stethoscope" },
  { label: "Brain", value: "Brain" },
  { label: "GraduationCap", value: "GraduationCap" },
  { label: "Video", value: "Video" },
  { label: "Calendar", value: "Calendar" },
  { label: "Users", value: "Users" },
  { label: "Award", value: "Award" },
  { label: "Percent", value: "Percent" },
  { label: "Handshake", value: "Handshake" },
  { label: "Crown", value: "Crown" },
  { label: "Heart", value: "Heart" },
  { label: "Shield", value: "Shield" },
];

export function ServiceDetailPage() {
  const { slug } = useParams();
  const { data, updateData } = useCMS();
  const pages = data.servicePages;
  const pageIndex = pages.findIndex((p) => p.slug === slug);
  const page = pages[pageIndex];

  if (!page) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-zinc-500">Halaman layanan tidak ditemukan.</p>
      </div>
    );
  }

  const update = (key: string, value: any) => {
    const arr = [...pages];
    arr[pageIndex] = { ...arr[pageIndex], [key]: value };
    updateData("servicePages", arr);
  };

  // ── Helpers ──────────────────────────────────────────────────
  const updatePhase = (i: number, key: string, value: string) => {
    const phases = [...(page.phases ?? [])];
    phases[i] = { ...phases[i], [key]: value };
    update("phases", phases);
  };
  const updateGaliBakatBenefit = (i: number, key: string, value: string) => {
    const arr = [...(page.galiBakatBenefits ?? [])];
    arr[i] = { ...arr[i], [key]: value };
    update("galiBakatBenefits", arr);
  };
  const updateConsultType = (i: number, key: string, value: any) => {
    const arr = [...(page.consultTypes ?? [])];
    arr[i] = { ...arr[i], [key]: value };
    update("consultTypes", arr);
  };
  const updatePsychologist = (i: number, key: string, value: any) => {
    const arr = [...(page.psychologists ?? [])];
    arr[i] = { ...arr[i], [key]: value };
    update("psychologists", arr);
  };
  const updateClinicFeature = (i: number, key: string, value: string) => {
    const arr = [...(page.clinicFeatures ?? [])];
    arr[i] = { ...arr[i], [key]: value };
    update("clinicFeatures", arr);
  };
  const updateCourse = (i: number, key: string, value: any) => {
    const arr = [...(page.courses ?? [])];
    arr[i] = { ...arr[i], [key]: value };
    update("courses", arr);
  };
  const updateWebinar = (i: number, key: string, value: any) => {
    const arr = [...(page.webinars ?? [])];
    arr[i] = { ...arr[i], [key]: value };
    update("webinars", arr);
  };
  const updateGalleryPhoto = (i: number, key: string, value: string) => {
    const arr = [...(page.galleryPhotos ?? [])];
    arr[i] = { ...arr[i], [key]: value };
    update("galleryPhotos", arr);
  };
  const updateGalleryVideo = (i: number, key: string, value: string) => {
    const arr = [...(page.galleryVideos ?? [])];
    arr[i] = { ...arr[i], [key]: value };
    update("galleryVideos", arr);
  };
  const updateNetBenefit = (i: number, key: string, value: string) => {
    const arr = [...(page.netBenefits ?? [])];
    arr[i] = { ...arr[i], [key]: value };
    update("netBenefits", arr);
  };
  const updateMemberPlan = (i: number, key: string, value: any) => {
    const arr = [...(page.memberPlans ?? [])];
    arr[i] = { ...arr[i], [key]: value };
    update("memberPlans", arr);
  };
  const updatePricing = (i: number, key: string, value: any) => {
    const pricing = [...page.pricing];
    pricing[i] = { ...pricing[i], [key]: value };
    update("pricing", pricing);
  };
  const updateClassHighlight = (i: number, key: string, value: string) => {
    const arr = [...(page.classHighlights ?? [])];
    arr[i] = { ...arr[i], [key]: value };
    update("classHighlights", arr);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <CMSPageHeader title={page.title} subtitle={`Kelola halaman layanan ${page.title}`} badge="LAYANAN">
        <CMSSaveNotice />
      </CMSPageHeader>

      {/* ── Common Info ── */}
      <CMSSection title="Informasi Halaman">
        <div className="grid gap-4 sm:grid-cols-2">
          <CMSInput label="Judul" value={page.title} onChange={(v) => update("title", v)} />
          <CMSInput label="Subtitle" value={page.subtitle} onChange={(v) => update("subtitle", v)} />
        </div>
        <CMSTextarea label="Deskripsi" value={page.description} onChange={(v) => update("description", v)} rows={4} />
        <CMSImageInput label="Hero Image" value={page.heroImage} onChange={(v) => update("heroImage", v)} />
        <div className="grid gap-4 sm:grid-cols-2">
          <CMSInput label="Hero Badge" value={page.heroBadge || ""} onChange={(v) => update("heroBadge", v)} placeholder="PROGRAM UNGGULAN" />
          <div />
          <CMSInput label="CTA Primer Text" value={page.heroPrimaryCtaText || ""} onChange={(v) => update("heroPrimaryCtaText", v)} placeholder="Hubungi Tim NEWME" />
          <CMSInput label="CTA Primer Link" value={page.heroPrimaryCtaLink || ""} onChange={(v) => update("heroPrimaryCtaLink", v)} placeholder="/contact" />
          <CMSInput label="CTA Sekunder Text" value={page.heroSecondaryCtaText || ""} onChange={(v) => update("heroSecondaryCtaText", v)} placeholder="Coba NEWME Test" />
          <CMSInput label="CTA Sekunder Link" value={page.heroSecondaryCtaLink || ""} onChange={(v) => update("heroSecondaryCtaLink", v)} placeholder="/register" />
        </div>
        <CMSInput label="Judul Intro Section" value={page.introTitle || ""} onChange={(v) => update("introTitle", v)} placeholder="Apa itu Kelas Gali Bakat?" />
        <CMSTextarea
          label="Paragraf Intro (1 paragraf per baris kosong dipisah manual)"
          value={(page.introParagraphs || []).join("\n\n")}
          onChange={(v) => update("introParagraphs", v.split(/\n\s*\n/).map((item) => item.trim()).filter(Boolean))}
          rows={6}
        />
        <CMSToggle label="Halaman Aktif" description="Nonaktifkan untuk menyembunyikan halaman" checked={page.enabled} onChange={(v) => update("enabled", v)} />
      </CMSSection>

      {/* ══════════════════════════════════════════════════════════════════
          KELAS GALI BAKAT (personality-tests)
      ══════════════════════════════════════════════════════════════════ */}
      {slug === "personality-tests" && (
        <>
          <CMSSection title="Tahapan Program (Alur Kelas Gali Bakat)" collapsible description="5 langkah utama program yang ditampilkan sebagai timeline">
            {(page.phases ?? []).map((p, i) => (
              <CMSListItem key={i} index={i} total={page.phases?.length} onDelete={() => update("phases", page.phases!.filter((_, j) => j !== i))}>
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="border-yellow-500/20 bg-yellow-500/10 text-[10px] text-yellow-500">Tahap {i + 1}</Badge>
                </div>
                <CMSInput label="Judul Tahap" value={p.title} onChange={(v) => updatePhase(i, "title", v)} />
                <CMSTextarea label="Deskripsi" value={p.desc} onChange={(v) => updatePhase(i, "desc", v)} rows={2} />
              </CMSListItem>
            ))}
            <CMSAddButton label="Tambah Tahap" onClick={() => update("phases", [...(page.phases ?? []), { title: "", desc: "" }])} />
          </CMSSection>

          <CMSSection title="Manfaat Program (6 Benefit Cards)" collapsible description="Ditampilkan sebagai grid 6 kartu di halaman">
            {(page.galiBakatBenefits ?? []).map((b, i) => (
              <CMSListItem key={i} index={i} total={page.galiBakatBenefits?.length} onDelete={() => update("galiBakatBenefits", page.galiBakatBenefits!.filter((_, j) => j !== i))}>
                <CMSInput label="Judul" value={b.title} onChange={(v) => updateGaliBakatBenefit(i, "title", v)} />
                <CMSTextarea label="Deskripsi" value={b.desc} onChange={(v) => updateGaliBakatBenefit(i, "desc", v)} rows={2} />
              </CMSListItem>
            ))}
            <CMSAddButton label="Tambah Benefit" onClick={() => update("galiBakatBenefits", [...(page.galiBakatBenefits ?? []), { title: "", desc: "" }])} />
          </CMSSection>

          <CMSSection title="Kelas Optimasi Potensi — Checklist" collapsible description="Poin-poin yang ditampilkan di section Kelas Optimasi">
            <div className="space-y-2">
              {(page.optimasiItems ?? []).map((item, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={item}
                    onChange={(e) => {
                      const arr = [...(page.optimasiItems ?? [])];
                      arr[i] = e.target.value;
                      update("optimasiItems", arr);
                    }}
                    placeholder={`Poin ${i + 1}`}
                    className="flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-yellow-500/50"
                  />
                  <button onClick={() => update("optimasiItems", page.optimasiItems!.filter((_, j) => j !== i))} className="text-zinc-600 hover:text-red-400 transition-colors">✕</button>
                </div>
              ))}
              <CMSAddButton label="Tambah Poin" onClick={() => update("optimasiItems", [...(page.optimasiItems ?? []), ""])} />
            </div>
          </CMSSection>

          <CMSSection title="Paket Harga" collapsible>
            {page.pricing.map((p, i) => (
              <CMSListItem key={i} onDelete={() => update("pricing", page.pricing.filter((_, j) => j !== i))}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <CMSInput label="Nama Paket" value={p.name} onChange={(v) => updatePricing(i, "name", v)} />
                  <CMSInput label="Harga" value={p.price} onChange={(v) => updatePricing(i, "price", v)} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs text-zinc-400" style={{ fontWeight: 500 }}>Fitur (1 per baris)</label>
                  <textarea
                    value={p.features.join("\n")}
                    onChange={(e) => updatePricing(i, "features", e.target.value.split("\n"))}
                    rows={4}
                    className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none transition-colors focus:border-yellow-500/50 resize-y"
                    placeholder="Fitur 1&#10;Fitur 2"
                  />
                </div>
              </CMSListItem>
            ))}
            <CMSAddButton label="Tambah Paket" onClick={() => update("pricing", [...page.pricing, { name: "", price: "", features: [] }])} />
          </CMSSection>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          NEWME CLINIC
      ══════════════════════════════════════════════════════════════════ */}
      {slug === "clinic" && (
        <>
          <CMSSection title="Jenis Konsultasi" collapsible description="Ditampilkan sebagai 2 kartu besar dengan warna gradient">
            {(page.consultTypes ?? []).map((c, i) => (
              <CMSListItem key={i} index={i} total={page.consultTypes?.length} onDelete={() => update("consultTypes", page.consultTypes!.filter((_, j) => j !== i))}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <CMSInput label="Judul Konsultasi" value={c.title} onChange={(v) => updateConsultType(i, "title", v)} />
                  <CMSInput label="Subtitle" value={c.subtitle} onChange={(v) => updateConsultType(i, "subtitle", v)} />
                </div>
                <CMSTextarea label="Deskripsi" value={c.desc} onChange={(v) => updateConsultType(i, "desc", v)} rows={2} />
                <div className="grid gap-3 sm:grid-cols-3">
                  <CMSInput label="Durasi" value={c.duration} onChange={(v) => updateConsultType(i, "duration", v)} placeholder="60-90 menit" />
                  <CMSInput label="Mode" value={c.mode} onChange={(v) => updateConsultType(i, "mode", v)} placeholder="Online / Offline" />
                  <CMSInput label="Harga Mulai Dari" value={c.price} onChange={(v) => updateConsultType(i, "price", v)} placeholder="Rp 250.000" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <CMSSelect
                    label="Icon"
                    value={c.icon || "Sparkles"}
                    onChange={(v) => updateConsultType(i, "icon", v)}
                    options={SERVICE_ICON_OPTIONS}
                  />
                  <CMSSelect
                    label="Theme Gradient"
                    value={c.theme || "yellow"}
                    onChange={(v) => updateConsultType(i, "theme", v)}
                    options={CONSULT_THEME_OPTIONS}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs text-zinc-400" style={{ fontWeight: 500 }}>Topik Konsultasi (1 per baris)</label>
                  <textarea
                    value={c.topics.join("\n")}
                    onChange={(e) => updateConsultType(i, "topics", e.target.value.split("\n").filter(Boolean))}
                    rows={4}
                    className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-yellow-500/50 resize-y"
                    placeholder="Pengembangan karir&#10;Manajemen stress"
                  />
                </div>
              </CMSListItem>
            ))}
            <CMSAddButton label="Tambah Jenis Konsultasi" onClick={() => update("consultTypes", [...(page.consultTypes ?? []), { title: "", subtitle: "", desc: "", duration: "60-90 menit", mode: "Online / Offline", topics: [], price: "", icon: "Sparkles", theme: "yellow" }])} />
          </CMSSection>

          <CMSSection title="Tim Psikolog" collapsible description="3 kartu psikolog yang ditampilkan di halaman">
            {(page.psychologists ?? []).map((p, i) => (
              <CMSListItem key={i} index={i} total={page.psychologists?.length} onDelete={() => update("psychologists", page.psychologists!.filter((_, j) => j !== i))}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <CMSInput label="Nama Lengkap" value={p.name} onChange={(v) => updatePsychologist(i, "name", v)} />
                  <CMSInput label="Spesialisasi" value={p.specialty} onChange={(v) => updatePsychologist(i, "specialty", v)} />
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <CMSInput label="Inisial Avatar" value={p.initials} onChange={(v) => updatePsychologist(i, "initials", v)} placeholder="MS" />
                  <CMSNumberInput label="Rating (0-5)" value={p.rating} onChange={(v) => updatePsychologist(i, "rating", v)} min={0} max={5} />
                  <CMSNumberInput label="Jumlah Sesi" value={p.sessions} onChange={(v) => updatePsychologist(i, "sessions", v)} min={0} />
                </div>
              </CMSListItem>
            ))}
            <CMSAddButton label="Tambah Psikolog" onClick={() => update("psychologists", [...(page.psychologists ?? []), { id: `ps${Date.now()}`, name: "", specialty: "", rating: 5.0, sessions: 0, initials: "" }])} />
          </CMSSection>

          <CMSSection title="Fitur Unggulan Klinik" collapsible description="4 kotak fitur di bagian bawah (Psikolog Berlisensi, Fleksibel, dll.)">
            {(page.clinicFeatures ?? []).map((f, i) => (
              <CMSListItem key={i} onDelete={() => update("clinicFeatures", page.clinicFeatures!.filter((_, j) => j !== i))}>
                <CMSInput label="Judul" value={f.title} onChange={(v) => updateClinicFeature(i, "title", v)} />
                <CMSTextarea label="Deskripsi" value={f.desc} onChange={(v) => updateClinicFeature(i, "desc", v)} rows={2} />
              </CMSListItem>
            ))}
            <CMSAddButton label="Tambah Fitur" onClick={() => update("clinicFeatures", [...(page.clinicFeatures ?? []), { title: "", desc: "" }])} />
          </CMSSection>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          NEWME CLASS
      ══════════════════════════════════════════════════════════════════ */}
      {slug === "class" && (
        <>
          <CMSSection title="Highlight Hero (4 Item)" collapsible description="Stat/highlight kecil di bawah hero NEWME Class">
            {(page.classHighlights ?? []).map((item, i) => (
              <CMSListItem key={i} index={i} total={page.classHighlights?.length} onDelete={() => update("classHighlights", page.classHighlights!.filter((_, j) => j !== i))}>
                <div className="grid gap-3 sm:grid-cols-3">
                  <CMSSelect
                    label="Icon"
                    value={item.icon}
                    onChange={(v) => updateClassHighlight(i, "icon", v)}
                    options={SERVICE_ICON_OPTIONS}
                  />
                  <CMSInput label="Label" value={item.label} onChange={(v) => updateClassHighlight(i, "label", v)} placeholder="12+ Kursus" />
                  <CMSInput label="Deskripsi" value={item.desc} onChange={(v) => updateClassHighlight(i, "desc", v)} placeholder="Online & Offline" />
                </div>
              </CMSListItem>
            ))}
            <CMSAddButton
              label="Tambah Highlight"
              onClick={() => update("classHighlights", [...(page.classHighlights ?? []), { icon: "BookOpen", label: "", desc: "" }])}
            />
          </CMSSection>

          <CMSSection title="Daftar Kursus" collapsible description="Ditampilkan di tab Kursus dengan kartu bergambar">
            {(page.courses ?? []).map((c, i) => (
              <CMSListItem key={i} index={i} total={page.courses?.length} onDelete={() => update("courses", page.courses!.filter((_, j) => j !== i))}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <CMSInput label="Judul Kursus" value={c.title} onChange={(v) => updateCourse(i, "title", v)} />
                  <CMSInput label="Instruktur" value={c.instructor} onChange={(v) => updateCourse(i, "instructor", v)} />
                </div>
                <div className="grid gap-3 sm:grid-cols-4">
                  <CMSInput label="Durasi" value={c.duration} onChange={(v) => updateCourse(i, "duration", v)} placeholder="8 Jam" />
                  <CMSNumberInput label="Jumlah Siswa" value={c.students} onChange={(v) => updateCourse(i, "students", v)} />
                  <CMSNumberInput label="Rating" value={c.rating} onChange={(v) => updateCourse(i, "rating", v)} min={0} max={5} />
                  <CMSInput label="Harga" value={c.price} onChange={(v) => updateCourse(i, "price", v)} placeholder="Rp 199.000" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <CMSInput label="Badge" value={c.badge} onChange={(v) => updateCourse(i, "badge", v)} placeholder="Best Seller" />
                </div>
                <CMSImageInput label="Gambar Kursus" value={c.image} onChange={(v) => updateCourse(i, "image", v)} />
              </CMSListItem>
            ))}
            <CMSAddButton label="Tambah Kursus" onClick={() => update("courses", [...(page.courses ?? []), { id: `c${Date.now()}`, title: "", instructor: "", duration: "", students: 0, rating: 5.0, price: "", badge: "", image: "" }])} />
          </CMSSection>

          <CMSSection title="Jadwal Webinar" collapsible description="Ditampilkan di tab Webinar sebagai daftar dengan tanggal dan harga">
            {(page.webinars ?? []).map((w, i) => (
              <CMSListItem key={i} index={i} total={page.webinars?.length} onDelete={() => update("webinars", page.webinars!.filter((_, j) => j !== i))}>
                <CMSInput label="Judul Webinar" value={w.title} onChange={(v) => updateWebinar(i, "title", v)} />
                <div className="grid gap-3 sm:grid-cols-3">
                  <CMSInput label="Tanggal" value={w.date} onChange={(v) => updateWebinar(i, "date", v)} placeholder="28 Mar 2026" />
                  <CMSInput label="Waktu" value={w.time} onChange={(v) => updateWebinar(i, "time", v)} placeholder="19:00 WIB" />
                  <CMSInput label="Pembicara" value={w.speaker} onChange={(v) => updateWebinar(i, "speaker", v)} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <CMSNumberInput label="Sisa Kuota" value={w.spots} onChange={(v) => updateWebinar(i, "spots", v)} min={0} />
                  <CMSInput label="Harga" value={w.price} onChange={(v) => updateWebinar(i, "price", v)} placeholder="Gratis / Rp 50.000" />
                </div>
              </CMSListItem>
            ))}
            <CMSAddButton label="Tambah Webinar" onClick={() => update("webinars", [...(page.webinars ?? []), { id: `w${Date.now()}`, title: "", date: "", time: "", speaker: "", spots: 50, price: "Gratis" }])} />
          </CMSSection>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          NEWME GALLERY
      ══════════════════════════════════════════════════════════════════ */}
      {slug === "gallery" && (
        <>
          <CMSSection title="Foto Galeri" collapsible description="Ditampilkan di tab Foto dalam layout masonry/kolom">
            {(page.galleryPhotos ?? []).map((p, i) => (
              <CMSListItem key={i} index={i} total={page.galleryPhotos?.length} onDelete={() => update("galleryPhotos", page.galleryPhotos!.filter((_, j) => j !== i))}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <CMSInput label="Caption" value={p.caption} onChange={(v) => updateGalleryPhoto(i, "caption", v)} />
                  <CMSInput label="Kategori" value={p.category} onChange={(v) => updateGalleryPhoto(i, "category", v)} placeholder="Event / Kegiatan" />
                </div>
                <CMSImageInput label="URL Foto" value={p.src} onChange={(v) => updateGalleryPhoto(i, "src", v)} />
              </CMSListItem>
            ))}
            <CMSAddButton label="Tambah Foto" onClick={() => update("galleryPhotos", [...(page.galleryPhotos ?? []), { id: `gp${Date.now()}`, src: "", caption: "", category: "Kegiatan" }])} />
          </CMSSection>

          <CMSSection title="Video Galeri" collapsible description="Ditampilkan di tab Video sebagai kartu dengan tombol play">
            {(page.galleryVideos ?? []).map((v, i) => (
              <CMSListItem key={i} index={i} total={page.galleryVideos?.length} onDelete={() => update("galleryVideos", page.galleryVideos!.filter((_, j) => j !== i))}>
                <CMSInput label="Judul Video" value={v.title} onChange={(v2) => updateGalleryVideo(i, "title", v2)} />
                <div className="grid gap-3 sm:grid-cols-3">
                  <CMSInput label="Pembicara/Alumni" value={v.speaker} onChange={(v2) => updateGalleryVideo(i, "speaker", v2)} />
                  <CMSInput label="Durasi" value={v.duration} onChange={(v2) => updateGalleryVideo(i, "duration", v2)} placeholder="5:32" />
                  <CMSInput label="Kategori" value={v.category} onChange={(v2) => updateGalleryVideo(i, "category", v2)} placeholder="Testimoni / Motivasi / BTS" />
                </div>
              </CMSListItem>
            ))}
            <CMSAddButton label="Tambah Video" onClick={() => update("galleryVideos", [...(page.galleryVideos ?? []), { id: `gv${Date.now()}`, title: "", speaker: "", duration: "", category: "Testimoni" }])} />
          </CMSSection>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          NEWME NET
      ══════════════════════════════════════════════════════════════════ */}
      {slug === "net" && (
        <>
          <CMSSection title="Benefit Member (6 Kartu)" collapsible description="Ditampilkan sebagai grid 6 kartu benefit member">
            {(page.netBenefits ?? []).map((b, i) => (
              <CMSListItem key={i} index={i} total={page.netBenefits?.length} onDelete={() => update("netBenefits", page.netBenefits!.filter((_, j) => j !== i))}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <CMSInput label="Judul" value={b.title} onChange={(v) => updateNetBenefit(i, "title", v)} />
                  <CMSInput label="Icon (Lucide)" value={b.icon} onChange={(v) => updateNetBenefit(i, "icon", v)} placeholder="Percent / Users / Calendar" />
                </div>
                <CMSTextarea label="Deskripsi" value={b.desc} onChange={(v) => updateNetBenefit(i, "desc", v)} rows={2} />
              </CMSListItem>
            ))}
            <CMSAddButton label="Tambah Benefit" onClick={() => update("netBenefits", [...(page.netBenefits ?? []), { icon: "Star", title: "", desc: "" }])} />
          </CMSSection>

          <CMSSection title="Paket Membership (3 Tier)" collapsible description="Ditampilkan sebagai 3 kartu pricing: Basic, Gold, Platinum">
            {(page.memberPlans ?? []).map((p, i) => (
              <CMSListItem key={i} index={i} total={page.memberPlans?.length} onDelete={() => update("memberPlans", page.memberPlans!.filter((_, j) => j !== i))}>
                <div className="grid gap-3 sm:grid-cols-3">
                  <CMSInput label="Nama Paket" value={p.name} onChange={(v) => updateMemberPlan(i, "name", v)} placeholder="Gold" />
                  <CMSInput label="Harga" value={p.price} onChange={(v) => updateMemberPlan(i, "price", v)} placeholder="Rp 99K" />
                  <CMSInput label="Periode" value={p.period} onChange={(v) => updateMemberPlan(i, "period", v)} placeholder="/bulan" />
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
                  <input type="checkbox" checked={p.highlight} onChange={(e) => updateMemberPlan(i, "highlight", e.target.checked)} className="accent-yellow-500" />
                  <span className="text-sm text-zinc-300">Tampilkan sebagai paket rekomendasi (highlighted)</span>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs text-zinc-400" style={{ fontWeight: 500 }}>Fitur (1 per baris)</label>
                  <textarea
                    value={p.features.join("\n")}
                    onChange={(e) => updateMemberPlan(i, "features", e.target.value.split("\n"))}
                    rows={4}
                    className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-yellow-500/50 resize-y"
                    placeholder="Akses komunitas online&#10;Newsletter bulanan"
                  />
                </div>
              </CMSListItem>
            ))}
            <CMSAddButton label="Tambah Paket" onClick={() => update("memberPlans", [...(page.memberPlans ?? []), { name: "", price: "", period: "/bulan", features: [], highlight: false }])} />
          </CMSSection>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          SERVICES (overview) + Generic features/pricing
      ══════════════════════════════════════════════════════════════════ */}
      {(slug === "services" || slug === "personality-tests") && slug !== "personality-tests" && (
        <CMSSection title="Fitur / Keunggulan" collapsible>
          {page.features.map((f, i) => (
            <CMSListItem key={i} onDelete={() => update("features", page.features.filter((_, j) => j !== i))}>
              <CMSInput label="Judul Fitur" value={f.title} onChange={(v) => { const arr = [...page.features]; arr[i] = { ...arr[i], title: v }; update("features", arr); }} />
              <CMSTextarea label="Deskripsi" value={f.desc} onChange={(v) => { const arr = [...page.features]; arr[i] = { ...arr[i], desc: v }; update("features", arr); }} rows={2} />
            </CMSListItem>
          ))}
          <CMSAddButton label="Tambah Fitur" onClick={() => update("features", [...page.features, { title: "", desc: "" }])} />
        </CMSSection>
      )}

      {slug === "services" && (
        <CMSSection title="Fitur / Keunggulan" collapsible>
          {page.features.map((f, i) => (
            <CMSListItem key={i} onDelete={() => update("features", page.features.filter((_, j) => j !== i))}>
              <CMSInput label="Judul" value={f.title} onChange={(v) => { const arr = [...page.features]; arr[i] = { ...arr[i], title: v }; update("features", arr); }} />
              <CMSTextarea label="Deskripsi" value={f.desc} onChange={(v) => { const arr = [...page.features]; arr[i] = { ...arr[i], desc: v }; update("features", arr); }} rows={2} />
            </CMSListItem>
          ))}
          <CMSAddButton label="Tambah Fitur" onClick={() => update("features", [...page.features, { title: "", desc: "" }])} />
        </CMSSection>
      )}
    </div>
  );
}
