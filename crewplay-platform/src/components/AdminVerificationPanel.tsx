"use client";

import { useCallback, useState } from "react";

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
};

export function AdminVerificationPanel({ adminKey }: Props) {
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const headers = useCallback(
    () => ({
      "Content-Type": "application/json",
      "x-admin-key": adminKey.trim(),
    }),
    [adminKey]
  );

  async function load() {
    if (!adminKey.trim()) {
      setMessage("請先輸入 ADMIN_API_KEY");
      return;
    }
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
        body: JSON.stringify({ member_key: memberKey, action, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "審核失敗");
      setPending((prev) => prev.filter((p) => p.member_key !== memberKey));
      setMessage(action === "approve" ? "已通過實名認證" : "已拒絕");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "審核失敗");
    } finally {
      setBusyKey(null);
    }
  }

  function imageUrl(id: string) {
    return `/api/admin/verification/image/${encodeURIComponent(id)}?key=${encodeURIComponent(adminKey.trim())}`;
  }

  return (
    <section className="mt-10">
      <h2 className="font-bold text-slate-800">1VS1 實名認證審核</h2>
      <p className="mt-1 text-sm text-slate-500">使用上方同一組管理金鑰載入待審項目。</p>

      <button
        type="button"
        onClick={load}
        className="mt-4 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold"
      >
        載入待審證件
      </button>

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
                disabled={busyKey === item.member_key}
                onClick={() => review(item.member_key, "approve")}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                通過
              </button>
              <button
                type="button"
                disabled={busyKey === item.member_key}
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
