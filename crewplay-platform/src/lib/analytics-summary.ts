import { FUNNEL_STEPS } from "@/lib/analytics";
import type { AnalyticsEvent } from "@/lib/analytics-store";

export type TrafficSummary = {
  uniqueSessions: number;
  funnel: Array<{
    name: string;
    label: string;
    index: number;
    sessions: number;
    dropFromPrev: number | null;
    dropRateFromPrev: number | null;
  }>;
  actions: Array<{ action: string; count: number }>;
  dailySessions: Array<{ date: string; sessions: number; pageViews: number }>;
  lastEventAt: string | null;
};

export function buildTrafficSummary(events: AnalyticsEvent[]): TrafficSummary {
  const funnelEvents = events.filter((e) => e.type === "funnel");
  const actionEvents = events.filter((e) => e.type === "action");

  const sessionMaxStep = new Map<string, number>();
  const sessionDays = new Map<string, Set<string>>();

  for (const e of funnelEvents) {
    const sid = e.session_id || "anonymous";
    const idx = e.step_index ?? 0;
    sessionMaxStep.set(sid, Math.max(sessionMaxStep.get(sid) ?? 0, idx));

    const day = e.ts.slice(0, 10);
    if (!sessionDays.has(day)) sessionDays.set(day, new Set());
    sessionDays.get(day)!.add(sid);
  }

  const dailyPageViews = new Map<string, number>();
  for (const e of funnelEvents) {
    const day = e.ts.slice(0, 10);
    dailyPageViews.set(day, (dailyPageViews.get(day) ?? 0) + 1);
  }

  const uniqueSessions = sessionMaxStep.size;

  const funnel = FUNNEL_STEPS.map((step, i) => {
    const sessions = [...sessionMaxStep.values()].filter((max) => max >= step.index).length;
    const prevSessions = i === 0 ? sessions : [...sessionMaxStep.values()].filter(
      (max) => max >= FUNNEL_STEPS[i - 1].index
    ).length;
    const dropFromPrev = i === 0 ? null : prevSessions - sessions;
    const dropRateFromPrev =
      i === 0 || prevSessions === 0 ? null : Math.round((1 - sessions / prevSessions) * 1000) / 10;

    return {
      name: step.name,
      label: step.label,
      index: step.index,
      sessions,
      dropFromPrev,
      dropRateFromPrev,
    };
  });

  const actionMap = new Map<string, number>();
  for (const e of actionEvents) {
    const key = e.action || "unknown";
    actionMap.set(key, (actionMap.get(key) ?? 0) + 1);
  }

  const actions = [...actionMap.entries()]
    .map(([action, count]) => ({ action, count }))
    .sort((a, b) => b.count - a.count);

  const dailySessions = [...sessionDays.entries()]
    .map(([date, set]) => ({
      date,
      sessions: set.size,
      pageViews: dailyPageViews.get(date) ?? 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const lastEventAt = events.length ? events[events.length - 1].ts : null;

  return {
    uniqueSessions,
    funnel,
    actions,
    dailySessions,
    lastEventAt,
  };
}
