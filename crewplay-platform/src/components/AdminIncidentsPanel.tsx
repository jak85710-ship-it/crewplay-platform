"use client";

import { useEffect, useMemo, useState } from "react";

type IncidentRow = {
  id: string;
  ticket_no?: string;
  status?: "open" | "closed";
  team_id: string;
  team_name?: string;
  team_region?: string;
  booking_reference: string;
  event_type: string;
  stage: string;
  action_taken: string;
  summary: string;
  created_at: string;
  closed_at?: string;
};

const STATUS_OPTIONS = [
  { value: "all", label: "全部案件" },
  { value: "open", label: "未結案" },
  { value: "closed", label: "已結案" },
] as const;

export function AdminIncidentsPanel({
  adminKey,
  isAuthorized,
}: {
  adminKey: string;
  isAuthorized: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]["value"]>("open");
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const openCount = useMemo(
    () => incidents.filter((row) => (row.status || "open") !== "closed").length,
    [incidents]
  );

  async function load() {
    if (!isAuthorized || !adminKey.trim()) return;
    setLoading(true);
    setMessage("");
    try {
      const sp = new URLSearchParams();
      if (status) sp.set("status", status);
      const res = await fetch(`/api/admin/incidents?${sp.toString()}`, {
        headers: { "x-admin-key": adminKey.trim() },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "載入事故案件失敗");
      setIncidents(Array.isArray(data.incidents) ? data.incidents : []);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "載入事故案件失敗");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthorized, adminKey, status]);

  function exportCsv() {
    if (!adminKey.trim()) return;
    const sp = new URLSearchParams();
    sp.set("key", adminKey.trim());
    sp.set("status", status);
    if (fromDate) sp.set("from", fromDate);
    if (toDate) sp.set("to", toDate);
    window.open(`/api/admin/incidents/export?${sp.toString()}`, "_blank", "noopener,noreferrer");
  }

  return (
    <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-slate-900">安全事故案件中心（Admin）</h2>
          <p className="text-xs text-slate-500">目前未結案：{openCount} 件</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as (typeof STATUS_OPTIONS)[number]["value"])}
            className="rounded-md border border-slate-300 px-2 py-1.5"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1.5"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1.5"
          />
          <button
            type="button"
            onClick={exportCsv}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700"
          >
            匯出 CSV
          </button>
        </div>
      </div>

      {message ? <p className="mt-2 text-xs text-rose-700">{message}</p> : null}
      {loading ? (
        <p className="mt-3 text-sm text-slate-500">載入中...</p>
      ) : incidents.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">目前無符合條件的事故案件。</p>
      ) : (
        <div className="mt-3 space-y-2">
          {incidents.slice(0, 100).map((row) => (
            <div key={row.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <p className="font-semibold text-slate-900">
                {row.ticket_no || row.id.slice(0, 8)} · {row.team_name || row.team_id}
              </p>
              <p className="text-xs text-slate-500">
                {row.status === "closed" ? "已結案" : "未結案"} · {new Date(row.created_at).toLocaleString("zh-TW")}
                {row.team_region ? ` · ${row.team_region}` : ""}
                {row.booking_reference ? ` · ${row.booking_reference}` : ""}
              </p>
              <p className="mt-1 text-slate-700">{row.summary}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

