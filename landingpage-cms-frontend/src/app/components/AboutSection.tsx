import { motion } from "motion/react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { useCMS } from "./cms/CMSContext";

export function AboutSection() {
  const { data } = useCMS();
  const { badge, title, description, stats, image } = data.about;

  return (
    <section className="bg-[#0a0a0a] py-24">
      <div className="mx-auto grid max-w-7xl gap-16 px-6 lg:grid-cols-2 lg:items-center">
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="mb-3 text-sm tracking-[0.15em] text-yellow-500" style={{ fontWeight: 500 }}>{badge}</p>
          <h2 className="mb-6 text-3xl text-white sm:text-4xl" style={{ fontWeight: 700, lineHeight: 1.2 }}>
            {title}
          </h2>
          <p className="mb-8 text-zinc-400" style={{ lineHeight: 1.8 }}>
            {description}
          </p>

          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <p className="text-2xl text-yellow-500" style={{ fontWeight: 700 }}>{s.value}</p>
                <p className="text-sm text-zinc-400">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative"
        >
          <div className="absolute -inset-4 rounded-2xl bg-yellow-500/10 blur-3xl" />
          <ImageWithFallback
            src={image}
            alt="Team"
            className="relative w-full rounded-2xl border border-white/10 object-cover"
          />
        </motion.div>
      </div>
    </section>
  );
}
