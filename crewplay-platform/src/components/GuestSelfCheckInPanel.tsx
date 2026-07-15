"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Props = {
  portalToken: string;
};

type CheckInResponse = {
  ok: true;
  already_checked_in: boolean;
  reference: string;
  booking: {
    id: string;
    guest_name: string;
    team_id: string;
    checked_in_at?: string | null;
  };
};

export function GuestSelfCheckInPanel({ portalToken }: Props) {
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const [result, setResult] = useState<CheckInResponse | null>(null);

  const loginHref = useMemo(() => {
    const redirect = `/checkin/scan?t=${encodeURIComponent(portalToken)}`;
    return `/login?redirect=${encodeURIComponent(redirect)}`;
  }, [portalToken]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setBusy(true);
      setError("");
      try {
        const res = await fetch("/api/checkin/guest/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ portalToken }),
        });
        const data = (await res.json()) as CheckInResponse & { error?: string; code?: string };
        if (!res.ok) {
          if (!cancelled) {
            setCode(data.code || "");
            setError(data.error || "報到失敗，請稍後再試");
          }
          return;
        }
        if (!cancelled) {
          setResult(data);
        }
      } catch {
        if (!cancelled) {
          setError("連線失敗，請重新整理後再試一次");
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [portalToken]);

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <p className="text-center text-xs font-semibold uppercase tracking-wide text-brand-700">
        CrewPlay 報到
      </p>
      <h1 className="mt-2 text-center text-2xl font-bold text-slate-900">現場快速報到</h1>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {busy ? (
          <p className="text-center text-sm text-slate-600">正在確認報到資料…</p>
        ) : result ? (
          <div className="space-y-4 text-center">
            <p className="text-3xl">✅</p>
            <p className="text-xl font-bold text-green-700">
              {result.already_checked_in ? "您已完成報到" : "報到成功"}
            </p>
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-xs text-slate-500">編號</p>
              <p className="mt-1 font-mono text-2xl font-bold tracking-wider text-slate-900">{result.reference}</p>
            </div>
            <p className="text-sm text-slate-600">請把此畫面出示給團主確認即可。</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {error || "報到失敗，請稍後重試"}
            </p>
            {code === "auth_required" && (
              <Link
                href={loginHref}
                className="block rounded-xl bg-brand-600 px-4 py-3 text-center text-sm font-semibold text-white"
              >
                先登入再完成報到
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
