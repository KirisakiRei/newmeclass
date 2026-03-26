import { motion } from "motion/react";
import { Link } from "react-router";
import { Calendar, Play, Star, Users, type LucideIcon } from "lucide-react";
import type { ServicePageData } from "../../../app/components/cms/CMSContext";
import { Badge } from "../../../app/components/ui/badge";
import { Button } from "../../../app/components/ui/button";
import { Card, CardContent } from "../../../app/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../app/components/ui/tabs";
import { ImageWithFallback } from "../../../app/components/media/ImageWithFallback";
import { getCmsIcon } from "../../../lib/cms-icons";
import { getPrimaryCta, getSecondaryCta } from "./helpers";

export function NewmeClassServicePage({ service }: { service: ServicePageData }) {
  const primaryCta = getPrimaryCta(service);
  const secondaryCta = getSecondaryCta(service);
  const highlights = (service.classHighlights || []).filter((item) => item.label);

  return (
    <div className="bg-[#0a0a0a] pt-16">
      <section className="relative overflow-hidden py-24">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
            <Badge className="mb-6 border-yellow-500/30 bg-yellow-500/10 text-yellow-500">
              {service.heroBadge || "NEWME CLASS"}
            </Badge>
            <h1 className="mb-6 text-4xl text-white sm:text-6xl" style={{ fontWeight: 800, lineHeight: 1.1 }}>
              {service.title}
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-zinc-400" style={{ lineHeight: 1.8 }}>
              {service.subtitle || service.description}
            </p>
          </motion.div>

          {highlights.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-10 flex flex-wrap justify-center gap-8">
              {highlights.map((item) => {
                const HighlightIcon = getCmsIcon(item.icon) as LucideIcon;
                return (
                  <div key={`${service.slug}-${item.label}`} className="flex items-center gap-3">
                    <HighlightIcon className="h-5 w-5 text-yellow-500" />
                    <div className="text-left">
                      <p className="text-sm text-white" style={{ fontWeight: 600 }}>{item.label}</p>
                      <p className="text-xs text-zinc-500">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-6">
          <Tabs defaultValue="courses">
            <div className="mb-10 flex justify-center">
              <TabsList className="h-auto gap-2 rounded-xl border border-white/10 bg-[#18181b] p-1.5">
                <TabsTrigger value="courses" className="rounded-lg px-6 py-2.5 text-zinc-400 data-[state=active]:bg-yellow-500 data-[state=active]:text-black">
                  Kursus
                </TabsTrigger>
                <TabsTrigger value="webinars" className="rounded-lg px-6 py-2.5 text-zinc-400 data-[state=active]:bg-yellow-500 data-[state=active]:text-black">
                  Webinar
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="courses">
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {(service.courses || []).map((course, index) => (
                  <motion.div key={course.id || `${service.slug}-course-${index}`} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }}>
                    <Card className="group h-full overflow-hidden border-white/10 bg-[#18181b] transition-colors hover:border-yellow-500/20">
                      <div className="relative h-40 overflow-hidden">
                        <ImageWithFallback src={course.image} alt={course.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#18181b] to-transparent" />
                        {course.badge ? (
                          <Badge className="absolute right-3 top-3 border-yellow-500/30 bg-yellow-500/10 text-yellow-500">{course.badge}</Badge>
                        ) : null}
                        <div className="absolute bottom-3 left-3 flex h-8 w-8 items-center justify-center rounded-full bg-yellow-500/90 text-black">
                          <Play className="h-3 w-3" />
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <h4 className="mb-1 text-sm text-white" style={{ fontWeight: 600, lineHeight: 1.4 }}>{course.title}</h4>
                        <p className="mb-3 text-xs text-zinc-500">{course.instructor}</p>
                        <div className="mb-3 flex items-center gap-3 text-xs text-zinc-400">
                          <span>{course.duration}</span>
                          <span className="flex items-center gap-1"><Users className="h-3 w-3" />{course.students}</span>
                          <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />{course.rating}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-yellow-500" style={{ fontWeight: 700 }}>{course.price}</span>
                          <Button size="sm" className="h-8 bg-yellow-500 text-xs text-black hover:bg-yellow-400" asChild>
                            <Link to={primaryCta.link}>Daftar</Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="webinars">
              <div className="space-y-4">
                {(service.webinars || []).map((webinar, index) => (
                  <motion.div key={webinar.id || `${service.slug}-webinar-${index}`} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }}>
                    <Card className="border-white/10 bg-[#18181b] transition-colors hover:border-yellow-500/20">
                      <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-yellow-500/10">
                            <Calendar className="h-5 w-5 text-yellow-500" />
                          </div>
                          <div>
                            <h4 className="text-white" style={{ fontWeight: 600 }}>{webinar.title}</h4>
                            <p className="text-sm text-zinc-400">{webinar.speaker} - {webinar.date}, {webinar.time}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-xs text-zinc-500">{webinar.spots} spots left</p>
                            <p className="text-yellow-500" style={{ fontWeight: 700 }}>{webinar.price}</p>
                          </div>
                          <Button className="bg-yellow-500 text-black hover:bg-yellow-400" asChild>
                            <Link to={secondaryCta.link}>Register</Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </div>
  );
}
