"use client";

import { useEffect, useState } from "react";

type TeamRow = {
  id: string;
  arena_name: string;
  sport: string;
  region: string;
  location: string;
  manual_members: number;
  stats: {
    totalSlots: number;
    usedSlots: number;
    remainingSlots: number;
    isFull: boolean;
  };
};

type PendingBookingRow = {
  id: string;
  team_id: string;
  reference: string;
  guest_name: string;
  guest_phone: string;
  guest_email: string;
  slots: number;
  created_at: string;
  note: string;
};

export function HostTeamManager() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<TeamRow[]>([]);
  const [pendingBookings, setPendingBookings] = useState<PendingBookingRow[]>([]);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [draftTotalById, setDraftTotalById] = useState<Record<string, string>>({});

  async function loadPending() {
    const res = await fetch("/api/host/bookings");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "載入待審核名單失敗");
    setPendingBookings(Array.isArray(data.pending) ? data.pending : []);
  }

  async function load() {
    setLoading(true);
    setMessage("");
    try {
      const [teamsRes, pendingRes] = await Promise.all([fetch("/api/host/teams"), fetch("/api/host/bookings")]);
      const teamsData = await teamsRes.json();
      const pendingData = await pendingRes.json();
      if (!teamsRes.ok) throw new Error(teamsData.error || "載入失敗");
      if (!pendingRes.ok) throw new Error(pendingData.error || "載入待審核名單失敗");

      const teams = (teamsData.teams ?? []) as TeamRow[];
      setRows(teams);
      setDraftTotalById(
        Object.fromEntries(teams.map((t) => [t.id, String(t.stats.totalSlots)]))
      );
      setPendingBookings(Array.isArray(pendingData.pending) ? pendingData.pending : []);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "載入失敗");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function mutate(teamId: string, action: "add_member" | "remove_member" | "set_total_slots", total?: number) {
    setBusyId(teamId);
    setMessage("");
    try {
      const body: Record<string, unknown> = { team_id: teamId, action };
      if (typeof total === "number") body.total_slots = total;
      const res = await fetch("/api/host/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "更新失敗");

      setRows((prev) =>
        prev.map((row) =>
          row.id === teamId
            ? {
                ...row,
                stats: data.stats,
                manual_members: data.manual_members,
              }
            : row
        )
      );
      setDraftTotalById((prev) => ({
        ...prev,
        [teamId]: String(data.stats.totalSlots),
      }));
      await loadPending();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "更新失敗");
    } finally {
      setBusyId(null);
    }
  }

  async function reviewPending(bookingId: string, action: "approve" | "reject") {
    setBusyId(bookingId);
    setMessage("");
    try {
      const res = await fetch("/api/host/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: bookingId,
          action,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "審核失敗");
      const fullAutoRejected = Number(data.full_auto_rejected || 0);
      if (action === "approve") {
        setMessage(
          fullAutoRejected > 0
            ? `已核准，且因滿團自動婉拒 ${fullAutoRejected} 位排隊者。`
            : "已核准此筆報名。"
        );
      } else {
        setMessage("已婉拒此筆報名。");
      }
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "審核失敗");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">載入中...</p>;
  }

  return (
    <div className="space-y-4">
      {message && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{message}</p>}
      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
          目前找不到您可編輯的團。請先用同一登入帳號建立「我要開團」資料。
        </p>
      ) : (
        rows.map((row) => (
          <div key={row.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="font-semibold text-slate-900">{row.arena_name}</p>
            <p className="text-xs text-slate-500">
              {row.sport} · {row.region} · {row.location || "—"}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-full bg-slate-100 px-2 py-0.5">
                已報名 {row.stats.usedSlots}/{row.stats.totalSlots}
              </span>
              <span className={`rounded-full px-2 py-0.5 ${row.stats.isFull ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                {row.stats.isFull ? "已滿團" : `尚缺 ${row.stats.remainingSlots} 人`}
              </span>
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-indigo-700">
                手動成員 {row.manual_members} 人
              </span>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={busyId === row.id}
                onClick={() => mutate(row.id, "add_member")}
                className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 disabled:opacity-60"
              >
                + 新增成員
              </button>
              <button
                type="button"
                disabled={busyId === row.id}
                onClick={() => mutate(row.id, "remove_member")}
                className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 disabled:opacity-60"
              >
                - 刪減成員
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                type="number"
                min={1}
                max={200}
                value={draftTotalById[row.id] ?? ""}
                onChange={(e) =>
                  setDraftTotalById((prev) => ({ ...prev, [row.id]: e.target.value }))
                }
                className="w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
              />
              <button
                type="button"
                disabled={busyId === row.id}
                onClick={() => mutate(row.id, "set_total_slots", Number(draftTotalById[row.id] || 0))}
                className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
              >
                調整總人數
              </button>
            </div>

            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-semibold text-slate-800">待團主審核名單</p>
              {pendingBookings.filter((b) => b.team_id === row.id).length === 0 ? (
                <p className="mt-2 text-xs text-slate-500">目前沒有待審核球友。</p>
              ) : (
                <div className="mt-2 space-y-2">
                  {pendingBookings
                    .filter((b) => b.team_id === row.id)
                    .map((b) => (
                      <div key={b.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <p className="text-sm font-semibold text-slate-900">{b.guest_name}（{b.slots} 人）</p>
                        <p className="text-xs text-slate-500">{b.reference} · {b.created_at ? new Date(b.created_at).toLocaleString("zh-TW") : "—"}</p>
                        <p className="mt-1 text-xs text-slate-600">{b.guest_phone} · {b.guest_email || "未填 email"}</p>
                        {b.note ? <p className="mt-1 text-xs text-slate-500">備註：{b.note}</p> : null}
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            disabled={busyId === b.id}
                            onClick={() => reviewPending(b.id, "approve")}
                            className="rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-700 disabled:opacity-60"
                          >
                            {busyId === b.id ? "處理中..." : "核准"}
                          </button>
                          <button
                            type="button"
                            disabled={busyId === b.id}
                            onClick={() => reviewPending(b.id, "reject")}
                            className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 disabled:opacity-60"
                          >
                            {busyId === b.id ? "處理中..." : "婉拒"}
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
