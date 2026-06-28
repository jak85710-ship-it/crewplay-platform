import { Suspense } from "react";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { checkMemberCanBook } from "@/lib/member-credit";
import { getMemberKeyFromSession } from "@/lib/member-key";
import { getMemberSession } from "@/lib/member-session";
import { enrichTeamFromIntro, getTeamById } from "@/lib/teams";
import { feeSummary } from "@/lib/utils";

import { BookFormClient } from "./BookFormClient";

interface Props {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<{ relogin?: string }>;
}

export default async function BookPage({ params, searchParams }: Props) {
  const { teamId } = await params;
  const sp = await searchParams;
  const cookieStore = await cookies();
  const member = getMemberSession(cookieStore);

  if (!member.isLoggedIn) {
    const loginQ = new URLSearchParams({ redirect: `/book/${teamId}` });
    if (sp.relogin === "1") loginQ.set("reason", "session_expired");
    redirect(`/login?${loginQ.toString()}`);
  }

  const teamRaw = await getTeamById(teamId);
  if (!teamRaw) notFound();

  const team = enrichTeamFromIntro(teamRaw);
  const memberKey = getMemberKeyFromSession(member);
  const credit = memberKey ? await checkMemberCanBook(memberKey) : null;

  return (
    <Suspense fallback={<p className="mx-auto max-w-lg px-4 py-10 text-center text-slate-500">載入報名表…</p>}>
      <BookFormClient
      teamId={teamId}
      team={{
        arena_name: team.arena_name,
        fee_label: team.fee_label,
      }}
      feeLabel={feeSummary(team)}
      unitPrice={team.fee_amount ?? 200}
      member={{
        name: member.name ?? member.displayName ?? "",
        email: member.email ?? "",
        contactPhone: member.contactPhone ?? member.phone ?? "",
        needsEmail: !member.email,
      }}
      credit={
        credit
          ? {
              credit_score: credit.credit_score,
              no_show_count: credit.no_show_count,
              can_book: credit.allowed,
              min_score: credit.min_score,
            }
          : null
      }
    />
    </Suspense>
  );
}
