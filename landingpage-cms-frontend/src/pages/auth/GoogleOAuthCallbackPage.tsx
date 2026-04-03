import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Loader2 } from "lucide-react";

export function GoogleOAuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const status = String(searchParams.get("status") || "").trim();
    const next = String(searchParams.get("next") || "").trim();
    const target = String(searchParams.get("target") || "/dashboard").trim() || "/dashboard";

    if (status !== "success") {
      navigate(`/login?error=${encodeURIComponent(String(searchParams.get("error") || "oauth_failed"))}`, { replace: true });
      return;
    }

    if (next === "complete-profile") {
      navigate("/auth/google/complete-profile", { replace: true });
      return;
    }

    window.location.href = target;
  }, [navigate, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4">
      <div className="rounded-2xl border border-white/10 bg-[#18181b] px-8 py-6 text-center text-white">
        <div className="flex items-center justify-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-yellow-500" />
          Menyambungkan sesi Google Anda...
        </div>
      </div>
    </div>
  );
}
