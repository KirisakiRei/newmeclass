import { motion } from "motion/react";
import { Settings } from "lucide-react";
import maintenanceIllustration from "../../assets/maintenance.png";

type MaintenancePageProps = {
  siteName?: string;
  tagline?: string;
};

export function MaintenancePage({
  siteName = "NEWME CLASS",
  tagline = "Kami akan segera kembali online.",
}: MaintenancePageProps) {
  return (
    <div className="relative h-[100dvh] overflow-hidden bg-[linear-gradient(180deg,#0a0a0a_0%,#121212_100%)] px-6 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(234,179,8,0.12),transparent_34%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(234,179,8,0.06),transparent_28%)]" />
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        className="absolute -left-12 top-16 text-yellow-500/10"
      >
        <Settings className="h-32 w-32 blur-[0.4px]" strokeWidth={1.4} />
      </motion.div>
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 56, repeat: Infinity, ease: "linear" }}
        className="absolute right-12 top-24 text-yellow-500/10"
      >
        <Settings className="h-24 w-24 blur-[0.2px]" strokeWidth={1.3} />
      </motion.div>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 52, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-20 right-[12%] text-yellow-500/10"
      >
        <Settings className="h-40 w-40 blur-[0.6px]" strokeWidth={1.2} />
      </motion.div>
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 44, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-10 left-[10%] text-yellow-500/10"
      >
        <Settings className="h-20 w-20 blur-[0.2px]" strokeWidth={1.25} />
      </motion.div>

      <div className="relative mx-auto flex h-[100dvh] max-w-5xl flex-col items-center justify-center overflow-hidden text-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full"
        >
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.42em] text-yellow-400 sm:mb-5 sm:text-sm">
            {siteName}
          </p>

          <div className="mx-auto flex max-w-4xl justify-center">
            <img
              src={maintenanceIllustration}
              alt="Website maintenance"
              className="mx-auto max-h-[50vh] w-full max-w-[760px] object-contain sm:max-h-[54vh]"
            />
          </div>

          <div className="mx-auto mt-1 max-w-4xl">
            <h1 className="whitespace-nowrap text-[clamp(1rem,3.1vw,3rem)] font-extrabold tracking-tight text-white">
              Website sedang dalam pemeliharaan
            </h1>
            <p className="mx-auto mt-3 whitespace-nowrap text-[clamp(0.72rem,1.4vw,1rem)] leading-7 text-zinc-400">
              {tagline}
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
