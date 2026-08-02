import Link from "next/link";
import { TeamCard } from "@/components/TeamCard";
import { getTeamBookingStatsMap } from "@/lib/team-booking-stats";
import { REGION_OPTIONS, regionsMatch } from "@/lib/region";
import { filterTeams, getAllTeams } from "@/lib/teams";
import { PAGE_SIZE, SPORTS } from "@/lib/utils";

interface Props {
  searchParams: Promise<{ sport?: string; region?: string; time?: string; weekday?: string; q?: string; page?: string }>;
}

export default async function TeamsPage({ searchParams }: Props) {
  const params = await searchParams;
  const sport = params.sport ?? "";
  const region = params.region ?? "";
  const time = params.time ?? "";
  const weekday = params.weekday ?? "";
  const q = params.q ?? "";
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  const all = await getAllTeams();
  const filtered = filterTeams(all, {
    sport: sport || undefined,
    region: region || undefined,
    time: time || undefined,
    weekday: weekday || undefined,
    q: q || undefined,
  });
  const hasFilters = Boolean(sport || region || time || weekday || q);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const slice = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const statsMap = await getTeamBookingStatsMap(slice);

  const sportsInData = [...new Set(all.map((t) => t.sport).filter(Boolean))];
  const regionsInData = [...new Set(all.map((t) => t.region).filter(Boolean))];
  const regionOptions = REGION_OPTIONS.filter((r) =>
    regionsInData.some((d) => regionsMatch(d, r))
  );

  function pageUrl(p: number) {
    const sp = new URLSearchParams();
    if (sport) sp.set("sport", sport);
    if (region) sp.set("region", region);
    if (time) sp.set("time", time);
    if (weekday) sp.set("weekday", weekday);
    if (q) sp.set("q", q);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `/teams?${qs}` : "/teams";
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-brand-900">揪團查詢</h1>
        <p className="mt-2 text-slate-600">
          依運動、縣市或關鍵字搜尋，找到適合的團後可查看詳情並線上預約報名。
        </p>
        {hasFilters && (
          <p className="mt-2 text-sm text-slate-500">找到 {filtered.length} 個揪團</p>
        )}
      </div>

      <form className="mb-4 grid gap-3 rounded-2xl border border-brand-100 bg-white p-4 shadow-sm sm:grid-cols-6" action="/teams" method="get">
        <input
          name="q"
          defaultValue={q}
          placeholder="搜尋團名、地點..."
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm sm:col-span-2"
        />
        <select name="sport" defaultValue={sport} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
          <option value="">全部運動</option>
          {SPORTS.filter((s) => sportsInData.includes(s)).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
          {sportsInData.filter((s) => !SPORTS.includes(s as typeof SPORTS[number])).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select name="region" defaultValue={region} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
          <option value="">全部縣市</option>
          {regionOptions.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <select name="time" defaultValue={time} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
          <option value="">全部時段</option>
          <option value="morning">早上（05:00-11:59）</option>
          <option value="afternoon">下午（12:00-17:59）</option>
          <option value="evening">晚上（18:00-21:59）</option>
          <option value="night">深夜（22:00-04:59）</option>
        </select>
        <select name="weekday" defaultValue={weekday} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
          <option value="">全部星期</option>
          <option value="mon">星期一</option>
          <option value="tue">星期二</option>
          <option value="wed">星期三</option>
          <option value="thu">星期四</option>
          <option value="fri">星期五</option>
          <option value="sat">星期六</option>
          <option value="sun">星期日</option>
        </select>
        <button type="submit" className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white sm:col-span-6 sm:w-32">
          搜尋
        </button>
      </form>

      {slice.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
          找不到符合的揪團，請調整搜尋條件或篩選項目。
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {slice.map((team) => (
            <TeamCard key={team.id} team={team} stats={statsMap[team.id]} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          {currentPage > 1 && (
            <Link href={pageUrl(currentPage - 1)} className="rounded-lg border px-4 py-2 text-sm hover:bg-slate-50">
              上一頁
            </Link>
          )}
          <span className="text-sm text-slate-500">
            第 {currentPage} / {totalPages} 頁
          </span>
          {currentPage < totalPages && (
            <Link href={pageUrl(currentPage + 1)} className="rounded-lg border px-4 py-2 text-sm hover:bg-slate-50">
              下一頁
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
