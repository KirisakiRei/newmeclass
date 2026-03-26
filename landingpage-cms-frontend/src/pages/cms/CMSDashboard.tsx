import { motion } from "motion/react";
import { useCMS } from "../../app/components/cms/CMSContext";
import { Card, CardContent } from "../../app/components/ui/card";
import { Badge } from "../../app/components/ui/badge";
import {
  LayoutDashboard, Image, ShoppingBag, Users, FileText, Newspaper,
  TrendingUp, Eye, Package, Star, Activity, ArrowUpRight,
} from "lucide-react";
import { Link } from "react-router";

const anim = (i: number) => ({ initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { delay: i * 0.05 } });

export function CMSDashboard() {
  const { data } = useCMS();

  const stats = [
    { label: "Hero Slides", value: data.hero.length, icon: Image, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Produk", value: data.products.length, icon: ShoppingBag, color: "text-yellow-500", bg: "bg-yellow-500/10" },
    { label: "Testimonial", value: data.testimonials.length, icon: Star, color: "text-purple-400", bg: "bg-purple-500/10" },
    { label: "Artikel", value: data.articles.filter((a) => a.published).length, icon: Newspaper, color: "text-green-400", bg: "bg-green-500/10" },
    { label: "Layanan", value: data.servicePages.filter((s) => s.enabled).length, icon: Package, color: "text-orange-400", bg: "bg-orange-500/10" },
    { label: "Tim", value: data.companyProfile.teamMembers.length, icon: Users, color: "text-pink-400", bg: "bg-pink-500/10" },
  ];

  const quickLinks = [
    { label: "Pengaturan Global", path: "/cms/global", icon: Activity },
    { label: "Hero Carousel", path: "/cms/landing/hero", icon: Image },
    { label: "Shop Management", path: "/cms/shop", icon: ShoppingBag },
    { label: "Profil Perusahaan", path: "/cms/company", icon: Users },
    { label: "Artikel", path: "/cms/landing/articles", icon: Newspaper },
    { label: "Privacy Policy", path: "/cms/privacy", icon: FileText },
  ];

  const statusHighlights = [
    { text: `${data.navigation.mainLinks.length} menu utama aktif`, time: "Navigation", type: "info" },
    { text: `${data.products.filter((product) => product.enabled).length} produk aktif di katalog`, time: "Shop", type: "success" },
    { text: `${data.articles.filter((a) => a.published).length} artikel dipublikasikan`, time: "Artikel", type: "success" },
    { text: data.global.maintenanceMode ? "Mode maintenance aktif" : "Website live", time: "Status", type: data.global.maintenanceMode ? "warning" : "success" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div {...anim(0)}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl text-white" style={{ fontWeight: 700 }}>
              Dashboard <span className="text-yellow-500">CMS</span>
            </h1>
            <p className="text-sm text-zinc-500">Kelola seluruh konten website NEWME CLASS</p>
          </div>
          <Badge variant="outline" className={`w-fit ${data.global.maintenanceMode ? "border-orange-500/30 bg-orange-500/10 text-orange-500" : "border-green-500/30 bg-green-500/10 text-green-500"}`}>
            <div className={`mr-1.5 h-2 w-2 rounded-full ${data.global.maintenanceMode ? "bg-orange-500" : "bg-green-500"}`} />
            {data.global.maintenanceMode ? "Maintenance" : "Live"}
          </Badge>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s, i) => (
          <motion.div key={s.label} {...anim(i + 1)}>
            <Card className="border-white/10 bg-[#18181b]">
              <CardContent className="p-4">
                <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${s.bg}`}>
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                </div>
                <p className="text-2xl text-white" style={{ fontWeight: 700 }}>{s.value}</p>
                <p className="text-[11px] text-zinc-500">{s.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Links */}
        <motion.div {...anim(7)} className="lg:col-span-2">
          <Card className="border-white/10 bg-[#18181b]">
            <CardContent className="p-5">
              <h3 className="mb-4 text-sm text-white" style={{ fontWeight: 600 }}>Akses Cepat</h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {quickLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className="group flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3 transition-colors hover:border-yellow-500/20 hover:bg-yellow-500/5"
                  >
                    <link.icon className="h-4 w-4 text-zinc-500 group-hover:text-yellow-500" />
                    <span className="text-xs text-zinc-400 group-hover:text-white">{link.label}</span>
                    <ArrowUpRight className="ml-auto h-3 w-3 text-zinc-700 group-hover:text-yellow-500" />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Status */}
        <motion.div {...anim(8)}>
          <Card className="border-white/10 bg-[#18181b]">
            <CardContent className="p-5">
              <h3 className="mb-4 text-sm text-white" style={{ fontWeight: 600 }}>Status</h3>
              <div className="space-y-3">
                {statusHighlights.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                      item.type === "success" ? "bg-green-500" : item.type === "warning" ? "bg-orange-500" : item.type === "update" ? "bg-blue-500" : "bg-zinc-500"
                    }`} />
                    <div>
                      <p className="text-xs text-zinc-300">{item.text}</p>
                      <p className="text-[10px] text-zinc-600">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Section Overview */}
      <motion.div {...anim(9)}>
        <Card className="border-white/10 bg-[#18181b]">
          <CardContent className="p-5">
            <h3 className="mb-4 text-sm text-white" style={{ fontWeight: 600 }}>Overview Landing Page Sections</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {[
                { name: "Hero Carousel", count: `${data.hero.length} slides`, path: "/cms/landing/hero" },
                { name: "About", count: `${data.about.stats.length} stats`, path: "/cms/landing/about" },
                { name: "Services", count: `${data.services.filter(s => s.enabled).length} aktif`, path: "/cms/landing/services" },
                { name: "Promo", count: data.promo.enabled ? "Aktif" : "Nonaktif", path: "/cms/landing/promo" },
                { name: "Products", count: `${data.products.length} produk`, path: "/cms/landing/products" },
                { name: "Testimonials", count: `${data.testimonials.length} review`, path: "/cms/landing/testimonials" },
                { name: "Benefits", count: `${data.benefits.length} item`, path: "/cms/landing/benefits" },
                { name: "Activities", count: `${data.activities.length} kegiatan`, path: "/cms/landing/activities" },
                { name: "Articles", count: `${data.articles.length} artikel`, path: "/cms/landing/articles" },
                { name: "Visi & Misi", count: `${data.visiMisi.misi.length} misi`, path: "/cms/landing/visi-misi" },
                { name: "Banners", count: `${data.banners.length} banner`, path: "/cms/landing/banners" },
                { name: "Final CTA", count: "1 section", path: "/cms/landing/final-cta" },
              ].map((sec) => (
                <Link
                  key={sec.path}
                  to={sec.path}
                  className="group rounded-lg border border-white/5 bg-white/[0.02] p-3 transition-colors hover:border-yellow-500/20"
                >
                  <p className="text-xs text-zinc-300 group-hover:text-yellow-500">{sec.name}</p>
                  <p className="text-[10px] text-zinc-600">{sec.count}</p>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
