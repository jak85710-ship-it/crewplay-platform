import type { Metadata } from "next";
import { GoogleAdsTag } from "@/components/GoogleAdsTag";
import { OrganizationJsonLd } from "@/components/OrganizationJsonLd";
import { SiteAnalytics } from "@/components/SiteAnalytics";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { WebSiteJsonLd } from "@/components/WebSiteJsonLd";
import { SITE_DESCRIPTION, SITE_OG_DESCRIPTION, SITE_TITLE, SITE_URL } from "@/lib/site-seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s｜CrewPlay 運動媒合平台",
  },
  description: SITE_DESCRIPTION,
  applicationName: "CrewPlay",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/logo.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/favicon-48.png",
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_OG_DESCRIPTION,
    url: SITE_URL,
    siteName: "CrewPlay 運動媒合平台",
    locale: "zh_TW",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: SITE_TITLE,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_OG_DESCRIPTION,
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body className="flex min-h-screen flex-col antialiased">
        <OrganizationJsonLd />
        <WebSiteJsonLd />
        <GoogleAdsTag />
        <SiteAnalytics />
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
