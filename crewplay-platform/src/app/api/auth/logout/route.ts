import { NextResponse } from "next/server";

import { clearMemberCookies } from "@/lib/member-session";

export async function POST() {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const res = NextResponse.redirect(`${site}/`);
  clearMemberCookies(res);
  return res;
}

export async function GET() {
  return POST();
}
