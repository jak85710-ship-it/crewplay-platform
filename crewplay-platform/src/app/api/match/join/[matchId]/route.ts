import { NextResponse } from "next/server";

import { checkMemberCanMatch } from "@/lib/member-credit";
import { joinMatchSession } from "@/lib/matches";
import { isMemberKeyResult, requireMemberKey } from "@/lib/require-member-api";

type Params = { params: Promise<{ matchId: string }> };

export async function POST(_req: Request, { params }: Params) {
  const auth = await requireMemberKey();
  if (!isMemberKeyResult(auth)) return auth;

  const gate = await checkMemberCanMatch(auth.memberKey);
  if (!gate.allowed) {
    return NextResponse.json({ error: gate.block_reason ?? "無法加入對局" }, { status: 403 });
  }

  const { matchId } = await params;
  const result = await joinMatchSession(matchId, auth.memberKey);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, match_id: result.session.id });
}
