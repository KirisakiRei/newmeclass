import { motion } from "motion/react";
import { Eye, Target } from "lucide-react";
import { useCMS } from "./cms/CMSContext";

function GoldDivider() {
  return (
    <div className="flex items-center justify-center gap-3 py-4">
      <div className="h-px w-24 bg-gradient-to-r from-transparent to-yellow-500/50" />
      <div className="h-1 w-1 rounded-full bg-yellow-500" />
      <div className="h-1.5 w-1.5 rounded-full bg-yellow-500/70" />
      <div className="h-1 w-1 rounded-full bg-yellow-500" />
      <div className="h-px w-24 bg-gradient-to-l from-transparent to-yellow-500/50" />
    </div>
  );
}

export function VisiMisiSection() {
  const { data } = useCMS();
  const { visi, misi } = data.visiMisi;

  return (
    <section className="relative overflow-hidden bg-[#0a0a0a] py-28">
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `linear-gradient(rgba(234,179,8,1) 1px, transparent 1px), linear-gradient(90deg, rgba(234,179,8,1) 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />
      <div className="absolute top-0 left-1/2 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-500/6 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 h-[400px] w-[600px] -translate-x-1/2 translate-y-1/2 rounded-full bg-yellow-500/4 blur-3xl pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-5xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20 text-center"
        >
          <p className="mb-3 text-sm tracking-[0.25em] text-yellow-500" style={{ fontWeight: 500 }}>
            MANIFESTO
          </p>
          <h2 className="text-4xl text-white sm:text-5xl" style={{ fontWeight: 800, lineHeight: 1.1 }}>
            Visi & Misi Kami
          </h2>
        </motion.div>

        {/* VISI */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mb-24 flex flex-col items-center text-center"
        >
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-yellow-500/10 ring-1 ring-yellow-500/25">
            <Eye className="h-6 w-6 text-yellow-500" />
          </div>
          <h3 className="mb-1 tracking-[0.2em] text-yellow-500" style={{ fontWeight: 600 }}>VISI</h3>
          <GoldDivider />
          <p className="mt-6 max-w-3xl text-xl text-zinc-200 sm:text-2xl" style={{ lineHeight: 1.85, fontWeight: 300 }}>
            {/* Highlight "terdepan di Indonesia" or similar phrase */}
            {visi.split("terdepan di Indonesia").length > 1 ? (
              <>
                {visi.split("terdepan di Indonesia")[0]}
                <span className="text-yellow-400" style={{ fontWeight: 600 }}>terdepan di Indonesia</span>
                {visi.split("terdepan di Indonesia")[1]}
              </>
            ) : visi}
          </p>
        </motion.div>

        {/* Separator */}
        <div className="mb-24 flex items-center gap-6">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-white/10" />
          <div className="h-px w-12 bg-yellow-500/40" />
          <div className="h-px flex-1 bg-gradient-to-l from-transparent via-white/10 to-white/10" />
        </div>

        {/* MISI */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <div className="mb-14 flex flex-col items-center text-center">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-yellow-500/10 ring-1 ring-yellow-500/25">
              <Target className="h-6 w-6 text-yellow-500" />
            </div>
            <h3 className="mb-1 tracking-[0.2em] text-yellow-500" style={{ fontWeight: 600 }}>MISI</h3>
            <GoldDivider />
          </div>

          <div className="mx-auto max-w-3xl">
            {misi.map((point, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="group flex gap-6 border-b border-white/[0.07] py-7 last:border-0 transition-colors hover:border-yellow-500/20"
              >
                <span
                  className="shrink-0 text-4xl text-yellow-500/20 transition-colors group-hover:text-yellow-500/40"
                  style={{ fontWeight: 800, lineHeight: 1, letterSpacing: "-0.02em" }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="self-center text-zinc-300 transition-colors group-hover:text-zinc-200" style={{ lineHeight: 1.8 }}>
                  {point}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
