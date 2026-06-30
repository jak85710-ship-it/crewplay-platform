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
};

export function CheckInStaffPanel({ token, booking, team }: Props) {
  const [adminKey, setAdminKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [checkedInAt, setCheckedInAt] = useState(booking.checked_in_at ?? null);

  const ref = bookingReference(booking);

  async function confirmCheckIn() {
    if (!adminKey.trim()) {
      setMessage("請輸入 ADMIN_API_KEY");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/bookings/check-in", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey.trim(),
        },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "核銷失敗");
        return;
      }
      setCheckedInAt(data.booking?.checked_in_at ?? new Date().toISOString());
      setMessage(data.already_checked_in ? "此報名先前已核銷進場" : "已確認進場 ✓");
    } catch {
      setMessage("連線失敗，請稍後再試");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <p className="text-center text-xs font-semibold uppercase tracking-wide text-brand-700">
        CrewPlay 進場核對
      </p>
      <h1 className="mt-2 text-center text-2xl font-bold text-slate-900">掃描報到</h1>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="font-mono text-center text-xl font-bold tracking-wider text-slate-900">{ref}</p>
        <dl className="mt-4 space-y-2 text-sm">
          <Row label="姓名" value={booking.guest_name} />
          <Row label="手機" value={booking.guest_phone} />
          <Row label="Email" value={booking.guest_email || "—"} />
          <Row label="人數" value={`${booking.slots} 人`} />
          <Row label="參考費用" value={`NT$ ${booking.amount}`} />
          {team && <Row label="揪團" value={team.arena_name} />}
          {team && <Row label="運動" value={`${team.sport} · ${team.region}`} />}
          {team?.location && <Row label="地點" value={team.location} />}
          <Row label="狀態" value={checkedInAt ? "已進場" : "待進場"} />
          {checkedInAt && (
            <Row label="進場時間" value={new Date(checkedInAt).toLocaleString("zh-TW", { hour12: false })} />
          )}
        </dl>
      </div>

      {!checkedInAt ? (
        <div className="mt-6 space-y-3">
          <label className="block text-sm">
            <span className="font-medium text-slate-700">管理金鑰（ADMIN_API_KEY）</span>
            <input
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
              placeholder="團主／場館核銷用"
            />
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={confirmCheckIn}
            className="w-full rounded-xl bg-brand-600 py-3.5 text-base font-bold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {busy ? "處理中…" : "確認進場"}
          </button>
        </div>
      ) : (
        <p className="mt-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-center text-sm font-semibold text-green-800">
          已完成進場核銷
        </p>
      )}

      {message && (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
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
