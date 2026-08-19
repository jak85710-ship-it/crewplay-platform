import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { sendHostIncidentStatusEmails } from "@/lib/email";
import { getHostIncidentById, setHostIncidentStatus } from "@/lib/host-incidents";
import { listOwnedTeamsForMember } from "@/lib/host-team-access";
import { getMemberSession } from "@/lib/member-session";

function cleanText(value: unknown, max = 120): string {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, max);
}

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const member = getMemberSession(cookieStore);
  if (!member.isLoggedIn) {
    return NextResponse.json({ error: "請先登入團主帳號" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "提交格式錯誤" }, { status: 400 });
  }

  const incidentId = cleanText(body.incident_id, 80);
  const action = cleanText(body.action, 20);
  const closeNote = cleanText(body.close_note, 300);
  if (!incidentId || (action !== "close" && action !== "reopen")) {
    return NextResponse.json({ error: "參數不完整或格式錯誤" }, { status: 400 });
  }

  const incident = await getHostIncidentById(incidentId);
  if (!incident) {
    return NextResponse.json({ error: "找不到事故紀錄" }, { status: 404 });
  }

  const ownedTeams = await listOwnedTeamsForMember(member);
  if (!ownedTeams.some((team) => team.id === incident.team_id)) {
    return NextResponse.json({ error: "您沒有操作此事故案件的權限" }, { status: 403 });
  }

  if (action === "close" && !closeNote) {
    return NextResponse.json({ error: "請填寫結案備註" }, { status: 400 });
  }

  const updated = await setHostIncidentStatus({
    incidentId,
    status: action === "close" ? "closed" : "open",
    closeNote,
  });
  if (!updated) {
    return NextResponse.json({ error: "更新失敗，請稍後再試" }, { status: 500 });
  }
  const team = ownedTeams.find((item) => item.id === updated.team_id);
  const statusMail = await sendHostIncidentStatusEmails({
    ticketNo: updated.ticket_no || updated.id.slice(0, 8).toUpperCase(),
    teamName: team?.arena_name || updated.team_id,
    status: updated.status === "closed" ? "closed" : "open",
    closeNote: updated.close_note || "",
    updatedAt: updated.status === "closed" ? updated.closed_at || new Date().toISOString() : new Date().toISOString(),
  });
  return NextResponse.json({ ok: true, incident: updated, mail: statusMail });
}

