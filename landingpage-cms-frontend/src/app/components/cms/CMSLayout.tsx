import { useEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { useCMS } from "./CMSContext";
import {
  Settings, LayoutDashboard, Building2, Briefcase, ShoppingBag, Shield,
  ChevronDown, ChevronRight, Menu, X, LogOut, Save,
  Home, Image, Users, Star, Gift, Megaphone, Newspaper, Eye, Target,
  Layers, Sparkles, Heart, GraduationCap, Network, FileText,
  Bell, Search, Link as LinkIcon,
} from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { clearAdminSession } from "../../../lib/session";
import newmeLogo from "../../../assets/585f88d5e9a2256caa217475b070012672c11723.png";
import { SeoHead } from "../SeoHead";

interface MenuItem {
  label: string;
  icon: any;
  path?: string;
  children?: { label: string; icon: any; path: string }[];
}

const menuItems: MenuItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/cms" },
  { label: "Pengaturan Global", icon: Settings, path: "/cms/global" },
  { label: "Navigation", icon: LinkIcon, path: "/cms/navigation" },
  { label: "Media Library", icon: Image, path: "/cms/media" },
  {
    label: "Landing Page",
    icon: Home,
    children: [
      { label: "Hero Carousel", icon: Image, path: "/cms/landing/hero" },
      { label: "About Section", icon: Users, path: "/cms/landing/about" },
      { label: "Services Section", icon: Briefcase, path: "/cms/landing/services" },
      { label: "Promo Section", icon: Megaphone, path: "/cms/landing/promo" },
      { label: "Product Slider", icon: ShoppingBag, path: "/cms/landing/products" },
      { label: "Testimonial", icon: Star, path: "/cms/landing/testimonials" },
      { label: "Benefits", icon: Gift, path: "/cms/landing/benefits" },
      { label: "Activities", icon: Sparkles, path: "/cms/landing/activities" },
      { label: "Articles", icon: Newspaper, path: "/cms/landing/articles" },
      { label: "Visi & Misi", icon: Target, path: "/cms/landing/visi-misi" },
      { label: "Banner Slider", icon: Layers, path: "/cms/landing/banners" },
      { label: "Final CTA", icon: Megaphone, path: "/cms/landing/final-cta" },
    ],
  },
  { label: "Profil Perusahaan", icon: Building2, path: "/cms/company" },
  {
    label: "Layanan",
    icon: Briefcase,
    children: [
      { label: "Kelas Gali Bakat", icon: Sparkles, path: "/cms/layanan/personality-tests" },
      { label: "NEWME Clinic", icon: Heart, path: "/cms/layanan/clinic" },
      { label: "NEWME Class", icon: GraduationCap, path: "/cms/layanan/class" },
      { label: "NEWME Gallery", icon: Image, path: "/cms/layanan/gallery" },
      { label: "NEWME Net", icon: Network, path: "/cms/layanan/net" },
      { label: "Services Page", icon: Layers, path: "/cms/layanan/services" },
    ],
  },
  { label: "Shop Management", icon: ShoppingBag, path: "/cms/shop" },
  { label: "Privacy Policy", icon: Shield, path: "/cms/privacy" },
];

