"use client";

import { useCallback, useState } from "react";

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
};

export function HostCheckInPortal({ portalToken, team }: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [lookup, setLookup] = useState<LookupResult | null>(null);
  const [scanKey, setScanKey] = useState(0);

  function resetScanner() {
    setLookup(null);
    setScanKey((k) => k + 1);
  }

  const handleScan = useCallback(
    async (text: string): Promise<boolean> => {
      const guestToken = parseGuestCheckInToken(text);
      if (!guestToken) {
        setMessage("無法辨識此 QR Code，請掃描球友的進場條碼");
        return false;
      }

      setBusy(true);
      setMessage("");
      try {
        const res = await fetch("/api/checkin/host/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guestToken, portalToken }),
        });
        const data = await res.json();
        if (!res.ok) {
          setMessage(data.error || "查詢失敗");
          return false;
        }
        setLookup(data as LookupResult);
        return true;
      } catch {
        setMessage("連線失敗，請稍後再試");
        return false;
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

      {lookup ? (
        <div className="mt-6">
          <HostCheckInConfirmPanel
            token={lookup.token}
            portalToken={portalToken}
            booking={lookup.booking}
            team={lookup.team}
            onDone={resetScanner}
            onCancel={resetScanner}
          />
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <p className="text-sm text-slate-600">
            請對準球友「我的預約」中的 QR Code 掃描。此連結僅供團主使用，請勿公開分享。
          </p>
          <QrScanner key={scanKey} onScan={handleScan} />
          {busy && <p className="text-center text-sm text-slate-500">處理中…</p>}
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
