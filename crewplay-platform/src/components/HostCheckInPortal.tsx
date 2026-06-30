"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { HostCheckInConfirmPanel } from "@/components/HostCheckInConfirmPanel";
import { QrScanner } from "@/components/QrScanner";
import { parseGuestCheckInToken } from "@/lib/parse-guest-checkin-token";
import type { Booking } from "@/types";

type TeamInfo = {
  id: string;
  arena_name: string;
  sport: string;
  region: string;
  location: string;
};

type LookupResult = {
  token: string;
  booking: Booking;
  team: {
    arena_name: string;
    sport: string;
    region: string;
    location: string;
  } | null;
};

type Props = {
  portalToken: string;
  team: TeamInfo;
  lineEnabled: boolean;
};

export function HostCheckInPortal({ portalToken, team, lineEnabled }: Props) {
  const [authenticated, setAuthenticated] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [lookup, setLookup] = useState<LookupResult | null>(null);

  const hostPath = `/checkin/host?t=${encodeURIComponent(portalToken)}`;
  const lineLoginHref = `/api/auth/line/login?redirect=${encodeURIComponent(hostPath)}`;

  const bootstrapHostSession = useCallback(async () => {
    setBusy(true);
    setMessage("");
    try {
      const sessionRes = await fetch(
        `/api/checkin/host/session?portalToken=${encodeURIComponent(portalToken)}`,
        { credentials: "same-origin" }
      );
      const sessionData = await sessionRes.json();
      if (!sessionRes.ok) {
        setMessage(sessionData.error || "無法載入核銷頁");
        return;
      }

      if (sessionData.hostAuthenticated) {
        setAuthenticated(true);
        setDisplayName(String(sessionData.displayName || ""));
        return;
      }

      if (!sessionData.lineLoggedIn) {
        setAuthenticated(false);
        return;
      }

      const verifyRes = await fetch("/api/checkin/host/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ portalToken }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        setMessage(verifyData.error || "LINE 登入驗證失敗");
        return;
      }

      setAuthenticated(true);
      setDisplayName(String(verifyData.displayName || sessionData.displayName || ""));
    } catch {
      setMessage("連線失敗，請稍後再試");
    } finally {
      setBusy(false);
    }
  }, [portalToken]);

  useEffect(() => {
    bootstrapHostSession();
  }, [bootstrapHostSession]);

  const handleScan = useCallback(
    async (text: string) => {
      const guestToken = parseGuestCheckInToken(text);
      if (!guestToken) {
        setMessage("無法辨識此 QR Code，請掃描球友的進場條碼");
        return;
      }

      setBusy(true);
      setMessage("");
      try {
        const res = await fetch("/api/checkin/host/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ guestToken, portalToken }),
        });
        const data = await res.json();
        if (!res.ok) {
          setMessage(data.error || "查詢失敗");
          return;
        }
        setLookup(data as LookupResult);
      } catch {
        setMessage("連線失敗，請稍後再試");
      } finally {
        setBusy(false);
      }
    },
    [portalToken]
  );

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <p className="text-center text-xs font-semibold uppercase tracking-wide text-brand-700">
        CrewPlay 團主核銷
      </p>
      <h1 className="mt-2 text-center text-2xl font-bold text-slate-900">進場掃碼</h1>
      <p className="mt-2 text-center text-sm text-slate-600">{team.arena_name}</p>

      {!authenticated ? (
        <div className="mt-6 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">團主驗證</p>
            <h2 className="mt-1 text-base font-semibold text-slate-800">LINE 登入</h2>
            <p className="mt-1 text-xs text-slate-500">請使用 LINE 登入後，即可掃描球友 QR Code 完成進場核銷</p>
          </div>

          {lineEnabled ? (
            <Link
              href={lineLoginHref}
              className="flex w-full items-center justify-center rounded-xl bg-[#06C755] py-3.5 text-base font-bold text-white hover:opacity-90"
            >
              LINE 登入
            </Link>
          ) : (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              LINE 登入尚未設定，請聯絡平台管理員。
            </p>
          )}

          {busy && <p className="text-center text-sm text-slate-500">載入中…</p>}
        </div>
      ) : lookup ? (
        <div className="mt-6">
          <HostCheckInConfirmPanel
            token={lookup.token}
            booking={lookup.booking}
            team={lookup.team}
            onDone={() => setLookup(null)}
            onCancel={() => setLookup(null)}
          />
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {displayName && (
            <p className="text-center text-sm text-slate-600">
              已登入：<span className="font-semibold text-slate-900">{displayName}</span>
            </p>
          )}
          <p className="text-sm text-slate-600">請對準球友「我的預約」中的 QR Code 掃描。</p>
          <QrScanner onScan={handleScan} />
        </div>
      )}

      {message && (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {message}
        </p>
      )}
    </div>
  );
}
