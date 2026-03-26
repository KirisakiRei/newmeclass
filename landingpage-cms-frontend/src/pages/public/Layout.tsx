import { Outlet, useLocation } from "react-router";
import { Navbar } from "../../app/components/Navbar";
import { Footer } from "../../app/components/Footer";
import { ScrollToTop } from "../../app/components/ScrollToTop";
import { MobileBottomNav } from "../../app/components/MobileBottomNav";
import { SeoHead } from "../../app/components/SeoHead";
import { MaintenancePage } from "../../app/components/MaintenancePage";
import { VisitorAnalyticsTracker } from "../../app/components/VisitorAnalyticsTracker";
import { useCMS } from "../../app/components/cms/CMSContext";

export function Layout() {
  const location = useLocation();
  const { data, loading } = useCMS();
  const hideFooter = location.pathname === "/login" || location.pathname === "/register";
  const maintenanceMode = Boolean(data.global.maintenanceMode);

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#0a0a0a] text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
        <SeoHead />
        <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-sm text-zinc-300">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-yellow-500 border-t-transparent" />
          Memuat halaman...
        </div>
      </div>
    );
  }

  if (maintenanceMode) {
    return (
      <>
        <ScrollToTop />
        <SeoHead />
        <MaintenancePage
          siteName={data.global.siteName}
          tagline="Kami akan segera kembali online."
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <ScrollToTop />
      <VisitorAnalyticsTracker />
      <SeoHead />
      <Navbar />
      <main className={hideFooter ? "" : "pb-16 lg:pb-0"}>
        <Outlet />
      </main>
      {!hideFooter && <Footer />}
      {!hideFooter && <MobileBottomNav />}
    </div>
  );
}
