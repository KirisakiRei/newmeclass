import { Link, useLocation } from "react-router";
import { Home, LayoutGrid, Phone, ShoppingBag, type LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import { useCMS } from "./cms/CMSContext";
import { resolveBackendAssetUrl } from "../../lib/public-url";
import newmeLogo from "../../assets/585f88d5e9a2256caa217475b070012672c11723.png";

const resolveIcon = (href: string): LucideIcon => {
  if (href.startsWith("/services")) return LayoutGrid;
  if (href.startsWith("/shop")) return ShoppingBag;
  if (href.startsWith("/contact")) return Phone;
  return Home;
};

function isActive(href: string, pathname: string, exact: boolean) {
  if (exact) return pathname === href;
  return pathname.startsWith(href);
}

export function MobileBottomNav() {
  const location = useLocation();
  const { data } = useCMS();
  const homeLink = data.navigation.mainLinks.find((item) => item.href === "/") || {
    label: "Beranda",
    href: "/",
  };
  const shopLink = data.navigation.mainLinks.find((item) => item.href.startsWith("/shop")) || {
    label: "Shop",
    href: "/shop",
  };
  const contactLink = data.navigation.mainLinks.find((item) => item.href.startsWith("/contact")) || {
    label: "Kontak",
    href: "/contact",
  };
  const navItems = [
    { ...homeLink, icon: resolveIcon(homeLink.href), exact: true },
    { label: "Layanan", href: "/services", icon: resolveIcon("/services"), exact: false },
    { ...shopLink, icon: resolveIcon(shopLink.href), exact: false },
    { ...contactLink, icon: resolveIcon(contactLink.href), exact: false },
  ];
  const left = navItems.slice(0, 2);
  const right = navItems.slice(2);
  const loginLink = data.navigation.authLinks.login;
  const logoSrc = resolveBackendAssetUrl(data.global.logoUrl, newmeLogo);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
      <div className="relative border-t border-white/10 bg-[#0a0a0a]/95 backdrop-blur-xl">
        <div className="flex h-16 items-center justify-around px-1">
          {left.map((item) => {
            const active = isActive(item.href, location.pathname, item.exact);
            return (
              <Link
                key={item.href}
                to={item.href}
                className="relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1 transition-all"
              >
                {active && (
                  <motion.div
                    layoutId="bottom-nav-indicator"
                    className="absolute -top-px h-0.5 w-8 rounded-full bg-yellow-500"
                  />
                )}
                <item.icon
                  className={`h-5 w-5 transition-colors ${active ? "text-yellow-500" : "text-zinc-500"}`}
                  strokeWidth={active ? 2.2 : 1.8}
                />
                <span
                  className={`text-[10px] transition-colors ${active ? "text-yellow-500" : "text-zinc-500"}`}
                  style={{ fontWeight: active ? 600 : 400 }}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}

          <div className="flex flex-1 flex-col items-center justify-center">
            <Link to={loginLink.href} className="relative -translate-y-5 flex flex-col items-center">
              <div className="absolute inset-0 rounded-full bg-yellow-500/20 blur-lg" />
              <div className="relative flex h-[52px] w-[52px] items-center justify-center rounded-full border-2 border-yellow-500/60 bg-[#0a0a0a] shadow-[0_4px_24px_rgba(234,179,8,0.35)]">
                <div className="absolute inset-1 rounded-full bg-gradient-to-br from-yellow-400/20 to-yellow-600/10" />
                <img
                  src={logoSrc}
                  alt="NEWME"
                  className="relative h-9 w-9 object-contain"
                  style={{ mixBlendMode: "screen" }}
                />
              </div>
              <span className="mt-0.5 text-[10px] text-yellow-500" style={{ fontWeight: 700 }}>
                {loginLink.label}
              </span>
            </Link>
          </div>

          {right.map((item) => {
            const active = isActive(item.href, location.pathname, item.exact);
            return (
              <Link
                key={item.href}
                to={item.href}
                className="relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1 transition-all"
              >
                {active && (
                  <motion.div
                    layoutId="bottom-nav-indicator"
                    className="absolute -top-px h-0.5 w-8 rounded-full bg-yellow-500"
                  />
                )}
                <item.icon
                  className={`h-5 w-5 transition-colors ${active ? "text-yellow-500" : "text-zinc-500"}`}
                  strokeWidth={active ? 2.2 : 1.8}
                />
                <span
                  className={`text-[10px] transition-colors ${active ? "text-yellow-500" : "text-zinc-500"}`}
                  style={{ fontWeight: active ? 600 : 400 }}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
        <div style={{ height: "env(safe-area-inset-bottom, 0px)" }} />
      </div>
    </nav>
  );
}
