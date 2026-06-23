"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";

import { FeaturedTeamCard } from "@/components/FeaturedTeamCard";
import type { Team } from "@/types";

type Props = {
  title: string;
  teams: Team[];
  viewAllHref?: string;
  badge?: string;
};

export function FeaturedTeamsCarousel({
  title,
  teams,
  viewAllHref = "/teams",
  badge = "熱門",
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(teams.length / 3));

  const scrollByPage = useCallback((direction: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.85 * direction;
    el.scrollBy({ left: amount, behavior: "smooth" });
  }, []);

  const onScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 0) {
      setPage(0);
      return;
    }
    const ratio = el.scrollLeft / maxScroll;
    setPage(Math.round(ratio * (pageCount - 1)));
  }, [pageCount]);

  if (teams.length === 0) return null;

  return (
    <section className="py-12">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">{title}</h2>
            <div className="flex items-center gap-1.5" aria-hidden>
              {Array.from({ length: pageCount }).map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === page ? "w-6 bg-slate-800" : "w-1.5 bg-slate-300"
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
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
        </div>

        <div
          ref={scrollerRef}
          onScroll={onScroll}
          className="mt-6 flex gap-4 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {teams.map((team) => (
            <FeaturedTeamCard key={team.id} team={team} badge={badge} />
          ))}
        </div>

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
