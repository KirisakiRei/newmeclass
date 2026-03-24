import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Star, Quote, ChevronLeft, ChevronRight } from "lucide-react";
import { useCMS } from "./cms/CMSContext";

export function TestimonialSlider() {
  const { data } = useCMS();
  const testimonials = data.testimonials;
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (testimonials.length === 0) return;
    const id = setInterval(() => setCurrent((c) => (c + 1) % testimonials.length), 7000);
    return () => clearInterval(id);
  }, [testimonials.length]);

  if (testimonials.length === 0) return null;
  const t = testimonials[Math.min(current, testimonials.length - 1)];

  return (
    <section className="bg-[#0a0a0a] py-24">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <p className="mb-3 text-sm tracking-[0.15em] text-yellow-500" style={{ fontWeight: 500 }}>TESTIMONI</p>
          <h2 className="text-3xl text-white sm:text-4xl" style={{ fontWeight: 700 }}>
            Kata Mereka Tentang Kami
          </h2>
        </motion.div>

        <div className="relative mx-auto max-w-4xl">
          <div className="absolute -top-6 left-0 opacity-10">
            <Quote className="h-24 w-24 text-yellow-500" />
          </div>

          <div className="relative min-h-[320px] overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#18181b] to-[#1a1a1f] p-8 sm:p-12">
            <div className="absolute top-0 left-0 h-full w-1 bg-gradient-to-b from-yellow-400 to-yellow-600" />

            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col"
              >
                <div className="mb-6 flex gap-1.5">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="h-5 w-5 fill-yellow-500 text-yellow-500" />
                  ))}
                </div>

                <blockquote className="mb-10 text-lg text-zinc-200 sm:text-xl" style={{ lineHeight: 1.8, fontWeight: 400 }}>
                  "{t.text}"
                </blockquote>

                <div className="flex items-center gap-4">
                  {t.avatar && t.avatar.startsWith("http") ? (
                    <img src={t.avatar} alt={t.name} className="h-14 w-14 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-yellow-500 to-yellow-600 text-lg text-black" style={{ fontWeight: 700 }}>
                      {t.avatar || t.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-white" style={{ fontWeight: 600 }}>{t.name}</p>
                    <p className="text-sm text-yellow-500/70">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-8 flex items-center justify-center gap-6">
            <button
              onClick={() => setCurrent((c) => (c - 1 + testimonials.length) % testimonials.length)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-zinc-400 transition-colors hover:border-yellow-500 hover:text-yellow-500"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`h-2 rounded-full transition-all duration-300 ${i === current ? "w-8 bg-yellow-500" : "w-2 bg-white/20 hover:bg-white/40"}`}
                />
              ))}
            </div>

            <button
              onClick={() => setCurrent((c) => (c + 1) % testimonials.length)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-zinc-400 transition-colors hover:border-yellow-500 hover:text-yellow-500"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
