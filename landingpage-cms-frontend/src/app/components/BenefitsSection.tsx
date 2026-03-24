import { motion } from "motion/react";
import { Button } from "./ui/button";
import { Link } from "react-router";
import { useCMS } from "./cms/CMSContext";

export function BenefitsSection() {
  const { data } = useCMS();
  const benefits = data.benefits;

  return (
    <section className="bg-[#0a0a0a] py-24">
      <div className="mx-auto grid max-w-7xl gap-16 px-6 lg:grid-cols-5">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="lg:sticky lg:top-32 lg:col-span-2 lg:self-start"
        >
          <p className="mb-3 text-sm tracking-[0.15em] text-yellow-500" style={{ fontWeight: 500 }}>KENAPA KAMI</p>
          <h2 className="mb-6 text-3xl text-white sm:text-4xl" style={{ fontWeight: 700, lineHeight: 1.2 }}>
            Manfaat Mengikuti Program NEWME
          </h2>
          <p className="mb-8 text-zinc-400" style={{ lineHeight: 1.7 }}>
            Kami memberikan pengalaman transformatif yang akan mengubah cara Anda memandang diri sendiri.
          </p>
          <Button className="bg-yellow-500 px-8 py-6 text-black hover:bg-yellow-400" asChild>
            <Link to="/services">Mulai Perjalanan</Link>
          </Button>
        </motion.div>

        <div className="flex flex-col gap-8 lg:col-span-3">
          {benefits.map((b, i) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="relative rounded-xl border border-white/10 bg-[#18181b] p-6 pl-16 sm:pl-20"
            >
              <span className="absolute left-4 top-2 text-6xl text-white/5" style={{ fontWeight: 900 }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mb-2 text-white" style={{ fontWeight: 600 }}>{b.title}</h3>
              <p className="text-sm text-zinc-400" style={{ lineHeight: 1.7 }}>{b.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
