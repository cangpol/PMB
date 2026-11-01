import { useEffect } from "react";

interface SeoHeadProps {
  title: string;
  description?: string;
  canonical?: string;
  ogType?: string;
}

export const SeoHead = ({
  title,
  description = "Penerimaan Mahasiswa Baru Universitas Pignatelli Triputra (UPITRA). Pendaftaran sarjana dan diploma resmi dengan beasiswa unggulan.",
  canonical,
  ogType = "website",
}: SeoHeadProps) => {
  useEffect(() => {
    const fullTitle = title.includes("UPITRA")
      ? title
      : `${title} | PMB UPITRA 2026`;
    document.title = fullTitle;

    // Meta Description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute("content", description);

    // Open Graph Title
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.setAttribute("content", fullTitle);
    }

    // Open Graph Description
    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) {
      ogDesc.setAttribute("content", description);
    }

    // Open Graph Type
    let ogTypeEl = document.querySelector('meta[property="og:type"]');
    if (ogTypeEl) {
      ogTypeEl.setAttribute("content", ogType);
    }

    // Canonical link
    if (canonical) {
      let linkCanonical = document.querySelector(
        'link[rel="canonical"]',
      ) as HTMLLinkElement | null;
      if (!linkCanonical) {
        linkCanonical = document.createElement("link");
        linkCanonical.setAttribute("rel", "canonical");
        document.head.appendChild(linkCanonical);
      }
      linkCanonical.setAttribute("href", canonical);
    }
  }, [title, description, canonical, ogType]);

  return null;
};
