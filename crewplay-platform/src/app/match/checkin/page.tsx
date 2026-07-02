import { verifyMatchCheckInToken } from "@/lib/match-checkin-token";
import { getMatchById } from "@/lib/matches";

type Props = { searchParams: Promise<{ t?: string }> };

export default async function MatchCheckInPassPage({ searchParams }: Props) {
  const { t } = await searchParams;
  const payload = verifyMatchCheckInToken(t);
  const session = payload ? await getMatchById(payload.matchId) : null;

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">CrewPlay 1V1</p>
      <h1 className="mt-2 text-xl font-bold text-slate-900">到場核銷條碼</h1>
      {!payload || !session ? (
        <p className="mt-4 text-sm text-red-700">條碼無效或已過期，請向球友重新索取 QR Code。</p>
      ) : (
        <>
          <p className="mt-4 text-sm text-slate-600">
            {session.venue_name} · {session.sport_type}
          </p>
          <p className="mt-2 font-mono text-lg font-bold text-slate-900">{session.id.slice(0, 8).toUpperCase()}</p>
          <p className="mt-6 text-sm text-slate-500">
            請由場館櫃檯或管理員掃描此頁 QR Code（或原始條碼）完成核銷。
          </p>
          {session.status === "CHECKED_IN" && (
            <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">此對局已完成核銷</p>
          )}
        </>
      )}
    </div>
  );
}
