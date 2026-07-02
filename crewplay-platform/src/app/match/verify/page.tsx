import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { MatchVerifyForm } from "@/components/MatchVerifyForm";
import { getMemberCredit } from "@/lib/member-credit";
import { getMemberKeyFromSession } from "@/lib/member-key";
import { getMemberSession } from "@/lib/member-session";

export const metadata: Metadata = {
  title: "1VS1 實名認證",
};

export default async function MatchVerifyPage() {
  const cookieStore = await cookies();
  const member = getMemberSession(cookieStore);
  if (!member.isLoggedIn) {
    redirect("/login?redirect=/match/verify");
  }

  const memberKey = getMemberKeyFromSession(member)!;
  const profile = await getMemberCredit(memberKey);

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <Link href="/match" className="text-sm text-brand-600 hover:underline">
        ← 返回 1VS1
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">實名認證</h1>
      <p className="mt-2 text-sm text-slate-600">
        為保障線下見面安全，使用 1VS1 匹配前須通過人工實名審核。證件影像僅供審核，依隱私權政策保存與刪除。
      </p>
      <div className="mt-8">
        <MatchVerifyForm
          initialStatus={profile.verification_status ?? "none"}
          rejectionReason={profile.rejection_reason}
        />
      </div>
    </div>
  );
}
