import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowRight, Calendar, Loader2, Mail, MapPin, Phone, User } from "lucide-react";
import { authAPI } from "../../services/api";
import { buildDashboardBridgeUrl, clearUserSession, setUserSession } from "../../lib/session";

export function GoogleCompleteProfilePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<any>(null);
  const [form, setForm] = useState({
    phone: "",
    birthDate: "",
    address: "",
    province: "",
    city: "",
    district: "",
    village: "",
    referralSource: "google",
    referralOther: "",
  });

  useEffect(() => {
    let active = true;
    const bootstrap = async () => {
      try {
        const sessionState = await authAPI.getSession();
        if (!sessionState?.authenticated) {
          clearUserSession();
          navigate("/login", { replace: true });
          return;
        }
        const me = sessionState?.viewer || null;
        if (!active) return;
        if (me?.onboardingCompleted) {
          window.location.href = buildDashboardBridgeUrl("", "/dashboard");
          return;
        }
        setProfile(me);
      } catch {
        clearUserSession();
        navigate("/login", { replace: true });
      } finally {
        if (active) setLoading(false);
      }
    };
    void bootstrap();
    return () => { active = false; };
  }, [navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await authAPI.completeGoogleProfile(form);
      setUserSession(null, response?.user || null);
      window.location.href = buildDashboardBridgeUrl("", "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Belum bisa menyimpan profil Google.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4 text-white">
        <Loader2 className="h-5 w-5 animate-spin text-yellow-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-16">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div className="rounded-2xl border border-white/10 bg-[#18181b] p-6 sm:p-8">
          <div className="mb-8">
            <div className="mb-1 inline-block rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-xs text-yellow-500">
              PROFIL GOOGLE
            </div>
            <h1 className="mt-3 text-2xl font-extrabold text-white sm:text-3xl">Lengkapi Profil Anda</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Kami sudah menyimpan akun Google Anda. Lengkapi data berikut agar dashboard NEWME bisa dipakai penuh.
            </p>
          </div>

          <div className="mb-6 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-300">
            <p className="flex items-center gap-2"><User className="h-4 w-4 text-yellow-500" /> {profile?.fullName || "Google User"}</p>
            <p className="mt-2 flex items-center gap-2"><Mail className="h-4 w-4 text-yellow-500" /> {profile?.email}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm text-zinc-400">
                Nomor HP / WhatsApp
                <div className="relative mt-1.5">
                  <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-10 pr-4 text-sm text-white outline-none focus:border-yellow-500/50" required />
                </div>
              </label>
              <label className="text-sm text-zinc-400">
                Tanggal Lahir
                <div className="relative mt-1.5">
                  <Calendar className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input type="date" value={form.birthDate} onChange={(e) => setForm((prev) => ({ ...prev, birthDate: e.target.value }))} className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-10 pr-4 text-sm text-white outline-none focus:border-yellow-500/50" required />
                </div>
              </label>
              <label className="text-sm text-zinc-400">
                Provinsi
                <input value={form.province} onChange={(e) => setForm((prev) => ({ ...prev, province: e.target.value }))} className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-yellow-500/50" required />
              </label>
              <label className="text-sm text-zinc-400">
                Kota / Kabupaten
                <input value={form.city} onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))} className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-yellow-500/50" required />
              </label>
              <label className="text-sm text-zinc-400">
                Kecamatan
                <input value={form.district} onChange={(e) => setForm((prev) => ({ ...prev, district: e.target.value }))} className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-yellow-500/50" required />
              </label>
              <label className="text-sm text-zinc-400">
                Kelurahan / Desa
                <input value={form.village} onChange={(e) => setForm((prev) => ({ ...prev, village: e.target.value }))} className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-yellow-500/50" />
              </label>
            </div>

            <label className="text-sm text-zinc-400">
              Alamat Lengkap
              <div className="relative mt-1.5">
                <MapPin className="absolute left-3.5 top-4 h-4 w-4 text-zinc-500" />
                <textarea value={form.address} onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))} className="min-h-[96px] w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-10 pr-4 text-sm text-white outline-none focus:border-yellow-500/50" required />
              </div>
            </label>

            <label className="text-sm text-zinc-400">
              Mengetahui NEWME dari mana
              <input value={form.referralSource} onChange={(e) => setForm((prev) => ({ ...prev, referralSource: e.target.value }))} className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-yellow-500/50" required />
            </label>

            <label className="text-sm text-zinc-400">
              Keterangan Tambahan Sumber
              <input value={form.referralOther} onChange={(e) => setForm((prev) => ({ ...prev, referralOther: e.target.value }))} className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-yellow-500/50" />
            </label>

            {error ? <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div> : null}

            <button type="submit" disabled={submitting} className="flex w-full items-center justify-center rounded-xl bg-yellow-500 py-3 text-sm font-semibold text-black transition hover:bg-yellow-400 disabled:opacity-70">
              {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Menyimpan profil...</> : <>Simpan dan Lanjut ke Dashboard <ArrowRight className="ml-1 h-4 w-4" /></>}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-500">
            <Link to="/login" className="text-yellow-500 hover:text-yellow-400">Kembali ke login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
