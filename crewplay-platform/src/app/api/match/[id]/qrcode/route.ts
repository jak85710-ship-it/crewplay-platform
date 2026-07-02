import { NextResponse } from "next/server";

import { getMatchCheckInToken } from "@/lib/matches";
import { matchCheckInPassUrl } from "@/lib/match-checkin-url";
import { isMemberKeyResult, requireMemberKey } from "@/lib/require-member-api";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireMemberKey();
  if (!isMemberKeyResult(auth)) return auth;

  const { id } = await params;
  const token = await getMatchCheckInToken(id, auth.memberKey);
  if (!token) {
    return NextResponse.json({ error: "目前無法取得到場條碼" }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    token,
    url: matchCheckInPassUrl(token),
  });
}