function SidebarItem({ item, collapsed }: { item: MenuItem; collapsed: boolean }) {
  const location = useLocation();
  const [open, setOpen] = useState(
    item.children?.some((c) => location.pathname === c.path) ?? false
  );
  const isActive = item.path === location.pathname;
  const hasActiveChild = item.children?.some((c) => location.pathname === c.path);

  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
            hasActiveChild ? "bg-yellow-500/10 text-yellow-500" : "text-zinc-400 hover:bg-white/5 hover:text-white"
          }`}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">{item.label}</span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
            </>
          )}
        </button>
        {!collapsed && (
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="ml-4 mt-1 space-y-0.5 border-l border-white/10 pl-3">
                  {item.children.map((child) => {
                    const childActive = location.pathname === child.path;
                    return (
                      <Link
                        key={child.path}
                        to={child.path}
                        className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] transition-colors ${
                          childActive ? "bg-yellow-500/10 text-yellow-500" : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
                        }`}
                      >
                        <child.icon className="h-3.5 w-3.5" />
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    );
  }

  return (
    <Link
      to={item.path!}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
        isActive ? "bg-yellow-500/10 text-yellow-500" : "text-zinc-400 hover:bg-white/5 hover:text-white"
      }`}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );
}

export function CMSLayout() {
  const { lastSaved } = useCMS();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const adminProfile = useMemo(() => {
    try {
      const raw = localStorage.getItem("admin_data");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);
  const adminInitial = String(adminProfile?.fullName || adminProfile?.name || "A").trim().charAt(0).toUpperCase() || "A";
  const adminName = String(adminProfile?.fullName || adminProfile?.name || "Admin CMS").trim();

  useEffect(() => {
    const ensureToken = () => {
      if (localStorage.getItem("admin_token")) return;
      clearAdminSession();
      navigate("/cms/login", { replace: true });
    };

    ensureToken();
    window.addEventListener("focus", ensureToken);
    window.addEventListener("storage", ensureToken);

    return () => {
      window.removeEventListener("focus", ensureToken);
      window.removeEventListener("storage", ensureToken);
    };
  }, [navigate]);

  const handleLogout = () => {
    clearAdminSession();
    navigate("/cms/login", { replace: true });
  };

  return (
    <>
      <SeoHead />
      <div className="flex h-screen bg-[#0a0a0a]" style={{ fontFamily: "'Poppins', sans-serif" }}>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-white/10 bg-[#111113] transition-all duration-300 lg:relative ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } ${sidebarOpen ? "w-64" : "w-16"}`}
      >
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-white/10 px-4">
          <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full">
            <img src={newmeLogo} alt="NEWME" className="h-full w-full object-contain" style={{ mixBlendMode: "screen" }} />
          </div>
          {sidebarOpen && (
            <div className="flex flex-col leading-none">
              <span className="text-sm text-white" style={{ fontWeight: 700 }}>
                NEWME <span className="text-yellow-500">CMS</span>
              </span>
              <span className="text-[9px] text-zinc-600">Content Management</span>
            </div>
          )}
          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto text-zinc-500 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Menu — native scroll agar flex-1 + overflow-y-auto bekerja dengan benar */}
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
          <div className="space-y-1">
            {menuItems.map((item) => (
              <SidebarItem key={item.label} item={item} collapsed={!sidebarOpen} />
            ))}
          </div>
        </div>

        {/* Sidebar footer */}
        <div className="shrink-0 border-t border-white/10 p-3">
          {sidebarOpen && lastSaved && (
            <div className="mb-2 flex items-center gap-1.5 px-1">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
              <span className="text-[10px] text-zinc-600">Tersimpan {lastSaved}</span>
            </div>
          )}
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 text-xs text-zinc-500 hover:text-yellow-500 hover:bg-yellow-500/5"
              onClick={() => navigate("/")}
            >
              <Eye className="mr-1 h-3.5 w-3.5" />
              {sidebarOpen && "Preview"}
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-[#111113] px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { if (window.innerWidth < 1024) setMobileOpen(true); else setSidebarOpen(!sidebarOpen); }}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/5 hover:text-white"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 sm:flex">
              <Search className="h-4 w-4 text-zinc-600" />
              <input
                placeholder="Cari menu..."
                className="w-48 bg-transparent text-sm text-zinc-300 placeholder:text-zinc-600 outline-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {lastSaved && (
              <Badge variant="outline" className="hidden border-green-500/30 bg-green-500/10 text-[10px] text-green-500 sm:flex">
                <Save className="mr-1 h-3 w-3" /> Auto-saved
              </Badge>
            )}
            <Button variant="ghost" size="sm" className="relative text-zinc-400 hover:text-white hover:bg-white/5">
              <Bell className="h-4 w-4" />
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-yellow-500" />
            </Button>
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-2 py-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-500/20 text-xs text-yellow-500" style={{ fontWeight: 600 }}>
                {adminInitial}
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-xs text-white" style={{ fontWeight: 600 }}>{adminName}</p>
                <p className="text-[10px] text-zinc-500">Landing CMS</p>
              </div>
              <Button variant="ghost" size="sm" className="hidden text-zinc-500 hover:text-red-400 sm:inline-flex" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6">
            <Outlet />
          </div>
        </main>
      </div>
      </div>
    </>
  );
}
