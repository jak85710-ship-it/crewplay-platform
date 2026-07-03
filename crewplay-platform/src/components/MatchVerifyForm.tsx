import Link from "next/link";

import { VERIFICATION_CONSENT_TEXT } from "@/lib/legal-entity";

type Props = {
  initialStatus: string;
  rejectionReason?: string | null;
  redirectAfter?: string | null;
  initialError?: string | null;
  memberEmail?: string | null;
  needsEmail?: boolean;
};

export function MatchVerifyForm({
  initialStatus,
  rejectionReason,
  redirectAfter,
  initialError,
  memberEmail,
  needsEmail,
}: Props) {
  const loginHref = `/login?redirect=${encodeURIComponent(
    redirectAfter
      ? `/match/verify?redirect=${encodeURIComponent(redirectAfter)}`
      : "/match/verify"
  )}`;

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
    <form
      action="/api/user/verification"
      method="POST"
      encType="multipart/form-data"
      className="space-y-5"
    >
      {redirectAfter && <input type="hidden" name="redirect_after" value={redirectAfter} />}

      {initialStatus === "rejected" && rejectionReason && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <p className="font-semibold">上次審核未通過</p>
          <p className="mt-1">原因：{rejectionReason}</p>
          <p className="mt-2">請重新上傳清晰、完整的證件影像。</p>
        </div>
      )}

      {needsEmail ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="block text-sm font-medium text-slate-700">
            Email（審核與通知用，與報名帳號相同格式）
            <input
              type="email"
              name="contact_email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              defaultValue={memberEmail ?? ""}
              className="mt-2 block w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>
        </div>
      ) : (
        memberEmail && (
          <>
            <input type="hidden" name="contact_email" value={memberEmail} />
            <p className="rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-900">
              審核資料將與 Email 帳號 <span className="font-semibold">{memberEmail}</span> 串聯。
            </p>
          </>
        )
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

      {initialError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <p>{initialError}</p>
          {initialError.includes("登入") && (
            <Link href={loginHref} className="mt-2 inline-block font-semibold underline">
              前往登入
            </Link>
          )}
        </div>
      )}

      <button
        type="submit"
        className="w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white"
      >
        送出實名認證
      </button>
    </form>
  );
}
