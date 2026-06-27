import type { Metadata } from "next";
import { GoogleAdsTag } from "@/components/GoogleAdsTag";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import "./globals.css";

export const metadata: Metadata = {
  title: "CrewPlay 運動媒合平台｜找球友、揪團、預約",
  description: "瀏覽全台揪團場地，線上預約羽球、桌球、排球等運動團。Find Your Play.",
  openGraph: {
    title: "CrewPlay 運動媒合平台",
    description: "找到你的運動夥伴，隨時開打",
    url: "https://www.crewplay.tw",
    siteName: "CrewPlay運動媒合平台",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body className="flex min-h-screen flex-col antialiased">
        <GoogleAdsTag />
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
