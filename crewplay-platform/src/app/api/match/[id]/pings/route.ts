import { NextResponse } from "next/server";

import { getMatchById, isMatchParticipant, listMatchPings } from "@/lib/matches";
import { isMemberKeyResult, requireMemberKey } from "@/lib/require-member-api";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireMemberKey();
  if (!isMemberKeyResult(auth)) return auth;

  const { id } = await params;
  const session = await getMatchById(id);
  if (!session) {
    return NextResponse.json({ error: "找不到對局" }, { status: 404 });
  }
  if (!isMatchParticipant(session, auth.memberKey)) {
    return NextResponse.json({ error: "您不是此對局參與者" }, { status: 403 });
  }

  const pings = await listMatchPings(id);
  return NextResponse.json({ ok: true, pings });
}
