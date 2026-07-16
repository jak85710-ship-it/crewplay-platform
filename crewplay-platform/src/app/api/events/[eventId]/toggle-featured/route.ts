import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getHostSubscriptionProfile, setEventFeatured } from "@/lib/host-freemium";
import { hostLeadIdCandidatesFromMember } from "@/lib/host-lead-routing";
import { listOwnedTeamsForMember } from "@/lib/host-team-access";
import { getMemberSession } from "@/lib/member-session";

type Params = { params: Promise<{ eventId: string }> };

export async function POST(req: Request, { params }: Params) {
  const { eventId } = await params;
  const cookieStore = await cookies();
  const member = getMemberSession(cookieStore);
  if (!member.isLoggedIn) {
    return NextResponse.json({ error: "請先登入團主帳號" }, { status: 401 });
  }

  const teams = await listOwnedTeamsForMember(member);
  if (!teams.some((team) => team.id === eventId)) {
    return NextResponse.json({ error: "您只能操作自己開的活動" }, { status: 403 });
  }

  const hostId = hostLeadIdCandidatesFromMember(member)[0];
  if (!hostId) {
    return NextResponse.json({ error: "無法識別團主身份" }, { status: 403 });
  }
  const profile = await getHostSubscriptionProfile(hostId);
  if (profile.subscription_plan !== "PRO") {
    return NextResponse.json(
      { error: "需升級 Pro 才能使用首頁置頂", requires_upgrade: true },
      { status: 403 }
    );
  }

  const body = (await req.json().catch(() => null)) as { is_featured?: boolean } | null;
  const isFeatured = body?.is_featured !== false;
  await setEventFeatured(eventId, isFeatured);
  return NextResponse.json({ ok: true, event_id: eventId, is_featured: isFeatured });
}
