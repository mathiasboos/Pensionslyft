// Structured data (schema.org JSON-LD) in one place, so the pages do not repeat it.
export const SITE_URL = "https://pensionslyft.se";
export const SITE_NAME = "Pensionslyft";
export const CONTACT_EMAIL = "info@pensionslyft.se";
export const DEFAULT_IMAGE = "/og-default.png";
export const DEFAULT_IMAGE_ALT = "Pensionslyft – kalkylatorer och guider om svensk pension";

export type Json = Record<string, unknown>;

export function absolute(path: string): string {
  return new URL(path, SITE_URL).href;
}

export const organization: Json = {
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: SITE_NAME,
  url: SITE_URL,
  logo: absolute("/apple-touch-icon.png"),
  email: CONTACT_EMAIL,
  contactPoint: { "@type": "ContactPoint", email: CONTACT_EMAIL, contactType: "customer support", availableLanguage: "sv" },
};

export function homeData(lang: "sv" | "en" = "sv"): Json[] {
  const en = lang === "en";
  return [
    { "@context": "https://schema.org", ...organization },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": en ? `${SITE_URL}/en#website` : `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: en ? `${SITE_URL}/en` : SITE_URL,
      inLanguage: en ? "en-GB" : "sv-SE",
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ];
}

export function breadcrumbs(trail: { name: string; path: string }[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((step, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: step.name,
      item: absolute(step.path),
    })),
  };
}

export function webApplication(app: { name: string; description: string; path: string; keywords?: string[] }): Json {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: app.name,
    description: app.description,
    url: absolute(app.path),
    applicationCategory: "FinanceApplication",
    operatingSystem: "Alla (webbläsare)",
    inLanguage: "sv-SE",
    ...(app.keywords?.length ? { keywords: app.keywords.join(", ") } : {}),
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "SEK" },
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
}

export function articleData(a: {
  type: "NewsArticle" | "Article";
  title: string;
  description: string;
  path: string;
  published: Date;
  tags: string[];
  author?: string;
  image?: string;
  source?: { name: string; url?: string };
  lang?: "sv" | "en";
}): Json {
  return {
    "@context": "https://schema.org",
    "@type": a.type,
    headline: a.title,
    description: a.description,
    datePublished: a.published.toISOString(),
    dateModified: a.published.toISOString(),
    mainEntityOfPage: { "@type": "WebPage", "@id": absolute(a.path) },
    image: [absolute(a.image ?? DEFAULT_IMAGE)],
    keywords: a.tags.join(", "),
    author: { "@type": "Organization", name: a.author ?? SITE_NAME },
    publisher: { "@id": `${SITE_URL}/#organization` },
    ...(a.source?.url ? { isBasedOn: a.source.url, citation: a.source.url } : {}),
    inLanguage: a.lang === "en" ? "en-GB" : "sv-SE",
    isAccessibleForFree: true,
  };
}
