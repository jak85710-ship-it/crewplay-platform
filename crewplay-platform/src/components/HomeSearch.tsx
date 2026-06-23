"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type HomeSearchRegion = { name: string; count: number };
export type HomeExploreCard = { label: string; hint: string; href: string; icon: string };

type Props = {
  sports: string[];
  regions: HomeSearchRegion[];
  exploreCards: HomeExploreCard[];
};

function buildTeamsUrl(opts: { q?: string; sport?: string; region?: string }) {
  const sp = new URLSearchParams();
  if (opts.q?.trim()) sp.set("q", opts.q.trim());
  if (opts.sport) sp.set("sport", opts.sport);
  if (opts.region) sp.set("region", opts.region);
  const qs = sp.toString();
  return qs ? `/teams?${qs}` : "/teams";
}

export function HomeSearch({ sports, regions, exploreCards }: Props) {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [region, setRegion] = useState("");

  function goSearch(overrides?: { q?: string; sport?: string; region?: string }) {
    router.push(
      buildTeamsUrl({
        q: overrides?.q ?? keyword,
        sport: overrides?.sport,
        region: overrides?.region ?? region,
      })
    );
  }

  const regionLabel =
    region === "" ? "全台縣市" : regions.find((r) => r.name === region)?.name ?? region;

  return (
    <div className="mt-10 flex w-full max-w-3xl flex-col items-center">
      <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/95 px-4 py-2 text-sm text-slate-700 shadow-sm backdrop-blur">
        <span className="text-brand-600" aria-hidden>
          📍
        </span>
        <label className="sr-only" htmlFor="home-region">
          地區
        </label>
        <span className="font-medium text-slate-500">地點</span>
        <select
          id="home-region"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="min-w-[7rem] cursor-pointer border-0 bg-transparent py-0 pl-1 pr-6 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-0"
        >
          <option value="">全台縣市</option>
          {regions.map((r) => (
            <option key={r.name} value={r.name}>
              {r.name}（{r.count} 團）
            </option>
          ))}
        </select>
      </div>

      <div className="w-full overflow-hidden rounded-3xl bg-white text-slate-900 shadow-xl shadow-brand-900/20 ring-1 ring-black/5">
        <div className="border-b border-slate-100 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <label className="relative flex-1">
              <span className="sr-only">搜尋關鍵字</span>
              <span
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                aria-hidden
              >
                🔍
              </span>
              <input
                type="search"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    goSearch();
                  }
                }}
                placeholder="輸入團名、場館或地點關鍵字"
                className="w-full rounded-2xl border border-slate-200 py-3.5 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </label>
            <button
              type="button"
              onClick={() => goSearch()}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-brand-600 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-brand-700 sm:min-w-[9rem]"
            >
              前往探索
              <span aria-hidden>→</span>
            </button>
          </div>

          {sports.length > 0 && (
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {sports.map((sport) => (
                <Link
                  key={sport}
                  href={buildTeamsUrl({ sport, region: region || undefined, q: keyword || undefined })}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-medium text-slate-700 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-800"
                >
                  {sport}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-slate-50/80 p-4 text-center sm:p-5">
          <p className="text-sm font-bold text-slate-800">快速查找</p>
          <p className="mt-0.5 text-xs text-slate-500">剛開始？點選下方項目，立刻瀏覽適合的揪團</p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {exploreCards.map((card) => (
              <Link
                key={card.href + card.label}
                href={card.href}
                className="group flex flex-col items-center rounded-2xl border border-slate-200 bg-white px-2 py-4 text-center transition hover:border-brand-200 hover:shadow-md"
              >
                <span className="text-2xl" aria-hidden>
                  {card.icon}
                </span>
                <span className="mt-2 text-xs font-semibold leading-snug text-slate-800 group-hover:text-brand-800">
                  {card.label}
                </span>
                <span className="mt-1 text-[10px] leading-tight text-slate-400">{card.hint}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-brand-100/80">
        已選地點：{regionLabel}
      </p>
    </div>
  );
}
