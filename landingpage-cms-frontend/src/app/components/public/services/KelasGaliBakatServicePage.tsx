import { motion } from "motion/react";
import { Link } from "react-router";
import { ArrowRight, CheckCircle, ClipboardCheck, HandHeart, Lightbulb, Phone, Rocket, Search, Target, TrendingUp, Users, Award, Heart, Brain, Sparkles } from "lucide-react";
import type { ServicePageData } from "../../cms/CMSContext";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Card, CardContent } from "../../ui/card";
import { ImageWithFallback } from "../../figma/ImageWithFallback";
import { fallbackImage, getPrimaryCta, getSecondaryCta } from "./helpers";

const phaseIcons = [ClipboardCheck, Search, Lightbulb, HandHeart, TrendingUp];
const benefitIcons = [Brain, Target, Users, Award, Heart, Rocket];

export function KelasGaliBakatServicePage({ service }: { service: ServicePageData }) {
  const primaryCta = getPrimaryCta(service);
  const secondaryCta = getSecondaryCta(service);

  return (
    <div className="bg-[#0a0a0a] pt-16">
      <section className="relative overflow-hidden py-24">
        <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/5 to-transparent" />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(234,179,8,1) 1px, transparent 1px), linear-gradient(90deg, rgba(234,179,8,1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}>
              <Badge className="mb-6 border-yellow-500/30 bg-yellow-500/10 text-yellow-500">
                {service.heroBadge || "PROGRAM UNGGULAN"}
              </Badge>
              <h1 className="mb-6 text-4xl text-white sm:text-6xl" style={{ fontWeight: 800, lineHeight: 1.1 }}>
                {service.title.includes("Kelas") ? (
                  <>
                    Kelas <span className="text-yellow-500">{service.title.replace(/^Kelas\s*/i, "")}</span>
                  </>
                ) : (
                  <>{service.title}</>
                )}
              </h1>
              <p className="mb-6 text-lg text-zinc-400" style={{ lineHeight: 1.8 }}>
                {service.subtitle}
              </p>
              <div className="flex flex-wrap gap-4">
                <Button className="bg-yellow-500 px-8 py-6 text-black hover:bg-yellow-400" asChild>
                  <Link to={primaryCta.link}>{primaryCta.text}</Link>
                </Button>
                <Button variant="outline" className="px-8 py-6" asChild>
                  <Link to={secondaryCta.link}>{secondaryCta.text}</Link>
                </Button>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}>
              <div className="relative">
                <div className="absolute -inset-4 rounded-2xl bg-yellow-500/10 blur-3xl" />
                <ImageWithFallback
                  src={service.heroImage || fallbackImage}
                  alt={service.title}
                  className="relative rounded-2xl border border-white/10 object-cover"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {(service.introTitle || (service.introParagraphs || []).length > 0) && (
        <section className="py-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mx-auto max-w-3xl text-center">
              <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                <h2 className="mb-6 text-3xl text-white" style={{ fontWeight: 700 }}>
                  {service.introTitle || "Apa itu Kelas Gali Bakat?"}
                </h2>
                {(service.introParagraphs || []).map((paragraph, index) => (
                  <p key={`${service.slug}-intro-${index}`} className={index === (service.introParagraphs || []).length - 1 ? "text-zinc-400" : "mb-6 text-zinc-400"} style={{ lineHeight: 1.9 }}>
                    {paragraph}
                  </p>
                ))}
              </motion.div>
            </div>
          </div>
        </section>
      )}

      {(service.phases || []).length > 0 && (
        <section className="py-24">
          <div className="mx-auto max-w-7xl px-6">
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-16 text-center">
              <p className="mb-3 text-sm tracking-[0.15em] text-yellow-500" style={{ fontWeight: 500 }}>ALUR PROGRAM</p>
              <h2 className="text-3xl text-white" style={{ fontWeight: 700 }}>Tahapan {service.title}</h2>
            </motion.div>

            <div className="relative mx-auto max-w-3xl">
              <div className="absolute left-6 top-0 h-full w-px bg-gradient-to-b from-yellow-500 via-yellow-500/50 to-transparent lg:left-1/2 lg:-translate-x-px" />

              <div className="space-y-12">
                {(service.phases || []).map((phase, index) => {
                  const PhaseIcon = phaseIcons[index] || ClipboardCheck;
                  return (
                    <motion.div
                      key={`${service.slug}-phase-${index}`}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                      className={`relative flex gap-6 ${index % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"}`}
                    >
                      <div className="absolute left-6 -translate-x-1/2 lg:left-1/2">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-yellow-500 bg-[#0a0a0a]">
                          <span className="text-sm text-yellow-500" style={{ fontWeight: 700 }}>{index + 1}</span>
                        </div>
                      </div>

                      <div className={`ml-16 lg:ml-0 lg:w-[calc(50%-2rem)] ${index % 2 === 0 ? "lg:pr-8 lg:text-right" : "lg:ml-[calc(50%+2rem)] lg:pl-8"}`}>
                        <Card className="border-white/10 bg-[#18181b] transition-colors hover:border-yellow-500/20">
                          <CardContent className="p-6">
                            <PhaseIcon className={`mb-3 h-6 w-6 text-yellow-500 ${index % 2 === 0 ? "lg:ml-auto" : ""}`} />
                            <h4 className="mb-2 text-white" style={{ fontWeight: 600 }}>{phase.title}</h4>
                            <p className="text-sm text-zinc-400" style={{ lineHeight: 1.7 }}>{phase.desc}</p>
                          </CardContent>
                        </Card>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {(service.galiBakatBenefits || []).length > 0 && (
        <section className="py-24">
          <div className="mx-auto max-w-7xl px-6">
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-16 text-center">
              <p className="mb-3 text-sm tracking-[0.15em] text-yellow-500" style={{ fontWeight: 500 }}>MANFAAT</p>
              <h2 className="text-3xl text-white" style={{ fontWeight: 700 }}>Yang Akan Anda Dapatkan</h2>
            </motion.div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {(service.galiBakatBenefits || []).map((benefit, index) => {
                const BenefitIcon = benefitIcons[index] || Sparkles;
                return (
                  <motion.div key={`${service.slug}-benefit-${index}`} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }}>
                    <Card className="h-full border-white/10 bg-[#18181b] transition-colors hover:border-yellow-500/20">
                      <CardContent className="p-6">
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-500/10">
                          <BenefitIcon className="h-6 w-6 text-yellow-500" />
                        </div>
                        <h4 className="mb-2 text-white" style={{ fontWeight: 600 }}>{benefit.title}</h4>
                        <p className="text-sm text-zinc-400" style={{ lineHeight: 1.7 }}>{benefit.desc}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {(service.optimasiItems || []).length > 0 && (
        <section className="py-24">
          <div className="mx-auto max-w-7xl px-6">
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <Card className="overflow-hidden border-yellow-500/20 bg-gradient-to-br from-[#18181b] to-[#1a1a1f]">
                <CardContent className="p-0">
                  <div className="grid lg:grid-cols-2">
                    <div className="p-8 lg:p-12">
                      <Badge className="mb-4 border-yellow-500/30 bg-yellow-500/10 text-yellow-500">LANJUTAN</Badge>
                      <h3 className="mb-4 text-2xl text-white sm:text-3xl" style={{ fontWeight: 700 }}>
                        Kelas Optimasi Potensi
                      </h3>
                      <p className="mb-6 text-zinc-400" style={{ lineHeight: 1.8 }}>
                        {service.description}
                      </p>
                      <ul className="mb-6 space-y-2">
                        {(service.optimasiItems || []).map((item) => (
                          <li key={item} className="flex items-center gap-2 text-sm text-zinc-300">
                            <CheckCircle className="h-4 w-4 shrink-0 text-yellow-500" /> {item}
                          </li>
                        ))}
                      </ul>
                      <Button className="bg-yellow-500 text-black hover:bg-yellow-400" asChild>
                        <Link to={primaryCta.link}>Konsultasi Program <ArrowRight className="ml-1 h-4 w-4" /></Link>
                      </Button>
                    </div>
                    <div className="relative hidden lg:block">
                      <ImageWithFallback
                        src={service.heroImage || fallbackImage}
                        alt={service.title}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-[#18181b] to-transparent" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>
      )}

      <section className="py-24">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="mb-6 text-3xl text-white sm:text-4xl" style={{ fontWeight: 800, lineHeight: 1.1 }}>
            Siap Menemukan <span className="text-yellow-500">Potensi Terbaikmu?</span>
          </h2>
          <p className="mb-8 text-zinc-400" style={{ lineHeight: 1.7 }}>
            Hubungi tim NEWME untuk informasi lebih lanjut tentang program {service.title}
            atau mulai dari langkah awal yang paling sesuai untukmu.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button className="bg-yellow-500 px-8 py-6 text-black hover:bg-yellow-400" asChild>
              <Link to={primaryCta.link}><Phone className="mr-2 h-4 w-4" /> {primaryCta.text}</Link>
            </Button>
            <Button variant="outline" className="px-8 py-6" asChild>
              <Link to={secondaryCta.link}>{secondaryCta.text}</Link>
            </Button>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
