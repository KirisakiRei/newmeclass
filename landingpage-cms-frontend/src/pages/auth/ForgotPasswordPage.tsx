import { useState } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { ArrowRight, Loader2, Mail } from "lucide-react";
import { Button } from "../../app/components/ui/button";
import { authAPI } from "../../services/api";
import newmeLogo from "../../assets/585f88d5e9a2256caa217475b070012672c11723.png";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      setLoading(true);
      await authAPI.forgotPassword(email);
      setSuccess("Jika email Anda terdaftar, kami akan mengirimkan tautan reset password.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memproses permintaan reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-6 pt-16">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md rounded-3xl border border-white/10 bg-[#18181b] p-6 sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 h-16 w-16">
            <img src={newmeLogo} alt="NEWME" className="h-full w-full object-contain" style={{ mixBlendMode: "screen" }} />
          </div>
          <p className="mb-1 inline-block rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-xs text-yellow-500">RESET PASSWORD</p>
          <h1 className="mt-3 mb-2 text-2xl font-extrabold text-white">Lupa Password</h1>
          <p className="text-sm leading-7 text-zinc-400">Masukkan email akun Anda. Kami akan mengirimkan tautan untuk membuat password baru.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-zinc-400">Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-10 pr-4 text-sm text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-yellow-500/50 focus:bg-white/[0.06]"
                placeholder="email@contoh.com"
              />
            </div>
          </div>

          {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}
          {success && <div className="rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-200">{success}</div>}

          <Button type="submit" disabled={loading} className="w-full bg-yellow-500 py-5 text-black hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-70">
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Memproses...</> : <>Kirim Link Reset <ArrowRight className="ml-1 h-4 w-4" /></>}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Ingat password Anda?{" "}
          <Link to="/login" className="text-yellow-500 transition-colors hover:text-yellow-400">
            Kembali ke login
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
