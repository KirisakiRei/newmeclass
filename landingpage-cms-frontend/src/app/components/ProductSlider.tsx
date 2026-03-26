import { motion } from "motion/react";
import { Badge } from "./ui/badge";
import { Link } from "react-router";
import { ArrowRight, Stethoscope, GraduationCap, TestTube, Network, ImageIcon, Star, type LucideIcon } from "lucide-react";
import { ImageWithFallback } from "./media/ImageWithFallback";
import { useCMS } from "./cms/CMSContext";

const ICON_MAP: Record<string, LucideIcon> = {
  TestTube, Stethoscope, GraduationCap, Network, ImageIcon, Star,
};

export function ProductSlider() {
  const { data } = useCMS();
  const items = data.ecosystemItems.filter((e) => e.enabled);

  const top2 = items.slice(0, 2);
  const bottom3 = items.slice(2);

  return (
    <section className="bg-[#0a0a0a] py-24">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <p className="mb-3 text-sm tracking-[0.15em] text-yellow-500" style={{ fontWeight: 500 }}>EKOSISTEM</p>
          <h2 className="mb-4 text-3xl text-white sm:text-4xl" style={{ fontWeight: 700 }}>
            Ekosistem NEWME
          </h2>
          <p className="mx-auto max-w-2xl text-zinc-400" style={{ lineHeight: 1.7 }}>
            Lima pilar ekosistem NEWME yang saling terintegrasi untuk pengembangan potensi diri Anda secara menyeluruh.
          </p>
        </motion.div>

        {/* Featured top 2 */}
        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          {top2.map((p, i) => {
            const Icon = ICON_MAP[p.icon] ?? Star;
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
              >
                <Link
                  to={p.href}
                  className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#18181b] transition-all duration-300 hover:border-yellow-500/30 hover:shadow-[0_0_60px_-12px_rgba(234,179,8,0.12)]"
                >
                  <div className="relative h-56 overflow-hidden">
                    <ImageWithFallback src={p.image} alt={p.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#18181b] via-[#18181b]/40 to-transparent" />
                    <Badge className="absolute top-4 right-4 border-yellow-500/30 bg-yellow-500/10 text-yellow-500">{p.badge}</Badge>
                    <div className={`absolute bottom-4 left-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${p.color} ring-1 ring-white/10 backdrop-blur-md`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <p className="mb-1 text-xs tracking-widest text-yellow-500/70" style={{ fontWeight: 500 }}>{p.subtitle}</p>
                    <h3 className="mb-2 text-xl text-white" style={{ fontWeight: 700 }}>{p.title}</h3>
                    <p className="mb-5 flex-1 text-sm text-zinc-400" style={{ lineHeight: 1.8 }}>{p.desc}</p>
                    <span className="inline-flex items-center gap-2 text-sm text-yellow-500 transition-all group-hover:gap-3">
                      Jelajahi <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom 3 */}
        <div className="grid gap-6 md:grid-cols-3">
          {bottom3.map((p, i) => {
            const Icon = ICON_MAP[p.icon] ?? Star;
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <Link
                  to={p.href}
                  className="group relative block overflow-hidden rounded-2xl border border-white/10 bg-[#18181b] transition-all duration-300 hover:border-yellow-500/30 hover:shadow-[0_0_60px_-12px_rgba(234,179,8,0.12)]"
                >
                  <div className="relative h-44 overflow-hidden">
                    <ImageWithFallback src={p.image} alt={p.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#18181b] via-[#18181b]/40 to-transparent" />
                    <Badge className="absolute top-4 right-4 border-yellow-500/30 bg-yellow-500/10 text-yellow-500">{p.badge}</Badge>
                  </div>
                  <div className="p-5">
                    <div className="mb-3 flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${p.color} ring-1 ring-white/10`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-[10px] tracking-widest text-yellow-500/70" style={{ fontWeight: 500 }}>{p.subtitle}</p>
                        <h3 className="text-white" style={{ fontWeight: 600 }}>{p.title}</h3>
                      </div>
                    </div>
                    <p className="mb-4 text-sm text-zinc-400" style={{ lineHeight: 1.7 }}>{p.desc}</p>
                    <span className="inline-flex items-center gap-2 text-sm text-yellow-500 transition-all group-hover:gap-3">
                      Jelajahi <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
