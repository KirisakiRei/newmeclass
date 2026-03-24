import { useState } from "react";
import { motion } from "motion/react";
import { Link } from "react-router";
import { Eye, EyeOff, Mail, Lock, ArrowRight } from "lucide-react";
import { Button } from "../ui/button";
import { authAPI } from "../../../services/api";
import { buildDashboardBridgeUrl, setUserSession } from "../../../lib/session";
import newmeLogo from "../../../assets/585f88d5e9a2256caa217475b070012672c11723.png";

export function LoginPage() {
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      const response = await authAPI.login({
        email: form.email,
        password: form.password,
      });
      const token = response?.token || response?.access_token;
      if (!token) {
        throw new Error("Token login tidak ditemukan");
      }
      setUserSession(token, response?.user || null);
      const bridge = await authAPI.createBridgeTicket("/dashboard");
      const ticket = String(bridge?.ticket || "").trim();
      if (!ticket) {
        throw new Error("Bridge ticket login tidak ditemukan");
      }
      window.location.href = buildDashboardBridgeUrl(ticket, "/dashboard");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal masuk ke akun";
      setError(message);
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
                <Link
                  to="/forgot-password"
                  className="text-xs text-zinc-500 transition-colors hover:text-yellow-500"
                >
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

            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-yellow-500 py-5 text-black hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-70"
              style={{ fontWeight: 600 }}
            >
              {loading ? "Memproses..." : <>Masuk <ArrowRight className="ml-1 h-4 w-4" /></>}
            </Button>

            {/* Divider */}
            <div className="relative flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs text-zinc-600">atau masuk dengan</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            {/* Google OAuth (mock) */}
            <button
              type="button"
              onClick={() => {
                window.location.href = "/contact";
              }}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] py-3 text-sm text-zinc-300 transition-colors hover:border-white/20 hover:bg-white/[0.06]"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M5.26620003,9.76452941 C6.19878754,6.93863203 8.85444915,4.90909091 12,4.90909091 C13.6909091,4.90909091 15.2181818,5.50909091 16.4181818,6.49090909 L19.9090909,3 C17.7818182,1.14545455 15.0545455,0 12,0 C7.27006974,0 3.1977497,2.69829785 1.23999023,6.65002441 L5.26620003,9.76452941 Z" />
                <path fill="#34A853" d="M16.0407269,18.0125889 C14.9509167,18.7163016 13.5660892,19.0909091 12,19.0909091 C8.86648613,19.0909091 6.21911939,17.076871 5.27698177,14.2678769 L1.23746264,17.3349879 C3.19279051,21.2936293 7.26500293,24 12,24 C14.9328362,24 17.7353462,22.9573905 19.834192,20.9995801 L16.0407269,18.0125889 Z" />
                <path fill="#4A90E2" d="M19.834192,20.9995801 C22.0291676,18.9520994 23.4545455,15.903663 23.4545455,12 C23.4545455,11.2909091 23.3454545,10.5272727 23.1818182,9.81818182 L12,9.81818182 L12,14.4545455 L18.4363636,14.4545455 C18.1187732,16.013626 17.2662994,17.2212117 16.0407269,18.0125889 L19.834192,20.9995801 Z" />
                <path fill="#FBBC05" d="M5.27698177,14.2678769 C5.03832634,13.556323 4.90909091,12.7937589 4.90909091,12 C4.90909091,11.2182781 5.03443647,10.4668121 5.26620003,9.76452941 L1.23999023,6.65002441 C0.43658717,8.26043162 0,10.0753848 0,12 C0,13.9195484 0.444780743,15.7301709 1.23746264,17.3349879 L5.27698177,14.2678769 Z" />
              </svg>
              Butuh bantuan login?
            </button>
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
