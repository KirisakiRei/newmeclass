import type { LucideIcon } from "lucide-react";
import { Sparkles } from "lucide-react";
import type { ServiceItem, ServicePageData } from "../../cms/CMSContext";
import { getCmsIcon } from "../../../../lib/cms-icons";

export const fallbackImage =
  "https://images.unsplash.com/photo-1773829020694-413e879d2957?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzZW1pbmFyJTIwYXVkaXRvcml1bSUyMHNwZWFrZXJ8ZW58MXx8fHwxNzc0MTk2NzgxfDA&ixlib=rb-4.1.0&q=80&w=1080";

const BADGE_TONE_CLASSES: Record<string, string> = {
  yellow: "border-yellow-500/30 bg-yellow-500/10 text-yellow-500",
  emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  blue: "border-blue-500/30 bg-blue-500/10 text-blue-400",
  purple: "border-purple-500/30 bg-purple-500/10 text-purple-400",
  orange: "border-orange-500/30 bg-orange-500/10 text-orange-400",
  zinc: "border-white/10 bg-white/5 text-zinc-300",
};

const ICON_TONE_CLASSES: Record<string, { bg: string; text: string }> = {
  yellow: { bg: "bg-yellow-500/15", text: "text-yellow-500" },
  emerald: { bg: "bg-emerald-500/15", text: "text-emerald-400" },
  blue: { bg: "bg-blue-500/15", text: "text-blue-400" },
  purple: { bg: "bg-purple-500/15", text: "text-purple-400" },
  orange: { bg: "bg-orange-500/15", text: "text-orange-400" },
};

const CONSULT_THEME_CLASSES: Record<string, string> = {
  emerald: "from-emerald-500 to-teal-600",
  yellow: "from-yellow-500 to-amber-600",
  blue: "from-blue-500 to-indigo-600",
  purple: "from-purple-500 to-fuchsia-600",
  orange: "from-orange-500 to-amber-600",
};

export const getBadgeToneClass = (tone?: string) => BADGE_TONE_CLASSES[tone || "yellow"] || BADGE_TONE_CLASSES.yellow;

export const getIconToneClass = (tone?: string) => ICON_TONE_CLASSES[tone || "yellow"] || ICON_TONE_CLASSES.yellow;

export const getConsultThemeClass = (theme?: string) => CONSULT_THEME_CLASSES[theme || "yellow"] || CONSULT_THEME_CLASSES.yellow;

export const getServiceIcon = (icon?: string): LucideIcon => getCmsIcon(icon) || Sparkles;

export const getServiceCardMeta = (homeServices: ServiceItem[], slug: string) => {
  const fromHome = homeServices.find((item) => {
    if (!item.link) return false;
    return item.link === `/services/${slug}` || item.link.endsWith(`/${slug}`);
  });

  return {
    badge: fromHome?.badge || "",
    badgeTone: fromHome?.badgeTone || "yellow",
    icon: getServiceIcon(fromHome?.icon),
    iconTone: fromHome?.iconTone || "yellow",
    image: fromHome?.image || "",
    tags: fromHome?.tags || [],
    subtitle: fromHome?.subtitle || "",
  };
};

export const getPrimaryCta = (service: ServicePageData) => ({
  text: service.heroPrimaryCtaText || "Hubungi Tim NEWME",
  link: service.heroPrimaryCtaLink || "/contact",
});

export const getSecondaryCta = (service: ServicePageData) => ({
  text: service.heroSecondaryCtaText || "Buat Akun",
  link: service.heroSecondaryCtaLink || "/register",
});
