import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Link, useNavigate } from "react-router";
import { Eye, EyeOff, Mail, Lock, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../app/components/ui/button";
import { getApiErrorCode, getApiErrorMessage, getApiErrorStatus } from "../../services/api-error";
import { authAPI } from "../../services/api";
import { buildDashboardBridgeUrl, clearUserSession, setUserSession } from "../../lib/session";
import newmeLogo from "../../assets/585f88d5e9a2256caa217475b070012672c11723.png";

type LoginFeedback = {
  title: string;
  description: string;
};

const resolveUserLoginFeedback = (error: unknown): LoginFeedback => {
  const status = getApiErrorStatus(error);
  const code = getApiErrorCode(error);
  const message = getApiErrorMessage(error, "").trim();

  if (status === 429) {
    return {
      title: "Terlalu banyak percobaan login",
      description: "Tunggu sebentar lalu coba lagi agar akun Anda tetap aman.",
    };
  }

  if (code === "AUTH_INVALID_CREDENTIALS" || status === 401 || /invalid credentials|email atau password|unauthorized/i.test(message)) {
    return {
      title: "Email atau password belum sesuai",
      description: "Periksa kembali email dan password Anda, lalu coba masuk lagi.",
    };
  }

  if (code === "AUTH_PROVIDER_MISMATCH_GOOGLE_ONLY") {
    return {
      title: "Akun terhubung ke Google",
      description: "Silakan masuk menggunakan tombol Login dengan Google untuk email ini.",
    };
  }

  if (code === "AUTH_PROVIDER_MISMATCH_MANUAL_ONLY") {
    return {
      title: "Gunakan email dan password",
      description: "Akun ini tidak menggunakan login Google. Silakan masuk dengan email dan password.",
    };
  }

  if (/bridge ticket|token login/i.test(message)) {
    return {
      title: "Login berhasil, tapi sesi belum tersambung",
      description: "Silakan coba masuk sekali lagi. Jika masih terjadi, beri tahu tim kami.",
    };
  }

  if (status >= 500) {
    return {
      title: "Server sedang sibuk",
      description: "Kami belum bisa memproses login saat ini. Coba lagi beberapa saat lagi.",
    };
  }

  return {
    title: "Belum bisa masuk",
    description: message || "Terjadi kendala saat memproses login. Silakan coba lagi.",
  };
};

export function LoginPage() {
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const bootstrap = async () => {
      try {
        const sessionState = await authAPI.getSession();
        if (!sessionState?.authenticated) {
          clearUserSession();
          return;
        }
        if (!active) return;
        setUserSession(null, sessionState?.viewer || null);
        navigate("/dashboard", { replace: true });
      } catch {
        // Stay on login page when no valid session exists.
      }
    };

    void bootstrap();
    return () => {
      active = false;
    };
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      clearUserSession();
      const response = await authAPI.login({
        email: form.email,
        password: form.password,
      });
      setUserSession(null, response?.user || null);
      window.location.href = buildDashboardBridgeUrl("", "/dashboard");
    } catch (err) {
      const feedback = resolveUserLoginFeedback(err);
      toast.error(feedback.title, {
        description: feedback.description,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="box-border flex h-[100dvh] overflow-hidden bg-[#0a0a0a] pt-16">

      {/* ── Left decorative panel — desktop only ── */}
      <div className="relative hidden w-[45%] overflow-hidden lg:flex">
        <img
          src="https://images.unsplash.com/photo-1647013302881-3f19103fd9f5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwZXJzb25hbGl0eSUyMHBzeWNob2xvZ3klMjBhc3Nlc3NtZW50fGVufDF8fHx8MTc3NDE5Njc4MXww&ixlib=rb-4.1.0&q=80&w=1080"
          alt="Login visual"
          className="h-full w-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/40 via-[#0a0a0a]/70 to-[#0a0a0a]" />

        <div className="absolute inset-0 flex flex-col items-center justify-center px-12 text-center">
          {/* Large logo */}
          <div className="mb-6 h-36 w-36 xl:h-44 xl:w-44">
            <img
              src={newmeLogo}
              alt="NEWME Logo"
              className="h-full w-full object-contain drop-shadow-[0_0_32px_rgba(234,179,8,0.25)]"
              style={{ mixBlendMode: "screen" }}
            />
          </div>

          <p className="mb-1 text-xs tracking-[0.3em] text-yellow-500" style={{ fontWeight: 600 }}>
            PT. MITRA SEMESTA EDUCLASS
          </p>
          <h2 className="mb-2 text-3xl text-white xl:text-4xl" style={{ fontWeight: 800, lineHeight: 1.2 }}>
            NEWME <span className="text-yellow-500">CLASS</span>
          </h2>
          <p className="mb-6 text-sm italic text-zinc-400">Jati dirimu disini</p>

          <div className="h-px w-16 bg-yellow-500/30" />

          <p className="mt-6 max-w-xs text-sm text-zinc-400" style={{ lineHeight: 1.7 }}>
            Bergabung dengan ribuan peserta yang telah mengakselerasi potensi diri bersama kami.
          </p>

          {/* Stats */}
          <div className="mt-8 flex gap-8">
            {[
              { num: "5000+", label: "Peserta" },
              { num: "120+", label: "Sekolah" },
              { num: "6+", label: "Tahun" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-xl text-yellow-500" style={{ fontWeight: 700 }}>{s.num}</p>
                <p className="text-xs text-zinc-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-6 sm:py-8">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm"
        >

          {/* Mobile-only logo */}
          <div className="mb-6 flex flex-col items-center lg:hidden">
            <div className="mb-3 h-20 w-20">
              <img
                src={newmeLogo}
                alt="NEWME Logo"
                className="h-full w-full object-contain"
                style={{ mixBlendMode: "screen" }}
              />
            </div>
            <p className="text-lg text-white" style={{ fontWeight: 800 }}>
              NEWME <span className="text-yellow-500">CLASS</span>
            </p>
            <p className="text-xs italic text-zinc-500">Jati dirimu disini</p>
          </div>

          {/* Header */}
          <div className="mb-8 text-center lg:text-left">
            <div className="mb-1 inline-block rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-xs text-yellow-500" style={{ fontWeight: 500 }}>
              MASUK AKUN
            </div>
            <h1 className="mt-3 mb-2 text-2xl text-white sm:text-3xl" style={{ fontWeight: 800 }}>
              Selamat Datang
            </h1>
            <p className="text-sm text-zinc-400">
              Belum punya akun?{" "}
              <Link
                to="/register"
                className="text-yellow-500 transition-colors hover:text-yellow-400"
                style={{ fontWeight: 500 }}
              >
                Daftar Gratis
              </Link>
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Email */}
            <div>
              <label className="mb-1.5 block text-sm text-zinc-400">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  type="email"
                  required
                  placeholder="Masukkan email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-10 pr-4 text-sm text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-yellow-500/50 focus:bg-white/[0.06]"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm text-zinc-400">Password</label>
                <Link to="/forgot-password" className="text-[11px] text-yellow-500 transition-colors hover:text-yellow-400">
                  Lupa password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  type={show ? "text" : "password"}
                  required
                  placeholder="Masukkan password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-10 pr-11 text-sm text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-yellow-500/50 focus:bg-white/[0.06]"
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors hover:text-zinc-300"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-yellow-500 py-5 text-black hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-70"
              style={{ fontWeight: 600 }}
            >
              {loading ? "Memproses..." : <>Masuk <ArrowRight className="ml-1 h-4 w-4" /></>}
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-zinc-600">
            Dengan masuk, Anda menyetujui{" "}
            <Link
              to="/privacy-policy"
              className="text-zinc-500 transition-colors hover:text-yellow-500"
            >
              Kebijakan Privasi
            </Link>{" "}
            kami.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
