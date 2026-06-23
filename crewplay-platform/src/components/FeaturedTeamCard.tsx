import Link from "next/link";

import { TeamCoverImage } from "@/components/TeamCoverImage";
import type { Team } from "@/types";
import { feeSummary } from "@/lib/utils";

function formatLocation(team: Team): string {
  if (team.region && team.location) {
    const district = team.location.replace(/^.*?[縣市]/, "").split(/[路街道段號]/)[0];
    if (district && district.length <= 8) {
      return `${team.region} · ${district}`;
    }
  }
  return team.region || team.location || "見詳情";
}

export function FeaturedTeamCard({ team, badge = "熱門" }: { team: Team; badge?: string }) {
  const fee = feeSummary(team);

  return (
    <Link
      href={`/teams/${team.id}`}
      className="group flex w-[17rem] shrink-0 snap-start flex-col sm:w-[18.5rem]"
    >
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-gradient-to-br from-brand-50 via-white to-brand-100">
        <TeamCoverImage
          team={team}
          sizes="280px"
          coverClassName="object-cover transition duration-300 group-hover:scale-[1.03]"
          logoClassName="object-contain p-10 transition duration-300 group-hover:scale-[1.03]"
        />
        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-sm">
          {team.sport || "運動"}
        </span>
      </div>

      <p className="mt-3 text-xs text-slate-500">團體揪團</p>
      <h3 className="mt-1 line-clamp-2 text-base font-bold leading-snug text-slate-900 group-hover:text-brand-700">
        {team.arena_name}
      </h3>

      <div className="mt-2 flex items-start justify-between gap-2 text-xs text-slate-500">
        <span className="line-clamp-1 min-w-0 flex-1">{formatLocation(team)}</span>
        <span className="inline-flex shrink-0 items-center gap-0.5">
          <span aria-hidden>📍</span>
        </span>
      </div>

      <div className="mt-3 flex items-end justify-between gap-2 border-t border-slate-100 pt-3">
        <span className="inline-flex items-center gap-1 text-xs text-slate-500">
          <span className="text-slate-800" aria-hidden>
            ★
          </span>
          {badge}
        </span>
        {fee && (
          <p className="text-right text-sm font-bold text-slate-900">
            {fee}
            <span className="ml-0.5 text-xs font-normal text-slate-500">起</span>
          </p>
        )}
      </div>
    </Link>
  );
}
