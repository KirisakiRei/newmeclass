import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "./ui/navigation-menu";
import { Button } from "./ui/button";
import { useCMS } from "./cms/CMSContext";
import { resolveBackendAssetUrl } from "../../lib/public-url";
import { authAPI } from "../../services/api";
import { buildDashboardBridgeUrl, clearUserSession, getUserSessionEventName, hasUserSession } from "../../lib/session";
import newmeLogo from "../../assets/585f88d5e9a2256caa217475b070012672c11723.png";

export function Navbar() {
  const location = useLocation();
  const { data } = useCMS();
  const [isLoggedIn, setIsLoggedIn] = useState(() => hasUserSession());
  const [redirecting, setRedirecting] = useState(false);
  const siteName = data.global.siteName || "NEWME CLASS";
  const [brandPrimary, brandAccent = ""] = siteName.split(" ");
  const navLinks = data.navigation.mainLinks;
  const serviceLinks = data.navigation.serviceLinks;
  const loginLink = data.navigation.authLinks.login;
  const registerLink = data.navigation.authLinks.register;
  const logoSrc = resolveBackendAssetUrl(data.global.logoUrl, newmeLogo);

  useEffect(() => {
    let active = true;
    const validateSession = async () => {
      if (!hasUserSession()) {
        if (active) setIsLoggedIn(false);
        return;
      }

      try {
        await authAPI.getProfile();
        if (active) setIsLoggedIn(true);
      } catch {
        clearUserSession();
        if (active) setIsLoggedIn(false);
      }
    };
    const syncSessionState = () => {
      void validateSession();
    };

    void validateSession();
    window.addEventListener("storage", syncSessionState);
    window.addEventListener("focus", syncSessionState);
    document.addEventListener("visibilitychange", syncSessionState);
    window.addEventListener(getUserSessionEventName(), syncSessionState);
    return () => {
      active = false;
      window.removeEventListener("storage", syncSessionState);
      window.removeEventListener("focus", syncSessionState);
      document.removeEventListener("visibilitychange", syncSessionState);
      window.removeEventListener(getUserSessionEventName(), syncSessionState);
    };
  }, [location.pathname]);

  const handleDashboardRedirect = async () => {
    if (!isLoggedIn || redirecting) return;
    setRedirecting(true);
    try {
      const bridge = await authAPI.createBridgeTicket("/dashboard");
      const ticket = bridge?.ticket || bridge?.token;
      if (!ticket) throw new Error("Bridge ticket login tidak ditemukan");
      window.location.href = buildDashboardBridgeUrl(ticket, "/dashboard");
    } catch {
      clearUserSession();
      window.location.href = loginLink.href;
    } finally {
      setRedirecting(false);
    }
  };

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full">
            <img
              src={logoSrc}
              alt="NEWME Logo"
              className="h-full w-full object-contain"
              style={{ mixBlendMode: "screen" }}
            />
          </div>

          <div className="flex flex-col leading-none">
            <span className="text-base text-white sm:text-[17px]" style={{ fontWeight: 800, letterSpacing: "0.01em" }}>
              {brandPrimary} {brandAccent ? <span className="text-yellow-500">{brandAccent}</span> : null}
            </span>
            <span
              className="mt-0.5 hidden text-[10px] italic text-zinc-500 sm:block"
              style={{ letterSpacing: "0.02em" }}
            >
              {data.global.tagline}
            </span>
          </div>
        </Link>

        <NavigationMenu className="hidden lg:flex">
          <NavigationMenuList className="gap-1">
            {navLinks.slice(0, 2).map((link) => (
              <NavigationMenuItem key={link.href}>
                <NavigationMenuLink asChild>
                  <Link
                    to={link.href}
                    className={`px-4 py-2 text-sm transition-colors hover:text-yellow-500 ${
                      location.pathname === link.href ? "text-yellow-500" : "text-zinc-300"
                    }`}
                  >
                    {link.label}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            ))}

            {serviceLinks.length > 0 && (
              <NavigationMenuItem>
                <NavigationMenuTrigger className="bg-transparent text-sm text-zinc-300 hover:bg-transparent hover:text-yellow-500 data-[state=open]:bg-transparent data-[state=open]:text-yellow-500">
                  Layanan
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-56 gap-1 rounded-lg border border-white/10 bg-[#18181b] p-2">
                    {serviceLinks.map((item) => (
                      <li key={item.href}>
                        <NavigationMenuLink asChild>
                          <Link
                            to={item.href}
                            className="block rounded-md px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-white/5 hover:text-yellow-500"
                          >
                            {item.label}
                          </Link>
                        </NavigationMenuLink>
                      </li>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
            )}

            {navLinks.slice(2).map((link) => (
              <NavigationMenuItem key={link.href}>
                <NavigationMenuLink asChild>
                  <Link
                    to={link.href}
                    className={`px-4 py-2 text-sm transition-colors hover:text-yellow-500 ${
                      location.pathname === link.href ? "text-yellow-500" : "text-zinc-300"
                    }`}
                  >
                    {link.label}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        <div className="hidden items-center gap-3 lg:flex">
          {isLoggedIn ? (
            <Button
              type="button"
              className="bg-yellow-500 text-sm text-black hover:bg-yellow-400"
              onClick={() => void handleDashboardRedirect()}
              disabled={redirecting}
            >
              {redirecting ? "Mengarahkan..." : "Dashboard"}
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                className="text-sm text-zinc-300 hover:bg-yellow-500/5 hover:text-yellow-500"
                asChild
              >
                <Link to={loginLink.href}>{loginLink.label}</Link>
              </Button>
              <Button className="bg-yellow-500 text-sm text-black hover:bg-yellow-400" asChild>
                <Link to={registerLink.href}>{registerLink.label}</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
