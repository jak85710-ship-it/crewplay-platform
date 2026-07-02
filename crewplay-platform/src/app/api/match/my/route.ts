import { NextResponse } from "next/server";

import { listMemberActiveMatches } from "@/lib/matches";
import { isMemberKeyResult, requireMemberKey } from "@/lib/require-member-api";

export async function GET() {
  const auth = await requireMemberKey();
  if (!isMemberKeyResult(auth)) return auth;

  const matches = await listMemberActiveMatches(auth.memberKey);
  return NextResponse.json({ ok: true, matches });
}
