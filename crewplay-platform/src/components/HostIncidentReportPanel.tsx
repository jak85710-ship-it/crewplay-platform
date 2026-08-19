"use client";

import { useEffect, useMemo, useState } from "react";

type TeamLite = {
  id: string;
  arena_name: string;
};

type IncidentRow = {
  id: string;
  team_id: string;
  booking_reference: string;
  event_type: string;
  stage: string;
  action_taken: string;
  summary: string;
  created_at: string;
};

type IncidentFormState = {
  team_id: string;
  booking_id: string;
  booking_reference: string;
  event_type: (typeof EVENT_OPTIONS)[number]["value"];
  stage: (typeof STAGE_OPTIONS)[number]["value"];
  action_taken: (typeof ACTION_OPTIONS)[number]["value"];
  summary: string;
};

const EVENT_OPTIONS = [
  { value: "accidental_injury", label: "意外受傷" },
  { value: "malicious_foul", label: "惡意犯規" },
  { value: "verbal_conflict", label: "言語衝突" },
  { value: "equipment_damage", label: "設備損壞" },
  { value: "other", label: "其他" },
] as const;
const STAGE_OPTIONS = [
  { value: "warmup", label: "熱身時" },
  { value: "in_match", label: "比賽中" },
  { value: "break", label: "休息時" },
  { value: "post_match", label: "賽後" },
] as const;
const ACTION_OPTIONS = [
  { value: "ambulance", label: "叫救護車" },
  { value: "onsite_settlement", label: "雙方自行和解" },
  { value: "police", label: "報警" },
  { value: "monitoring_only", label: "僅現場勸導紀錄" },
] as const;

function labelOf(value: string, options: readonly { value: string; label: string }[]): string {
  return options.find((opt) => opt.value === value)?.label || value;
}

export function HostIncidentReportPanel() {
  const [teams, setTeams] = useState<TeamLite[]>([]);
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resendingId, setResendingId] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState<IncidentFormState>({
    team_id: "",
    booking_id: "",
    booking_reference: "",
    event_type: EVENT_OPTIONS[0].value,
    stage: STAGE_OPTIONS[0].value,
    action_taken: ACTION_OPTIONS[0].value,
    summary: "",
  });

  const teamNameMap = useMemo(
    () => Object.fromEntries(teams.map((t) => [t.id, t.arena_name])),
    [teams]
  );

  async function load() {
    setLoading(true);
    try {
      const [teamsRes, incidentsRes] = await Promise.all([
        fetch("/api/host/teams"),
        fetch("/api/host/incidents"),
      ]);
      const teamsData = await teamsRes.json();
      const incidentsData = await incidentsRes.json();
      if (!teamsRes.ok) throw new Error(teamsData.error || "載入團隊失敗");
      if (!incidentsRes.ok) throw new Error(incidentsData.error || "載入事故紀錄失敗");
      const list = Array.isArray(teamsData.teams) ? (teamsData.teams as TeamLite[]) : [];
      setTeams(list);
      if (list.length && !form.team_id) {
        setForm((prev) => ({ ...prev, team_id: list[0].id }));
      }
      setIncidents(Array.isArray(incidentsData.incidents) ? incidentsData.incidents : []);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "載入失敗");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submitReport() {
    if (!form.team_id || !form.summary.trim()) {
      setMessage("請先選擇團隊並填寫客觀敘述");
      return;
    }
    setSubmitting(true);
    setMessage("");
    try {
      const res = await fetch("/api/host/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "事故通報送出失敗");
      if (data?.mail?.sent) {
        setMessage("已完成事故通報，通知信已送出。請保留現場證據並於必要時聯繫客服。");
      } else {
        setMessage("已完成事故通報，但通知信暫時失敗，可在下方「最近事故紀錄」按重送。");
      }
      setForm((prev) => ({
        ...prev,
        booking_id: "",
        booking_reference: "",
        summary: "",
      }));
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "事故通報送出失敗");
    } finally {
      setSubmitting(false);
    }
  }

  async function resendMail(incidentId: string) {
    if (!incidentId || resendingId) return;
    setResendingId(incidentId);
    setMessage("");
    try {
      const res = await fetch("/api/host/incidents/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incident_id: incidentId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "重送失敗");
      setMessage("事故通知信已重送成功。");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "重送失敗，請稍後再試");
    } finally {
      setResendingId("");
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">緊急事故 / 爭議回報（AAR）</h2>
      <p className="mt-1 text-sm text-slate-600">
        請用客觀事實紀錄，建議於事件後 24 小時內提交，作為後續釐清證據。
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="font-medium text-slate-700">團隊</span>
          <select
            value={form.team_id}
            onChange={(e) => setForm((prev) => ({ ...prev, team_id: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          >
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.arena_name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="font-medium text-slate-700">預約編號（選填）</span>
          <input
            value={form.booking_reference}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, booking_reference: e.target.value.toUpperCase() }))
            }
            placeholder="例如 E57457CC"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>

        <label className="text-sm">
          <span className="font-medium text-slate-700">事件類型</span>
          <select
            value={form.event_type}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                event_type: e.target.value as IncidentFormState["event_type"],
              }))
            }
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          >
            {EVENT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="font-medium text-slate-700">發生時間與階段</span>
          <select
            value={form.stage}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                stage: e.target.value as IncidentFormState["stage"],
              }))
            }
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          >
            {STAGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm sm:col-span-2">
          <span className="font-medium text-slate-700">現場處置</span>
          <select
            value={form.action_taken}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                action_taken: e.target.value as IncidentFormState["action_taken"],
              }))
            }
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          >
            {ACTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm sm:col-span-2">
          <span className="font-medium text-slate-700">客觀還原（必填）</span>
          <textarea
            rows={4}
            value={form.summary}
            onChange={(e) => setForm((prev) => ({ ...prev, summary: e.target.value }))}
            placeholder="請描述可觀察到的事實、雙方行為與處置，不使用情緒字眼。"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
      </div>

      {message && <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{message}</p>}

      <button
        type="button"
        disabled={submitting || loading}
        onClick={submitReport}
        className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {submitting ? "送出中..." : "送出事故通報"}
      </button>

      <div className="mt-6">
        <p className="text-sm font-semibold text-slate-900">最近事故紀錄</p>
        {loading ? (
          <p className="mt-2 text-sm text-slate-500">載入中...</p>
        ) : incidents.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">尚無事故回報。</p>
        ) : (
          <div className="mt-2 space-y-2">
            {incidents.slice(0, 20).map((row) => (
              <div key={row.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <p className="font-semibold text-slate-800">
                  {teamNameMap[row.team_id] || row.team_id} · {labelOf(row.event_type, EVENT_OPTIONS)}
                </p>
                <p className="text-xs text-slate-500">
                  {new Date(row.created_at).toLocaleString("zh-TW")} ·
                  {" "}{labelOf(row.stage, STAGE_OPTIONS)} · {labelOf(row.action_taken, ACTION_OPTIONS)}
                  {row.booking_reference ? ` · ${row.booking_reference}` : ""}
                </p>
                <p className="mt-1 text-slate-700">{row.summary}</p>
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => void resendMail(row.id)}
                    disabled={Boolean(resendingId)}
                    className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 disabled:opacity-60"
                  >
                    {resendingId === row.id ? "重送中..." : "重送通知信"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

