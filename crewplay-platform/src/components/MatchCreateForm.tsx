"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { MATCH_SKILL_LEVELS, type MatchSkillLevel } from "@/lib/match-skill-levels";
import { PILOT_MATCH_VENUE_NAME } from "@/lib/member-credit-constants";

function defaultStart(): string {
  const d = new Date();
  d.setHours(d.getHours() + 2, 0, 0, 0);
  return d.toISOString().slice(0, 16);
}

function defaultEnd(): string {
  const d = new Date();
  d.setHours(d.getHours() + 3, 0, 0, 0);
  return d.toISOString().slice(0, 16);
}

export function MatchCreateForm() {
  const router = useRouter();
  const [skillLevel, setSkillLevel] = useState<MatchSkillLevel>(MATCH_SKILL_LEVELS[1]);
  const [scheduledStart, setScheduledStart] = useState(defaultStart);
  const [scheduledEnd, setScheduledEnd] = useState(defaultEnd);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/match/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skill_level: skillLevel,
          scheduled_start: new Date(scheduledStart).toISOString(),
          scheduled_end: new Date(scheduledEnd).toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "建立失敗");

      router.push(`/match/session/${data.match.id}`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "建立失敗");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="rounded-xl border border-brand-100 bg-brand-50 p-4 text-sm text-brand-900">
        試營運場館：<strong>{PILOT_MATCH_VENUE_NAME}</strong>（桌球）· 雙方到場須掃描核銷
      </div>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">運動程度</span>
        <select
          value={skillLevel}
          onChange={(e) => setSkillLevel(e.target.value as MatchSkillLevel)}
          className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5"
        >
          {MATCH_SKILL_LEVELS.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">開始時間</span>
        <input
          type="datetime-local"
          value={scheduledStart}
          onChange={(e) => setScheduledStart(e.target.value)}
          required
          className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5"
        />
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">結束時間</span>
        <input
          type="datetime-local"
          value={scheduledEnd}
          onChange={(e) => setScheduledEnd(e.target.value)}
          required
          className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5"
        />
      </label>

      {message && <p className="text-sm text-red-700">{message}</p>}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {busy ? "建立中…" : "發起 1VS1 對局"}
      </button>
    </form>
  );
}
