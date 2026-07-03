"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";

import { VERIFICATION_CONSENT_TEXT } from "@/lib/legal-entity";

import { submitVerificationAction, type VerifySubmitState } from "@/app/match/verify/actions";

type Props = {
  initialStatus: string;
  rejectionReason?: string | null;
  redirectAfter?: string | null;
};

const initialActionState: VerifySubmitState = {};

export function MatchVerifyForm({ initialStatus, rejectionReason, redirectAfter }: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(submitVerificationAction, initialActionState);
  const redirected = useRef(false);

  useEffect(() => {
    if (!state.ok || redirected.current) return;
    redirected.current = true;
    const q = redirectAfter ? `?redirect=${encodeURIComponent(redirectAfter)}` : "";
    router.replace(`/match/verify/pending${q}`);
  }, [state.ok, redirectAfter, router]);

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

  const loginHref = `/login?redirect=${encodeURIComponent(
    redirectAfter
      ? `/match/verify?redirect=${encodeURIComponent(redirectAfter)}`
      : "/match/verify"
  )}`;

  return (
    <form action={formAction} className="space-y-5">
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

      {state.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <p>{state.error}</p>
          {state.code === "login_required" && (
            <Link href={loginHref} className="mt-2 inline-block font-semibold underline">
              前往登入（登入後會回到此頁，無需重新填寫時請再試一次）
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
