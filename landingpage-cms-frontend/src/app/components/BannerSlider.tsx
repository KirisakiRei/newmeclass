import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "./ui/button";
import { Link } from "react-router";
import { useCMS } from "./cms/CMSContext";

const BG_CLASSES = [
  "from-yellow-600/30 to-transparent",
  "from-yellow-500/20 to-transparent",
  "from-yellow-600/25 to-transparent",
];

export function BannerSlider() {
  const { data } = useCMS();
  const activeBanners = data.banners.filter((b) => b.enabled);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (activeBanners.length === 0) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % activeBanners.length), 5000);
    return () => clearInterval(id);
  }, [activeBanners.length]);

  if (activeBanners.length === 0) return null;
  const b = activeBanners[Math.min(idx, activeBanners.length - 1)];
  const bg = BG_CLASSES[idx % BG_CLASSES.length];

  return (
    <section className="bg-[#0a0a0a] py-12">
      <div className="mx-auto max-w-7xl px-6">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#18181b]">
          <div className={`absolute inset-0 bg-gradient-to-r ${bg}`} />
          <AnimatePresence mode="wait">
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="relative z-10 flex flex-col items-center gap-6 px-8 py-16 text-center"
            >
              <h3 className="text-2xl text-white sm:text-3xl" style={{ fontWeight: 700 }}>
                {b.title}
              </h3>
              {b.subtitle && (
                <p className="text-zinc-400">{b.subtitle}</p>
              )}
              <Button className="bg-yellow-500 px-8 text-black hover:bg-yellow-400" asChild>
                <Link to={b.ctaLink}>{b.ctaText}</Link>
              </Button>
            </motion.div>
          </AnimatePresence>

          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
            {activeBanners.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)} className={`h-1.5 rounded-full transition-all ${i === idx ? "w-6 bg-yellow-500" : "w-3 bg-white/20"}`} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
