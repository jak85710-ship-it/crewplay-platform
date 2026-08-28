"use client";

import { useCallback, useEffect, useState } from "react";

type HostSubmissionRow = {
  id: string;
  merchant_trade_no: string;
  submitted_at: string;
  sport: string;
  team_name: string;
  location: string;
  weekday: string;
  time_slots: string[];
  vacancies: string;
  fee: string;
  skill_level: string;
  equipment: string;
  balls: string;
  phone: string;
  email: string;
  trust_image_id?: string;
  review_status: "pending_review" | "approved" | "rejected";
  reviewed_at?: string;
  review_note?: string;
  published_team_id?: string;
};

type Props = {
  adminKey: string;
  isAuthorized: boolean;
};

export function AdminHostSubmissionsPanel({ adminKey, isAuthorized }: Props) {
  const [rows, setRows] = useState<HostSubmissionRow[]>([]);
  const [message, setMessage] = useState("");
  const [busyTradeNo, setBusyTradeNo] = useState("");
  const [loading, setLoading] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"pending_review" | "approved" | "rejected" | "all">(
    "pending_review"
  );

  const headers = useCallback(
    () => ({
      "Content-Type": "application/json",
      "x-admin-key": adminKey.trim(),
    }),
    [adminKey]
  );

  function ensureAuthorized(): boolean {
    if (!adminKey.trim()) {
      setMessage("請先輸入 ADMIN_API_KEY");
      return false;
    }
    if (!isAuthorized) {
      setMessage("請先按「驗證金鑰」完成身分確認");
      return false;
    }
    return true;
  }

  async function load() {
    if (!ensureAuthorized()) return;
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/host-submissions/pending?status=${statusFilter}`, {
        headers: { "x-admin-key": adminKey.trim() },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "載入開團申請失敗");
      setRows(Array.isArray(data.pending) ? data.pending : []);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "載入開團申請失敗");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, isAuthorized, adminKey]);

  async function review(tradeNo: string, action: "approve" | "reject") {
    if (!ensureAuthorized()) return;
    const note =
      action === "reject"
        ? window.prompt("請輸入拒絕原因（會寄給申請者）", "") ?? ""
        : window.prompt("審核備註（選填）", "") ?? "";
    if (action === "reject" && !note.trim()) {
      setMessage("拒絕時建議填寫原因，已取消本次操作。");
      return;
    }
    setBusyTradeNo(tradeNo);
    setMessage("");
    try {
      const res = await fetch("/api/admin/host-submissions/review", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          trade_no: tradeNo,
          action,
          note,
          notify_email: notifyEmail,
          reviewed_by: "admin",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "審核失敗");
      const base = action === "approve" ? "已審核通過並自動上架" : "已拒絕申請";
      const notifyMsg =
        notifyEmail && data?.notify
          ? data.notify.sent
            ? "，已寄出通知信"
            : `，通知信未送出（${data.notify.error || "unknown"}）`
          : "";
      setMessage(`${base}${notifyMsg}`);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "審核失敗");
    } finally {
      setBusyTradeNo("");
    }
  }

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold text-slate-800">開團申請審核（通過即自動上架）</h2>
        <div className="flex items-center gap-2 text-xs">
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(
                e.target.value as "pending_review" | "approved" | "rejected" | "all"
              )
            }
            className="rounded-md border border-slate-300 px-2 py-1"
          >
            <option value="pending_review">待審核</option>
            <option value="approved">已通過</option>
            <option value="rejected">已拒絕</option>
            <option value="all">全部</option>
          </select>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded-md border border-slate-300 px-3 py-1 font-semibold"
          >
            {loading ? "載入中..." : "重新整理"}
          </button>
        </div>
      </div>

      <label className="mt-3 inline-flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={notifyEmail}
          onChange={(e) => setNotifyEmail(e.target.checked)}
        />
        審核後寄送結果通知信給申請者
      </label>

      {message ? <p className="mt-2 text-sm text-slate-600">{message}</p> : null}

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">目前沒有符合條件的開團申請。</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((row) => (
            <li key={row.merchant_trade_no} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="font-mono text-xs text-slate-500">{row.merchant_trade_no}</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {row.team_name} · {row.sport}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {row.location}｜{row.weekday} {row.time_slots.join("、")}
              </p>
              <p className="text-xs text-slate-500">
                缺額 {row.vacancies} 人 · 費用 {row.fee} · 程度 {row.skill_level}
              </p>
              <p className="text-xs text-slate-500">
                聯絡：{row.phone} / {row.email}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                提交：{new Date(row.submitted_at).toLocaleString("zh-TW")} · 狀態：
                {row.review_status === "pending_review"
                  ? "待審核"
                  : row.review_status === "approved"
                    ? "已通過"
                    : "已拒絕"}
              </p>
              {row.trust_image_id ? (
                <img
                  src={`/api/submissions/image/${encodeURIComponent(row.trust_image_id)}`}
                  alt="申請上傳圖片"
                  className="mt-2 max-h-44 rounded-lg border border-slate-200 object-contain"
                />
              ) : null}
              {row.review_note ? (
                <p className="mt-2 rounded bg-slate-50 px-2 py-1 text-xs text-slate-600">
                  審核備註：{row.review_note}
                </p>
              ) : null}
              {row.published_team_id ? (
                <p className="mt-2 text-xs text-emerald-700">
                  已上架團隊：{row.published_team_id}
                </p>
              ) : null}

              {row.review_status === "pending_review" ? (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => void review(row.merchant_trade_no, "approve")}
                    disabled={busyTradeNo === row.merchant_trade_no}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {busyTradeNo === row.merchant_trade_no ? "處理中..." : "通過並上架"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void review(row.merchant_trade_no, "reject")}
                    disabled={busyTradeNo === row.merchant_trade_no}
                    className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-700 disabled:opacity-60"
                  >
                    拒絕
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

