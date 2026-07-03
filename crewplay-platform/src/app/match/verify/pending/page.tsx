import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getMemberCredit, isVerificationApproved } from "@/lib/member-credit";
import { getMemberKeyFromSession } from "@/lib/member-key";
import { getMemberSession } from "@/lib/member-session";

export const metadata: Metadata = {
  title: "實名認證審核中",
};

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ redirect?: string }> };

function safeRedirect(path: string | undefined): string | null {
  if (!path?.startsWith("/match/")) return null;
  return path;
}

export default async function MatchVerifyPendingPage({ searchParams }: Props) {
  const { redirect: redirectParam } = await searchParams;
  const afterVerify = safeRedirect(redirectParam);

  const cookieStore = await cookies();
  const member = getMemberSession(cookieStore);
  if (!member.isLoggedIn) {
    const loginRedirect = afterVerify
      ? `/match/verify/pending?redirect=${encodeURIComponent(afterVerify)}`
      : "/match/verify/pending";
    redirect(`/login?redirect=${encodeURIComponent(loginRedirect)}`);
  }

  const memberKey = getMemberKeyFromSession(member)!;
  const profile = await getMemberCredit(memberKey);

  if (isVerificationApproved(profile)) {
    redirect(afterVerify ?? "/match");
  }

  if (profile.verification_status !== "pending") {
    redirect(
      afterVerify
        ? `/match/verify?redirect=${encodeURIComponent(afterVerify)}`
        : "/match/verify"
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <Link href="/match" className="text-sm text-brand-600 hover:underline">
        ← 返回 1V1
      </Link>

      <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-2xl">
          ⏳
        </div>
        <h1 className="mt-5 text-xl font-bold text-slate-900">實名認證審核中</h1>
        <p className="mt-3 text-sm leading-relaxed text-amber-950">
          我們已收到您的證件資料，感謝您耐心等候。
        </p>
        <p className="mt-4 text-sm font-semibold text-amber-900">
          人工審核約需 1–2 個工作天
        </p>
        <p className="mt-2 text-sm text-amber-900/90">
          審核通過後即可發起或加入 1V1 對局。請回到 1V1 首頁查看狀態，無需再次登入或重複上傳。
        </p>
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        <p className="font-medium text-slate-800">審核完成後您可以：</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>到「1V1 首頁」確認實名狀態為「已通過」</li>
          <li>發起對局或瀏覽並加入其他人的對局</li>
        </ul>
      </div>

      <Link
        href="/match"
        className="mt-8 block w-full rounded-xl bg-brand-600 px-4 py-3 text-center text-sm font-semibold text-white"
      >
        返回 1V1 首頁
      </Link>
    </div>
  );
}
