"use client";

import { useState } from "react";

import { bookingReference } from "@/lib/booking-ref";
import type { Booking } from "@/types";

type TeamInfo = {
  arena_name: string;
  sport: string;
  region: string;
  location: string;
};

type Props = {
  token: string;
  booking: Booking;
  team: TeamInfo | null;
  onDone: () => void;
  onCancel: () => void;
};

export function HostCheckInConfirmPanel({ token, booking, team, onDone, onCancel }: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const ref = bookingReference(booking);
  const checkedIn = Boolean(booking.checked_in_at);

  async function confirmCheckIn() {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/bookings/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "核銷失敗");
        return;
      }
      setMessage(data.already_checked_in ? "此報名先前已核銷進場" : "已確認進場 ✓");
      setTimeout(onDone, 1200);
    } catch {
      setMessage("連線失敗，請稍後再試");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-center text-xs font-semibold uppercase tracking-wide text-brand-700">核銷確認</p>
      <p className="mt-2 font-mono text-center text-xl font-bold tracking-wider text-slate-900">{ref}</p>
      <dl className="mt-4 space-y-2 text-sm">
        <Row label="姓名" value={booking.guest_name} />
        <Row label="手機" value={booking.guest_phone} />
        <Row label="Email" value={booking.guest_email || "—"} />
        <Row label="人數" value={`${booking.slots} 人`} />
        {team && <Row label="揪團" value={team.arena_name} />}
        <Row label="狀態" value={checkedIn ? "已進場" : "待進場"} />
      </dl>

      {!checkedIn ? (
        <div className="mt-5 space-y-2">
          <button
            type="button"
            disabled={busy}
            onClick={confirmCheckIn}
            className="w-full rounded-xl bg-brand-600 py-3.5 text-base font-bold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {busy ? "處理中…" : "確認進場"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full rounded-xl border border-slate-300 py-2.5 text-sm font-semibold text-slate-700"
          >
            繼續掃描下一位
          </button>
        </div>
      ) : (
        <p className="mt-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-center text-sm font-semibold text-green-800">
          已完成進場核銷
        </p>
      )}

      {message && (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {message}
        </p>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 pb-2 last:border-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-900">{value}</dd>
    </div>
  );
}
