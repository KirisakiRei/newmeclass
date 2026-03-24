import { useState } from "react";
import { motion } from "motion/react";
import { Badge } from "../../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { ImageWithFallback } from "../../figma/ImageWithFallback";
import { Camera, Film, Play, X } from "lucide-react";
import type { ServicePageData } from "../../cms/CMSContext";

export function NewmeGalleryServicePage({ service }: { service: ServicePageData }) {
  const [lightbox, setLightbox] = useState<number | null>(null);
  const photos = service.galleryPhotos || [];
  const videos = service.galleryVideos || [];

  return (
    <div className="bg-[#0a0a0a] pt-16">
      <section className="relative overflow-hidden py-24">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
            <Badge className="mb-6 border-yellow-500/30 bg-yellow-500/10 text-yellow-500">
              {service.heroBadge || "NEWME GALLERY"}
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

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-6">
          <Tabs defaultValue="photos">
            <div className="mb-10 flex justify-center">
              <TabsList className="h-auto gap-2 rounded-xl border border-white/10 bg-[#18181b] p-1.5">
                <TabsTrigger value="photos" className="rounded-lg px-6 py-2.5 text-zinc-400 data-[state=active]:bg-yellow-500 data-[state=active]:text-black">
                  <Camera className="mr-2 h-4 w-4" /> Foto
                </TabsTrigger>
                <TabsTrigger value="videos" className="rounded-lg px-6 py-2.5 text-zinc-400 data-[state=active]:bg-yellow-500 data-[state=active]:text-black">
                  <Film className="mr-2 h-4 w-4" /> Video
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="photos">
              <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
                {photos.map((photo, index) => (
                  <motion.div
                    key={photo.id || `${service.slug}-photo-${index}`}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.05 }}
                    className="group mb-4 cursor-pointer overflow-hidden rounded-xl border border-white/10"
                    onClick={() => setLightbox(index)}
                  >
                    <div className="relative">
                      <ImageWithFallback src={photo.src} alt={photo.caption} className="w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                        <div className="p-4">
                          <Badge className="mb-2 border-yellow-500/30 bg-yellow-500/10 text-xs text-yellow-500">{photo.category}</Badge>
                          <p className="text-sm text-white" style={{ fontWeight: 500 }}>{photo.caption}</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="videos">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {videos.map((video, index) => (
                  <motion.div key={video.id || `${service.slug}-video-${index}`} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.08 }}>
                    <div className="group cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-[#18181b] transition-colors hover:border-yellow-500/20">
                      <div className="relative flex h-40 items-center justify-center bg-gradient-to-br from-[#1a1a1f] to-[#18181b]">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-yellow-500/10 transition-colors group-hover:bg-yellow-500/20">
                          <Play className="h-6 w-6 text-yellow-500" />
                        </div>
                        <Badge className="absolute right-3 top-3 border-white/10 bg-black/50 text-xs text-zinc-300">{video.duration}</Badge>
                        <Badge className="absolute left-3 top-3 border-yellow-500/30 bg-yellow-500/10 text-xs text-yellow-500">{video.category}</Badge>
                      </div>
                      <div className="p-4">
                        <h4 className="mb-1 text-sm text-white" style={{ fontWeight: 600 }}>{video.title}</h4>
                        <p className="text-xs text-zinc-500">{video.speaker}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {lightbox !== null && photos[lightbox] ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-6" onClick={() => setLightbox(null)}>
          <button className="absolute right-6 top-6 text-white transition-colors hover:text-yellow-500" onClick={() => setLightbox(null)}>
            <X className="h-8 w-8" />
          </button>
          <img src={photos[lightbox].src} alt={photos[lightbox].caption} className="max-h-[80vh] max-w-full rounded-lg object-contain" />
          <p className="absolute bottom-8 text-center text-sm text-white" style={{ fontWeight: 500 }}>{photos[lightbox].caption}</p>
        </div>
      ) : null}
    </div>
  );
}

