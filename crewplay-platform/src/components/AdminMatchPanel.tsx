"use client";

import { useCallback, useState } from "react";

import { QrScanner } from "@/components/QrScanner";
import { parseGuestCheckInToken } from "@/lib/parse-guest-checkin-token";

type PendingReview = {
  id: string;
  match_id: string;
  reviewee_member_key: string;
  venue_name: string | null;
  scheduled_start: string | null;
  created_at: string;
};

type Props = {
  adminKey: string;
  isAuthorized: boolean;
};

export function AdminMatchPanel({ adminKey, isAuthorized }: Props) {
  const [scanKey, setScanKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<PendingReview[]>([]);
  const [verifyBusy, setVerifyBusy] = useState<string | null>(null);

  const headers = useCallback(
    () => ({
      "Content-Type": "application/json",
      "x-admin-key": adminKey.trim(),
    }),
    [adminKey]
  );

  function ensureAuthorized(): boolean {
    if (!adminKey.trim()) {
      setMessage("請先輸入 ADMIN_API_KEY");
      return false;
    }
    if (!isAuthorized) {
      setMessage("請先按「驗證金鑰」完成編輯者身分確認。");
      return false;
    }
    return true;
  }

  async function loadPendingReviews() {
    if (!ensureAuthorized()) return;
    setMessage("");
    try {
      const res = await fetch("/api/admin/match/reviews/pending", {
        headers: { "x-admin-key": adminKey.trim() },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "載入失敗");
      setPending(data.pending ?? []);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "載入失敗");
    }
  }

  const handleScan = useCallback(
    async (text: string): Promise<boolean> => {
      if (!adminKey.trim()) {
        setMessage("請先輸入 ADMIN_API_KEY");
        return false;
      }
      if (!isAuthorized) {
        setMessage("請先按「驗證金鑰」完成編輯者身分確認。");
        return false;
      }

      const token = parseGuestCheckInToken(text);
      if (!token) {
        setMessage("無法辨識此 QR Code");
        return false;
      }

      setBusy(true);
      setMessage("");
      try {
        const res = await fetch("/api/admin/match/check-in", {
          method: "POST",
          headers: headers(),
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "核銷失敗");
        setMessage(`核銷成功 · ${data.venue_name ?? ""} · 對局 ${data.match_id?.slice(0, 8)}`);
        setScanKey((k) => k + 1);
        return true;
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "核銷失敗");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [adminKey, headers, isAuthorized]
  );

  async function verifyNoShow(reviewId: string) {
    if (!ensureAuthorized()) return;
    if (!window.confirm("確認核實缺席？將扣信用分並停用 1V1 功能 90 日。")) return;

    setVerifyBusy(reviewId);
    setMessage("");
    try {
      const res = await fetch("/api/admin/match/review/verify", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ review_id: reviewId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "核實失敗");
      setPending((prev) => prev.filter((r) => r.id !== reviewId));
      setMessage(data.message ?? "已核實缺席");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "核實失敗");
    } finally {
      setVerifyBusy(null);
    }
  }

  return (
    <section className="mt-10">
      <h2 className="font-bold text-slate-800">1V1 到場核銷</h2>
      <p className="mt-1 text-sm text-slate-500">掃描球友 1V1 到場 QR Code 完成核銷。</p>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
        <QrScanner key={scanKey} onScan={handleScan} />
      </div>

      <div className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-slate-800">缺席申訴待核實</h3>
          <button
            type="button"
            onClick={loadPendingReviews}
            disabled={!isAuthorized}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          >
            載入申訴
          </button>
        </div>

        {pending.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">尚無待核實項目（請按「載入申訴」）。</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {pending.map((r) => (
              <li key={r.id} className="rounded-xl border border-slate-200 p-4 text-sm">
                <p className="font-mono text-xs text-slate-500">對局 {r.match_id.slice(0, 8)}</p>
                <p className="mt-1">被申訴：{r.reviewee_member_key}</p>
                <p className="text-slate-600">{r.venue_name ?? ""}</p>
                <button
                  type="button"
                  disabled={verifyBusy === r.id || !isAuthorized}
                  onClick={() => verifyNoShow(r.id)}
                  className="mt-2 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                >
                  核實缺席
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {message && <p className="mt-3 text-sm text-slate-600">{message}</p>}
    </section>
  );
}
