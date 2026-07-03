import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { MatchCreateForm } from "@/components/MatchCreateForm";
import { checkMemberCanMatch } from "@/lib/member-credit";
import { getMemberKeyFromSession } from "@/lib/member-key";
import { getMemberSession } from "@/lib/member-session";
import { matchAccessRedirect } from "@/lib/match-gate";

export const metadata: Metadata = {
  title: "發起 1V1 對局",
};

export default async function MatchCreatePage() {
  const cookieStore = await cookies();
  const member = getMemberSession(cookieStore);
  if (!member.isLoggedIn) {
    redirect("/login?redirect=/match/create");
  }

  const memberKey = getMemberKeyFromSession(member)!;
  const gate = await checkMemberCanMatch(memberKey);
  const verifyRedirect = matchAccessRedirect(gate, "/match/create");
  if (verifyRedirect) redirect(verifyRedirect);

  const blockedReason = gate.allowed ? null : gate.block_reason ?? "目前無法發起對局";

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <Link href="/match" className="text-sm text-brand-600 hover:underline">
        ← 返回 1V1
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">發起 1V1 對局</h1>
      <p className="mt-2 text-sm text-slate-600">配對成功後，雙方須到場掃描核銷。請勿交換私人聯絡方式。</p>
      <div className="mt-8">
        <MatchCreateForm blockedReason={blockedReason} />
      </div>
    </div>
  );
}
