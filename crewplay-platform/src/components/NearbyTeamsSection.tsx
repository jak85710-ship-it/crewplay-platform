"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { NearbyTeamCard } from "@/components/NearbyTeamCard";
import { pickNearbyTeams } from "@/lib/nearby-teams";
import { REGION_OPTIONS, regionFromCoords } from "@/lib/region";
import type { Team } from "@/types";

const STORAGE_KEY = "crewplay_nearby_region";

type Props = {
  teams: Team[];
  excludeIds?: string[];
};

export function NearbyTeamsSection({ teams, excludeIds = [] }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const [region, setRegion] = useState<string | null>(null);
  const [locationHint, setLocationHint] = useState("正在定位…");
  const [geoReady, setGeoReady] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setRegion(saved);
      setLocationHint(`已依 ${saved} 篩選`);
      setGeoReady(true);
      return;
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationHint("無法定位，已為您精選有圖片的揪團");
      setGeoReady(true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const detected = regionFromCoords(pos.coords.latitude, pos.coords.longitude);
        if (detected) {
          setRegion(detected);
          setLocationHint(`已依 ${detected} 篩選`);
          localStorage.setItem(STORAGE_KEY, detected);
        } else {
          setLocationHint("無法定位，已為您精選有圖片的揪團");
        }
        setGeoReady(true);
      },
      () => {
        setLocationHint("未授權定位，已為您精選有圖片的揪團");
        setGeoReady(true);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  const nearbyTeams = useMemo(() => {
    if (!geoReady) return [];
    return pickNearbyTeams(teams, {
      region,
      excludeIds,
      limit: 12,
    });
  }, [teams, region, excludeIds, geoReady]);

  const pageCount = Math.max(1, Math.ceil(nearbyTeams.length / 3));

  const scrollByPage = useCallback((direction: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: el.clientWidth * 0.85 * direction, behavior: "smooth" });
  }, []);

  const onScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 0) {
      setPage(0);
      return;
    }
    setPage(Math.round((el.scrollLeft / maxScroll) * (pageCount - 1)));
  }, [pageCount]);

  function onRegionChange(value: string) {
    if (!value) {
      localStorage.removeItem(STORAGE_KEY);
      setRegion(null);
      setLocationHint("已為您精選有圖片的揪團");
      return;
    }
    localStorage.setItem(STORAGE_KEY, value);
    setRegion(value);
    setLocationHint(`已依 ${value} 篩選`);
  }

  const viewAllHref = region ? `/teams?region=${encodeURIComponent(region)}` : "/teams";

  return (
    <section className="relative border-t border-brand-100 bg-white py-12">
      <p
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none text-[5rem] font-bold uppercase tracking-widest text-slate-100 sm:text-[7rem]"
        aria-hidden
      >
        CrewPlay
      </p>

      <div className="relative mx-auto max-w-6xl px-4">
        <p className="text-sm text-slate-500">根據您的位置設定</p>

        <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">探索您附近的揪團</h2>
            <p className="mt-1 text-sm text-slate-500">{locationHint}</p>
          </div>

          <label className="flex shrink-0 items-center gap-2 text-sm text-slate-600">
            <span className="hidden sm:inline">縣市</span>
            <select
              value={region ?? ""}
              onChange={(e) => onRegionChange(e.target.value)}
              className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm"
              aria-label="選擇縣市"
            >
              <option value="">全部（有圖優先）</option>
              {REGION_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <div className="mr-auto flex items-center gap-1.5" aria-hidden>
            {Array.from({ length: pageCount }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === page ? "w-6 bg-slate-800" : "w-1.5 bg-slate-300"
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => scrollByPage(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 text-slate-700 transition hover:border-brand-300 hover:bg-brand-50"
            aria-label="上一組"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => scrollByPage(1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 text-slate-700 transition hover:border-brand-300 hover:bg-brand-50"
            aria-label="下一組"
          >
            →
          </button>
        </div>

        {!geoReady ? (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500">
            正在為您找附近的揪團…
          </div>
        ) : nearbyTeams.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500">
            此區域暫無揪團，
            <Link href="/teams" className="text-brand-600 hover:underline">
              瀏覽全部
            </Link>
          </div>
        ) : (
          <div
            ref={scrollerRef}
            onScroll={onScroll}
            className="mt-6 flex gap-4 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {nearbyTeams.map((team) => (
              <NearbyTeamCard key={team.id} team={team} />
            ))}
          </div>
        )}

        <div className="mt-8 flex justify-center">
          <Link
            href={viewAllHref}
            className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-6 py-2.5 text-sm font-medium text-slate-700 transition hover:border-brand-400 hover:text-brand-800"
          >
            查看全部
            <span aria-hidden>›</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
