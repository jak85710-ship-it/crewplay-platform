"use client";

import { useMemo, useState } from "react";

import { bookingReference } from "@/lib/booking-ref";
import { NO_SHOW_PENALTY } from "@/lib/member-credit-constants";
import type { Booking } from "@/types";

function statusLabel(status: string): string {
  switch (status) {
    case "submitted":
      return "已送出";
    case "pending_payment":
      return "待付款";
    case "paid":
      return "已確認";
    case "cancelled":
      return "已取消";
    case "refunded":
      return "已退款";
    case "no_show":
      return "爽約";
    default:
      return status;
  }
}

type Props = {
  bookings: Booking[];
  adminKey: string;
};

export function AdminBookingsTable({ bookings, adminKey }: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [rows, setRows] = useState(bookings);

  const recent = useMemo(() => rows.slice(0, 50), [rows]);

  async function markNoShow(bookingId: string) {
    if (!adminKey.trim()) {
      setMessage("請先輸入 ADMIN_API_KEY");
      return;
    }
    setBusyId(bookingId);
    setMessage("");
    try {
      const res = await fetch("/api/admin/bookings/no-show", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey.trim(),
        },
        body: JSON.stringify({ booking_id: bookingId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "標記失敗");

      setRows((prev) =>
        prev.map((b) =>
          b.id === bookingId ? { ...b, status: "no_show", no_show_at: new Date().toISOString() } : b
        )
      );
      setMessage(
        data.already_marked
          ? "此筆已是爽約狀態"
          : `已標記爽約${data.member_key ? `，會員 ${data.member_key} 扣 ${NO_SHOW_PENALTY} 分` : ""}`
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "錯誤");
    } finally {
      setBusyId(null);
    }
  }

  async function cancelByAdmin(bookingId: string) {
    if (!adminKey.trim()) {
      setMessage("請先輸入 ADMIN_API_KEY");
      return;
    }
    if (!window.confirm("確認要手動取消這筆預約？")) return;
    setBusyId(bookingId);
    setMessage("");
    try {
      const res = await fetch("/api/admin/bookings/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey.trim(),
        },
        body: JSON.stringify({ booking_id: bookingId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "取消失敗");

      setRows((prev) =>
        prev.map((b) =>
          b.id === bookingId ? { ...b, status: "cancelled", cancelled_at: new Date().toISOString() } : b
        )
      );
      setMessage(data.already_cancelled ? "此筆預約原本已取消" : "已手動取消預約");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "取消失敗");
    } finally {
      setBusyId(null);
    }
  }

  async function restoreCredit(bookingId: string) {
    if (!adminKey.trim()) {
      setMessage("請先輸入 ADMIN_API_KEY");
      return;
    }
    if (!window.confirm("確認回復這筆誤扣的信用積分？")) return;
    setBusyId(bookingId);
    setMessage("");
    try {
      const res = await fetch("/api/admin/bookings/restore-credit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey.trim(),
        },
        body: JSON.stringify({ booking_id: bookingId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "回復失敗");

      setRows((prev) =>
        prev.map((b) =>
          b.id === bookingId ? { ...b, status: "submitted", no_show_at: null } : b
        )
      );
      setMessage(
        `已回復扣分（+${data.restored_points}），目前信用分 ${data.credit_score}。`
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "回復失敗");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      {message && <p className="mt-3 text-sm text-slate-700">{message}</p>}

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3">時間</th>
              <th className="px-4 py-3">編號</th>
              <th className="px-4 py-3">姓名</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">會員鍵</th>
              <th className="px-4 py-3">狀態</th>
              <th className="px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((b) => {
              const ref = bookingReference(b);
              return (
              <tr key={b.id} className="border-b last:border-0">
                <td className="px-4 py-3 text-xs text-slate-500">
                  {b.created_at ? new Date(b.created_at).toLocaleString("zh-TW") : "—"}
                </td>
                <td className="px-4 py-3 font-mono text-xs">{ref}</td>
                <td className="px-4 py-3">{b.guest_name}</td>
                <td className="px-4 py-3 text-xs">{b.guest_email || "—"}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{b.member_key || "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      b.checked_in_at
                        ? "bg-green-100 text-green-800"
                        : b.status === "no_show"
                        ? "bg-red-100 text-red-800"
                        : b.status === "paid"
                          ? "bg-green-100 text-green-800"
                          : "bg-brand-100 text-brand-800"
                    }`}
                  >
                    {b.checked_in_at ? "已進場" : statusLabel(b.status)}
                  </span>
                </td>
                <td className="px-4 py-3 space-y-1">
                  {b.status === "no_show" ? (
                    <>
                      <span className="block text-xs text-slate-400">已標記爽約</span>
                      <button
                        type="button"
                        disabled={busyId === b.id}
                        onClick={() => restoreCredit(b.id)}
                        className="rounded-lg border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                      >
                        {busyId === b.id ? "處理中…" : "回復扣錯積分"}
                      </button>
                    </>
                  ) : (
                    <>
                      {b.status !== "cancelled" && (
                        <button
                          type="button"
                          disabled={busyId === b.id}
                          onClick={() => cancelByAdmin(b.id)}
                          className="mr-1 rounded-lg border border-amber-200 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                        >
                          {busyId === b.id ? "處理中…" : "手動取消預約"}
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={busyId === b.id || b.status === "cancelled"}
                        onClick={() => markNoShow(b.id)}
                        className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        {busyId === b.id ? "處理中…" : "標記爽約"}
                      </button>
                    </>
                  )}
                </td>
              </tr>
            );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
