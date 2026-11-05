import { useEffect } from "react";

interface DocsSchemaProps {
  title: string;
  description: string;
  slug: string;
  section: string;
  dateModified?: string;
}

/**
 * JSON-LD structured data for documentation pages
 * Uses TechArticle schema type for technical documentation
 */
export function DocsSchema({
  title,
  description,
  slug,
  section,
  dateModified,
}: DocsSchemaProps) {
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "docs-schema";
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "TechArticle",
      headline: title,
      description: description,
      dateModified: dateModified || new Date().toISOString().split("T")[0],
      author: {
        "@type": "Organization",
        name: "StudyOS Team",
        url: "https://github.com/saishivasanjeethpaikarao-jpg/StudyOS",
      },
      publisher: {
        "@type": "Organization",
        name: "StudyOS",
        url: "https://studyos-web-8ruc.onrender.com",
        logo: {
          "@type": "ImageObject",
          url: "https://studyos-web-8ruc.onrender.com/og-image.png",
        },
      },
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": `https://studyos-web-8ruc.onrender.com/docs/${slug}`,
      },
      articleSection: section,
      inLanguage: "en",
      isAccessibleForFree: true,
      image: "https://studyos-web-8ruc.onrender.com/og-image.png",
    });

    // Remove existing schema if present
    const existing = document.getElementById("docs-schema");
    if (existing) existing.remove();

    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [title, description, slug, section, dateModified]);

  return null;
}
