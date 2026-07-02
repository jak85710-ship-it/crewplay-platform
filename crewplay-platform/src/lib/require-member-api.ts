import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getMemberKeyFromSession } from "@/lib/member-key";
import { getMemberSession } from "@/lib/member-session";

export async function requireMemberKey(): Promise<
  { memberKey: string } | NextResponse
> {
  const cookieStore = await cookies();
  const member = getMemberSession(cookieStore);
  const memberKey = getMemberKeyFromSession(member);
  if (!memberKey) {
    return NextResponse.json({ error: "請先登入會員" }, { status: 401 });
  }
  return { memberKey };
}

export function isMemberKeyResult(
  result: { memberKey: string } | NextResponse
): result is { memberKey: string } {
  return "memberKey" in result;
}
