import { motion } from "motion/react";
import { Button } from "./ui/button";
import { Link } from "react-router";
import { ShieldCheck, Award, Users } from "lucide-react";
import newmeLogo from "../../assets/585f88d5e9a2256caa217475b070012672c11723.png";
import { useCMS } from "./cms/CMSContext";
import { resolveBackendAssetUrl } from "../../lib/public-url";

export function FinalCTA() {
  const { data } = useCMS();
  const { title, subtitle, ctaText, ctaLink } = data.finalCta;
  const logoSrc = resolveBackendAssetUrl(data.global.logoUrl, newmeLogo);

  // Split title at "Potensi" to highlight the last part
  const highlightWord = title.includes("Potensi") ? "Potensi" : title.split(" ").slice(-2).join(" ");
  const beforeHighlight = title.substring(0, title.lastIndexOf(highlightWord));
  const afterHighlight = title.substring(title.lastIndexOf(highlightWord) + highlightWord.length);

  return (
    <section className="relative bg-[#0a0a0a] py-24 overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-yellow-500/20 to-transparent" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-500/5 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="relative mx-auto max-w-2xl px-6 text-center"
      >
        {/* Logo */}
        <div className="mb-5 flex justify-center">
          <div className="relative h-20 w-20">
            <div className="absolute inset-0 rounded-full bg-yellow-500/15 blur-xl" />
            <img
              src={logoSrc}
              alt="NEWME Logo"
              className="relative h-full w-full object-contain drop-shadow-[0_0_16px_rgba(234,179,8,0.2)]"
              style={{ mixBlendMode: "screen" }}
            />
          </div>
        </div>

        <p className="mb-4 text-sm tracking-[0.2em] text-yellow-500" style={{ fontWeight: 500 }}>
          {data.global.siteName}
        </p>

        <h2 className="mb-6 text-3xl text-white sm:text-5xl" style={{ fontWeight: 800, lineHeight: 1.1 }}>
          {beforeHighlight}
          <span className="bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
            {highlightWord}
          </span>
          {afterHighlight}
        </h2>
        <p className="mb-10 text-zinc-400" style={{ lineHeight: 1.7 }}>
          {subtitle}
        </p>

        <Button className="mb-8 bg-yellow-500 px-12 py-6 text-lg text-black hover:bg-yellow-400" asChild>
          <Link to={ctaLink}>{ctaText}</Link>
        </Button>

        <div className="flex flex-wrap justify-center gap-6 text-xs text-zinc-500 sm:gap-8">
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-yellow-500/50" /> Data Aman & Terenkripsi
          </span>
          <span className="flex items-center gap-2">
            <Award className="h-4 w-4 text-yellow-500/50" /> Bersertifikasi Resmi
          </span>
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4 text-yellow-500/50" /> {data.about.stats.find(s => s.label === "Peserta")?.value ?? "5000+"} Peserta
          </span>
        </div>
      </motion.div>
    </section>
  );
}
