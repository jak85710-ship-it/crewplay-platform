import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getMemberSession } from "@/lib/member-session";

export async function GET() {
  const cookieStore = await cookies();
  const member = getMemberSession(cookieStore);

  if (!member.isLoggedIn) {
    return NextResponse.json({ isLoggedIn: false });
  }

  return NextResponse.json({
    isLoggedIn: true,
    displayName: member.displayName,
    name: member.name ?? "",
    email: member.email ?? "",
    contactPhone: member.contactPhone ?? "",
    loginPhone: member.phone ?? "",
    method: member.method,
    needsEmail: !member.email,
  });
}
