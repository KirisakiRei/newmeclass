import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { ArrowRight, Eye, EyeOff, Loader2, Lock, UserCircle2 } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Button } from "../../app/components/ui/button";
import { adminAuthAPI } from "../../services/api";
import { clearAdminSession, setAdminSession } from "../../lib/session";
import newmeLogo from "../../assets/585f88d5e9a2256caa217475b070012672c11723.png";
import { SeoHead } from "../../app/components/SeoHead";

const hasCmsPermission = (permissionKeys: string[] = []) =>
  permissionKeys.includes("cms_access.manage");

type LoginFeedback = {
  title: string;
  description: string;
};

const resolveCmsLoginFeedback = (error: unknown): LoginFeedback => {
  const status = Number(
    (error as { status?: number })?.status
    || (error as { payload?: { statusCode?: number } })?.payload?.statusCode
    || 0,
  );
  const message = String(
    (error as { message?: string })?.message
    || (error as { payload?: { message?: string; error?: string } })?.payload?.message
    || (error as { payload?: { message?: string; error?: string } })?.payload?.error
    || "",
  ).trim();

  if (status === 429) {
    return {
      title: "Terlalu banyak percobaan login",
      description: "Tunggu sebentar sebelum mencoba lagi agar akses CMS tetap aman.",
    };
  }

  if (status === 403 || /izin|forbidden|access/i.test(message)) {
    return {
      title: "Akses CMS belum diaktifkan",
      description: "Akun admin ini belum diberi permission untuk mengelola Landing CMS.",
    };
  }

  if (status === 401 || /invalid credentials/i.test(message)) {
    return {
      title: "Login belum berhasil",
      description: "Periksa kembali username atau email admin beserta password yang digunakan.",
    };
  }

  if (status >= 500) {
    return {
      title: "Server sedang sibuk",
      description: "Landing CMS belum bisa diakses saat ini. Coba lagi beberapa saat lagi.",
    };
  }

  return {
    title: "Belum bisa masuk ke CMS",
    description: message || "Terjadi kendala saat memproses login admin. Silakan coba lagi.",
  };
};

export function CMSLoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ username: "", password: "" });
  const deniedToastShownRef = useRef(false);

  const next = String(searchParams.get("next") || "/cms").trim() || "/cms";
  const deniedReason = String(searchParams.get("reason") || "").trim();

  useEffect(() => {
    if (deniedReason === "forbidden" && !deniedToastShownRef.current) {
      deniedToastShownRef.current = true;
      const feedback = resolveCmsLoginFeedback({ status: 403 });
      toast.error(feedback.title, { description: feedback.description });
    }
  }, [deniedReason]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      clearAdminSession();
      const response = await adminAuthAPI.login({
        username: form.username,
        password: form.password,
      });
      const token = response?.token || response?.access_token;
      const admin = response?.admin || response?.user || null;
      if (!token || !admin) {
        throw new Error("Data login admin tidak lengkap");
      }
      if (!hasCmsPermission(admin?.permissionKeys || [])) {
        const permissionError = new Error("CMS access is forbidden");
        (permissionError as Error & { status?: number }).status = 403;
        throw permissionError;
      }
      setAdminSession(token, admin);
      navigate(next, { replace: true });
    } catch (err) {
      const feedback = resolveCmsLoginFeedback(err);
      toast.error(feedback.title, { description: feedback.description });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SeoHead />
      <div className="relative flex h-[100dvh] overflow-hidden bg-[#0a0a0a]">
        <div className="relative hidden h-full w-[46%] overflow-hidden lg:flex">
        <img
          src="https://images.unsplash.com/photo-1694702722584-05adc8802e28?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBvZmZpY2UlMjBidWlsZGluZyUyMGV4dGVyaW9yfGVufDF8fHx8MTc3NDE5NTQ5NHww&ixlib=rb-4.1.0&q=80&w=1080"
          alt="CMS visual"
          className="h-full w-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/50 via-[#0a0a0a]/70 to-[#0a0a0a]" />
        <div className="absolute inset-0 flex flex-col items-center justify-center px-12 text-center">
          <div className="mb-6 h-32 w-32">
            <img src={newmeLogo} alt="NEWME" className="h-full w-full object-contain" style={{ mixBlendMode: "screen" }} />
          </div>
          <p className="mb-2 text-xs tracking-[0.35em] text-yellow-500">NEWME CMS</p>
          <h2 className="mb-2 text-4xl font-extrabold text-white">CONTENT MANAGEMENT</h2>
          <h2 className="mb-2 text-4xl font-extrabold text-white">SYSTEM</h2>
          {/* <p className="max-w-sm text-sm leading-7 text-zinc-400">
            Masuk dengan akun admin untuk mengelola halaman publik NEWME tanpa mengganggu dashboard operasional utama.
          </p> */}
        </div>
      </div>

        <div className="box-border flex h-full flex-1 items-start justify-center px-6 pt-6 pb-6 sm:px-8 sm:pt-8 sm:pb-8 lg:items-center lg:px-10 lg:py-8">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-sm lg:-mt-8"
          >
            <div className="mb-4 flex flex-col items-center lg:hidden">
              <div className="mb-3 h-20 w-20">
                <img src={newmeLogo} alt="NEWME" className="h-full w-full object-contain" style={{ mixBlendMode: "screen" }} />
              </div>
              <p className="text-lg font-extrabold text-white">NEWME <span className="text-yellow-500">CMS</span></p>
              <p className="text-xs italic text-zinc-500">Landing page management</p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#18181b] p-6 sm:p-8">
              <div className="mb-6 text-center lg:text-left">
                <div className="mb-1 inline-block rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-xs text-yellow-500">
                  LOGIN CMS
                </div>
                <h1 className="mt-3 mb-2 text-2xl font-extrabold text-white sm:text-3xl">Masuk ke Landing CMS</h1>
                <p className="text-sm text-zinc-400">
                  Gunakan akun admin yang memiliki izin CMS.{" "}
                  <Link to="/" className="text-yellow-500 transition-colors hover:text-yellow-400">
                    Kembali ke website
                  </Link>
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm text-zinc-400">Username / Email Admin</label>
                  <div className="relative">
                    <UserCircle2 className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <input
                      value={form.username}
                      onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-10 pr-4 text-sm text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-yellow-500/50 focus:bg-white/[0.06]"
                      placeholder="Masukkan username atau email admin"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm text-zinc-400">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <input
                      type={show ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-10 pr-11 text-sm text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-yellow-500/50 focus:bg-white/[0.06]"
                      placeholder="Masukkan password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShow((prev) => !prev)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors hover:text-zinc-300"
                    >
                      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full bg-yellow-500 py-5 text-black hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-70">
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Memproses...</> : <>Masuk<ArrowRight className="ml-1 h-4 w-4" /></>}
                </Button>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
