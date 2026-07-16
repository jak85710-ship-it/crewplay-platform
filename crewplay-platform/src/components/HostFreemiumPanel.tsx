"use client";

import { useEffect, useMemo, useState } from "react";

type DashboardData = {
  host: {
    host_id: string;
    plan: "FREE" | "PRO";
    monthly_leads_used: number;
    quota_limit: number | null;
    quota_reset_date: string;
  };
  events: Array<{
    id: string;
    name: string;
    sport: string;
    region: string;
    is_featured: boolean;
  }>;
  leads: Array<{
    id: string;
    team_id: string;
    team_name: string;
    created_at: string;
    is_unlocked: boolean;
    player_info: {
      name?: string;
      email?: string;
      line_id?: string;
      note?: string;
      sport?: string;
      region?: string;
    };
  }>;
};

function QuotaBar({ used, limit }: { used: number; limit: number }) {
  const ratio = Math.max(0, Math.min(100, Math.round((used / Math.max(1, limit)) * 100)));
  return (
    <div>
      <p className="text-sm text-slate-700">
        本月名單額度：<span className="font-semibold">{used}</span> / <span className="font-semibold">{limit}</span>
      </p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full ${ratio >= 100 ? "bg-red-500" : "bg-brand-600"}`}
          style={{ width: `${ratio}%` }}
        />
      </div>
    </div>
  );
}

export function HostFreemiumPanel() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [message, setMessage] = useState("");
  const [unlockBusyId, setUnlockBusyId] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [eventBusyId, setEventBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/host/pro/dashboard");
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "載入失敗");
      setData(payload as DashboardData);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "載入失敗");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const quotaUsed = data?.host.monthly_leads_used ?? 0;
  const quotaLimit = data?.host.quota_limit ?? null;
  const quotaReached = quotaLimit != null && quotaUsed >= quotaLimit;
  const lockedCount = useMemo(
    () => (data?.leads || []).filter((lead) => !lead.is_unlocked).length,
    [data]
  );

  async function unlockLead(leadId: string) {
    setUnlockBusyId(leadId);
    setMessage("");
    try {
      const res = await fetch(`/api/leads/${leadId}/unlock`, { method: "POST" });
      const payload = await res.json();
      if (!res.ok) {
        if (payload.requires_upgrade) {
          setUpgradeOpen(true);
        }
        throw new Error(payload.error || "解鎖失敗");
      }
      await load();
      setMessage("名單已解鎖");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "解鎖失敗");
    } finally {
      setUnlockBusyId(null);
    }
  }

  async function toggleFeatured(eventId: string, next: boolean) {
    setEventBusyId(eventId);
    setMessage("");
    try {
      const res = await fetch(`/api/events/${eventId}/toggle-featured`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_featured: next }),
      });
      const payload = await res.json();
      if (!res.ok) {
        if (payload.requires_upgrade) setUpgradeOpen(true);
        throw new Error(payload.error || "更新置頂失敗");
      }
      await load();
      setMessage(next ? "已開啟首頁置頂" : "已取消首頁置頂");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "更新置頂失敗");
    } finally {
      setEventBusyId(null);
    }
  }

  async function urgentPush(eventId: string) {
    setEventBusyId(eventId);
    setMessage("");
    try {
      const res = await fetch(`/api/events/${eventId}/urgent-push`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const payload = await res.json();
      if (!res.ok) {
        if (payload.requires_upgrade) setUpgradeOpen(true);
        throw new Error(payload.error || "急徵推播失敗");
      }
      setMessage(`急徵推播已送入佇列（預計通知 ${payload.sent_count ?? 0} 人）`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "急徵推播失敗");
    } finally {
      setEventBusyId(null);
    }
  }

  async function switchPlan(plan: "FREE" | "PRO") {
    setMessage("");
    try {
      const res = await fetch("/api/host/subscription/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "切換方案失敗");
      await load();
      setMessage(`已切換為 ${plan}（本地測試）`);
      setUpgradeOpen(false);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "切換方案失敗");
    }
  }

  if (loading) {
    return <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">載入團主增值服務中…</p>;
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        {message || "載入失敗，請稍後再試。"}
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900">團主增值服務儀表板</h2>
          {data.host.plan === "PRO" ? (
            <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
              PRO 無限額度
            </span>
          ) : (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">FREE</span>
          )}
        </div>
        <p className="mt-1 text-sm text-slate-600">
          目前方案：<span className="font-semibold">{data.host.plan}</span>
        </p>
        <div className="mt-3">
          {data.host.plan === "PRO" || quotaLimit == null ? (
            <p className="text-sm text-emerald-700">本月名單額度：無限額度</p>
          ) : (
            <QuotaBar used={quotaUsed} limit={quotaLimit} />
          )}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          下次額度重置：{new Date(data.host.quota_reset_date).toLocaleString("zh-TW")}
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-slate-900">名單列表（Lead List）</h3>
          {!quotaReached ? null : (
            <button
              type="button"
              onClick={() => setUpgradeOpen(true)}
              className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white"
            >
              解鎖無限名單（Upgrade to Pro）
            </button>
          )}
        </div>
        <p className="mt-1 text-xs text-slate-500">鎖定名單數：{lockedCount}</p>
        <div className="mt-3 space-y-2">
          {data.leads.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">
              目前尚無球友名單
            </p>
          ) : (
            data.leads.map((lead) => (
              <div key={lead.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-800">{lead.team_name}</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${lead.is_unlocked ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                    {lead.is_unlocked ? "已解鎖" : "未解鎖"}
                  </span>
                </div>
                <div className={`mt-2 rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-700 ${lead.is_unlocked ? "" : "blur-[2px]"}`}>
                  <p>姓名：{lead.player_info.name || "—"}</p>
                  <p>Email：{lead.player_info.email || "—"}</p>
                  <p>LINE ID：{lead.player_info.line_id || "—"}</p>
                  <p>備註：{lead.player_info.note || "—"}</p>
                </div>
                {!lead.is_unlocked && (
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <p className="text-xs text-slate-500">
                      FREE 方案每月可解鎖 5 筆，超過需升級 Pro。
                    </p>
                    <button
                      type="button"
                      disabled={unlockBusyId === lead.id}
                      onClick={() => unlockLead(lead.id)}
                      className="rounded-lg border border-brand-300 px-2.5 py-1 text-xs font-semibold text-brand-700 disabled:opacity-60"
                    >
                      {unlockBusyId === lead.id ? "解鎖中…" : "解鎖此名單"}
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="font-semibold text-slate-900">Pro 特權控制</h3>
        <div className="mt-3 space-y-2">
          {data.events.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">
              尚無可操作活動
            </p>
          ) : (
            data.events.map((event) => (
              <div key={event.id} className="rounded-lg border border-slate-200 p-3">
                <p className="text-sm font-semibold text-slate-800">{event.name}</p>
                <p className="text-xs text-slate-500">{event.sport} · {event.region}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={eventBusyId === event.id}
                    onClick={() => toggleFeatured(event.id, !event.is_featured)}
                    className="rounded-lg border border-violet-300 px-3 py-1 text-xs font-semibold text-violet-700 disabled:opacity-60"
                  >
                    {event.is_featured ? "取消首頁置頂" : "設為首頁置頂"}
                  </button>
                  <button
                    type="button"
                    disabled={eventBusyId === event.id}
                    onClick={() => urgentPush(event.id)}
                    className="rounded-lg border border-rose-300 px-3 py-1 text-xs font-semibold text-rose-700 disabled:opacity-60"
                  >
                    發送急徵推播
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {message && <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{message}</p>}

      {upgradeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h4 className="text-lg font-bold text-slate-900">升級 Pro 專業版</h4>
            <p className="mt-2 text-sm text-slate-600">解鎖完整團主增值服務：</p>
            <ul className="mt-3 space-y-1 text-sm text-slate-700">
              <li>1. 無限接收名單</li>
              <li>2. 首頁置頂曝光</li>
              <li>3. 急徵推播</li>
            </ul>
            <div className="mt-4 flex justify-end gap-2">
              {process.env.NODE_ENV === "development" ? (
                <>
                  <button
                    type="button"
                    onClick={() => switchPlan("PRO")}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white"
                  >
                    本地測試：啟用 PRO
                  </button>
                  <button
                    type="button"
                    onClick={() => switchPlan("FREE")}
                    className="rounded-lg border border-amber-300 px-3 py-1.5 text-sm"
                  >
                    本地測試：切回 FREE
                  </button>
                </>
              ) : null}
              <button
                type="button"
                onClick={() => setUpgradeOpen(false)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
