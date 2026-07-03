"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { PublicMatchCard } from "@/lib/match-types";

function formatRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  return `${s.toLocaleString("zh-TW", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} – ${e.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}`;
}

type Props = {
  initialMatches: PublicMatchCard[];
};

export function MatchBrowseList({ initialMatches }: Props) {
  const router = useRouter();
  const [matches, setMatches] = useState(initialMatches);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function join(matchId: string) {
    setBusyId(matchId);
    setMessage("");
    try {
      const res = await fetch(`/api/match/join/${matchId}`, {
        method: "POST",
        credentials: "same-origin",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "加入失敗");

      setMatches((prev) => prev.filter((m) => m.id !== matchId));
      router.push(`/match/session/${matchId}`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "加入失敗");
    } finally {
      setBusyId(null);
    }
  }

  if (matches.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
        目前沒有等待中的對局。
        <Link href="/match/create" className="ml-1 text-brand-600 underline">
          發起一場
        </Link>
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {message && <p className="text-sm text-red-700">{message}</p>}
      <ul className="space-y-3">
        {matches.map((m) => (
          <li key={m.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">
                  {m.sport_type} · {m.skill_level}
                </p>
                <p className="mt-1 text-sm text-slate-600">{m.venue_name}</p>
                <p className="mt-1 text-sm text-slate-500">{formatRange(m.scheduled_start, m.scheduled_end)}</p>
              </div>
              <button
                type="button"
                disabled={busyId === m.id}
                onClick={() => join(m.id)}
                className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {busyId === m.id ? "加入中…" : "加入對局"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
