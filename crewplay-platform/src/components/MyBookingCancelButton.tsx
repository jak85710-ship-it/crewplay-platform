"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  CANCEL_BOOKING_PENALTY,
  CREDIT_RECOVERY_INTERVAL_DAYS,
  CREDIT_RECOVERY_POINTS,
} from "@/lib/member-credit-constants";

type Props = {
  bookingId: string;
  reference: string;
  cancelAuthToken?: string;
};

export function MyBookingCancelButton({ bookingId, reference, cancelAuthToken = "" }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function cancelBooking() {
    const confirmed = window.confirm(
      `確定取消報名 ${reference}？\n\n` +
        `取消將扣除信用分 ${CANCEL_BOOKING_PENALTY} 分。\n` +
        `信用分每 ${CREDIT_RECOVERY_INTERVAL_DAYS} 天自動回補 ${CREDIT_RECOVERY_POINTS} 分，` +
        `扣 ${CANCEL_BOOKING_PENALTY} 分約需 ${(CANCEL_BOOKING_PENALTY / CREDIT_RECOVERY_POINTS) * CREDIT_RECOVERY_INTERVAL_DAYS} 天補回。`
    );
    if (!confirmed) return;

    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/bookings/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: bookingId, cancel_auth: cancelAuthToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "取消失敗");

      setMessage(data.message ?? "已取消預約");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "取消失敗");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <button
        type="button"
        disabled={busy}
        onClick={cancelBooking}
        className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
      >
        {busy ? "取消中…" : "取消預約（扣信用分）"}
      </button>
      {message && <p className="mt-2 text-sm text-slate-600">{message}</p>}
    </div>
  );
}
