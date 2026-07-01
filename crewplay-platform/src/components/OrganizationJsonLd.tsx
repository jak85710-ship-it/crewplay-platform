import { SITE_DESCRIPTION, SITE_OG_DESCRIPTION, SITE_TITLE, SITE_URL } from "@/lib/site-seo";

export function OrganizationJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_TITLE,
    alternateName: "CrewPlay",
    url: SITE_URL,
    logo: `${SITE_URL}/brand/logo.png`,
    description: SITE_DESCRIPTION,
    sameAs: [],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
