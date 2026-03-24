import { motion } from "motion/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  GraduationCap, Users, Brain, Lightbulb, Target, Telescope, ArrowRight,
  Heart, Star, Sparkles, Image as ImageIcon, Network, type LucideIcon,
} from "lucide-react";
import { Link } from "react-router";
import { useCMS } from "./cms/CMSContext";

const ICON_MAP: Record<string, LucideIcon> = {
  GraduationCap, Users, Brain, Lightbulb, Target, Telescope, Heart,
  Star, Sparkles, ImageIcon, Network,
};

function ServiceCard({ icon, title, desc, index, href }: { icon: string; title: string; desc: string; index: number; href: string }) {
  const Icon = ICON_MAP[icon] ?? Star;
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <Link to={href} className="group relative block overflow-hidden rounded-2xl border border-white/10 bg-[#18181b] p-8 transition-all duration-300 hover:border-yellow-500/30 hover:shadow-[0_0_40px_-12px_rgba(234,179,8,0.15)]">
        <div className="absolute top-0 left-0 h-1 w-0 bg-gradient-to-r from-yellow-400 to-yellow-600 transition-all duration-500 group-hover:w-full" />
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-500/20 to-yellow-600/5 ring-1 ring-yellow-500/20">
          <Icon className="h-7 w-7 text-yellow-500" />
        </div>
        <h3 className="mb-3 text-lg text-white" style={{ fontWeight: 600 }}>{title}</h3>
        <p className="mb-5 text-sm text-zinc-400" style={{ lineHeight: 1.8 }}>{desc}</p>
        <span className="inline-flex items-center gap-2 text-sm text-yellow-500 transition-all group-hover:gap-3">
          Pelajari <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </Link>
    </motion.div>
  );
}

export function ServicesSection() {
  const { data } = useCMS();
  const b2b = data.services.filter((s) => s.enabled && s.type === "b2b");
  const b2c = data.services.filter((s) => s.enabled && s.type === "b2c");

  return (
    <section className="bg-[#0a0a0a] py-24">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <p className="mb-3 text-sm tracking-[0.15em] text-yellow-500" style={{ fontWeight: 500 }}>PRODUK & JASA</p>
          <h2 className="text-3xl text-white sm:text-4xl" style={{ fontWeight: 700 }}>
            Solusi Lengkap Pengembangan Potensi
          </h2>
        </motion.div>

        <Tabs defaultValue="b2b" className="w-full">
          <div className="mb-12 flex justify-center">
            <TabsList className="h-auto gap-2 rounded-xl border border-white/10 bg-[#18181b] p-1.5">
              <TabsTrigger value="b2b" className="rounded-lg px-6 py-2.5 text-zinc-400 data-[state=active]:bg-yellow-500 data-[state=active]:text-black data-[state=active]:shadow-lg">
                B to B (Yayasan)
              </TabsTrigger>
              <TabsTrigger value="b2c" className="rounded-lg px-6 py-2.5 text-zinc-400 data-[state=active]:bg-yellow-500 data-[state=active]:text-black data-[state=active]:shadow-lg">
                B to C (Individual)
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="b2b">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {b2b.map((s, i) => (
                <ServiceCard key={s.id} icon={s.icon} title={s.title} desc={s.description} index={i} href={s.link} />
              ))}
            </div>
          </TabsContent>
          <TabsContent value="b2c">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {b2c.map((s, i) => (
                <ServiceCard key={s.id} icon={s.icon} title={s.title} desc={s.description} index={i} href={s.link} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}
