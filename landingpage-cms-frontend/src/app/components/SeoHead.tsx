import { useEffect } from "react";
import { useLocation } from "react-router";
import { useCMS } from "./cms/CMSContext";
import { resolveBackendAssetUrl } from "../../lib/public-url";

const ensureNamedMeta = (name: string) => {
  let element = document.head.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute("name", name);
    document.head.appendChild(element);
  }
  return element;
};

const ensurePropertyMeta = (property: string) => {
  let element = document.head.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute("property", property);
    document.head.appendChild(element);
  }
  return element;
};

const ensureLinkTag = (rel: string) => {
  let element = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!element) {
    element = document.createElement("link");
    element.rel = rel;
    document.head.appendChild(element);
  }
  return element;
};

export function SeoHead() {
  const location = useLocation();
  const { data } = useCMS();
  const global = data.global;

  useEffect(() => {
    const siteName = global.siteName || "NEWME CLASS";
    const baseTitle = global.metaTitle || siteName;
    const pageTitle = location.pathname === "/" ? baseTitle : `${baseTitle} | ${siteName}`;
    const description = global.metaDescription || global.tagline || "Platform pengembangan diri dan talenta NEWME.";
    const keywords = global.metaKeywords || "";
    const iconUrl = resolveBackendAssetUrl(global.faviconUrl || global.logoUrl);
    const ogImageUrl = resolveBackendAssetUrl(global.logoUrl || global.faviconUrl);

    document.title = pageTitle;
    ensureNamedMeta("description").content = description;
    ensureNamedMeta("keywords").content = keywords;
    ensureNamedMeta("theme-color").content = "#0a0a0a";
    ensurePropertyMeta("og:title").content = pageTitle;
    ensurePropertyMeta("og:description").content = description;
    ensurePropertyMeta("og:type").content = "website";
    ensurePropertyMeta("og:image").content = ogImageUrl;

    if (iconUrl) {
      ensureLinkTag("icon").href = iconUrl;
      ensureLinkTag("apple-touch-icon").href = iconUrl;
    }
  }, [
    global.faviconUrl,
    global.logoUrl,
    global.metaDescription,
    global.metaKeywords,
    global.metaTitle,
    global.siteName,
    global.tagline,
    location.pathname,
  ]);

  return null;
}
