import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useCMS } from "../CMSContext";
import { CMSPageHeader, CMSSection, CMSInput, CMSTextarea, CMSToggle, CMSImageInput, CMSListItem, CMSAddButton, CMSSaveNotice } from "../CMSFormComponents";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";

export function GlobalSettingsPage() {
  const { data, updateData } = useCMS();
  const g = data.global;
  const [maintenancePending, setMaintenancePending] = useState(false);
  const [maintenanceConfirmation, setMaintenanceConfirmation] = useState("");

  const update = (key: string, value: any) => {
    updateData("global", { ...g, [key]: value });
  };

  const updateSocial = (index: number, key: string, value: string) => {
    const updated = [...g.socialLinks];
    updated[index] = { ...updated[index], [key]: value };
    update("socialLinks", updated);
  };

  useEffect(() => {
    if (g.maintenanceMode) {
      setMaintenancePending(false);
      setMaintenanceConfirmation("");
    }
  }, [g.maintenanceMode]);

  const handleMaintenanceToggle = (next: boolean) => {
    if (next) {
      setMaintenancePending(true);
      setMaintenanceConfirmation("");
      toast.message("Konfirmasi maintenance diperlukan", {
        description: "Ketik MAINTENANCE lalu aktifkan agar website publik benar-benar dialihkan.",
      });
      return;
    }

    if (!g.maintenanceMode) {
      setMaintenancePending(false);
      setMaintenanceConfirmation("");
      return;
    }

    setMaintenancePending(false);
    setMaintenanceConfirmation("");
    update("maintenanceMode", false);
    toast.success("Maintenance mode dimatikan", {
      description: "Website publik akan kembali live setelah autosave selesai.",
    });
  };

  const confirmMaintenanceActivation = () => {
    if (maintenanceConfirmation.trim().toUpperCase() !== "MAINTENANCE") {
      toast.error("Konfirmasi belum sesuai", {
        description: "Ketik tepat MAINTENANCE untuk mengaktifkan mode pemeliharaan.",
      });
      return;
    }

    update("maintenanceMode", true);
    setMaintenancePending(false);
    setMaintenanceConfirmation("");
    toast.success("Maintenance mode diaktifkan", {
      description: "Seluruh halaman public web akan dialihkan ke halaman maintenance setelah autosave selesai.",
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <CMSPageHeader title="Pengaturan Global" subtitle="Konfigurasi sitewide untuk seluruh website" badge="GLOBAL SETTINGS">
        <CMSSaveNotice />
      </CMSPageHeader>

      <CMSSection title="Identitas Website" description="Nama, tagline, dan branding">
        <div className="grid gap-4 sm:grid-cols-2">
          <CMSInput label="Nama Website" value={g.siteName} onChange={(v) => update("siteName", v)} />
          <CMSInput label="Tagline" value={g.tagline} onChange={(v) => update("tagline", v)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <CMSImageInput label="Logo Website" value={g.logoUrl} onChange={(v) => update("logoUrl", v)} />
          <CMSImageInput label="Favicon Website" value={g.faviconUrl} onChange={(v) => update("faviconUrl", v)} />
        </div>
      </CMSSection>

      <CMSSection title="SEO & Meta" description="Pengaturan identitas pencarian untuk seluruh website publik">
        <CMSInput label="Meta Title" value={g.metaTitle} onChange={(v) => update("metaTitle", v)} />
        <CMSTextarea label="Meta Description" value={g.metaDescription} onChange={(v) => update("metaDescription", v)} rows={2} />
        <CMSInput label="Meta Keywords" value={g.metaKeywords} onChange={(v) => update("metaKeywords", v)} placeholder="kelas bakat, tes kepribadian, newme class" />
      </CMSSection>

      <CMSSection title="Informasi Kontak" description="Kontak yang tampil di website">
        <div className="grid gap-4 sm:grid-cols-2">
          <CMSInput label="Telepon" value={g.phone} onChange={(v) => update("phone", v)} />
          <CMSInput label="Email" value={g.email} onChange={(v) => update("email", v)} />
        </div>
        <CMSTextarea label="Alamat" value={g.address} onChange={(v) => update("address", v)} rows={2} />
      </CMSSection>

      <CMSSection title="Social Media Links" description="Link sosial media">
        {g.socialLinks.map((s, i) => (
          <CMSListItem key={i} onDelete={() => update("socialLinks", g.socialLinks.filter((_, j) => j !== i))}>
            <div className="grid gap-3 sm:grid-cols-2">
              <CMSInput label="Platform" value={s.platform} onChange={(v) => updateSocial(i, "platform", v)} />
              <CMSInput label="URL" value={s.url} onChange={(v) => updateSocial(i, "url", v)} />
            </div>
          </CMSListItem>
        ))}
        <CMSAddButton label="Tambah Social Link" onClick={() => update("socialLinks", [...g.socialLinks, { platform: "", url: "" }])} />
      </CMSSection>

      <CMSSection title="Mode Website">
        <CMSToggle
          label="Mode Maintenance"
          description={g.maintenanceMode
            ? "Saat aktif, seluruh halaman public web akan menampilkan halaman pemeliharaan."
            : maintenancePending
              ? "Menunggu konfirmasi aktivasi agar tidak terpicu secara tidak sengaja."
              : "Aktifkan untuk menonaktifkan website sementara."}
          checked={g.maintenanceMode || maintenancePending}
          onChange={handleMaintenanceToggle}
        />

        <div className={`rounded-2xl border px-4 py-4 ${g.maintenanceMode ? "border-orange-500/20 bg-orange-500/10" : "border-white/10 bg-white/[0.03]"}`}>
          <div className="flex flex-wrap items-center gap-3">
            <Badge className={g.maintenanceMode ? "border-orange-500/30 bg-orange-500/10 text-orange-300" : "border-green-500/30 bg-green-500/10 text-green-300"}>
              {g.maintenanceMode ? "Sedang maintenance" : "Website live"}
            </Badge>
            <p className="text-sm text-zinc-300">
              {g.maintenanceMode
                ? "Pengunjung public web sedang diarahkan ke halaman maintenance."
                : "Public web masih dapat diakses normal oleh pengunjung."}
            </p>
          </div>
        </div>

        {maintenancePending && !g.maintenanceMode ? (
          <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-2 text-yellow-300">
                <ShieldAlert className="h-4 w-4" />
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <p className="text-sm font-semibold text-white">Konfirmasi aktivasi maintenance mode</p>
                  <p className="mt-1 text-sm leading-6 text-zinc-300">
                    Ketik <span className="font-semibold text-yellow-300">MAINTENANCE</span> untuk mengaktifkan mode ini. Setelah tersimpan, seluruh halaman public web akan dialihkan ke halaman maintenance.
                  </p>
                </div>

                <CMSInput
                  label="Ketik konfirmasi"
                  value={maintenanceConfirmation}
                  onChange={setMaintenanceConfirmation}
                  placeholder="MAINTENANCE"
                />

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    className="bg-yellow-500 text-black hover:bg-yellow-400"
                    onClick={confirmMaintenanceActivation}
                  >
                    Aktifkan Maintenance
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-white/15 bg-transparent text-zinc-300 hover:bg-white/5 hover:text-white"
                    onClick={() => {
                      setMaintenancePending(false);
                      setMaintenanceConfirmation("");
                    }}
                  >
                    Batal
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </CMSSection>
    </div>
  );
}
