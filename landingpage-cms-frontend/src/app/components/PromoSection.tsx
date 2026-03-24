import { motion } from "motion/react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Check } from "lucide-react";
import { Link } from "react-router";
import { useCMS } from "./cms/CMSContext";

export function PromoSection() {
  const { data } = useCMS();
  const { badge, title, description, tests, ctaText, ctaLink, enabled } = data.promo;

  if (!enabled) return null;

  return (
    <section className="relative overflow-hidden py-24">
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-600/20 via-[#0a0a0a] to-[#0a0a0a]" />
      <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-yellow-500/5 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="relative z-10 mx-auto max-w-3xl px-6 text-center"
      >
        <Badge className="mb-6 border-yellow-500/30 bg-yellow-500/10 text-yellow-500">
          {badge}
        </Badge>
        <h2 className="mb-4 text-4xl text-white sm:text-5xl" style={{ fontWeight: 800, lineHeight: 1.1 }}>
          {title.includes("NEWME") ? (
            <>
              {title.split("NEWME")[0]}
              <span className="bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
                NEWME
              </span>
              {title.split("NEWME")[1]}
            </>
          ) : title}
        </h2>
        <p className="mb-10 text-zinc-400" style={{ lineHeight: 1.7 }}>
          {description}
        </p>

        {tests && tests.length > 0 && (
          <div className="mb-10 flex flex-wrap justify-center gap-3">
            {tests.map((t, i) => (
              <motion.div
                key={t}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <Badge variant="outline" className="gap-2 border-white/10 bg-[#18181b] px-4 py-2 text-zinc-300">
                  <Check className="h-3 w-3 text-yellow-500" />
                  {t}
                </Badge>
              </motion.div>
            ))}
          </div>
        )}

        <Button className="bg-yellow-500 px-10 py-6 text-lg text-black hover:bg-yellow-400" asChild>
          <Link to={ctaLink}>{ctaText}</Link>
        </Button>
      </motion.div>
    </section>
  );
}
