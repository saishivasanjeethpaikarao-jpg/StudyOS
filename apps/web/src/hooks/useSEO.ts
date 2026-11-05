import { useEffect } from "react";

interface SEOConfig {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
  ogType?: "website" | "article";
  noindex?: boolean;
}

const BASE_URL = "https://studyos-web-8ruc.onrender.com";
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-image.png`;
const SITE_NAME = "StudyOS";

/**
 * Hook for managing per-page SEO meta tags
 * Updates document title and meta tags dynamically
 */
export function useSEO(config: SEOConfig) {
  useEffect(() => {
    const { title, description, canonical, ogImage, ogType = "website", noindex } = config;
    
    // Update document title
    const fullTitle = title === SITE_NAME ? title : `${title} | ${SITE_NAME}`;
    document.title = fullTitle;
    
    // Helper to update or create meta tag
    const setMeta = (name: string, content: string, isProperty = false) => {
      const attr = isProperty ? "property" : "name";
      let meta = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
      
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute(attr, name);
        document.head.appendChild(meta);
      }
      
      meta.content = content;
    };
    
    // Helper to update or create link tag
    const setLink = (rel: string, href: string) => {
      let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
      
      if (!link) {
        link = document.createElement("link");
        link.rel = rel;
        document.head.appendChild(link);
      }
      
      link.href = href;
    };
    
    // Basic meta tags
    setMeta("title", fullTitle);
    setMeta("description", description);
    
    // Robots
    if (noindex) {
      setMeta("robots", "noindex, nofollow");
    } else {
      setMeta("robots", "index, follow");
    }
    
    // Canonical URL
    const canonicalUrl = canonical ? `${BASE_URL}${canonical}` : BASE_URL;
    setLink("canonical", canonicalUrl);
    
    // Open Graph
    setMeta("og:title", fullTitle, true);
    setMeta("og:description", description, true);
    setMeta("og:url", canonicalUrl, true);
    setMeta("og:type", ogType, true);
    setMeta("og:image", ogImage || DEFAULT_OG_IMAGE, true);
    setMeta("og:site_name", SITE_NAME, true);
    
    // Twitter Card
    setMeta("twitter:title", fullTitle);
    setMeta("twitter:description", description);
    setMeta("twitter:url", canonicalUrl);
    setMeta("twitter:image", ogImage || DEFAULT_OG_IMAGE);
    
    // Cleanup function to restore defaults on unmount
    return () => {
      document.title = `${SITE_NAME} - Your study life, in one place`;
    };
  }, [config.title, config.description, config.canonical, config.ogImage, config.ogType, config.noindex]);
}

// Pre-defined SEO configs for common pages
export const SEO_CONFIGS = {
  landing: {
    title: "StudyOS",
    description: "Your study life, in one place. Bring assignments, subjects, deadlines and your daily plan together in one calm student workspace.",
    canonical: "/",
  },
  alternative: {
    sunsama: {
      title: "Open-Source Sunsama Alternative for Any AI Agent",
      description: "StudyOS builds on an open-source daily planner foundation with a board of days, time blocking, focus mode, and optional AI connections.",
      canonical: "/alternative/sunsama",
    },
  },
  download: {
    title: "Download StudyOS — Windows & Android Apps",
    description: "Download official StudyOS apps for Windows (Setup.exe) and Android (APK). Scan QR code to install directly on mobile.",
    canonical: "/download",
  },
  login: {
    title: "Sign In",
    description: "Sign in to your StudyOS account to access your daily planner and time-blocked schedule.",
    canonical: "/login",
    noindex: true,
  },
  register: {
    title: "Create Account",
    description: "Create your StudyOS account and start planning your day.",
    canonical: "/register",
    noindex: true,
  },
  privacy: {
    title: "Privacy Policy",
    description: "StudyOS privacy policy. Learn how we handle your data with transparency and respect for your privacy.",
    canonical: "/privacy",
  },
  terms: {
    title: "Terms of Service",
    description: "StudyOS terms of service. The terms and conditions for using our planning application.",
    canonical: "/terms",
  },
} as const;
