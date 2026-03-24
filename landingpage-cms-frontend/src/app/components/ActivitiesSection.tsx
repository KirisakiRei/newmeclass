import { motion } from "motion/react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { useCMS } from "./cms/CMSContext";

export function ActivitiesSection() {
  const { data } = useCMS();
  const activities = data.activities;

  return (
    <section className="bg-[#0a0a0a] py-24">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <p className="mb-3 text-sm tracking-[0.15em] text-yellow-500" style={{ fontWeight: 500 }}>AKTIVITAS</p>
          <h2 className="text-3xl text-white sm:text-4xl" style={{ fontWeight: 700 }}>
            Dokumentasi Kegiatan
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:grid-rows-2">
          {activities.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className={`group relative overflow-hidden rounded-xl ${i === 0 ? "col-span-2 row-span-2" : ""}`}
            >
              <ImageWithFallback
                src={a.image}
                alt={a.caption ?? a.title}
                className="h-full min-h-48 w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <p className="p-4 text-sm text-white" style={{ fontWeight: 500 }}>{a.caption ?? a.title}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
