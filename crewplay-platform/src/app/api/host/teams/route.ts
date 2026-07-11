import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { listOwnedTeamsForMember } from "@/lib/host-team-access";
import { getMemberSession } from "@/lib/member-session";
import { getTeamBookingStatsMap } from "@/lib/team-booking-stats";
import { addTeamManualMembers, listTeamManualMembers, setTeamManualMembers } from "@/lib/team-manual-members";
import { setTeamCapacityOverride } from "@/lib/team-capacity-overrides";

export async function GET() {
  const cookieStore = await cookies();
  const member = getMemberSession(cookieStore);
  if (!member.isLoggedIn) {
    return NextResponse.json({ error: "請先登入團主帳號" }, { status: 401 });
  }

  const teams = await listOwnedTeamsForMember(member);
  const statsMap = await getTeamBookingStatsMap(teams);
  const manualMap = await listTeamManualMembers();

  return NextResponse.json({
    teams: teams.map((t) => ({
      id: t.id,
      arena_name: t.arena_name,
      sport: t.sport,
      region: t.region,
      location: t.location,
      stats: statsMap[t.id],
      manual_members: Math.max(0, Number(manualMap[t.id] || 0)),
    })),
  });
}

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const member = getMemberSession(cookieStore);
  if (!member.isLoggedIn) {
    return NextResponse.json({ error: "請先登入團主帳號" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as
    | {
        team_id?: string;
        action?: "add_member" | "remove_member" | "set_manual_members" | "set_total_slots";
        count?: number;
        total_slots?: number;
      }
    | null;
  const teamId = String(body?.team_id ?? "").trim();
  const action = body?.action;
  if (!teamId || !action) {
    return NextResponse.json({ error: "缺少 team_id 或 action" }, { status: 400 });
  }

  const ownedTeams = await listOwnedTeamsForMember(member);
  if (!ownedTeams.some((t) => t.id === teamId)) {
    return NextResponse.json({ error: "您只能編輯自己開的團" }, { status: 403 });
  }

  if (action === "set_total_slots") {
    const totalSlots = Number(body?.total_slots);
    if (!Number.isFinite(totalSlots) || totalSlots <= 0 || totalSlots > 200) {
      return NextResponse.json({ error: "總人數需為 1~200" }, { status: 400 });
    }
    await setTeamCapacityOverride(teamId, Math.floor(totalSlots));
  } else if (action === "set_manual_members") {
    const count = Number(body?.count);
    if (!Number.isFinite(count) || count < 0 || count > 500) {
      return NextResponse.json({ error: "人數需為 0~500" }, { status: 400 });
    }
    await setTeamManualMembers(teamId, Math.floor(count));
  } else if (action === "add_member") {
    await addTeamManualMembers(teamId, 1);
  } else if (action === "remove_member") {
    await addTeamManualMembers(teamId, -1);
  } else {
    return NextResponse.json({ error: "不支援的 action" }, { status: 400 });
  }

  const team = ownedTeams.find((t) => t.id === teamId);
  if (!team) return NextResponse.json({ error: "找不到團隊" }, { status: 404 });
  const stats = await getTeamBookingStatsMap([team]);
  const manualMap = await listTeamManualMembers();
  return NextResponse.json({
    ok: true,
    team_id: teamId,
    stats: stats[teamId],
    manual_members: Math.max(0, Number(manualMap[teamId] || 0)),
  });
}
