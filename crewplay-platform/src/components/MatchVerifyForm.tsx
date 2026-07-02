"use client";

import Link from "next/link";
import { useState } from "react";

import { VERIFICATION_CONSENT_TEXT } from "@/lib/legal-entity";

type Props = {
  initialStatus: string;
  rejectionReason?: string | null;
};

export function MatchVerifyForm({ initialStatus, rejectionReason }: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [file, setFile] = useState<File | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  if (status === "approved") {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
        <p className="font-semibold">實名認證已通過</p>
        <p className="mt-2">您可以使用 1VS1 盲盒匹配功能。</p>
        <Link href="/match" className="mt-4 inline-block font-semibold text-brand-700 underline">
          返回 1VS1 首頁
        </Link>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        <p className="font-semibold">實名認證審核中</p>
        <p className="mt-2">人工審核約 1–3 個工作天，通過後即可使用 1VS1 匹配。</p>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setMessage("請上傳證件影像");
      return;
    }
    if (!agreed) {
      setMessage("請勾選同意事項");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("agreed", "true");

      const res = await fetch("/api/user/verification", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "上傳失敗");

      setStatus(data.verification_status ?? "pending");
      setMessage(data.message ?? "已送出審核");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "上傳失敗");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {status === "rejected" && rejectionReason && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <p className="font-semibold">上次審核未通過</p>
          <p className="mt-1">原因：{rejectionReason}</p>
          <p className="mt-2">請重新上傳清晰、完整的證件影像。</p>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="block text-sm font-medium text-slate-700">
          上傳身分證或駕照（JPG / PNG / WebP，4MB 以內）
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="mt-2 block w-full text-sm"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      <label className="flex gap-3 rounded-xl border border-brand-100 bg-brand-50 p-4 text-sm text-brand-900">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-1"
        />
        <span>{VERIFICATION_CONSENT_TEXT}</span>
      </label>

      {message && (
        <p className={`text-sm ${status === "pending" ? "text-emerald-700" : "text-slate-600"}`}>{message}</p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {busy ? "上傳中…" : "送出實名認證"}
      </button>
    </form>
  );
}
