import { motion } from "motion/react";
import { Badge } from "./ui/badge";
import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { useCMS } from "./cms/CMSContext";

export function ArticlesSection() {
  const { data } = useCMS();
  const published = data.articles.filter((a) => a.published);
  const [featured, ...rest] = published;

  if (!featured) return null;

  return (
    <section className="bg-[#0a0a0a] py-24">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 flex items-end justify-between"
        >
          <div>
            <p className="mb-3 text-sm tracking-[0.15em] text-yellow-500" style={{ fontWeight: 500 }}>INSIGHT</p>
            <h2 className="text-3xl text-white sm:text-4xl" style={{ fontWeight: 700 }}>
              Artikel & Wawasan
            </h2>
          </div>
          <Link to="/articles" className="hidden items-center gap-1 text-sm text-yellow-500 transition-colors hover:text-yellow-400 sm:flex">
            Lihat Semua <ArrowRight className="h-3 w-3" />
          </Link>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Link to={`/articles/${featured.id}`} className="group block overflow-hidden rounded-xl border border-white/10 bg-[#18181b]">
              <div className="relative h-64 overflow-hidden">
                <ImageWithFallback src={featured.image} alt={featured.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              </div>
              <div className="p-6">
                <div className="mb-3 flex items-center gap-3">
                  <Badge className="border-yellow-500/30 bg-yellow-500/10 text-yellow-500">{featured.category}</Badge>
                  <span className="text-xs text-zinc-500">{featured.date}</span>
                </div>
                <h3 className="text-lg text-white" style={{ fontWeight: 600, lineHeight: 1.4 }}>{featured.title}</h3>
              </div>
            </Link>
          </motion.div>

          <div className="flex flex-col gap-6">
            {rest.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Link to={`/articles/${a.id}`} className="group flex gap-4 overflow-hidden rounded-xl border border-white/10 bg-[#18181b]">
                  <div className="h-32 w-32 shrink-0 overflow-hidden">
                    <ImageWithFallback src={a.image} alt={a.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  </div>
                  <div className="flex flex-col justify-center p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <Badge className="border-yellow-500/30 bg-yellow-500/10 text-xs text-yellow-500">{a.category}</Badge>
                      <span className="text-xs text-zinc-500">{a.date}</span>
                    </div>
                    <h3 className="text-sm text-white" style={{ fontWeight: 600, lineHeight: 1.5 }}>{a.title}</h3>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
