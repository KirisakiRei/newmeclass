import { motion } from "motion/react";
import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "../../app/components/ui/button";

export function PlaceholderPage({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] pt-16">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 text-center"
      >
        <p className="mb-3 text-sm tracking-[0.15em] text-yellow-500" style={{ fontWeight: 500 }}>
          {subtitle || "COMING SOON"}
        </p>
        <h1 className="mb-6 text-4xl text-white sm:text-5xl" style={{ fontWeight: 800 }}>
          {title}
        </h1>
        <p className="mb-8 text-zinc-400">
          Halaman ini sedang dalam pengembangan. Nantikan update terbaru kami.
        </p>
        <Button variant="outline" asChild>
          <Link to="/"><ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Beranda</Link>
        </Button>
      </motion.div>
    </div>
  );
}

export function NotFound() {
  return <PlaceholderPage title={"404 \u2014 Tidak Ditemukan"} subtitle="OOPS" />;
}
