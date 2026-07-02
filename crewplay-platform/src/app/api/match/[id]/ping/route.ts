import { NextResponse } from "next/server";

import { addMatchPing, type MatchPingType } from "@/lib/matches";
import { isMemberKeyResult, requireMemberKey } from "@/lib/require-member-api";

type Params = { params: Promise<{ id: string }> };

const VALID_PINGS = new Set<MatchPingType>([
  "DEPARTED",
  "ARRIVED_COUNTER",
  "LATE_5MIN",
  "NEED_HELP",
]);

export async function POST(req: Request, { params }: Params) {
  const auth = await requireMemberKey();
  if (!isMemberKeyResult(auth)) return auth;

  const { id } = await params;
  const body = await req.json();
  const pingType = String(body.ping_type ?? "").trim() as MatchPingType;

  if (!VALID_PINGS.has(pingType)) {
    return NextResponse.json({ error: "無效的聯絡類型" }, { status: 400 });
  }

  const result = await addMatchPing(id, auth.memberKey, pingType);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, ping: result.ping });
}
