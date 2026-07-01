import type { Metadata } from "next";
import { GoogleAdsTag } from "@/components/GoogleAdsTag";
import { OrganizationJsonLd } from "@/components/OrganizationJsonLd";
import { SiteAnalytics } from "@/components/SiteAnalytics";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import "./globals.css";

const SITE_URL = "https://www.crewplay.tw";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "CrewPlay 運動媒合平台｜找球友、揪團、預約",
  description: "瀏覽全台揪團場地，線上預約羽球、桌球、排球等運動團。Find Your Play.",
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
    title: "CrewPlay 運動媒合平台",
    description: "找到你的運動夥伴，隨時開打",
    url: SITE_URL,
    siteName: "CrewPlay運動媒合平台",
    locale: "zh_TW",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "CrewPlay 運動媒合平台",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CrewPlay 運動媒合平台",
    description: "找到你的運動夥伴，隨時開打",
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
        <GoogleAdsTag />
        <SiteAnalytics />
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
