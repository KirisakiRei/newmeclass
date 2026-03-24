import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight, Phone, Mail } from "lucide-react";
import { Button } from "./ui/button";
import { Link } from "react-router";
import { useCMS } from "./cms/CMSContext";

export function HeroCarousel() {
  const { data } = useCMS();
  const slides = data.hero;
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => setCurrent((c) => (c + 1) % slides.length), [slides.length]);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + slides.length) % slides.length), [slides.length]);

  useEffect(() => {
    if (slides.length === 0) return;
    const id = setInterval(next, 6000);
    return () => clearInterval(id);
  }, [next, slides.length]);

  if (slides.length === 0) return null;
  const slide = slides[Math.min(current, slides.length - 1)];

  return (
    <section className="relative min-h-screen overflow-hidden bg-[#0a0a0a]">
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0"
        >
          {slide.image && (
            <img src={slide.image} alt="" className="h-full w-full object-cover opacity-30" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent" />
        </motion.div>
      </AnimatePresence>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-6 pt-16">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl"
          >
            <p className="mb-4 text-sm tracking-[0.2em] text-yellow-500" style={{ fontWeight: 500 }}>
              {slide.subtitle}
            </p>
            <h1 className="mb-6 text-5xl text-white sm:text-7xl" style={{ fontWeight: 800, lineHeight: 1.1 }}>
              {slide.title}
            </h1>
            <p className="mb-10 max-w-lg text-lg text-zinc-400" style={{ lineHeight: 1.7 }}>
              {slide.desc}
            </p>
            <div className="flex flex-wrap gap-4">
              <Button className="bg-yellow-500 px-8 py-6 text-black hover:bg-yellow-400" asChild>
                <Link to={slide.ctaLink || "/services"}>{slide.ctaText || "Mulai Sekarang"}</Link>
              </Button>
              <Button
                variant="outline"
                className="border-white/20 bg-transparent px-8 py-6 text-white hover:bg-white/5 hover:text-yellow-500"
                asChild
              >
                <Link to="/company-profile">Pelajari Lebih</Link>
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Bottom bar */}
        <div className="absolute bottom-8 left-4 right-4 sm:left-6 sm:right-6">
          <div className="mb-6 flex flex-col gap-2 rounded-xl border border-yellow-500/20 bg-[#18181b]/80 px-4 py-3 backdrop-blur-md sm:flex-row sm:items-center sm:gap-6 sm:px-6 sm:py-3 sm:w-fit">
            <a href={`tel:${data.global.phone.replace(/\s|-/g, "")}`} className="flex items-center gap-2 text-xs text-yellow-500 transition-colors hover:text-yellow-400 sm:text-sm">
              <Phone className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" /> <span>{data.global.phone}</span>
            </a>
            <div className="hidden sm:block h-4 w-px bg-white/10" />
            <a href={`mailto:${data.global.email}`} className="flex items-center gap-2 text-xs text-yellow-500 transition-colors hover:text-yellow-400 sm:text-sm">
              <Mail className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" /> <span>{data.global.email}</span>
            </a>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {slides.map((_, i) => (
                <button key={i} onClick={() => setCurrent(i)} className="group flex items-center gap-2">
                  <div className="h-1 overflow-hidden rounded-full bg-white/20" style={{ width: i === current ? 48 : 24, transition: "width 0.3s" }}>
                    {i === current && (
                      <motion.div
                        className="h-full rounded-full bg-yellow-500"
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 6 }}
                      />
                    )}
                  </div>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button onClick={prev} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white transition-colors hover:border-yellow-500 hover:text-yellow-500">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={next} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white transition-colors hover:border-yellow-500 hover:text-yellow-500">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
