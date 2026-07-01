import { SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from "@/lib/site-seo";

export function WebSiteJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_TITLE,
    alternateName: "CrewPlay",
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    inLanguage: "zh-Hant-TW",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/teams?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
