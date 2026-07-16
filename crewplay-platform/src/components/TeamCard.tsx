import Link from "next/link";
import type { Team } from "@/types";
import { TeamCoverImage } from "@/components/TeamCoverImage";
import type { TeamBookingStats } from "@/lib/team-booking-stats";
import { feeSummary } from "@/lib/utils";

export function TeamCard({ team, stats }: { team: Team; stats?: TeamBookingStats }) {
  const fee = feeSummary(team);

  return (
    <Link
      href={`/teams/${team.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
    >
      <div className="relative aspect-[16/10] bg-gradient-to-br from-brand-50 via-white to-brand-100">
        <TeamCoverImage team={team} />
        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-brand-700 shadow">
          {team.sport || "運動"}
        </span>
        {team.is_featured ? (
          <span className="absolute right-3 top-3 rounded-full bg-violet-600 px-2.5 py-1 text-xs font-semibold text-white shadow">
            置頂
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-base font-bold text-slate-900">{team.arena_name}</h3>
        <p className="text-sm text-slate-500">{team.region} · {team.location || "見詳情"}</p>
        {stats && (
          <p className="text-xs text-slate-600">
            報名 {stats.usedSlots}/{stats.totalSlots}
            {stats.isFull ? (
              <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 font-semibold text-red-700">已滿團</span>
            ) : (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-700">
                尚缺 {stats.remainingSlots} 人
              </span>
            )}
          </p>
        )}
        {fee && <p className="mt-auto text-sm font-medium text-brand-700">{fee}</p>}
      </div>
    </Link>
  );
}

export function TeamCardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="aspect-[16/10] bg-slate-200" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-3/4 rounded bg-slate-200" />
        <div className="h-3 w-1/2 rounded bg-slate-200" />
      </div>
    </div>
  );
}
