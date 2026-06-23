import Link from "next/link";

import { TeamCoverImage } from "@/components/TeamCoverImage";
import type { Team } from "@/types";
import { feeSummary } from "@/lib/utils";

function formatLocation(team: Team): string {
  if (team.region && team.location) {
    const district = team.location.replace(/^.*?[縣市]/, "").split(/[路街道段號]/)[0];
    if (district && district.length <= 10) {
      return `${team.region}, ${district}`;
    }
  }
  return team.region || "見詳情";
}

export function NearbyTeamCard({ team }: { team: Team }) {
  const fee = feeSummary(team);

  return (
    <Link
      href={`/teams/${team.id}`}
      className="group flex w-[min(100%,22rem)] shrink-0 snap-start flex-col rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-brand-200 hover:shadow-md sm:w-[24rem]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-base font-bold leading-snug text-slate-900 group-hover:text-brand-700">
            {team.arena_name}
          </h3>
          <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
            <span aria-hidden>📍</span>
            <span className="line-clamp-1">{formatLocation(team)}</span>
          </p>
        </div>
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-gradient-to-br from-brand-50 via-white to-brand-100">
          <TeamCoverImage
            team={team}
            sizes="64px"
            coverClassName="object-cover"
            logoClassName="object-contain p-2"
          />
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        {team.sport || "運動"} 揪團可預約
        {fee ? ` | ${fee}` : ""}
      </p>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
        <span className="inline-flex items-center gap-1 text-xs text-slate-500">
          <span className="text-slate-800" aria-hidden>
            ★
          </span>
          附近
        </span>
        <span className="rounded-full border border-slate-300 px-4 py-1.5 text-xs font-medium text-slate-700 transition group-hover:border-brand-400 group-hover:text-brand-800">
          查看
        </span>
      </div>
    </Link>
  );
}
