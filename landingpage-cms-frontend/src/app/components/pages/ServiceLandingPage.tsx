import { Link, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import { useMemo } from "react";
import { useCMS } from "../cms/CMSContext";
import { Button } from "../ui/button";
import { KelasGaliBakatServicePage } from "../public/services/KelasGaliBakatServicePage";
import { NewmeClinicServicePage } from "../public/services/NewmeClinicServicePage";
import { NewmeClassServicePage } from "../public/services/NewmeClassServicePage";
import { NewmeGalleryServicePage } from "../public/services/NewmeGalleryServicePage";
import { NewmeNetServicePage } from "../public/services/NewmeNetServicePage";

const resolveSlug = (slug?: string) => (slug === "newme-test" ? "personality-tests" : slug || "services");

export function ServiceLandingPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data } = useCMS();
  const serviceSlug = resolveSlug(slug);

  const page = useMemo(
    () => data.servicePages.find((item) => item.slug === serviceSlug && item.enabled),
    [data.servicePages, serviceSlug],
  );

  if (!page) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-6 pt-24 text-center">
        <div>
          <p className="mb-4 text-zinc-500">Halaman layanan tidak ditemukan.</p>
          <Button asChild className="bg-yellow-500 text-black hover:bg-yellow-400">
            <Link to="/services">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali ke Semua Layanan
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (serviceSlug === "personality-tests") {
    return <KelasGaliBakatServicePage service={page} />;
  }

  if (serviceSlug === "clinic") {
    return <NewmeClinicServicePage service={page} />;
  }

  if (serviceSlug === "class") {
    return <NewmeClassServicePage service={page} />;
  }

  if (serviceSlug === "gallery") {
    return <NewmeGalleryServicePage service={page} />;
  }

  if (serviceSlug === "net") {
    return <NewmeNetServicePage service={page} />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-6 pt-24 text-center">
      <div>
        <p className="mb-4 text-zinc-500">Slug layanan belum punya template publik.</p>
        <Button asChild className="bg-yellow-500 text-black hover:bg-yellow-400">
          <Link to="/services">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali ke Semua Layanan
          </Link>
        </Button>
      </div>
    </div>
  );
}

