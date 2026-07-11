"use client";

import { useMemo, useState } from "react";
import type { Team } from "@/types";

type Props = {
  adminKey: string;
  teams: Team[];
  initialOverrides: Record<string, number>;
};

export function AdminTeamCapacityPanel({ adminKey, teams, initialOverrides }: Props) {
  const [query, setQuery] = useState("");
  const [overrides, setOverrides] = useState<Record<string, number>>(initialOverrides);
  const [draftById, setDraftById] = useState<Record<string, string>>(
    Object.fromEntries(teams.map((t) => [t.id, initialOverrides[t.id] != null ? String(initialOverrides[t.id]) : ""]))
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...teams].sort((a, b) => a.arena_name.localeCompare(b.arena_name, "zh-Hant"));
    if (!q) return sorted;
    return sorted.filter(
      (team) =>
        team.arena_name.toLowerCase().includes(q) ||
        team.region.toLowerCase().includes(q) ||
        team.sport.toLowerCase().includes(q)
    );
  }, [teams, query]);

  async function save(teamId: string) {
    if (!adminKey.trim()) {
      setMessage("請先輸入 ADMIN_API_KEY");
      return;
    }

    const raw = (draftById[teamId] ?? "").trim();
    const body =
      raw === ""
        ? { team_id: teamId, capacity: null }
        : { team_id: teamId, capacity: Number(raw) };

    if (raw !== "") {
      const n = Number(raw);
      if (!Number.isFinite(n) || n <= 0 || n > 200) {
        setMessage("名額請輸入 1~200");
        return;
      }
    }

    setBusyId(teamId);
    setMessage("");
    try {
      const res = await fetch("/api/admin/team-capacity", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey.trim(),
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "儲存失敗");

      setOverrides((prev) => {
        const next = { ...prev };
        if (data.capacity == null) delete next[teamId];
        else next[teamId] = Number(data.capacity);
        return next;
      });
      setDraftById((prev) => ({ ...prev, [teamId]: data.capacity == null ? "" : String(data.capacity) }));
      setMessage("名額已更新");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "儲存失敗");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="mt-10">
      <h2 className="font-bold text-slate-800">團名額設定（報名統計）</h2>
      <p className="mt-1 text-sm text-slate-500">
        可直接調整每團總名額；留空並儲存可回復為系統自動判斷。
      </p>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜尋團名 / 地區 / 運動"
          className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />

        <div className="mt-4 space-y-2">
          {rows.slice(0, 120).map((team) => (
            <div
              key={team.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-800">{team.arena_name}</p>
                <p className="text-xs text-slate-500">
                  {team.sport} · {team.region}
                </p>
              </div>

              <input
                type="number"
                min={1}
                max={200}
                value={draftById[team.id] ?? ""}
                onChange={(e) => setDraftById((prev) => ({ ...prev, [team.id]: e.target.value }))}
                placeholder={overrides[team.id] != null ? String(overrides[team.id]) : "留空=自動"}
                className="w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
              />
              <button
                type="button"
                disabled={busyId === team.id}
                onClick={() => save(team.id)}
                className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
              >
                {busyId === team.id ? "儲存中..." : "儲存"}
              </button>
            </div>
          ))}
        </div>

        {rows.length > 120 && (
          <p className="mt-3 text-xs text-slate-500">結果過多，僅顯示前 120 筆，請用關鍵字縮小範圍。</p>
        )}
      </div>

      {message && <p className="mt-3 text-sm text-slate-600">{message}</p>}
    </section>
  );
}
