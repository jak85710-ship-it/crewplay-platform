import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { checkMemberCanBook, getMemberCredit, MIN_BOOKING_SCORE } from "@/lib/member-credit";
import { getMemberKeyFromSession } from "@/lib/member-key";
import { getMemberSession } from "@/lib/member-session";

export async function GET() {
  const cookieStore = await cookies();
  const member = getMemberSession(cookieStore);

  if (!member.isLoggedIn) {
    return NextResponse.json({ isLoggedIn: false }, { status: 401 });
  }

  const memberKey = getMemberKeyFromSession(member);
  if (!memberKey) {
    return NextResponse.json({ error: "無法識別會員身分" }, { status: 400 });
  }

  const profile = await getMemberCredit(memberKey);
  const check = await checkMemberCanBook(memberKey);

  return NextResponse.json({
    isLoggedIn: true,
    member_key: memberKey,
    credit_score: profile.credit_score,
    no_show_count: profile.no_show_count,
    can_book: check.allowed,
    min_score: MIN_BOOKING_SCORE,
  });
}
