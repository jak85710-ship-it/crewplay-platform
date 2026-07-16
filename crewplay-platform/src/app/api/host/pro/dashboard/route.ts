import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  FREE_MONTHLY_LEAD_QUOTA,
  getFeaturedEventMap,
  getHostSubscriptionProfile,
  listHostLeads,
} from "@/lib/host-freemium";
import { hostLeadIdCandidatesFromMember } from "@/lib/host-lead-routing";
import { listOwnedTeamsForMember } from "@/lib/host-team-access";
import { getMemberSession } from "@/lib/member-session";

function maskLeadInfo(value: string): string {
  const text = String(value || "").trim();
  if (!text) return "—";
  if (text.length <= 2) return "*".repeat(text.length);
  return `${text.slice(0, 2)}${"*".repeat(Math.min(8, Math.max(2, text.length - 2)))}`;
}

export async function GET() {
  const cookieStore = await cookies();
  const member = getMemberSession(cookieStore);
  if (!member.isLoggedIn) {
    return NextResponse.json({ error: "請先登入團主帳號" }, { status: 401 });
  }

  const hostIds = hostLeadIdCandidatesFromMember(member);
  if (!hostIds.length) {
    return NextResponse.json({ error: "無法識別團主身份" }, { status: 403 });
  }
  const hostId = hostIds[0];

  const [profile, leads, teams, featuredMap] = await Promise.all([
    getHostSubscriptionProfile(hostId),
    listHostLeads(hostId),
    listOwnedTeamsForMember(member),
    getFeaturedEventMap(),
  ]);
  const teamById = Object.fromEntries(teams.map((t) => [t.id, t]));
  const quotaLimit = profile.subscription_plan === "PRO" ? null : FREE_MONTHLY_LEAD_QUOTA;

  return NextResponse.json({
    ok: true,
    host: {
      host_id: hostId,
      plan: profile.subscription_plan,
      monthly_leads_used: profile.monthly_leads_used,
      quota_limit: quotaLimit,
      quota_reset_date: profile.quota_reset_date,
    },
    events: teams.map((team) => ({
      id: team.id,
      name: team.arena_name,
      sport: team.sport,
      region: team.region,
      is_featured: featuredMap[team.id] === true,
    })),
    leads: leads.map((lead) => {
      const team = teamById[lead.team_id];
      const isUnlocked = lead.is_unlocked;
      return {
        id: lead.id,
        team_id: lead.team_id,
        team_name: team?.arena_name || "未命名活動",
        created_at: lead.created_at,
        is_unlocked: isUnlocked,
        player_info: isUnlocked
          ? lead.player_info
          : {
              name: maskLeadInfo(lead.player_info.name || ""),
              email: maskLeadInfo(lead.player_info.email || ""),
              line_id: maskLeadInfo(lead.player_info.line_id || ""),
              note: "升級 Pro 以解鎖完整聯絡資訊",
              sport: lead.player_info.sport || "",
              region: lead.player_info.region || "",
            },
      };
    }),
  });
}
