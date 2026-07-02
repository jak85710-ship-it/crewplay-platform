"use client";

import { useCallback, useEffect, useState } from "react";

import { MatchCheckInQr } from "@/components/MatchCheckInQr";
import { MATCH_PING_LABELS, type MatchPing, type MatchPingType, type MatchSession } from "@/lib/match-types";

function statusLabel(status: MatchSession["status"]): string {
  switch (status) {
    case "WAITING":
      return "等待對手";
    case "MATCHED":
      return "已配對";
    case "CHECKED_IN":
      return "已到場核銷";
    case "COMPLETED":
      return "已完成";
    case "CANCELLED":
      return "已取消";
    default:
      return status;
  }
}

function formatRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  return `${s.toLocaleString("zh-TW")} – ${e.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}`;
}

type Props = {
  matchId: string;
  initialMatch: MatchSession;
  role: "host" | "guest" | null;
};

export function MatchSessionPanel({ matchId, initialMatch, role }: Props) {
  const [match, setMatch] = useState(initialMatch);
  const [pings, setPings] = useState<MatchPing[]>([]);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [busyPing, setBusyPing] = useState<string | null>(null);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [skillMatch, setSkillMatch] = useState(true);
  const [isHarassment, setIsHarassment] = useState(false);
  const [isNoShow, setIsNoShow] = useState(false);
  const [reviewDone, setReviewDone] = useState(false);

  const isParticipant = role === "host" || role === "guest";
  const canPing = match.status === "MATCHED" || match.status === "CHECKED_IN";
  const canShowQr = isParticipant && match.status === "MATCHED";
  const canReview =
    isParticipant &&
    match.status === "CHECKED_IN" &&
    new Date() >= new Date(match.scheduled_end) &&
    !reviewDone;

  const loadPings = useCallback(async () => {
    if (!isParticipant) return;
    try {
      const res = await fetch(`/api/match/${matchId}/pings`);
      const data = await res.json();
      if (res.ok) setPings(data.pings ?? []);
    } catch {
      /* ignore */
    }
  }, [isParticipant, matchId]);

  const loadQr = useCallback(async () => {
    if (!canShowQr) return;
    try {
      const res = await fetch(`/api/match/${matchId}/qrcode`);
      const data = await res.json();
      if (res.ok) setQrUrl(data.url ?? null);
    } catch {
      /* ignore */
    }
  }, [canShowQr, matchId]);

  useEffect(() => {
    loadPings();
    loadQr();
  }, [loadPings, loadQr]);

  async function sendPing(pingType: MatchPingType) {
    setBusyPing(pingType);
    setMessage("");
    try {
      const res = await fetch(`/api/match/${matchId}/ping`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ping_type: pingType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "送出失敗");
      await loadPings();
      setMessage(`已送出：${MATCH_PING_LABELS[pingType]}`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "送出失敗");
    } finally {
      setBusyPing(null);
    }
  }

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    setReviewBusy(true);
    setMessage("");
    try {
      const res = await fetch(`/api/match/${matchId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skill_match: skillMatch,
          is_harassment: isHarassment,
          is_no_show: isNoShow,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "評價失敗");
      setReviewDone(true);
      setMessage("感謝您的回饋，缺席申訴將由管理員核實。");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "評價失敗");
    } finally {
      setReviewBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-lg font-bold text-slate-900">
            {match.sport_type} · {match.skill_level}
          </p>
          <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800">
            {statusLabel(match.status)}
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-600">{match.venue_name}</p>
        <p className="text-sm text-slate-500">{match.venue_address}</p>
        <p className="mt-2 text-sm text-slate-700">{formatRange(match.scheduled_start, match.scheduled_end)}</p>
        {role && (
          <p className="mt-2 text-xs text-slate-400">您的角色：{role === "host" ? "發起者" : "加入者"}</p>
        )}
      </div>

      {match.status === "WAITING" && isParticipant && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          等待另一位球友加入。您可以分享此頁連結，或請對方到「瀏覽對局」加入。
        </div>
      )}

      {canShowQr && qrUrl && <MatchCheckInQr url={qrUrl} matchId={matchId} />}

      {canShowQr && !qrUrl && (
        <p className="text-sm text-slate-500">載入到場條碼中…</p>
      )}

      {match.status === "CHECKED_IN" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          已到場核銷 · {match.checked_in_at ? new Date(match.checked_in_at).toLocaleString("zh-TW") : ""}
        </div>
      )}

      {isParticipant && canPing && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-slate-800">到場前聯絡（僅對局雙方可見）</h2>
          <p className="mt-1 text-xs text-slate-500">請使用下方按鈕通知對手，勿交換私人聯絡方式。</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {(Object.keys(MATCH_PING_LABELS) as MatchPingType[]).map((type) => (
              <button
                key={type}
                type="button"
                disabled={busyPing === type}
                onClick={() => sendPing(type)}
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {MATCH_PING_LABELS[type]}
              </button>
            ))}
          </div>
          {pings.length > 0 && (
            <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm text-slate-600">
              {pings.map((p) => (
                <li key={p.id}>
                  {MATCH_PING_LABELS[p.ping_type]} · {new Date(p.created_at).toLocaleTimeString("zh-TW")}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {canReview && (
        <form onSubmit={submitReview} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-slate-800">對局結束 · 互評</h2>
          <label className="mt-4 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={skillMatch} onChange={(e) => setSkillMatch(e.target.checked)} />
            對手程度與描述相符
          </label>
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isHarassment} onChange={(e) => setIsHarassment(e.target.checked)} />
            對方有騷擾或不當行為
          </label>
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isNoShow} onChange={(e) => setIsNoShow(e.target.checked)} />
            對方未到場（缺席）
          </label>
          <p className="mt-2 text-xs text-slate-500">缺席申訴須經管理員核實後，才會扣信用分並停用 1VS1 功能 90 日。</p>
          <button
            type="submit"
            disabled={reviewBusy}
            className="mt-4 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {reviewBusy ? "送出中…" : "提交評價"}
          </button>
        </form>
      )}

      {message && <p className="text-sm text-slate-600">{message}</p>}
    </div>
  );
}
