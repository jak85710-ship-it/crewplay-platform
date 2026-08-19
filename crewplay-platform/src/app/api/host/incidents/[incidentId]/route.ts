import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getHostIncidentById } from "@/lib/host-incidents";
import { listOwnedTeamsForMember } from "@/lib/host-team-access";
import { getMemberSession } from "@/lib/member-session";

interface Props {
  params: Promise<{ incidentId: string }>;
}

export async function GET(_req: Request, props: Props) {
  const cookieStore = await cookies();
  const member = getMemberSession(cookieStore);
  if (!member.isLoggedIn) {
    return NextResponse.json({ error: "請先登入團主帳號" }, { status: 401 });
  }

  const { incidentId } = await props.params;
  const incident = await getHostIncidentById(incidentId);
  if (!incident) {
    return NextResponse.json({ error: "找不到事故紀錄" }, { status: 404 });
  }

  const ownedTeams = await listOwnedTeamsForMember(member);
  if (!ownedTeams.some((team) => team.id === incident.team_id)) {
    return NextResponse.json({ error: "您沒有此事故紀錄的查看權限" }, { status: 403 });
  }

  return NextResponse.json({ ok: true, incident });
}

