import { Link } from "react-router";
import { Mail, MapPin, Phone } from "lucide-react";
import { useCMS } from "./cms/CMSContext";
import { resolveBackendAssetUrl } from "../../lib/public-url";
import newmeLogo from "../../assets/585f88d5e9a2256caa217475b070012672c11723.png";

export function Footer() {
  const { data } = useCMS();
  const siteName = data.global.siteName || "NEWME CLASS";
  const [brandPrimary, brandAccent = ""] = siteName.split(" ");
  const phoneHref = String(data.global.phone || "").replace(/[^\d+]/g, "");
  const footerMenuLinks = data.navigation.footerMenuLinks;
  const footerServiceLinks = data.navigation.footerServiceLinks;
  const legalLinks = data.navigation.legalLinks;
  const logoSrc = resolveBackendAssetUrl(data.global.logoUrl, newmeLogo);

  return (
    <footer className="border-t border-white/10 bg-[#0a0a0a] pb-20 lg:pb-0">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-4">
            <Link to="/" className="flex items-center gap-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full">
                <img src={logoSrc} alt="NEWME Logo" className="h-full w-full object-contain" style={{ mixBlendMode: "screen" }} />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-lg text-white" style={{ fontWeight: 800 }}>
                  {brandPrimary} {brandAccent ? <span className="text-yellow-500">{brandAccent}</span> : null}
                </span>
                <span className="mt-1 text-[11px] italic text-zinc-500">{data.global.tagline}</span>
              </div>
            </Link>
            <p className="text-sm leading-7 text-zinc-400">{data.companyProfile.description}</p>
          </div>

          <div className="flex flex-col gap-4">
            <h4 className="text-sm text-white" style={{ fontWeight: 600 }}>Menu</h4>
            <nav className="flex flex-col gap-2">
              {footerMenuLinks.map((item) => (
                <Link key={item.href} to={item.href} className="text-sm text-zinc-400 transition-colors hover:text-white">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex flex-col gap-4">
            <h4 className="text-sm text-white" style={{ fontWeight: 600 }}>Layanan</h4>
            <nav className="flex flex-col gap-2">
              {footerServiceLinks.map((item) => (
                <Link key={item.href} to={item.href} className="text-sm text-zinc-400 transition-colors hover:text-white">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex flex-col gap-4">
            <h4 className="text-sm text-white" style={{ fontWeight: 600 }}>Kontak</h4>
            <div className="flex flex-col gap-3">
              <a href={phoneHref ? `tel:${phoneHref}` : undefined} className="flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white">
                <Phone className="h-4 w-4 text-yellow-500" />
                {data.global.phone}
              </a>
              <a href={`mailto:${data.global.email}`} className="flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white">
                <Mail className="h-4 w-4 text-yellow-500" />
                {data.global.email}
              </a>
              <p className="flex items-start gap-2 text-sm text-zinc-400">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
                {data.global.address}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-6 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-6 overflow-hidden rounded-full opacity-60">
              <img src={logoSrc} alt="NEWME" className="h-full w-full object-contain" style={{ mixBlendMode: "screen" }} />
            </div>
            <p className="text-xs text-zinc-500">© 2026 {siteName}. All rights reserved.</p>
          </div>
          <div className="flex gap-6">
            {legalLinks.map((item) => (
              <Link key={item.href} to={item.href} className="text-xs text-zinc-500 transition-colors hover:text-white">
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
