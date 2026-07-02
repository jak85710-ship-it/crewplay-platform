import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { MatchSessionPanel } from "@/components/MatchSessionPanel";
import { getMemberKeyFromSession } from "@/lib/member-key";
import { getMemberSession } from "@/lib/member-session";
import { getMatchById, isMatchParticipant } from "@/lib/matches";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: `1V1 對局 ${id.slice(0, 8)}` };
}

export default async function MatchSessionPage({ params }: Props) {
  const { id } = await params;
  const session = await getMatchById(id);
  if (!session) notFound();

  const cookieStore = await cookies();
  const member = getMemberSession(cookieStore);
  const memberKey = getMemberKeyFromSession(member);
  const role =
    memberKey && isMatchParticipant(session, memberKey)
      ? session.host_member_key === memberKey
        ? "host"
        : "guest"
      : null;

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <Link href="/match" className="text-sm text-brand-600 hover:underline">
        ← 返回 1V1
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">對局詳情</h1>
      {!member.isLoggedIn && (
        <p className="mt-4 text-sm text-amber-800">
          請
          <Link href={`/login?redirect=/match/session/${id}`} className="mx-1 underline">
            登入
          </Link>
          以查看聯絡與到場條碼。
        </p>
      )}
      <div className="mt-6">
        <MatchSessionPanel matchId={id} initialMatch={session} role={role} />
      </div>
    </div>
  );
}
