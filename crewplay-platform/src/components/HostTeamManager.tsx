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

export function HostTeamManager() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<TeamRow[]>([]);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [draftTotalById, setDraftTotalById] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/host/teams");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "載入失敗");
      const teams = (data.teams ?? []) as TeamRow[];
      setRows(teams);
      setDraftTotalById(
        Object.fromEntries(teams.map((t) => [t.id, String(t.stats.totalSlots)]))
      );
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
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "更新失敗");
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
          </div>
        ))
      )}
    </div>
  );
}
