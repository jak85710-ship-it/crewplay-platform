import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { setHostSubscriptionPlan } from "@/lib/host-freemium";
import { hostLeadIdCandidatesFromMember } from "@/lib/host-lead-routing";
import { getMemberSession } from "@/lib/member-session";

export async function POST(req: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "此測試功能僅開放本地開發環境" }, { status: 403 });
  }

  const cookieStore = await cookies();
  const member = getMemberSession(cookieStore);
  if (!member.isLoggedIn) {
    return NextResponse.json({ error: "請先登入團主帳號" }, { status: 401 });
  }
  const hostId = hostLeadIdCandidatesFromMember(member)[0];
  if (!hostId) {
    return NextResponse.json({ error: "無法識別團主身份" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as { plan?: string } | null;
  const plan = String(body?.plan || "").toUpperCase();
  if (plan !== "FREE" && plan !== "PRO") {
    return NextResponse.json({ error: "plan 只能是 FREE 或 PRO" }, { status: 400 });
  }

  const profile = await setHostSubscriptionPlan(hostId, plan);
  return NextResponse.json({ ok: true, profile });
}
