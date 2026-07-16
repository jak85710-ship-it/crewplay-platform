import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createHostLead } from "@/lib/host-freemium";
import { resolveHostLeadIdsForTeam } from "@/lib/host-lead-routing";
import { getMemberSession } from "@/lib/member-session";
import { getTeamById } from "@/lib/teams";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | {
        team_id?: string;
        line_id?: string;
        email?: string;
        note?: string;
      }
    | null;
  const teamId = String(body?.team_id || "").trim();
  if (!teamId) {
    return NextResponse.json({ error: "缺少 team_id" }, { status: 400 });
  }

  const team = await getTeamById(teamId);
  if (!team) {
    return NextResponse.json({ error: "找不到活動" }, { status: 404 });
  }

  const hostIds = await resolveHostLeadIdsForTeam(teamId);
  if (!hostIds.length) {
    return NextResponse.json({ error: "目前尚未設定可接收名單的團主" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const member = getMemberSession(cookieStore);
  const leadPayload = {
    name: member.name || member.displayName || "",
    email: String(body?.email || member.email || "").trim(),
    line_id: String(body?.line_id || "").trim(),
    note: String(body?.note || "").trim(),
    sport: team.sport,
    region: team.region,
  };

  const created = await Promise.all(
    hostIds.map((hostId) =>
      createHostLead({
        host_id: hostId,
        team_id: teamId,
        player_info: leadPayload,
      })
    )
  );

  return NextResponse.json({
    ok: true,
    leads: created.map((row) => ({
      id: row.id,
      host_id: row.host_id,
      is_unlocked: row.is_unlocked,
      created_at: row.created_at,
    })),
  });
}
