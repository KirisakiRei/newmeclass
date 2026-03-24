import { motion } from "motion/react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Card, CardContent } from "../ui/card";
import { Link } from "react-router";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { useCMS } from "../cms/CMSContext";
import {
  Building2,
  Eye,
  Mail,
  Phone,
  Quote,
  Sparkles,
  Star,
  Target,
  Users,
} from "lucide-react";

export function CompanyProfilePage() {
  const { data } = useCMS();
  const boardMembers = data.companyProfile.teamMembers.slice(0, 4);
  const supportMembers = data.companyProfile.teamMembers.slice(4);
  const testimonials = data.testimonials;
  const benefits = data.benefits;
  const visionText = data.companyProfile.vision || data.visiMisi.visi;
  const missionItems = data.companyProfile.mission.length ? data.companyProfile.mission : data.visiMisi.misi;

  return (
    <div className="bg-[#0a0a0a] pt-16">
      <section className="relative overflow-hidden py-24">
        <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/5 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
            <Badge className="mb-6 border-yellow-500/30 bg-yellow-500/10 text-yellow-500">
              {data.companyProfile.legalName || data.companyProfile.name}
            </Badge>
            <h1 className="mb-6 text-4xl text-white sm:text-6xl" style={{ fontWeight: 800, lineHeight: 1.1 }}>
              Siapa <span className="text-yellow-500">Kami</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-zinc-400" style={{ lineHeight: 1.8 }}>
              {data.companyProfile.description}
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-6 md:grid-cols-2">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <Card className="h-full border-white/10 bg-[#18181b]">
                <CardContent className="p-8">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-500/10">
                    <Building2 className="h-6 w-6 text-yellow-500" />
                  </div>
                  <h3 className="mb-2 text-xl text-white" style={{ fontWeight: 600 }}>B to B - Yayasan & Institusi</h3>
                  <p className="mb-4 text-sm text-zinc-400" style={{ lineHeight: 1.7 }}>
                    Program asesmen massal, kelas gali bakat, training guru, dan observasi kelas untuk sekolah dan yayasan pendidikan di seluruh Indonesia.
                  </p>
                  <Button variant="outline" className="border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10 hover:text-yellow-400" asChild>
                    <Link to="/services">Lihat Program B2B</Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <Card className="h-full border-white/10 bg-[#18181b]">
                <CardContent className="p-8">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-500/10">
                    <Users className="h-6 w-6 text-yellow-500" />
                  </div>
                  <h3 className="mb-2 text-xl text-white" style={{ fontWeight: 600 }}>B to C - Individual</h3>
                  <p className="mb-4 text-sm text-zinc-400" style={{ lineHeight: 1.7 }}>
                    NEWME Test, konseling pribadi, career mapping, dan kelas individu untuk siapa saja yang ingin mengenal dan mengembangkan dirinya.
                  </p>
                  <Button variant="outline" className="border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10 hover:text-yellow-400" asChild>
                    <Link to="/services">Lihat Program B2C</Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mt-8 flex flex-wrap justify-center gap-8">
            <a href={`tel:${String(data.global.phone || "").replace(/[^\d+]/g, "")}`} className="flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-yellow-500">
              <Phone className="h-4 w-4 text-yellow-500" /> {data.global.phone}
            </a>
            <a href={`mailto:${data.global.email}`} className="flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-yellow-500">
              <Mail className="h-4 w-4 text-yellow-500" /> {data.global.email}
            </a>
          </motion.div>
        </div>
      </section>

      {(visionText || missionItems.length > 0) && (
        <section className="relative overflow-hidden py-24">
          <div className="absolute inset-0 opacity-[0.02]" style={{
            backgroundImage: "linear-gradient(rgba(234,179,8,1) 1px, transparent 1px), linear-gradient(90deg, rgba(234,179,8,1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }} />
          <div className="relative mx-auto max-w-7xl px-6">
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-12 text-center">
              <h2 className="text-3xl text-white" style={{ fontWeight: 700 }}>Visi & Misi</h2>
            </motion.div>
            <div className="mx-auto max-w-3xl space-y-8">
              {visionText && (
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="rounded-2xl border border-yellow-500/20 bg-[#18181b] p-8 text-center">
                  <Eye className="mx-auto mb-4 h-8 w-8 text-yellow-500" />
                  <h3 className="mb-3 text-xl text-yellow-500" style={{ fontWeight: 700 }}>Visi</h3>
                  <p className="text-zinc-300" style={{ lineHeight: 1.8 }}>{visionText}</p>
                </motion.div>
              )}
              {missionItems.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="rounded-2xl border border-white/10 bg-[#18181b] p-8">
                  <Target className="mx-auto mb-4 h-8 w-8 text-yellow-500" />
                  <h3 className="mb-4 text-center text-xl text-yellow-500" style={{ fontWeight: 700 }}>Misi</h3>
                  <div className="space-y-3">
                    {missionItems.map((item, index) => (
                      <div key={`${item}-${index}`} className="flex items-start gap-3">
                        <span className="mt-0.5 text-sm text-yellow-500" style={{ fontWeight: 700 }}>
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <p className="text-sm text-zinc-300">{item}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-16 text-center">
            <p className="mb-3 text-sm tracking-[0.15em] text-yellow-500" style={{ fontWeight: 500 }}>TIM KAMI</p>
            <h2 className="text-3xl text-white" style={{ fontWeight: 700 }}>Board of Directors</h2>
          </motion.div>

          {boardMembers.length > 0 ? (
            <div className="mb-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {boardMembers.map((member, index) => (
                <motion.div key={member.id || member.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }}>
                  <Card className="border-white/10 bg-[#18181b] text-center">
                    <CardContent className="p-6">
                      {member.image ? (
                        <div className="mx-auto mb-4 h-20 w-20 overflow-hidden rounded-full border border-yellow-500/20">
                          <ImageWithFallback src={member.image} alt={member.name} className="h-full w-full object-cover" />
                        </div>
                      ) : (
                        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-yellow-500 to-yellow-600 text-2xl text-black" style={{ fontWeight: 700 }}>
                          {String(member.name || "").split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}
                        </div>
                      )}
                      <h4 className="text-white" style={{ fontWeight: 600 }}>{member.name}</h4>
                      <p className="text-sm text-yellow-500/70">{member.role}</p>
                      {member.bio && <p className="mt-2 text-xs text-zinc-500">{member.bio}</p>}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="mb-16 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center text-sm text-zinc-500">
              Data Board of Directors belum tersedia.
            </div>
          )}

          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-10 text-center">
            <h3 className="text-2xl text-white" style={{ fontWeight: 600 }}>Team Support</h3>
          </motion.div>

          {supportMembers.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {supportMembers.map((member, index) => (
                <motion.div key={member.id || member.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }}>
                  <Card className="border-white/10 bg-[#18181b] text-center">
                    <CardContent className="p-6">
                      {member.image ? (
                        <div className="mx-auto mb-4 h-16 w-16 overflow-hidden rounded-full border border-yellow-500/20">
                          <ImageWithFallback src={member.image} alt={member.name} className="h-full w-full object-cover" />
                        </div>
                      ) : (
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/10 text-xl text-yellow-500" style={{ fontWeight: 600 }}>
                          {String(member.name || "").split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}
                        </div>
                      )}
                      <h4 className="text-sm text-white" style={{ fontWeight: 600 }}>{member.name}</h4>
                      <p className="text-xs text-zinc-500">{member.role}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center text-sm text-zinc-500">
              Data team support belum tersedia.
            </div>
          )}
        </div>
      </section>

      {testimonials.length > 0 && (
        <section className="py-24">
          <div className="mx-auto max-w-7xl px-6">
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-16 text-center">
              <p className="mb-3 text-sm tracking-[0.15em] text-yellow-500" style={{ fontWeight: 500 }}>TANGGAPAN</p>
              <h2 className="text-3xl text-white" style={{ fontWeight: 700 }}>Kata Mitra & Client</h2>
            </motion.div>
            <div className="grid gap-6 md:grid-cols-3">
              {testimonials.map((item, index) => (
                <motion.div key={item.id || item.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }}>
                  <Card className="h-full border-white/10 bg-[#18181b]">
                    <CardContent className="p-6">
                      <Quote className="mb-3 h-6 w-6 text-yellow-500/30" />
                      <p className="mb-4 text-sm text-zinc-300" style={{ lineHeight: 1.7 }}>"{item.text}"</p>
                      <div className="mb-3 flex gap-1">
                        {Array.from({ length: Math.max(1, Math.min(5, item.rating || 5)) }).map((_, starIndex) => (
                          <Star key={starIndex} className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                        ))}
                      </div>
                      <p className="text-sm text-white" style={{ fontWeight: 500 }}>{item.name}</p>
                      <p className="text-xs text-zinc-500">{item.role}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {benefits.length > 0 && (
        <section className="py-24">
          <div className="mx-auto max-w-7xl px-6">
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-16 text-center">
              <p className="mb-3 text-sm tracking-[0.15em] text-yellow-500" style={{ fontWeight: 500 }}>BENEFIT</p>
              <h2 className="text-3xl text-white" style={{ fontWeight: 700 }}>Apa yang Diterima Client?</h2>
            </motion.div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {benefits.map((item, index) => (
                <motion.div key={item.id || item.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }}>
                  <Card className="h-full border-white/10 bg-[#18181b] transition-colors hover:border-yellow-500/20">
                    <CardContent className="p-6">
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-500/10">
                        <Sparkles className="h-6 w-6 text-yellow-500" />
                      </div>
                      <h4 className="mb-2 text-white" style={{ fontWeight: 600 }}>{item.title}</h4>
                      <p className="text-sm text-zinc-400" style={{ lineHeight: 1.7 }}>{item.description}</p>
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
