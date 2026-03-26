import { motion } from "motion/react";
import { Badge } from "../../app/components/ui/badge";
import { Link } from "react-router";
import { Mail, MapPin, Phone, Shield } from "lucide-react";
import { useCMS } from "../../app/components/cms/CMSContext";
import newmeLogo from "../../assets/585f88d5e9a2256caa217475b070012672c11723.png";

export function PrivacyPolicyPage() {
  const { data } = useCMS();
  const sections = data.privacyPolicy.sections || [];

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-16">
      <section className="relative overflow-hidden border-b border-white/8 py-16">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(234,179,8,1) 1px, transparent 1px), linear-gradient(90deg, rgba(234,179,8,1) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />
        <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-4 flex justify-center">
              <div className="relative h-16 w-16">
                <div className="absolute inset-0 rounded-full bg-yellow-500/15 blur-lg" />
                <img src={newmeLogo} alt="NEWME Logo" className="relative h-full w-full object-contain" style={{ mixBlendMode: "screen" }} />
              </div>
            </div>
            <Badge className="mb-4 border-yellow-500/30 bg-yellow-500/10 text-yellow-500">LEGAL</Badge>
            <h1 className="mb-3 text-3xl text-white sm:text-5xl" style={{ fontWeight: 800 }}>
              Kebijakan <span className="text-yellow-500">Privasi</span>
            </h1>
            <p className="mx-auto max-w-2xl text-sm leading-8 text-zinc-400 sm:text-base">
              Kami menjaga informasi pribadi Anda dengan serius. Halaman ini menjelaskan bagaimana data Anda digunakan dan dilindungi.
            </p>
            <p className="mt-4 text-xs tracking-[0.18em] text-zinc-500">
              TERAKHIR DIPERBARUI {String(data.privacyPolicy.lastUpdated || "").toUpperCase()}
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-white/10 bg-[#18181b] p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/10">
                  <Shield className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-white" style={{ fontWeight: 700 }}>Ringkasan Kontak</p>
                  <p className="text-xs text-zinc-500">Hubungi kami jika ada pertanyaan privasi.</p>
                </div>
              </div>
              <div className="space-y-3 text-sm text-zinc-400">
                <a href={`mailto:${data.global.email}`} className="flex items-start gap-2 transition-colors hover:text-yellow-500">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
                  {data.global.email}
                </a>
                <a href={`tel:${String(data.global.phone || "").replace(/[^\d+]/g, "")}`} className="flex items-start gap-2 transition-colors hover:text-yellow-500">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
                  {data.global.phone}
                </a>
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
                  {data.global.address}
                </div>
              </div>
              <div className="mt-6 border-t border-white/10 pt-4">
                <Link to="/contact" className="text-sm text-yellow-500 transition-colors hover:text-yellow-400">
                  Butuh bantuan? Hubungi tim kami
                </Link>
              </div>
            </div>
          </aside>

          <div className="space-y-5">
            {sections.map((section, index) => (
              <motion.article
                key={section.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.04 }}
                className="rounded-2xl border border-white/10 bg-[#18181b] p-5 sm:p-7"
              >
                <div className="mb-4 flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-yellow-500/20 bg-yellow-500/10 text-sm text-yellow-500" style={{ fontWeight: 700 }}>
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <div>
                    <h2 className="text-xl text-white" style={{ fontWeight: 700 }}>{section.title}</h2>
                    <p className="mt-2 whitespace-pre-line text-sm leading-8 text-zinc-400">{section.content}</p>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
