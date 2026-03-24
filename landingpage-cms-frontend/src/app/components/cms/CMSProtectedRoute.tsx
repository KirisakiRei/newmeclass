import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { Loader2 } from "lucide-react";
import { adminAuthAPI } from "../../../services/api";
import { clearAdminSession, setAdminSession } from "../../../lib/session";

type AdminProfile = {
  permissionKeys?: string[];
};

const hasCmsPermission = (profile?: AdminProfile | null) => {
  const permissions = profile?.permissionKeys || [];
  return permissions.includes("cms_access.manage");
};

export function CMSProtectedRoute() {
  const location = useLocation();
  const [status, setStatus] = useState<"loading" | "ready" | "unauthorized">("loading");
  const [reason, setReason] = useState<"unauthorized" | "forbidden">("unauthorized");

  useEffect(() => {
    let active = true;

    const hydrate = async () => {
      const token = localStorage.getItem("admin_token");
      if (!token) {
        if (active) {
          setReason("unauthorized");
          setStatus("unauthorized");
        }
        return;
      }

      try {
        const cachedRaw = localStorage.getItem("admin_data");
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (hasCmsPermission(cached)) {
            if (active) setStatus("ready");
            return;
          }
          clearAdminSession();
          if (active) {
            setReason("forbidden");
            setStatus("unauthorized");
          }
          return;
        }

        const profile = await adminAuthAPI.getProfile();
        setAdminSession(token, profile);
        if (!active) return;
        if (hasCmsPermission(profile)) {
          setStatus("ready");
          return;
        }
        clearAdminSession();
        setReason("forbidden");
        setStatus("unauthorized");
      } catch {
        clearAdminSession();
        if (active) {
          setReason("unauthorized");
          setStatus("unauthorized");
        }
      }
    };

    void hydrate();
    return () => {
      active = false;
    };
  }, []);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] text-zinc-300">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#18181b] px-5 py-4">
          <Loader2 className="h-5 w-5 animate-spin text-yellow-500" />
          Memuat akses CMS...
        </div>
      </div>
    );
  }

  if (status === "unauthorized") {
    const next = `${location.pathname}${location.search}`;
    const query = new URLSearchParams({ next });
    if (reason === "forbidden") {
      query.set("reason", "forbidden");
    }
    return <Navigate to={`/cms/login?${query.toString()}`} replace />;
  }

  return <Outlet />;
}
