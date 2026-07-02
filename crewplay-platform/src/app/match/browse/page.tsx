import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { MatchBrowseList } from "@/components/MatchBrowseList";
import { checkMemberCanMatch } from "@/lib/member-credit";
import { getMemberKeyFromSession } from "@/lib/member-key";
import { getMemberSession } from "@/lib/member-session";
import { matchAccessRedirect } from "@/lib/match-gate";
import { listWaitingMatches } from "@/lib/matches";

export const metadata: Metadata = {
  title: "瀏覽 1V1 對局",
};

export default async function MatchBrowsePage() {
  const cookieStore = await cookies();
  const member = getMemberSession(cookieStore);
  if (!member.isLoggedIn) {
    redirect("/login?redirect=/match/browse");
  }

  const memberKey = getMemberKeyFromSession(member)!;
  const gate = await checkMemberCanMatch(memberKey);
  const blocked = matchAccessRedirect(gate, "/match/browse");
  if (blocked) redirect(blocked);

  const matches = await listWaitingMatches();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/match" className="text-sm text-brand-600 hover:underline">
        ← 返回 1V1
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">瀏覽對局</h1>
      <p className="mt-2 text-sm text-slate-600">選擇一場等待中的對局加入。加入後即鎖定配對。</p>
      <div className="mt-8">
        <MatchBrowseList initialMatches={matches} />
      </div>
    </div>
  );
}
