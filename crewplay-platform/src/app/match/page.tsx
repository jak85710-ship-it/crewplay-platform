import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";

import { checkMemberCanMatch } from "@/lib/member-credit";
import { getMemberKeyFromSession } from "@/lib/member-key";
import { getMemberSession } from "@/lib/member-session";
import { listMemberActiveMatches } from "@/lib/matches";
import { MIN_MATCH_SCORE, PILOT_MATCH_VENUE_NAME } from "@/lib/member-credit-constants";

export const metadata: Metadata = {
  title: "1VS1 盲盒匹配",
  description: "實名認證、場館核銷的 1 對 1 運動匹配。試營運場館：萬拓乒乓。",
};

function formatRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  return `${s.toLocaleString("zh-TW", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} – ${e.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}`;
}

export default async function MatchHubPage() {
  const cookieStore = await cookies();
  const member = getMemberSession(cookieStore);
  const memberKey = getMemberKeyFromSession(member);
  const gate = memberKey ? await checkMemberCanMatch(memberKey) : null;
  const active = memberKey ? await listMemberActiveMatches(memberKey) : [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">1VS1 盲盒匹配</h1>
      <p className="mt-2 text-sm text-slate-600">
        專為線下運動設計：實名認證、信用治理、場館核銷。試營運場館：
        <strong className="mx-1">{PILOT_MATCH_VENUE_NAME}</strong>（桌球）
      </p>

      {!member.isLoggedIn && (
        <div className="mt-6 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-900">
          請先登入才能使用 1VS1 功能。
          <Link href="/login?redirect=/match" className="ml-1 font-semibold underline">
            前往登入
          </Link>
        </div>
      )}

      {member.isLoggedIn && gate && (
        <div
          className={`mt-6 rounded-xl border px-4 py-3 text-sm ${
            gate.allowed
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          <p className="font-semibold">
            信用分 {gate.credit_score} / 100 · 實名狀態：
            {gate.verification_status === "approved"
              ? "已通過"
              : gate.verification_status === "pending"
                ? "審核中"
                : gate.verification_status === "rejected"
                  ? "未通過"
                  : "尚未認證"}
          </p>
          {gate.allowed ? (
            <p className="mt-1">您可以使用 1VS1 匹配（門檻 ≥ {MIN_MATCH_SCORE} 分）。</p>
          ) : (
            <p className="mt-1">{gate.block_reason}</p>
          )}
        </div>
      )}

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Link
          href="/match/verify"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-300"
        >
          <p className="font-bold text-slate-900">實名認證</p>
          <p className="mt-1 text-sm text-slate-600">上傳證件，人工審核後開通匹配</p>
        </Link>
        <Link
          href="/match/create"
          className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-300 ${
            !gate?.allowed ? "pointer-events-none opacity-50" : ""
          }`}
        >
          <p className="font-bold text-slate-900">發起對局</p>
          <p className="mt-1 text-sm text-slate-600">設定程度與時段，等待對手加入</p>
        </Link>
        <Link
          href="/match/browse"
          className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-300 ${
            !gate?.allowed ? "pointer-events-none opacity-50" : ""
          }`}
        >
          <p className="font-bold text-slate-900">瀏覽對局</p>
          <p className="mt-1 text-sm text-slate-600">加入其他人發起的 1VS1</p>
        </Link>
        <Link
          href="/privacy"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-300"
        >
          <p className="font-bold text-slate-900">安全與隱私</p>
          <p className="mt-1 text-sm text-slate-600">了解實名、信用與缺席規則</p>
        </Link>
      </div>

      {active.length > 0 && (
        <section className="mt-10">
          <h2 className="font-bold text-slate-800">進行中的對局</h2>
          <ul className="mt-4 space-y-3">
            {active.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/match/session/${m.id}`}
                  className="block rounded-xl border border-slate-200 bg-white p-4 hover:border-brand-300"
                >
                  <p className="font-semibold text-slate-900">
                    {m.sport_type} · {m.skill_level} · {m.status}
                  </p>
                  <p className="text-sm text-slate-600">{formatRange(m.scheduled_start, m.scheduled_end)}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
