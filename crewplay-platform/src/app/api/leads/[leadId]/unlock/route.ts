import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { FREE_MONTHLY_LEAD_QUOTA, getHostSubscriptionProfile, unlockLeadForHost } from "@/lib/host-freemium";
import { hostLeadIdCandidatesFromMember } from "@/lib/host-lead-routing";
import { getMemberSession } from "@/lib/member-session";

type Params = { params: Promise<{ leadId: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { leadId } = await params;
  const cookieStore = await cookies();
  const member = getMemberSession(cookieStore);
  if (!member.isLoggedIn) {
    return NextResponse.json({ error: "請先登入團主帳號" }, { status: 401 });
  }
  const hostCandidates = hostLeadIdCandidatesFromMember(member);
  if (!hostCandidates.length) {
    return NextResponse.json({ error: "無法識別團主身份" }, { status: 403 });
  }

  for (const hostId of hostCandidates) {
    const result = await unlockLeadForHost({
      host_id: hostId,
      lead_id: String(leadId || "").trim(),
    });
    if (!result.ok && result.code === "forbidden") continue;
    if (!result.ok) {
      const status = result.code === "not_found" ? 404 : result.code === "requires_upgrade" ? 403 : 400;
      return NextResponse.json(
        {
          error: result.error,
          requires_upgrade: result.requires_upgrade === true,
          quota: result.profile
            ? {
                plan: result.profile.subscription_plan,
                used: result.profile.monthly_leads_used,
                limit: FREE_MONTHLY_LEAD_QUOTA,
                reset_at: result.profile.quota_reset_date,
              }
            : null,
        },
        { status }
      );
    }

    return NextResponse.json({
      ok: true,
      lead: result.lead,
      quota: {
        plan: result.profile.subscription_plan,
        used: result.profile.monthly_leads_used,
        limit: FREE_MONTHLY_LEAD_QUOTA,
        reset_at: result.profile.quota_reset_date,
      },
    });
  }

  const profile = await getHostSubscriptionProfile(hostCandidates[0]);
  return NextResponse.json(
    {
      error: "找不到這筆名單",
      quota: {
        plan: profile.subscription_plan,
        used: profile.monthly_leads_used,
        limit: FREE_MONTHLY_LEAD_QUOTA,
        reset_at: profile.quota_reset_date,
      },
    },
    { status: 404 }
  );
}
