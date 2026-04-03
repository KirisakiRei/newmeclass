import { useEffect } from "react";
import { useLocation } from "react-router";
import { getDashboardBaseUrl } from "../../lib/session";

const buildTargetUrl = (pathname: string, search: string, audience: "mitra" | "yayasan") => {
  const normalizedPath = String(pathname || "").trim();
  const suffix = normalizedPath === `/${audience}` || normalizedPath === `/${audience}/`
    ? `/${audience}/login`
    : normalizedPath.startsWith(`/${audience}/`)
      ? normalizedPath
      : `/${audience}/login`;

  const url = new URL(suffix, `${getDashboardBaseUrl()}/`);
  if (search) {
    const params = new URLSearchParams(search);
    params.forEach((value, key) => {
      url.searchParams.append(key, value);
    });
  }
  return url.toString();
};

function DashboardAuthRedirect({ audience }: { audience: "mitra" | "yayasan" }) {
  const location = useLocation();

  useEffect(() => {
    const target = buildTargetUrl(location.pathname, location.search, audience);
    window.location.replace(target);
  }, [audience, location.pathname, location.search]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-6 text-center text-zinc-300">
      Mengalihkan ke halaman login {audience}...
    </div>
  );
}

export function MitraAuthRedirectPage() {
  return <DashboardAuthRedirect audience="mitra" />;
}

export function YayasanAuthRedirectPage() {
  return <DashboardAuthRedirect audience="yayasan" />;
}
