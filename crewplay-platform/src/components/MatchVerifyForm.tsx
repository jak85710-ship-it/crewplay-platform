"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { VERIFICATION_CONSENT_TEXT } from "@/lib/legal-entity";

type Props = {
  initialStatus: string;
  rejectionReason?: string | null;
  redirectAfter?: string | null;
};

type SubmitError = {
  message: string;
  showLoginLink?: boolean;
};

export function MatchVerifyForm({ initialStatus, rejectionReason, redirectAfter }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<SubmitError | null>(null);

  const loginHref = `/login?redirect=${encodeURIComponent(
    redirectAfter
      ? `/match/verify?redirect=${encodeURIComponent(redirectAfter)}`
      : "/match/verify"
  )}`;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      const res = await fetch("/api/user/verification", {
        method: "POST",
        body: formData,
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
        ok?: boolean;
      };

      if (!res.ok) {
        if (data.code === "login_required") {
          const me = await fetch("/api/member/me", { credentials: "same-origin" })
            .then((r) => r.json())
            .catch(() => ({ isLoggedIn: false }));

          if (me.isLoggedIn) {
            setError({
              message: "上傳時未能讀取登入狀態，請重新整理頁面後再試一次。",
            });
          } else {
            setError({
              message: data.error || "請先登入會員",
              showLoginLink: true,
            });
          }
        } else {
          setError({ message: data.error || "上傳失敗，請稍後再試" });
        }
        return;
      }

      const q = redirectAfter ? `?redirect=${encodeURIComponent(redirectAfter)}` : "";
      router.replace(`/match/verify/pending${q}`);
    } catch {
      setError({ message: "連線失敗，請稍後再試" });
    } finally {
      setPending(false);
    }
  }

  if (initialStatus === "approved") {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
        <p className="font-semibold">實名認證已通過</p>
        <p className="mt-2">您可以使用 1V1 盲盒匹配功能。</p>
        <Link
          href={redirectAfter || "/match"}
          className="mt-4 inline-block font-semibold text-brand-700 underline"
        >
          {redirectAfter ? "繼續使用 1V1" : "返回 1V1 首頁"}
        </Link>
      </div>
    );
  }

  if (initialStatus === "pending") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        <p className="font-semibold">實名認證審核中</p>
        <p className="mt-2">人工審核約 1–2 個工作天，通過後即可使用 1V1 匹配。</p>
        <Link
          href={`/match/verify/pending${redirectAfter ? `?redirect=${encodeURIComponent(redirectAfter)}` : ""}`}
          className="mt-4 inline-block font-semibold text-brand-700 underline"
        >
          查看審核進度
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {initialStatus === "rejected" && rejectionReason && (
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
            name="file"
            accept="image/jpeg,image/png,image/webp"
            required
            className="mt-2 block w-full text-sm"
          />
        </label>
      </div>

      <label className="flex gap-3 rounded-xl border border-brand-100 bg-brand-50 p-4 text-sm text-brand-900">
        <input type="checkbox" name="agreed" value="true" required className="mt-1" />
        <span>{VERIFICATION_CONSENT_TEXT}</span>
      </label>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <p>{error.message}</p>
          {error.showLoginLink && (
            <Link href={loginHref} className="mt-2 inline-block font-semibold underline">
              前往登入
            </Link>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "上傳中…" : "送出實名認證"}
      </button>
    </form>
  );
}
