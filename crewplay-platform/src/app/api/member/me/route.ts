import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getMemberKeyFromSession } from "@/lib/member-key";
import { applyMemberProfileToCookieStore, getMemberSession, setMemberSessionKey } from "@/lib/member-session";

export async function GET() {
  const cookieStore = await cookies();
  const member = getMemberSession(cookieStore);

  if (!member.isLoggedIn) {
    return NextResponse.json(
      { isLoggedIn: false },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const memberKey = getMemberKeyFromSession(member);
  const res = NextResponse.json({
    isLoggedIn: true,
    displayName: member.displayName,
    name: member.name ?? "",
    email: member.email ?? "",
    contactPhone: member.contactPhone ?? "",
    loginPhone: member.phone ?? "",
    method: member.method,
    needsEmail: !member.email,
  }, { headers: { "Cache-Control": "no-store" } });

  applyMemberProfileToCookieStore(res.cookies, {
    name: member.name ?? member.displayName,
    email: member.email,
    contactPhone: member.contactPhone ?? member.phone,
  });
  if (memberKey) {
    setMemberSessionKey(res.cookies, memberKey);
  }
  return res;
}
