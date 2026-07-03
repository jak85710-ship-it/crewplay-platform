import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { MatchVerifyForm } from "@/components/MatchVerifyForm";
import { getMemberCredit, isVerificationApproved } from "@/lib/member-credit";
import { getMemberKeyFromSession } from "@/lib/member-key";
import { getMemberSession } from "@/lib/member-session";

export const metadata: Metadata = {
  title: "1V1 實名認證",
};

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ redirect?: string }> };

function safeRedirect(path: string | undefined): string | null {
  if (!path?.startsWith("/match/")) return null;
  return path;
}

export default async function MatchVerifyPage({ searchParams }: Props) {
  const { redirect: redirectParam } = await searchParams;
  const afterVerify = safeRedirect(redirectParam);

  const cookieStore = await cookies();
  const member = getMemberSession(cookieStore);
  if (!member.isLoggedIn) {
    const loginRedirect = afterVerify
      ? `/match/verify?redirect=${encodeURIComponent(afterVerify)}`
      : "/match/verify";
    redirect(`/login?redirect=${encodeURIComponent(loginRedirect)}`);
  }

  const memberKey = getMemberKeyFromSession(member)!;
  const profile = await getMemberCredit(memberKey);

  if (profile.verification_status === "pending") {
    const pendingQ = afterVerify ? `?redirect=${encodeURIComponent(afterVerify)}` : "";
    redirect(`/match/verify/pending${pendingQ}`);
  }

  if (isVerificationApproved(profile) && afterVerify) {
    redirect(afterVerify);
  }

  const verified = isVerificationApproved(profile);

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <Link href="/match" className="text-sm text-brand-600 hover:underline">
        ← 返回 1V1
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">實名認證</h1>
      <p className="mt-2 text-sm text-slate-600">
        為保障線下見面安全，使用 1V1 匹配前須通過人工實名審核。
      </p>
      {verified && !afterVerify && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          實名認證已通過。
          <Link href="/match/create" className="ml-2 font-semibold underline">
            發起對局
          </Link>
          <Link href="/match/browse" className="ml-2 font-semibold underline">
            瀏覽對局
          </Link>
        </div>
      )}
      <div className="mt-8">
        <MatchVerifyForm
          initialStatus={profile.verification_status ?? "none"}
          rejectionReason={profile.rejection_reason}
          redirectAfter={afterVerify}
        />
      </div>
    </div>
  );
}
