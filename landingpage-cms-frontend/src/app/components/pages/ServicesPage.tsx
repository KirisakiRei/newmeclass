import { motion } from "motion/react";
import { Link } from "react-router";
import { ArrowRight, Building2, Users } from "lucide-react";
import { Badge } from "../ui/badge";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { useCMS } from "../cms/CMSContext";
import { fallbackImage, getBadgeToneClass, getIconToneClass, getServiceIcon } from "../public/services/helpers";

function ServiceCard({
  id,
  title,
  subtitle,
  badge,
  badgeTone,
  description,
  tags,
  href,
  image,
  icon,
  iconTone,
  index,
}: {
  id: string;
  title: string;
  subtitle: string;
  badge?: string;
  badgeTone?: string;
  description: string;
  tags: string[];
  href: string;
  image: string;
  icon: string;
  iconTone?: string;
  index: number;
}) {
  const Icon = getServiceIcon(icon);
  const iconToneClass = getIconToneClass(iconTone);

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, delay: index * 0.08 }}
      className="h-full"
    >
      <Link
        to={href}
        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#18181b] transition-all duration-400 hover:border-yellow-500/25 hover:shadow-[0_8px_40px_-12px_rgba(234,179,8,0.18)]"
      >
        <div className="relative overflow-hidden h-44 sm:h-52">
          <ImageWithFallback
            src={image || fallbackImage}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-600 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#18181b] via-[#18181b]/20 to-transparent" />

          <span
            className="absolute right-3 bottom-2 select-none text-7xl leading-none text-white/[0.04]"
            style={{ fontWeight: 900 }}
          >
            {id}
          </span>

          {badge ? (
            <Badge className={`absolute left-3 top-3 text-xs ${getBadgeToneClass(badgeTone)}`}>
              {badge}
            </Badge>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col p-5">
          <div className="mb-3 flex items-center gap-3">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconToneClass.bg}`}>
              <Icon className={`h-4 w-4 ${iconToneClass.text}`} />
            </div>
            <p className="text-xs text-zinc-500" style={{ fontWeight: 500 }}>
              {subtitle}
            </p>
          </div>

          <h3 className="mb-2 text-base text-white sm:text-lg" style={{ fontWeight: 700 }}>
            {title}
          </h3>

          <p className="mb-4 flex-1 text-sm text-zinc-400" style={{ lineHeight: 1.7 }}>
            {description}
          </p>

          <div className="mb-4 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-0.5 text-[11px] text-zinc-500"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2 text-sm text-yellow-500 transition-all duration-200 group-hover:gap-3" style={{ fontWeight: 500 }}>
            Lihat Detail{" "}
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export function ServicesPage() {
  const { data } = useCMS();
  const services = data.services.filter((item) => item.enabled);

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-16">
      <section className="relative overflow-hidden py-16 sm:py-20">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(234,179,8,0.8) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-yellow-500/30 to-transparent" />

        <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
            <p className="mb-3 text-xs tracking-[0.3em] text-yellow-500 sm:text-sm" style={{ fontWeight: 500 }}>
              EKOSISTEM NEWME CLASS
            </p>
            <h1 className="mb-4 text-3xl text-white sm:text-5xl" style={{ fontWeight: 800, lineHeight: 1.15 }}>
              Pilih <span className="text-yellow-500">Layanan</span> yang Tepat<br className="hidden sm:block" /> untuk Potensimu
            </h1>
            <p className="mx-auto max-w-xl text-sm text-zinc-400 sm:text-base" style={{ lineHeight: 1.8 }}>
              Lima layanan terintegrasi untuk individu maupun institusi dari asesmen, konseling, kelas, galeri, hingga komunitas.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-7 flex flex-wrap justify-center gap-2"
          >
            {[
              { icon: Building2, label: "Yayasan & Sekolah", sub: "Program B2B" },
              { icon: Users, label: "Individu & Keluarga", sub: "Program B2C" },
            ].map((audience) => (
              <div
                key={audience.label}
                className="flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2"
              >
                <audience.icon className="h-4 w-4 text-yellow-500" />
                <div className="text-left">
                  <p className="text-xs text-white" style={{ fontWeight: 600 }}>
                    {audience.label}
                  </p>
                  <p className="text-[10px] text-zinc-500">{audience.sub}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="pb-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service, index) => (
              <ServiceCard
                key={service.id}
                id={String(index + 1).padStart(2, "0")}
                title={service.title}
                subtitle={service.subtitle || ""}
                badge={service.badge}
                badgeTone={service.badgeTone}
                description={service.description}
                tags={service.tags || []}
                href={service.link}
                image={service.image || ""}
                icon={service.icon}
                iconTone={service.iconTone}
                index={index}
              />
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-10 overflow-hidden rounded-2xl border border-yellow-500/20 bg-gradient-to-br from-yellow-500/6 via-[#18181b] to-[#18181b] p-6 sm:p-8"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-yellow-500/15">
                  <Building2 className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <h3 className="mb-1 text-sm text-white sm:text-base" style={{ fontWeight: 700 }}>
                    Program untuk Yayasan & Sekolah
                  </h3>
                  <p className="text-xs text-zinc-400 sm:text-sm" style={{ lineHeight: 1.6 }}>
                    Konsultasikan kebutuhan institusi Anda untuk asesmen massal, kelas gali bakat, dan pendampingan program.
                  </p>
                </div>
              </div>
              <Link
                to="/contact"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-yellow-500 px-5 py-3 text-sm text-black transition-colors hover:bg-yellow-400"
                style={{ fontWeight: 600 }}
              >
                Konsultasi B2B
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

