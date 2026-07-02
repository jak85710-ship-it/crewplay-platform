import { NextResponse } from "next/server";

import {
  getMatchById,
  isMatchParticipant,
  listMemberActiveMatches,
  toPublicMatchCard,
} from "@/lib/matches";
import { isMemberKeyResult, requireMemberKey } from "@/lib/require-member-api";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const session = await getMatchById(id);
  if (!session) {
    return NextResponse.json({ error: "找不到對局" }, { status: 404 });
  }

  const auth = await requireMemberKey();
  if (isMemberKeyResult(auth) && isMatchParticipant(session, auth.memberKey)) {
    return NextResponse.json({
      ok: true,
      match: session,
      role: session.host_member_key === auth.memberKey ? "host" : "guest",
    });
  }

  return NextResponse.json({ ok: true, match: toPublicMatchCard(session) });
}
