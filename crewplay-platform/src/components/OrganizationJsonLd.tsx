const SITE_URL = "https://www.crewplay.tw";

export function OrganizationJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "CrewPlay 運動媒合平台",
    alternateName: "CrewPlay",
    url: SITE_URL,
    logo: `${SITE_URL}/brand/logo.png`,
    description: "瀏覽全台揪團場地，線上預約羽球、桌球、排球等運動團。Find Your Play.",
    sameAs: [],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
