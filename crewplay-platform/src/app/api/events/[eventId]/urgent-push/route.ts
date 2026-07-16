import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  URGENT_PUSH_COOLDOWN_HOURS,
  canTriggerUrgentPush,
  getHostSubscriptionProfile,
  listAllHostLeads,
  recordUrgentPush,
} from "@/lib/host-freemium";
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
  const team = teams.find((row) => row.id === eventId);
  if (!team) {
    return NextResponse.json({ error: "您只能操作自己開的活動" }, { status: 403 });
  }

  const hostId = hostLeadIdCandidatesFromMember(member)[0];
  if (!hostId) {
    return NextResponse.json({ error: "無法識別團主身份" }, { status: 403 });
  }
  const profile = await getHostSubscriptionProfile(hostId);
  if (profile.subscription_plan !== "PRO") {
    return NextResponse.json(
      { error: "需升級 Pro 才能使用急徵推播", requires_upgrade: true },
      { status: 403 }
    );
  }

  const cooldown = await canTriggerUrgentPush({
    host_id: hostId,
    event_id: eventId,
    cooldownHours: URGENT_PUSH_COOLDOWN_HOURS,
  });
  if (!cooldown.ok) {
    return NextResponse.json(
      {
        error: "急徵推播冷卻中",
        cooldown_hours: URGENT_PUSH_COOLDOWN_HOURS,
        next_allowed_at: cooldown.next_allowed_at,
        last_sent_at: cooldown.last_sent_at,
      },
      { status: 429 }
    );
  }

  const body = (await req.json().catch(() => null)) as { message?: string } | null;
  const message = String(body?.message || "").trim() || `【急徵】${team.arena_name} 目前還缺人，歡迎立即報名！`;

  const allLeads = await listAllHostLeads();
  const recipients = [...new Set(
    allLeads
      .filter((lead) => {
        const sport = String(lead.player_info?.sport || "").trim();
        const region = String(lead.player_info?.region || "").trim();
        return (sport && sport === team.sport) || (region && region === team.region);
      })
      .map((lead) => String(lead.player_info?.email || "").trim())
      .filter((email) => email.includes("@"))
  )];

  const log = await recordUrgentPush({
    host_id: hostId,
    event_id: eventId,
    sport: team.sport,
    region: team.region,
    message,
  });

  return NextResponse.json({
    ok: true,
    event_id: eventId,
    sent_count: recipients.length,
    channel: "site_notification_queue",
    log,
  });
}
