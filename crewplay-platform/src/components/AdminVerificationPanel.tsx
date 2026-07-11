"use client";

import { useCallback, useEffect, useState } from "react";

type PendingItem = {
  member_key: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  verification_image_id: string | null;
  updated_at: string;
};

type Props = {
  adminKey: string;
  isAuthorized: boolean;
  onAdminKeyChange: (value: string) => void;
};

export function AdminVerificationPanel({ adminKey, isAuthorized, onAdminKeyChange }: Props) {
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [batchBusy, setBatchBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [notifyMember, setNotifyMember] = useState(true);

  useEffect(() => {
    const saved = window.localStorage.getItem("admin_verify_notify_member");
    if (saved === "0") setNotifyMember(false);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("admin_verify_notify_member", notifyMember ? "1" : "0");
  }, [notifyMember]);

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
      setMessage("請先按「驗證金鑰」完成編輯者身分確認。");
      return false;
    }
    return true;
  }

  async function load() {
    if (!ensureAuthorized()) return;
    setMessage("");
    try {
      const res = await fetch("/api/admin/verification/pending", {
        headers: { "x-admin-key": adminKey.trim() },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "載入失敗");
      setPending(data.pending ?? []);
      setLoaded(true);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "載入失敗");
    }
  }

  async function review(memberKey: string, action: "approve" | "reject") {
    if (!ensureAuthorized()) return;
    let reason = "";
    if (action === "reject") {
      reason = window.prompt("拒絕原因（選填）") ?? "";
    }
    setBusyKey(memberKey);
    setMessage("");
    try {
      const res = await fetch("/api/admin/verification/review", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          member_key: memberKey,
          action,
          reason,
          notify_result_email: notifyMember,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "審核失敗");
      setPending((prev) => prev.filter((p) => p.member_key !== memberKey));
      const base = action === "approve" ? "已通過實名認證" : "已拒絕";
      const notifyMsg =
        notifyMember && data?.notify
          ? data.notify.sent
            ? "，已發送結果通知信"
            : data.notify.skipped
              ? "，未寄送（會員未填 Email）"
              : "，寄信失敗"
          : "";
      setMessage(`${base}${notifyMsg}`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "審核失敗");
    } finally {
      setBusyKey(null);
    }
  }

  async function reviewAll(action: "approve" | "reject") {
    if (!ensureAuthorized()) return;
    if (pending.length === 0 || batchBusy) return;
    const ok = window.confirm(
      action === "approve"
        ? `確定要一次通過全部 ${pending.length} 筆待審嗎？`
        : `確定要一次拒絕全部 ${pending.length} 筆待審嗎？`
    );
    if (!ok) return;

    const rejectReason =
      action === "reject" ? window.prompt("批次拒絕原因（選填）") ?? "" : "";

    setBatchBusy(true);
    setMessage("");
    let success = 0;
    let fail = 0;
    let sent = 0;
    let mailFail = 0;

    for (const item of [...pending]) {
      try {
        const res = await fetch("/api/admin/verification/review", {
          method: "POST",
          headers: headers(),
          body: JSON.stringify({
            member_key: item.member_key,
            action,
            reason: rejectReason,
            notify_result_email: notifyMember,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "審核失敗");
        success += 1;
        if (notifyMember && data?.notify) {
          if (data.notify.sent) sent += 1;
          else if (!data.notify.skipped) mailFail += 1;
        }
      } catch {
        fail += 1;
      }
    }

    await load();
    setBatchBusy(false);
    setMessage(
      `批次${action === "approve" ? "通過" : "拒絕"}完成：成功 ${success} 筆，失敗 ${fail} 筆` +
        (notifyMember ? `；已寄送 ${sent} 封，寄信失敗 ${mailFail} 封` : "")
    );
  }

  function imageUrl(id: string) {
    return `/api/admin/verification/image/${encodeURIComponent(id)}?key=${encodeURIComponent(adminKey.trim())}`;
  }

  return (
    <section className="mt-10">
      <h2 className="font-bold text-slate-800">1V1 實名認證審核</h2>
      <p className="mt-1 text-sm text-slate-500">可直接在此輸入管理金鑰後載入待審項目。</p>

      <div className="mt-3 max-w-md">
        <label className="block text-sm font-semibold text-slate-700">管理金鑰（ADMIN_API_KEY）</label>
        <input
          type="password"
          value={adminKey}
          onChange={(e) => onAdminKeyChange(e.target.value)}
          placeholder="輸入後可直接按『載入待審證件』"
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        />
      </div>

      <label className="mt-3 inline-flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={notifyMember}
          onChange={(e) => setNotifyMember(e.target.checked)}
        />
        開啟「審核結果寄信通知會員」
      </label>

      <button
        type="button"
        onClick={load}
            disabled={batchBusy || !isAuthorized}
        className="mt-4 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold"
      >
        載入待審證件
      </button>
      {loaded && pending.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
              disabled={batchBusy || !isAuthorized}
            onClick={() => reviewAll("approve")}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {batchBusy ? "處理中…" : `一鍵全部通過（${pending.length}）`}
          </button>
          <button
            type="button"
              disabled={batchBusy || !isAuthorized}
            onClick={() => reviewAll("reject")}
            className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-700 disabled:opacity-60"
          >
            {batchBusy ? "處理中…" : `一鍵全部拒絕（${pending.length}）`}
          </button>
        </div>
      )}

      {message && <p className="mt-3 text-sm text-slate-600">{message}</p>}

      {loaded && pending.length === 0 && (
        <p className="mt-4 text-sm text-slate-500">目前沒有待審項目。</p>
      )}

      <ul className="mt-4 space-y-4">
        {pending.map((item) => (
          <li key={item.member_key} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="font-mono text-xs text-slate-500">{item.member_key}</p>
            <p className="mt-1 text-sm font-semibold">{item.display_name || "（未提供暱稱）"}</p>
            <p className="text-sm text-slate-600">
              {[item.email, item.phone].filter(Boolean).join(" · ") || "無聯絡資料"}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              送件時間：{new Date(item.updated_at).toLocaleString("zh-TW")}
            </p>
            {item.verification_image_id && adminKey.trim() && (
              <img
                src={imageUrl(item.verification_image_id)}
                alt="證件影像"
                className="mt-3 max-h-48 rounded-lg border border-slate-200 object-contain"
              />
            )}
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={busyKey === item.member_key || batchBusy || !isAuthorized}
                onClick={() => review(item.member_key, "approve")}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                通過
              </button>
              <button
                type="button"
                disabled={busyKey === item.member_key || batchBusy || !isAuthorized}
                onClick={() => review(item.member_key, "reject")}
                className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-700 disabled:opacity-60"
              >
                拒絕
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
