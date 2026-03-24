import { motion } from "motion/react";
import { Link } from "react-router";
import { ArrowRight, Calendar, Heart, MessageCircle, Shield, Star, Video } from "lucide-react";
import type { ServicePageData } from "../../cms/CMSContext";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Card, CardContent } from "../../ui/card";
import { getCmsIcon } from "../../../../lib/cms-icons";
import { fallbackImage, getConsultThemeClass, getPrimaryCta, getSecondaryCta } from "./helpers";
import { ImageWithFallback } from "../../figma/ImageWithFallback";

const clinicFeatureIcons = [Shield, Video, MessageCircle, Heart];

export function NewmeClinicServicePage({ service }: { service: ServicePageData }) {
  const primaryCta = getPrimaryCta(service);
  const secondaryCta = getSecondaryCta(service);

  return (
    <div className="bg-[#0a0a0a] pt-16">
      <section className="relative overflow-hidden py-24">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
            <Badge className="mb-6 border-yellow-500/30 bg-yellow-500/10 text-yellow-500">
              {service.heroBadge || "NEWME CLINIC"}
            </Badge>
            <h1 className="mb-6 text-4xl text-white sm:text-6xl" style={{ fontWeight: 800, lineHeight: 1.1 }}>
              {service.title.split(" ").map((word, index, arr) => index === arr.length - 1 ? <span key={word} className="text-yellow-500">{word} </span> : `${word} `)}
            </h1>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-zinc-400" style={{ lineHeight: 1.8 }}>
              {service.subtitle || service.description}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button className="bg-yellow-500 px-8 py-6 text-black hover:bg-yellow-400" asChild>
                <Link to={primaryCta.link}>{primaryCta.text}</Link>
              </Button>
              <Button variant="outline" className="px-8 py-6" asChild>
                <Link to={secondaryCta.link}>{secondaryCta.text}</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {(service.consultTypes || []).length > 0 && (
        <section className="py-16">
          <div className="mx-auto max-w-7xl px-6">
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-12 text-center">
              <h2 className="text-3xl text-white" style={{ fontWeight: 700 }}>Pilih Jenis Konsultasi</h2>
            </motion.div>

            <div className="grid gap-8 lg:grid-cols-2">
              {(service.consultTypes || []).map((consult, index) => {
                const ConsultIcon = getCmsIcon(consult.icon);
                return (
                  <motion.div key={`${service.slug}-consult-${index}`} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.15 }}>
                    <Card className="h-full overflow-hidden border-white/10 bg-[#18181b] transition-colors hover:border-yellow-500/20">
                      <CardContent className="p-0">
                        <div className={`bg-gradient-to-r ${getConsultThemeClass(consult.theme)} p-6`}>
                          <ConsultIcon className="mb-3 h-10 w-10 text-white" />
                          <h3 className="text-2xl text-white" style={{ fontWeight: 700 }}>{consult.title}</h3>
                          <p className="text-white/70">{consult.subtitle}</p>
                        </div>
                        <div className="p-6">
                          <p className="mb-5 text-sm text-zinc-400" style={{ lineHeight: 1.7 }}>{consult.desc}</p>

                          <div className="mb-5 flex flex-wrap gap-3">
                            <span className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-zinc-300">
                              <Calendar className="h-3.5 w-3.5 text-yellow-500" /> {consult.duration}
                            </span>
                            <span className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-zinc-300">
                              <Video className="h-3.5 w-3.5 text-yellow-500" /> {consult.mode}
                            </span>
                          </div>

                          <div className="mb-5">
                            <div className="flex flex-wrap gap-2">
                              {consult.topics.map((topic) => (
                                <Badge key={topic} variant="outline" className="border-white/10 text-zinc-400">{topic}</Badge>
                              ))}
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs text-zinc-500">Mulai dari</p>
                              <p className="text-xl text-yellow-500" style={{ fontWeight: 700 }}>{consult.price}</p>
                            </div>
                            <Button className="bg-yellow-500 text-black hover:bg-yellow-400" asChild>
                              <Link to={primaryCta.link}>Booking <ArrowRight className="ml-1 h-4 w-4" /></Link>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {(service.psychologists || []).length > 0 && (
        <section className="py-24">
          <div className="mx-auto max-w-7xl px-6">
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-12 text-center">
              <p className="mb-3 text-sm tracking-[0.15em] text-yellow-500" style={{ fontWeight: 500 }}>TIM PSIKOLOG</p>
              <h2 className="text-3xl text-white" style={{ fontWeight: 700 }}>Psikolog Profesional Kami</h2>
            </motion.div>
            <div className="grid gap-6 md:grid-cols-3">
              {(service.psychologists || []).map((psychologist, index) => (
                <motion.div key={psychologist.id || `${service.slug}-psy-${index}`} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }}>
                  <Card className="border-white/10 bg-[#18181b] transition-colors hover:border-yellow-500/20">
                    <CardContent className="p-6 text-center">
                      <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-yellow-500 to-yellow-600 text-2xl text-black" style={{ fontWeight: 700 }}>
                        {psychologist.initials}
                      </div>
                      <h4 className="text-white" style={{ fontWeight: 600 }}>{psychologist.name}</h4>
                      <p className="mb-3 text-sm text-yellow-500/70">{psychologist.specialty}</p>
                      <div className="flex items-center justify-center gap-4 text-xs text-zinc-400">
                        <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />{psychologist.rating}</span>
                        <span>{psychologist.sessions}+ sesi</span>
                      </div>
                      <Button className="mt-4 w-full bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20" asChild>
                        <Link to={primaryCta.link}>Pilih Psikolog</Link>
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {(service.clinicFeatures || []).length > 0 && (
        <section className="py-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {(service.clinicFeatures || []).map((feature, index) => {
                const FeatureIcon = clinicFeatureIcons[index] || Heart;
                return (
                  <motion.div key={`${service.slug}-feature-${index}`} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }}>
                    <div className="rounded-xl border border-white/10 bg-[#18181b] p-6 text-center">
                      <FeatureIcon className="mx-auto mb-3 h-8 w-8 text-yellow-500" />
                      <h4 className="mb-1 text-sm text-white" style={{ fontWeight: 600 }}>{feature.title}</h4>
                      <p className="text-xs text-zinc-400" style={{ lineHeight: 1.6 }}>{feature.desc}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <section className="pb-24">
        <div className="mx-auto max-w-7xl px-6">
          <Card className="overflow-hidden border-white/10 bg-[#18181b]">
            <CardContent className="grid gap-8 p-0 lg:grid-cols-2">
              <div className="p-8 lg:p-10">
                <Badge className="mb-4 border-yellow-500/30 bg-yellow-500/10 text-yellow-500">{service.heroBadge || "NEWME CLINIC"}</Badge>
                <h3 className="mb-4 text-2xl text-white sm:text-3xl" style={{ fontWeight: 700 }}>{service.introTitle || service.title}</h3>
                {(service.introParagraphs || [service.description]).map((paragraph, index) => (
                  <p key={`${service.slug}-intro-${index}`} className={index === (service.introParagraphs || [service.description]).length - 1 ? "text-zinc-400" : "mb-4 text-zinc-400"} style={{ lineHeight: 1.8 }}>
                    {paragraph}
                  </p>
                ))}
                <div className="mt-6 flex flex-wrap gap-4">
                  <Button className="bg-yellow-500 text-black hover:bg-yellow-400" asChild>
                    <Link to={primaryCta.link}>{primaryCta.text}</Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to={secondaryCta.link}>{secondaryCta.text}</Link>
                  </Button>
                </div>
              </div>
              <div className="relative hidden lg:block">
                <ImageWithFallback src={service.heroImage || fallbackImage} alt={service.title} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#18181b] via-transparent to-transparent" />
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
