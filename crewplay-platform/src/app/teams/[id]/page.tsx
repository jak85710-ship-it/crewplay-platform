import Link from "next/link";
import { notFound } from "next/navigation";
import { TeamCoverImage } from "@/components/TeamCoverImage";
import { BOOKING_PAUSE_MESSAGE, isBookingOpenForTeam } from "@/lib/booking-availability";
import { getTeamBookingStats } from "@/lib/team-booking-stats";
import { enrichTeamFromIntro, getTeamById } from "@/lib/teams";
import { feeSummary, formatIntroduce } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TeamDetailPage({ params }: Props) {
  const { id } = await params;
  const raw = await getTeamById(id);
  if (!raw) notFound();
  const team = enrichTeamFromIntro(raw);
  const bookingOpen = isBookingOpenForTeam(team);
  const stats = await getTeamBookingStats(team);
  const lines = formatIntroduce(team.introduce);
  const fee = feeSummary(team);
  const mapQuery = encodeURIComponent(team.location || team.region);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/teams" className="text-sm text-brand-600 hover:underline">
        ← 返回列表
      </Link>

      <article className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="relative aspect-[21/9] bg-gradient-to-br from-brand-50 via-white to-brand-100 sm:aspect-[2/1]">
          <TeamCoverImage
            team={team}
            priority
            sizes="100vw"
            logoClassName="object-contain p-12 sm:p-16"
          />
        </div>
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-start gap-3">
            <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800">
              {team.sport}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{team.region}</span>
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900 sm:text-3xl">{team.arena_name}</h1>
          {team.location && <p className="mt-2 text-slate-600">{team.location}</p>}
          {fee && <p className="mt-4 text-lg font-semibold text-brand-700">{fee}</p>}

          <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-sm font-medium text-green-800">
            免預付 · 到場向團主繳費
          </p>

          <details className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <summary className="cursor-pointer list-none text-sm font-semibold text-slate-800">
              報名統計（點擊查看）
            </summary>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              <p>
                目前報名 <span className="font-semibold">{stats.usedSlots}</span> /{" "}
                <span className="font-semibold">{stats.totalSlots}</span> 人
                {stats.isFull ? (
                  <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                    已滿團
                  </span>
                ) : (
                  <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                    尚缺 {stats.remainingSlots} 人
                  </span>
                )}
              </p>
              <p className="text-xs text-slate-500">
                統計筆數：{stats.activeBookings} 筆
              </p>

              {team.sport === "排球" && stats.volleyball && (
                <div className="mt-3 rounded-lg border border-indigo-200 bg-indigo-50 p-3">
                  <p className="font-semibold text-indigo-900">排球位置缺額</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {(["主攻（大砲）", "輔舉", "攔中", "舉球", "自由球員"] as const).map((pos) => (
                      <p key={pos} className="rounded-md bg-white px-3 py-2 text-xs text-slate-700">
                        <span className="font-semibold">{pos}</span>：
                        已報 {stats.volleyball!.booked[pos]} / 目標 {stats.volleyball!.targets[pos]}
                        {stats.volleyball!.missing[pos] > 0 ? (
                          <span className="ml-1 font-semibold text-red-700">（尚缺 {stats.volleyball!.missing[pos]}）</span>
                        ) : (
                          <span className="ml-1 font-semibold text-emerald-700">（已足）</span>
                        )}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </details>

          <div className="mt-8">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">團介紹</h2>
            <ul className="mt-3 space-y-1 text-sm leading-relaxed text-slate-700">
              {lines.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {bookingOpen ? (
              <Link
                href={`/book/${team.id}`}
                className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow hover:bg-brand-700"
              >
                快速報名（現場付費）
              </Link>
            ) : (
              <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-3 text-sm font-semibold text-red-700">
                {BOOKING_PAUSE_MESSAGE}
              </div>
            )}
            {mapQuery && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                地圖
              </a>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}
