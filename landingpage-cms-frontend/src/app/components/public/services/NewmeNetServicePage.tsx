import { motion } from "motion/react";
import { Link } from "react-router";
import { CheckCircle } from "lucide-react";
import type { ServicePageData } from "../../cms/CMSContext";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Card, CardContent } from "../../ui/card";
import { getCmsIcon } from "../../../../lib/cms-icons";
import { getPrimaryCta } from "./helpers";

export function NewmeNetServicePage({ service }: { service: ServicePageData }) {
  const primaryCta = getPrimaryCta(service);

  return (
    <div className="bg-[#0a0a0a] pt-16">
      <section className="relative overflow-hidden py-24">
        <div className="absolute inset-0 bg-gradient-to-b from-orange-500/5 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
            <Badge className="mb-6 border-yellow-500/30 bg-yellow-500/10 text-yellow-500">
              {service.heroBadge || "NEWME NET"}
            </Badge>
            <h1 className="mb-6 text-4xl text-white sm:text-6xl" style={{ fontWeight: 800, lineHeight: 1.1 }}>
              {service.title}
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-zinc-400" style={{ lineHeight: 1.8 }}>
              {service.subtitle || service.description}
            </p>
          </motion.div>
        </div>
      </section>

      {(service.netBenefits || []).length > 0 && (
        <section className="py-16">
          <div className="mx-auto max-w-7xl px-6">
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-12 text-center">
              <h2 className="text-3xl text-white" style={{ fontWeight: 700 }}>Benefit Member</h2>
            </motion.div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {(service.netBenefits || []).map((benefit, index) => {
                const BenefitIcon = getCmsIcon(benefit.icon);
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

      {(service.memberPlans || []).length > 0 && (
        <section className="py-24">
          <div className="mx-auto max-w-7xl px-6">
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-12 text-center">
              <p className="mb-3 text-sm tracking-[0.15em] text-yellow-500" style={{ fontWeight: 500 }}>MEMBERSHIP</p>
              <h2 className="text-3xl text-white" style={{ fontWeight: 700 }}>Pilih Paket Anda</h2>
            </motion.div>
            <div className="grid gap-6 md:grid-cols-3">
              {(service.memberPlans || []).map((plan, index) => (
                <motion.div key={`${service.slug}-plan-${index}`} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }}>
                  <Card className={`h-full ${plan.highlight ? "border-yellow-500/40 bg-gradient-to-b from-yellow-500/5 to-[#18181b] shadow-[0_0_60px_-12px_rgba(234,179,8,0.15)]" : "border-white/10 bg-[#18181b]"}`}>
                    <CardContent className="p-8">
                      {plan.highlight ? <Badge className="mb-4 border-yellow-500/30 bg-yellow-500/10 text-yellow-500">Rekomendasi</Badge> : null}
                      <h3 className="mb-2 text-2xl text-white" style={{ fontWeight: 700 }}>{plan.name}</h3>
                      <div className="mb-6">
                        <span className="text-3xl text-yellow-500" style={{ fontWeight: 800 }}>{plan.price}</span>
                        <span className="text-zinc-500">{plan.period}</span>
                      </div>
                      <ul className="mb-8 space-y-3">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-2 text-sm text-zinc-300">
                            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" /> {feature}
                          </li>
                        ))}
                      </ul>
                      <Button className={`w-full ${plan.highlight ? "bg-yellow-500 text-black hover:bg-yellow-400" : "border border-white/10 bg-transparent text-zinc-300 hover:border-yellow-500/30 hover:bg-yellow-500/5 hover:text-yellow-500"}`} asChild>
                        <Link to={primaryCta.link}>Gabung Sekarang</Link>
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
