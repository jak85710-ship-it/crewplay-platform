import Link from "next/link";

import { BrandLogo } from "@/components/BrandLogo";
import { BrandStorySection } from "@/components/BrandStorySection";
import { FeaturedTeamsCarousel } from "@/components/FeaturedTeamsCarousel";
import { HomeExploreCard, HomeSearch } from "@/components/HomeSearch";
import { NearbyTeamsSection } from "@/components/NearbyTeamsSection";
import { pickPopularTeams, pickRecommendedTeams } from "@/lib/featured-teams";
import { getAllTeams } from "@/lib/teams";

function countByField(values: string[]) {
  const map = new Map<string, number>();
  for (const value of values) {
    if (!value) continue;
    map.set(value, (map.get(value) ?? 0) + 1);
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));
}

export default async function HomePage() {
  const teams = await getAllTeams();
  const sports = countByField(teams.map((t) => t.sport))
    .slice(0, 8)
    .map((s) => s.name);
  const regions = countByField(teams.map((t) => t.region)).slice(0, 12);
  const popularTeams = pickPopularTeams(teams, 12);
  const recommendedTeams = pickRecommendedTeams(teams, 12);
  const featuredIds = [...popularTeams, ...recommendedTeams].map((t) => t.id);

  const exploreCards: HomeExploreCard[] = [
    { label: "羽球揪團", hint: "最受歡迎", href: "/teams?sport=羽球", icon: "🏸" },
    { label: "桌球揪團", hint: "輕鬆上手", href: "/teams?sport=桌球", icon: "🏓" },
    { label: "排球揪團", hint: "團隊運動", href: "/teams?sport=排球", icon: "🏐" },
    { label: "匹克球", hint: "新興項目", href: "/teams?sport=匹克球", icon: "🎾" },
    { label: "高雄地區", hint: "南部最多團", href: "/teams?region=高雄", icon: "📍" },
    { label: "台南地區", hint: "週末好去處", href: "/teams?region=臺南", icon: "📍" },
    { label: "新北地區", hint: "北區精選", href: "/teams?region=新北", icon: "📍" },
    { label: "週末開團", hint: "六日可報", href: "/teams?q=週", icon: "📅" },
    { label: "初學友善", hint: "入門、新手", href: "/teams?q=初", icon: "✨" },
    { label: "全部揪團", hint: "瀏覽所有", href: "/teams", icon: "🔎" },
  ];

  return (
    <div>
      <section className="brand-hero relative overflow-hidden pb-20 text-white sm:pb-24">
        <div className="pointer-events-none absolute -right-16 top-8 opacity-10">
          <BrandLogo href="" showWordmark={false} size="lg" />
        </div>
        <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-12 text-center sm:py-16">
          <p className="text-3xl font-bold tracking-wide text-white sm:text-4xl">CrewPlay</p>
          <p className="mt-3 text-sm font-semibold uppercase tracking-[0.2em] text-brand-200">Find Your Play</p>
          <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
            找到你的運動夥伴，隨時開打
          </h1>
          <p className="mt-4 max-w-xl text-base text-brand-100/95 sm:text-lg">
            輸入關鍵字或點選快速項目，立刻找到適合的揪團並線上預約。
          </p>

          <HomeSearch sports={sports} regions={regions} exploreCards={exploreCards} />

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/join/host" className="btn-outline">
              我要開團
            </Link>
            <Link href="/join/venue" className="btn-outline">
              場主刊登
            </Link>
          </div>
        </div>
      </section>

      <div className="border-t border-brand-100 bg-white">
        <FeaturedTeamsCarousel title="熱門運動揪團" teams={popularTeams} viewAllHref="/teams" badge="熱門" />
        <FeaturedTeamsCarousel
          title="推薦給您的揪團"
          teams={recommendedTeams}
          viewAllHref="/teams"
          badge="推薦"
        />
      </div>

      <NearbyTeamsSection teams={teams} excludeIds={featuredIds} />

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl font-bold text-brand-900">我們在做的事很簡單</h2>
        <p className="mt-2 text-slate-600">讓運動更容易成團</p>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            "一鍵瀏覽附近揪團，想動就動",
            "依運動、縣市、團名搜尋",
            "羽球、桌球、排球等多元項目",
            "線上預約＋金流，減少放鳥",
          ].map((text) => (
            <li
              key={text}
              className="rounded-2xl border border-brand-100 bg-white p-5 text-sm text-slate-700 shadow-sm"
            >
              {text}
            </li>
          ))}
        </ul>
      </section>

      <BrandStorySection />
    </div>
  );
}
