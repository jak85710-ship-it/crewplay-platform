"use client";

import { useMemo, useState } from "react";
import type { Team } from "@/types";

type Props = {
  adminKey: string;
  isAuthorized: boolean;
  teams: Team[];
  initialGlobalRecipients: string[];
  initialByTeam: Record<string, string[]>;
};

function parseRecipients(raw: string): string[] {
  return [...new Set(raw.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean))];
}

export function AdminLineHostRecipientsPanel({
  adminKey,
  isAuthorized,
  teams,
  initialGlobalRecipients,
  initialByTeam,
}: Props) {
  const [query, setQuery] = useState("");
  const [globalInput, setGlobalInput] = useState(initialGlobalRecipients.join(", "));
  const [draftByTeam, setDraftByTeam] = useState<Record<string, string>>(
    Object.fromEntries(teams.map((t) => [t.id, (initialByTeam[t.id] || []).join(", ")]))
  );
  const [busy, setBusy] = useState(false);
  const [testBusy, setTestBusy] = useState(false);
  const [testTeamId, setTestTeamId] = useState("");
  const [testText, setTestText] = useState("");
  const [message, setMessage] = useState("");
  const [testDebug, setTestDebug] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return teams;
    return teams.filter(
      (team) =>
        team.arena_name.toLowerCase().includes(q) ||
        team.region.toLowerCase().includes(q) ||
        team.sport.toLowerCase().includes(q)
    );
  }, [teams, query]);

  async function saveAll() {
    if (!adminKey.trim()) {
      setMessage("請先輸入 ADMIN_API_KEY");
      return;
    }
    if (!isAuthorized) {
      setMessage("請先按「驗證金鑰」完成編輯者身分確認。");
      return;
    }

    const byTeam: Record<string, string[]> = {};
    for (const team of teams) {
      byTeam[team.id] = parseRecipients(draftByTeam[team.id] || "");
    }

    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/line-host-recipients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey.trim(),
        },
        body: JSON.stringify({
          globalRecipients: parseRecipients(globalInput),
          byTeam,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "儲存失敗");
      setMessage("LINE 團主收件者設定已更新");
      setTestDebug("");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "儲存失敗");
    } finally {
      setBusy(false);
    }
  }

  async function sendTestMessage() {
    if (!adminKey.trim()) {
      setMessage("請先輸入 ADMIN_API_KEY");
      return;
    }
    if (!isAuthorized) {
      setMessage("請先按「驗證金鑰」完成編輯者身分確認。");
      return;
    }
    setTestBusy(true);
    setMessage("");
    setTestDebug("");
    try {
      const res = await fetch("/api/admin/line-host-recipients/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey.trim(),
        },
        body: JSON.stringify({
          team_id: testTeamId || undefined,
          text: testText.trim() || undefined,
        }),
      });
      const rawText = await res.text();
      const data = JSON.parse(rawText || "{}") as {
        error?: string;
        hint?: string;
        detail?: string;
        failedReasons?: string[];
        details?: Array<{ recipient?: string; sent?: boolean; reason?: string }>;
        success?: number;
        total?: number;
        failed?: number;
      };
      const hint = String(data.hint || "").trim();
      const reasons = Array.isArray(data.failedReasons) ? data.failedReasons.slice(0, 5) : [];
      const details = Array.isArray(data.details) ? data.details.slice(0, 8) : [];
      const debugText = [
        hint ? `提示：${hint}` : "",
        data.detail ? `例外：${data.detail}` : "",
        reasons.length ? `失敗原因：${reasons.join(" | ")}` : "",
        details.length
          ? `明細：${details
              .map((d) => `${d.sent ? "OK" : "FAIL"}:${String(d.recipient || "").slice(0, 8)}... ${d.reason || ""}`)
              .join(" ; ")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n");
      setTestDebug(debugText);
      if (!res.ok) throw new Error(data.error || "測試訊息送出失敗");
      setMessage(`測試完成：成功 ${data.success}/${data.total}，失敗 ${data.failed}${hint ? `（${hint}）` : ""}`);
    } catch (err) {
      if (err instanceof SyntaxError) {
        setMessage("測試訊息送出失敗（伺服器回應格式異常）");
        setTestDebug("例外：API 未回傳 JSON，請檢查伺服器部署版本是否最新。");
      } else {
        setMessage(err instanceof Error ? err.message : "測試訊息送出失敗");
      }
    } finally {
      setTestBusy(false);
    }
  }

  return (
    <section className="mt-10">
      <h2 className="font-bold text-slate-800">LINE 團主通知收件者設定</h2>
      <p className="mt-1 text-sm text-slate-500">
        支援全域與分團設定。可填多組 userId/groupId，使用逗號或換行分隔。
      </p>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
        <label className="block text-sm font-medium text-slate-700">全域收件者（所有團都會收到）</label>
        <textarea
          rows={2}
          value={globalInput}
          onChange={(e) => setGlobalInput(e.target.value)}
          disabled={!isAuthorized}
          placeholder="Uxxxx, Uyyyy 或 C/groupId"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-50"
        />

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜尋團名 / 地區 / 運動"
          className="mt-4 w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />

        <div className="mt-3 space-y-2">
          {rows.slice(0, 120).map((team) => (
            <div key={team.id} className="rounded-lg border border-slate-200 p-3">
              <p className="text-sm font-semibold text-slate-800">{team.arena_name}</p>
              <p className="text-xs text-slate-500">
                {team.sport} · {team.region}
              </p>
              <textarea
                rows={2}
                value={draftByTeam[team.id] ?? ""}
                onChange={(e) => setDraftByTeam((prev) => ({ ...prev, [team.id]: e.target.value }))}
                disabled={!isAuthorized}
                placeholder="此團專屬收件者（留空=僅全域）"
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-50"
              />
            </div>
          ))}
        </div>

        {rows.length > 120 && (
          <p className="mt-3 text-xs text-slate-500">結果過多，僅顯示前 120 筆，請縮小搜尋條件。</p>
        )}

        <button
          type="button"
          onClick={saveAll}
          disabled={busy || !isAuthorized}
          className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? "儲存中..." : "儲存 LINE 收件者設定"}
        </button>

        <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-semibold text-slate-800">測試推播</p>
          <p className="mt-1 text-xs text-slate-500">可選擇指定團隊（分團 + 全域）或留空僅測全域收件者。</p>

          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <select
              value={testTeamId}
              onChange={(e) => setTestTeamId(e.target.value)}
              disabled={!isAuthorized}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:opacity-50"
            >
              <option value="">僅全域收件者</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.arena_name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={sendTestMessage}
              disabled={testBusy || !isAuthorized}
              className="rounded-lg border border-brand-400 bg-white px-4 py-2 text-sm font-semibold text-brand-700 disabled:opacity-60"
            >
              {testBusy ? "測試送出中..." : "發送測試 LINE 訊息"}
            </button>
          </div>

          <textarea
            rows={3}
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            disabled={!isAuthorized}
            placeholder="可選：自訂測試訊息內容（留空則使用系統預設）"
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-50"
          />
        </div>
      </div>

      {message && <p className="mt-3 text-sm text-slate-600">{message}</p>}
      {testDebug && <pre className="mt-2 overflow-auto rounded-lg bg-slate-100 p-3 text-xs text-slate-700">{testDebug}</pre>}
    </section>
  );
}
